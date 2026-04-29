import { pool } from "../config/db";
import { cloudinaryService } from "./cloudinaryService";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getProfileIdForUser(userId: number): Promise<number | null> {
  const { rows } = await pool.query(
    "SELECT id_profiles FROM profiles WHERE user_id = $1",
    [userId]
  );
  return rows[0]?.id_profiles ?? null;
}

function estimateDurationSeconds(components: any[]): number {
  let total = 0;
  for (const c of components) {
    const len = c.length != null ? Number(c.length) : 0;
    const sets = c.sets != null ? Number(c.sets) : 1;
    const reps = c.reps != null ? Number(c.reps) : 0;
    if (len > 0) {
      total += len * sets;
    } else if (reps > 0) {
      total += sets * reps * 3; // ~3s per rep estimate
    }
  }
  return total;
}

// ---------------------------------------------------------------------------
// Training CRUD
// ---------------------------------------------------------------------------

export async function createTraining(title: string, description?: string) {
  const { rows } = await pool.query(
    `INSERT INTO trainings (title, description) VALUES ($1, $2) RETURNING *`,
    [title, description || null]
  );
  return rows[0];
}

export async function updateTraining(
  id: number,
  fields: { title?: string; description?: string }
) {
  const updates: string[] = [];
  const values: any[] = [];
  let idx = 1;
  if (fields.title !== undefined) {
    updates.push(`title = $${idx++}`);
    values.push(fields.title);
  }
  if (fields.description !== undefined) {
    updates.push(`description = $${idx++}`);
    values.push(fields.description);
  }
  if (updates.length === 0) return null;
  values.push(id);
  const { rows } = await pool.query(
    `UPDATE trainings SET ${updates.join(", ")} WHERE id_trainings = $${idx} RETURNING *`,
    values
  );
  return rows[0] ?? null;
}

export async function deleteTraining(id: number) {
  await pool.query(
    "DELETE FROM trainings_components WHERE id_trainings = $1",
    [id]
  );
  await pool.query("DELETE FROM trainings WHERE id_trainings = $1", [id]);
}

/**
 * Full training with components, drill/combo/technique titles, and video URLs.
 */
export async function getTrainingById(id: number) {
  const { rows } = await pool.query(
    "SELECT * FROM trainings WHERE id_trainings = $1",
    [id]
  );
  if (!rows[0]) return null;

  const training = rows[0];
  const { rows: components } = await pool.query(
    `SELECT tc.*,
            d.title  AS drill_title,       d.source AS drill_source,
            c.title  AS combination_title,  c.source AS combination_source,
            t.title  AS technique_title,    t.source AS technique_source
     FROM trainings_components tc
     LEFT JOIN drills        d ON tc.id_drills        = d.id_drills
     LEFT JOIN combinations  c ON tc.id_combinations  = c.id_combinations
     LEFT JOIN techniques    t ON tc.id_techniques    = t.id_techniques
     WHERE tc.id_trainings = $1
     ORDER BY tc.sort_order ASC, tc.id_trainings_components ASC`,
    [id]
  );

  const componentsWithUrls = components.map((comp: any) => {
    const source =
      comp.drill_source || comp.combination_source || comp.technique_source || comp.source;
    if (source) {
      comp.source = source;
      comp.source_url = cloudinaryService.generateDrillUrl(`${source}/preview`);
      comp.video_url = cloudinaryService.generateVideoUrl(`${source}/video`);
    }
    return comp;
  });

  return { training, components: componentsWithUrls };
}

/**
 * Batch fetch multiple trainings by IDs (for calendar preview embedding).
 */
export async function getTrainingsByIds(ids: number[]) {
  if (ids.length === 0) return [];
  const { rows } = await pool.query(
    `SELECT t.id_trainings, t.title, t.description,
            COUNT(tc.id_trainings_components)::int AS component_count,
            COALESCE(SUM(
              CASE
                WHEN tc.length IS NOT NULL AND tc.length > 0
                  THEN tc.length * COALESCE(tc.sets, 1)
                WHEN tc.reps IS NOT NULL AND tc.reps > 0
                  THEN COALESCE(tc.sets, 1) * tc.reps * 3
                ELSE 0
              END
            ), 0)::int AS estimated_duration_seconds
     FROM trainings t
     LEFT JOIN trainings_components tc ON t.id_trainings = tc.id_trainings
     WHERE t.id_trainings = ANY($1)
     GROUP BY t.id_trainings
     ORDER BY t.id_trainings ASC`,
    [ids]
  );
  return rows;
}

/**
 * Lightweight summaries for all trainings (used in pickers / list views).
 */
export async function getTrainingSummaries() {
  const { rows } = await pool.query(
    `SELECT t.id_trainings, t.title, t.description,
            COUNT(tc.id_trainings_components)::int AS component_count,
            COALESCE(SUM(
              CASE
                WHEN tc.length IS NOT NULL AND tc.length > 0
                  THEN tc.length * COALESCE(tc.sets, 1)
                WHEN tc.reps IS NOT NULL AND tc.reps > 0
                  THEN COALESCE(tc.sets, 1) * tc.reps * 3
                ELSE 0
              END
            ), 0)::int AS estimated_duration_seconds
     FROM trainings t
     LEFT JOIN trainings_components tc ON t.id_trainings = tc.id_trainings
     GROUP BY t.id_trainings
     ORDER BY t.id_trainings ASC`
  );
  return rows;
}

// ---------------------------------------------------------------------------
// Component CRUD
// ---------------------------------------------------------------------------

export async function addComponent(
  trainingId: number,
  data: {
    id_drills?: number;
    id_combinations?: number;
    id_techniques?: number;
    length?: number;
    reps?: number;
    sets?: number;
  }
) {
  const { rows } = await pool.query(
    `INSERT INTO trainings_components
       (id_trainings, id_drills, id_combinations, id_techniques, length, reps, sets)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [
      trainingId,
      data.id_drills || null,
      data.id_combinations || null,
      data.id_techniques || null,
      data.length || null,
      data.reps || null,
      data.sets || null,
    ]
  );
  return rows[0];
}

export async function updateComponent(
  compId: number,
  fields: { length?: number; reps?: number; sets?: number }
) {
  const updates: string[] = [];
  const values: any[] = [];
  let idx = 1;
  if (fields.length !== undefined) {
    updates.push(`length = $${idx++}`);
    values.push(fields.length);
  }
  if (fields.reps !== undefined) {
    updates.push(`reps = $${idx++}`);
    values.push(fields.reps);
  }
  if (fields.sets !== undefined) {
    updates.push(`sets = $${idx++}`);
    values.push(fields.sets);
  }
  if (updates.length === 0) return null;
  values.push(compId);
  const { rows } = await pool.query(
    `UPDATE trainings_components SET ${updates.join(", ")} WHERE id_trainings_components = $${idx} RETURNING *`,
    values
  );
  return rows[0] ?? null;
}

export async function deleteComponent(compId: number) {
  await pool.query(
    "DELETE FROM trainings_components WHERE id_trainings_components = $1",
    [compId]
  );
}

/**
 * Bulk reorder components. Receives an ordered array of component IDs.
 * Uses a single UPDATE with unnest for efficiency.
 */
export async function reorderComponents(
  trainingId: number,
  orderedIds: number[]
) {
  if (orderedIds.length === 0) return;
  await pool.query(
    `UPDATE trainings_components tc
     SET sort_order = v.new_order
     FROM (SELECT unnest($1::int[]) AS id, generate_series(1, $2) AS new_order) v
     WHERE tc.id_trainings_components = v.id
       AND tc.id_trainings = $3`,
    [orderedIds, orderedIds.length, trainingId]
  );
}

export { getProfileIdForUser, estimateDurationSeconds };
