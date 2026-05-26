import { pool } from "../config/db";
import { getTrainingsByIds } from "./trainingService";

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

export { getProfileIdForUser };

// ---------------------------------------------------------------------------
// Calendar CRUD
// ---------------------------------------------------------------------------

export async function createCalendar(
  title: string,
  createdByProfileId: number,
  privacy?: string,
  calendarType?: string,
  numWeeks?: number,
  orderStartDate?: string | null
) {
  const { rows } = await pool.query(
    `INSERT INTO training_calendar (title, id_created_by, privacy, calendar_type, num_weeks, order_start_date)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [
      title,
      createdByProfileId,
      privacy || null,
      calendarType || "order",
      numWeeks ?? 1,
      orderStartDate || null,
    ]
  );
  return rows[0];
}

export async function updateCalendar(
  id: number,
  fields: {
    title?: string;
    privacy?: string;
    calendar_type?: string;
    num_weeks?: number;
    order_start_date?: string | null;
  }
) {
  const updates: string[] = [];
  const values: any[] = [];
  let idx = 1;
  if (fields.title !== undefined) {
    updates.push(`title = $${idx++}`);
    values.push(fields.title);
  }
  if (fields.privacy !== undefined) {
    updates.push(`privacy = $${idx++}`);
    values.push(fields.privacy);
  }
  if (fields.calendar_type !== undefined) {
    updates.push(`calendar_type = $${idx++}`);
    values.push(fields.calendar_type);
  }
  if (fields.num_weeks !== undefined) {
    updates.push(`num_weeks = $${idx++}`);
    values.push(fields.num_weeks);
  }
  if (fields.order_start_date !== undefined) {
    updates.push(`order_start_date = $${idx++}`);
    values.push(fields.order_start_date);
  }
  if (updates.length === 0) return null;
  values.push(id);
  const { rows } = await pool.query(
    `UPDATE training_calendar SET ${updates.join(", ")}
     WHERE id_training_calendar = $${idx} RETURNING *`,
    values
  );
  return rows[0] ?? null;
}

/**
 * Fork a calendar: create a copy owned by forkByProfileId with all training slots.
 */
export async function forkCalendar(
  sourceId: number,
  forkByProfileId: number,
  overrides?: { title?: string; privacy?: string }
) {
  const source = await pool.query(
    "SELECT * FROM training_calendar WHERE id_training_calendar = $1",
    [sourceId]
  );
  if (!source.rows[0]) throw new Error("Source calendar not found");
  const src = source.rows[0];

  const newTitle = overrides?.title ?? `${src.title} (copy)`;
  const newPrivacy = overrides?.privacy ?? src.privacy ?? null;

  const { rows: newRows } = await pool.query(
    `INSERT INTO training_calendar (title, id_created_by, privacy, calendar_type, num_weeks, order_start_date)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [newTitle, forkByProfileId, newPrivacy, src.calendar_type, src.num_weeks, src.order_start_date]
  );
  const newCalendar = newRows[0];

  const { rows: slots } = await pool.query(
    `SELECT id_trainings, "order", icon_name, week_number, day_of_week, start_time
     FROM training_calendar_trainings
     WHERE id_training_calendar = $1
     ORDER BY "order" ASC`,
    [sourceId]
  );

  for (const slot of slots) {
    await pool.query(
      `INSERT INTO training_calendar_trainings
        (id_training_calendar, id_trainings, "order", icon_name, week_number, day_of_week, start_time)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        newCalendar.id_training_calendar,
        slot.id_trainings,
        slot.order,
        slot.icon_name,
        slot.week_number,
        slot.day_of_week,
        slot.start_time,
      ]
    );
  }

  return newCalendar;
}

export async function deleteCalendar(id: number) {
  await pool.query(
    "DELETE FROM training_calendar_trainings WHERE id_training_calendar = $1",
    [id]
  );
  await pool.query(
    "DELETE FROM profiles_training_calendar WHERE training_calendar_id_training_calendar = $1",
    [id]
  );
  await pool.query(
    "DELETE FROM training_calendar WHERE id_training_calendar = $1",
    [id]
  );
}

/**
 * Clear all training slots from a calendar (used when changing calendar type).
 */
export async function clearCalendarTrainings(calendarId: number) {
  await pool.query(
    "DELETE FROM training_calendar_trainings WHERE id_training_calendar = $1",
    [calendarId]
  );
}

/**
 * Basic calendar fetch with its training slots (no training detail embedding).
 */
export async function getCalendarById(id: number) {
  const { rows } = await pool.query(
    "SELECT * FROM training_calendar WHERE id_training_calendar = $1",
    [id]
  );
  if (!rows[0]) return null;
  const calendar = rows[0];

  const orderClause =
    calendar.calendar_type === "day"
      ? `tct.week_number ASC, tct.day_of_week ASC, tct.start_time ASC NULLS LAST, tct."order" ASC`
      : `tct."order" ASC, tct.start_time ASC NULLS LAST`;

  const { rows: items } = await pool.query(
    `SELECT tct.*, tr.title AS training_title, tr.description AS training_description
     FROM training_calendar_trainings tct
     LEFT JOIN trainings tr ON tct.id_trainings = tr.id_trainings
     WHERE tct.id_training_calendar = $1
     ORDER BY ${orderClause}`,
    [id]
  );

  return { calendar, items };
}

/**
 * Rich calendar preview with embedded training summaries (component count, duration).
 */
export async function getCalendarPreview(id: number) {
  const { rows } = await pool.query(
    `SELECT tc.*, p.display_name AS creator_name
     FROM training_calendar tc
     LEFT JOIN profiles p ON tc.id_created_by = p.id_profiles
     WHERE tc.id_training_calendar = $1`,
    [id]
  );
  if (!rows[0]) return null;
  const calendar = rows[0];

  const orderClause =
    calendar.calendar_type === "day"
      ? `tct.week_number ASC, tct.day_of_week ASC, tct.start_time ASC NULLS LAST, tct."order" ASC`
      : `tct."order" ASC, tct.start_time ASC NULLS LAST`;

  const { rows: slots } = await pool.query(
    `SELECT tct.id_training_calendar_trainings, tct.id_trainings, tct."order",
            tct.icon_name, tct.week_number, tct.day_of_week, tct.start_time
     FROM training_calendar_trainings tct
     WHERE tct.id_training_calendar = $1
     ORDER BY ${orderClause}`,
    [id]
  );

  const trainingIds = [...new Set(slots.map((s: any) => s.id_trainings).filter(Boolean))];
  const trainingSummaries = trainingIds.length > 0 ? await getTrainingsByIds(trainingIds) : [];
  const summaryMap = new Map(trainingSummaries.map((t: any) => [t.id_trainings, t]));

  const items = slots.map((slot: any) => ({
    ...slot,
    training: summaryMap.get(slot.id_trainings) || null,
  }));

  return { calendar, items };
}

// ---------------------------------------------------------------------------
// Calendar listing
// ---------------------------------------------------------------------------

/**
 * Public calendars with training count and creator name.
 */
export async function listPublicCalendars() {
  const { rows } = await pool.query(
    `SELECT tc.*,
            p.display_name AS creator_name,
            COUNT(tct.id_training_calendar_trainings)::int AS training_count
     FROM training_calendar tc
     LEFT JOIN profiles p ON tc.id_created_by = p.id_profiles
     LEFT JOIN training_calendar_trainings tct ON tc.id_training_calendar = tct.id_training_calendar
     WHERE tc.privacy = 'public'
     GROUP BY tc.id_training_calendar, p.display_name
     ORDER BY tc.id_training_calendar ASC`
  );
  return rows;
}

/**
 * Calendars created by the given user (both public and private).
 */
export async function listUserCalendars(userId: number) {
  const profileId = await getProfileIdForUser(userId);
  if (!profileId) return [];

  const { rows } = await pool.query(
    `SELECT tc.*,
            COUNT(tct.id_training_calendar_trainings)::int AS training_count
     FROM training_calendar tc
     LEFT JOIN training_calendar_trainings tct ON tc.id_training_calendar = tct.id_training_calendar
     WHERE tc.id_created_by = $1
     GROUP BY tc.id_training_calendar
     ORDER BY tc.id_training_calendar DESC`,
    [profileId]
  );
  return rows;
}

// ---------------------------------------------------------------------------
// Calendar selection (profile <-> calendar)
// ---------------------------------------------------------------------------

export async function selectCalendar(userId: number, calendarId: number, profileIdOverride?: number) {
  const profileId = profileIdOverride ?? await getProfileIdForUser(userId);
  if (!profileId) throw new Error("Profile not found");

  await pool.query(
    "DELETE FROM profiles_training_calendar WHERE profiles_id_profiles = $1",
    [profileId]
  );
  const { rows } = await pool.query(
    `INSERT INTO profiles_training_calendar
       (profiles_id_profiles, training_calendar_id_training_calendar, visibility)
     VALUES ($1, $2, 'private') RETURNING *`,
    [profileId, calendarId]
  );
  return rows[0];
}

export async function getSelectedCalendar(userId: number, profileIdOverride?: number) {
  const profileId = profileIdOverride ?? await getProfileIdForUser(userId);
  if (!profileId) return null;

  const { rows } = await pool.query(
    `SELECT tc.*
     FROM profiles_training_calendar ptc
     JOIN training_calendar tc ON ptc.training_calendar_id_training_calendar = tc.id_training_calendar
     WHERE ptc.profiles_id_profiles = $1
     LIMIT 1`,
    [profileId]
  );
  if (!rows[0]) return null;

  const cal = rows[0];

  const orderClause =
    cal.calendar_type === "day"
      ? `tct.week_number ASC, tct.day_of_week ASC, tct.start_time ASC NULLS LAST, tct."order" ASC`
      : `tct."order" ASC, tct.start_time ASC NULLS LAST`;

  const { rows: items } = await pool.query(
    `SELECT tct.*, tr.title AS training_title, tr.description AS training_description
     FROM training_calendar_trainings tct
     LEFT JOIN trainings tr ON tct.id_trainings = tr.id_trainings
     WHERE tct.id_training_calendar = $1
     ORDER BY ${orderClause}`,
    [cal.id_training_calendar]
  );

  return { calendar: cal, items };
}

// ---------------------------------------------------------------------------
// Calendar training slots
// ---------------------------------------------------------------------------

export async function addTrainingToCalendar(
  calendarId: number,
  trainingId: number | null,
  order?: number,
  iconName?: string,
  weekNumber?: number,
  dayOfWeek?: number,
  startTime?: string
) {
  const { rows } = await pool.query(
    `INSERT INTO training_calendar_trainings
       (id_training_calendar, id_trainings, "order", icon_name, week_number, day_of_week, start_time)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [
      calendarId,
      trainingId,
      order ?? null,
      iconName || null,
      weekNumber ?? null,
      dayOfWeek ?? null,
      startTime || null,
    ]
  );
  return rows[0];
}

export async function removeTrainingFromCalendar(itemId: number) {
  await pool.query(
    "DELETE FROM training_calendar_trainings WHERE id_training_calendar_trainings = $1",
    [itemId]
  );
}

/**
 * Bulk reorder calendar trainings.
 * Receives ordered array of training_calendar_trainings IDs.
 */
export async function reorderCalendarTrainings(
  calendarId: number,
  orderedItemIds: number[]
) {
  if (orderedItemIds.length === 0) return;
  await pool.query(
    `UPDATE training_calendar_trainings tct
     SET "order" = v.new_order
     FROM (SELECT unnest($1::bigint[]) AS id, generate_series(1, $2) AS new_order) v
     WHERE tct.id_training_calendar_trainings = v.id
       AND tct.id_training_calendar = $3`,
    [orderedItemIds, orderedItemIds.length, calendarId]
  );
}

// ---------------------------------------------------------------------------
// Weekly stats (for weekly goal display)
// ---------------------------------------------------------------------------

/**
 * Get weekly completion stats for a profile.
 * Returns completed workouts, scheduled trainings, and completion percentage for a given week.
 * @param profileId Profile ID
 * @param dateStr Date string in YYYY-MM-DD format (any day in the target week)
 * @returns { completed: number, scheduled: number, percent: number }
 */
export async function getWeeklyStats(profileId: number, dateStr: string) {
  // Parse the date and calculate week start (Monday) and end (Sunday)
  const parts = dateStr.split('-').map(Number);
  const y = parts[0] || new Date().getFullYear();
  const m = parts[1] || 1;
  const d = parts[2] || 1;
  const date = new Date(y, m - 1, d);
  const dayOfWeek = date.getDay(); // 0 = Sunday
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() - daysToMonday);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  
  const weekStartStr = formatDate(weekStart);
  const weekEndStr = formatDate(weekEnd);

  // Count completed workouts in this week
  const { rows: completedRows } = await pool.query(
    `SELECT COUNT(*)::int AS count FROM workout_completions 
     WHERE profile_id = $1 
     AND DATE(completed_at) >= $2 
     AND DATE(completed_at) <= $3`,
    [profileId, weekStartStr, weekEndStr]
  );
  const completed = completedRows[0]?.count ?? 0;

  // Count scheduled trainings (days with training slots) in this week
  // This counts unique days that have at least one training assigned in the selected calendar
  const { rows: profileCalendarRows } = await pool.query(
    `SELECT training_calendar_id_training_calendar FROM profiles_training_calendar 
     WHERE profiles_id_profiles = $1 LIMIT 1`,
    [profileId]
  );
  
  const calendarId = profileCalendarRows[0]?.training_calendar_id_training_calendar;
  let scheduled = 0;
  
  if (calendarId) {
    // Get calendar info
    const { rows: calRows } = await pool.query(
      `SELECT calendar_type, num_weeks, order_start_date, created_at 
       FROM training_calendar WHERE id_training_calendar = $1`,
      [calendarId]
    );
    const calendar = calRows[0];
    
    if (calendar) {
      const calType = calendar.calendar_type || 'order';
      const { rows: itemRows } = await pool.query(
        `SELECT * FROM training_calendar_trainings WHERE id_training_calendar = $1`,
        [calendarId]
      );
      
      // Count days in the week that have scheduled trainings
      for (let d = 0; d < 7; d++) {
        const dayDate = new Date(weekStart);
        dayDate.setDate(weekStart.getDate() + d);
        const checkDateStr = formatDate(dayDate);
        
        let hasTraining = false;
        
        if (calType === 'day') {
          const numWeeks = calendar.num_weeks || 1;
          const createdAt = calendar.created_at 
            ? calendar.created_at.substring(0, 10)
            : checkDateStr;
          const dow = ((dayDate.getDay() + 6) % 7); // 0 = Monday
          const totalDays = daysBetween(createdAt, checkDateStr);
          const weekInRotation = totalDays >= 0
            ? (Math.floor(totalDays / 7) % numWeeks) + 1
            : ((numWeeks - (Math.floor(Math.abs(totalDays) / 7) % numWeeks)) % numWeeks) + 1;
          
          hasTraining = itemRows.some(
            (it: any) => Number(it.day_of_week) === dow && Number(it.week_number) === weekInRotation
          );
        } else {
          const rawStart = calendar.order_start_date;
          const startDate = rawStart ? String(rawStart).substring(0, 10) : checkDateStr;
          const uniqueOrders = [...new Set(itemRows.map((it: any) => Number(it.order)))].sort((a, b) => a - b);
          const n = uniqueOrders.length || 1;
          const totalDays = daysBetween(startDate, checkDateStr);
          const cycleIdx = totalDays >= 0 ? totalDays % n : ((n - (Math.abs(totalDays) % n)) % n);
          const targetOrder = uniqueOrders[cycleIdx];
          
          hasTraining = itemRows.some(
            (it: any) => Number(it.order) === targetOrder && it.id_trainings
          );
        }
        
        if (hasTraining) scheduled++;
      }
    }
  }
  
  const percent = scheduled > 0 ? (completed / scheduled) * 100 : 0;
  
  return { completed, scheduled, percent };
}

// Helper: Format date to YYYY-MM-DD string
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper: Days between two YYYY-MM-DD dates
function daysBetween(d1: string, d2: string): number {
  const a = new Date(d1 + 'T00:00:00');
  const b = new Date(d2 + 'T00:00:00');
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}
