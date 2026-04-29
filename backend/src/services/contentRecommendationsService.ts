import { pool } from '../config/db';
import { cloudinaryService } from './cloudinaryService';

type ContentType = 'technique' | 'drill' | 'combination';
type ContentTypeFilter = 'all' | 'techniques' | 'drills' | 'combinations';
type ContentKey = 'techniques' | 'drills' | 'combinations';

const EXPERIENCE_RANK: Record<string, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
};

const CONTENT_CONFIG: Record<
  ContentType,
  { table: 'techniques' | 'drills' | 'combinations'; idColumn: 'id_techniques' | 'id_drills' | 'id_combinations'; popularityColumn: 'id_techniques' | 'id_drills' | 'id_combinations'; key: ContentKey }
> = {
  technique: { table: 'techniques', idColumn: 'id_techniques', popularityColumn: 'id_techniques', key: 'techniques' },
  drill: { table: 'drills', idColumn: 'id_drills', popularityColumn: 'id_drills', key: 'drills' },
  combination: { table: 'combinations', idColumn: 'id_combinations', popularityColumn: 'id_combinations', key: 'combinations' },
};

interface ProfilePersonalizationContext {
  styleId: number | null;
  weightClassId: number | null;
  heightCm: number | null;
  experienceRank: number | null;
}

interface RecommendationRow {
  content_id: number;
  title: string;
  description: string | null;
  source: string | null;
  category_name: string | null;
  rule_score: number;
  popularity: number;
  score: number;
  reason_style: boolean;
  reason_weight: boolean;
  reason_height: boolean;
  reason_experience: boolean;
}

let profileColumnsCache: { hasHeight: boolean; hasExperience: boolean } | null = null;
let rulesTableExistsCache: boolean | null = null;

export interface PersonalizedContentItem {
  content_type: ContentType;
  content_id: number;
  title: string;
  description: string | null;
  category_name: string | null;
  score: number;
  popularity: number;
  reasons: string[];
  source_url: string | null;
  video_url: string | null;
}

export interface ContentRecommendations {
  techniques: PersonalizedContentItem[];
  drills: PersonalizedContentItem[];
  combinations: PersonalizedContentItem[];
}

function toExperienceRank(level: unknown): number | null {
  if (typeof level !== 'string') return null;
  const normalized = level.toLowerCase();
  return EXPERIENCE_RANK[normalized] ?? null;
}

function buildReasons(row: RecommendationRow, includeReasons: boolean): string[] {
  if (!includeReasons) return [];

  const reasons: string[] = [];
  if (row.reason_style) reasons.push('match_style');
  if (row.reason_weight) reasons.push('match_weight');
  if (row.reason_height) reasons.push('match_height');
  if (row.reason_experience) reasons.push('match_experience');
  if (row.popularity > 0) reasons.push('popular_with_community');
  if (!reasons.length) reasons.push('fallback_popularity');
  return reasons;
}

async function getProfileColumnSupport() {
  if (profileColumnsCache) return profileColumnsCache;

  const { rows } = await pool.query<{
    column_name: string;
  }>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'profiles'
       AND column_name IN ('height_cm', 'experience_level')`
  );

  const columns = new Set(rows.map((row) => row.column_name));
  profileColumnsCache = {
    hasHeight: columns.has('height_cm'),
    hasExperience: columns.has('experience_level'),
  };

  return profileColumnsCache;
}

async function hasRulesTable() {
  if (rulesTableExistsCache !== null) return rulesTableExistsCache;

  const { rows } = await pool.query<{ table_exists: boolean }>(
    `SELECT to_regclass('public.content_personalization_rules') IS NOT NULL AS table_exists`
  );

  rulesTableExistsCache = Boolean(rows[0]?.table_exists);
  return rulesTableExistsCache;
}

async function getProfileContext(profileId: number): Promise<ProfilePersonalizationContext> {
  const columnSupport = await getProfileColumnSupport();
  const { rows } = await pool.query(
    `SELECT
       boxing_style_id_boxing_style,
       weight_class_id_weight_class,
       ${columnSupport.hasHeight ? 'height_cm' : 'NULL::integer AS height_cm'},
       ${columnSupport.hasExperience ? 'experience_level' : 'NULL::character varying AS experience_level'}
     FROM profiles
     WHERE id_profiles = $1
     LIMIT 1`,
    [profileId]
  );

  const profile = rows[0];
  if (!profile) {
    throw new Error('Profile not found');
  }

  return {
    styleId: profile.boxing_style_id_boxing_style ?? null,
    weightClassId: profile.weight_class_id_weight_class ?? null,
    heightCm: profile.height_cm ?? null,
    experienceRank: toExperienceRank(profile.experience_level),
  };
}

async function getRecommendationsForType(
  profileId: number,
  contentType: ContentType,
  limitPerType: number,
  includeReasons: boolean
): Promise<PersonalizedContentItem[]> {
  const profile = await getProfileContext(profileId);
  const config = CONTENT_CONFIG[contentType];
  const rulesEnabled = await hasRulesTable();
  const limitPlaceholder = rulesEnabled ? '$6' : '$2';

  const ruleMatchesCte = rulesEnabled
    ? `
    rule_matches AS (
      SELECT
        r.content_id,
        SUM(
          CASE
            WHEN
              (r.boxing_style_id IS NULL OR ($2 IS NOT NULL AND r.boxing_style_id = $2))
              AND (r.weight_class_id IS NULL OR ($3 IS NOT NULL AND r.weight_class_id = $3))
              AND (r.min_height_cm IS NULL OR ($4 IS NOT NULL AND $4 >= r.min_height_cm))
              AND (r.max_height_cm IS NULL OR ($4 IS NOT NULL AND $4 <= r.max_height_cm))
              AND (
                r.min_experience_level IS NULL OR (
                  $5 IS NOT NULL AND $5 >= (
                    CASE r.min_experience_level
                      WHEN 'beginner' THEN 1
                      WHEN 'intermediate' THEN 2
                      WHEN 'advanced' THEN 3
                      ELSE NULL
                    END
                  )
                )
              )
              AND (
                r.max_experience_level IS NULL OR (
                  $5 IS NOT NULL AND $5 <= (
                    CASE r.max_experience_level
                      WHEN 'beginner' THEN 1
                      WHEN 'intermediate' THEN 2
                      WHEN 'advanced' THEN 3
                      ELSE NULL
                    END
                  )
                )
              )
            THEN COALESCE(r.boost_score, 0)
            ELSE 0
          END
        )::int AS rule_score,
        BOOL_OR(
          r.boxing_style_id IS NOT NULL
          AND $2 IS NOT NULL
          AND r.boxing_style_id = $2
          AND (r.weight_class_id IS NULL OR ($3 IS NOT NULL AND r.weight_class_id = $3))
          AND (r.min_height_cm IS NULL OR ($4 IS NOT NULL AND $4 >= r.min_height_cm))
          AND (r.max_height_cm IS NULL OR ($4 IS NOT NULL AND $4 <= r.max_height_cm))
          AND (
            r.min_experience_level IS NULL OR (
              $5 IS NOT NULL AND $5 >= (
                CASE r.min_experience_level
                  WHEN 'beginner' THEN 1
                  WHEN 'intermediate' THEN 2
                  WHEN 'advanced' THEN 3
                  ELSE NULL
                END
              )
            )
          )
          AND (
            r.max_experience_level IS NULL OR (
              $5 IS NOT NULL AND $5 <= (
                CASE r.max_experience_level
                  WHEN 'beginner' THEN 1
                  WHEN 'intermediate' THEN 2
                  WHEN 'advanced' THEN 3
                  ELSE NULL
                END
              )
            )
          )
        ) AS reason_style,
        BOOL_OR(
          r.weight_class_id IS NOT NULL
          AND $3 IS NOT NULL
          AND r.weight_class_id = $3
          AND (r.boxing_style_id IS NULL OR ($2 IS NOT NULL AND r.boxing_style_id = $2))
          AND (r.min_height_cm IS NULL OR ($4 IS NOT NULL AND $4 >= r.min_height_cm))
          AND (r.max_height_cm IS NULL OR ($4 IS NOT NULL AND $4 <= r.max_height_cm))
          AND (
            r.min_experience_level IS NULL OR (
              $5 IS NOT NULL AND $5 >= (
                CASE r.min_experience_level
                  WHEN 'beginner' THEN 1
                  WHEN 'intermediate' THEN 2
                  WHEN 'advanced' THEN 3
                  ELSE NULL
                END
              )
            )
          )
          AND (
            r.max_experience_level IS NULL OR (
              $5 IS NOT NULL AND $5 <= (
                CASE r.max_experience_level
                  WHEN 'beginner' THEN 1
                  WHEN 'intermediate' THEN 2
                  WHEN 'advanced' THEN 3
                  ELSE NULL
                END
              )
            )
          )
        ) AS reason_weight,
        BOOL_OR(
          (r.min_height_cm IS NOT NULL OR r.max_height_cm IS NOT NULL)
          AND $4 IS NOT NULL
          AND (r.min_height_cm IS NULL OR $4 >= r.min_height_cm)
          AND (r.max_height_cm IS NULL OR $4 <= r.max_height_cm)
          AND (r.boxing_style_id IS NULL OR ($2 IS NOT NULL AND r.boxing_style_id = $2))
          AND (r.weight_class_id IS NULL OR ($3 IS NOT NULL AND r.weight_class_id = $3))
          AND (
            r.min_experience_level IS NULL OR (
              $5 IS NOT NULL AND $5 >= (
                CASE r.min_experience_level
                  WHEN 'beginner' THEN 1
                  WHEN 'intermediate' THEN 2
                  WHEN 'advanced' THEN 3
                  ELSE NULL
                END
              )
            )
          )
          AND (
            r.max_experience_level IS NULL OR (
              $5 IS NOT NULL AND $5 <= (
                CASE r.max_experience_level
                  WHEN 'beginner' THEN 1
                  WHEN 'intermediate' THEN 2
                  WHEN 'advanced' THEN 3
                  ELSE NULL
                END
              )
            )
          )
        ) AS reason_height,
        BOOL_OR(
          (r.min_experience_level IS NOT NULL OR r.max_experience_level IS NOT NULL)
          AND $5 IS NOT NULL
          AND (
            r.min_experience_level IS NULL OR $5 >= (
              CASE r.min_experience_level
                WHEN 'beginner' THEN 1
                WHEN 'intermediate' THEN 2
                WHEN 'advanced' THEN 3
                ELSE NULL
              END
            )
          )
          AND (
            r.max_experience_level IS NULL OR $5 <= (
              CASE r.max_experience_level
                WHEN 'beginner' THEN 1
                WHEN 'intermediate' THEN 2
                WHEN 'advanced' THEN 3
                ELSE NULL
              END
            )
          )
          AND (r.boxing_style_id IS NULL OR ($2 IS NOT NULL AND r.boxing_style_id = $2))
          AND (r.weight_class_id IS NULL OR ($3 IS NOT NULL AND r.weight_class_id = $3))
          AND (r.min_height_cm IS NULL OR ($4 IS NOT NULL AND $4 >= r.min_height_cm))
          AND (r.max_height_cm IS NULL OR ($4 IS NOT NULL AND $4 <= r.max_height_cm))
        ) AS reason_experience
      FROM content_personalization_rules r
      WHERE r.content_type = $1
        AND r.is_active = true
      GROUP BY r.content_id
    )`
    : `
    rule_matches AS (
      SELECT
        NULL::integer AS content_id,
        0::int AS rule_score,
        false AS reason_style,
        false AS reason_weight,
        false AS reason_height,
        false AS reason_experience
      WHERE false AND $1::text IS NOT NULL
    )`;

  const query = `
    WITH popularity AS (
      SELECT tc.${config.popularityColumn} AS content_id, COUNT(*)::int AS popularity
      FROM workout_completions wc
      JOIN trainings_components tc ON tc.id_trainings = wc.training_id
      WHERE tc.${config.popularityColumn} IS NOT NULL
      GROUP BY tc.${config.popularityColumn}
    ),
    ${ruleMatchesCte}
    SELECT
      t.${config.idColumn} AS content_id,
      t.title,
      t.description,
      t.source,
      c.name AS category_name,
      COALESCE(rm.rule_score, 0)::int AS rule_score,
      COALESCE(p.popularity, 0)::int AS popularity,
      (COALESCE(rm.rule_score, 0) + LEAST(COALESCE(p.popularity, 0), 25))::int AS score,
      COALESCE(rm.reason_style, false) AS reason_style,
      COALESCE(rm.reason_weight, false) AS reason_weight,
      COALESCE(rm.reason_height, false) AS reason_height,
      COALESCE(rm.reason_experience, false) AS reason_experience
    FROM ${config.table} t
    LEFT JOIN category c ON c.id_category = t.category_id_category
    LEFT JOIN rule_matches rm ON rm.content_id = t.${config.idColumn}
    LEFT JOIN popularity p ON p.content_id = t.${config.idColumn}
    ORDER BY score DESC, popularity DESC, t.${config.idColumn} ASC
    LIMIT ${limitPlaceholder}
  `;

  const params = rulesEnabled
    ? [
        contentType,
        profile.styleId,
        profile.weightClassId,
        profile.heightCm,
        profile.experienceRank,
        limitPerType,
      ]
    : [contentType, limitPerType];

  const { rows } = await pool.query<RecommendationRow>(query, params);

  return rows.map((row) => {
    const source = row.source ?? null;
    return {
      content_type: contentType,
      content_id: row.content_id,
      title: row.title,
      description: row.description,
      category_name: row.category_name ?? null,
      score: row.score,
      popularity: row.popularity,
      reasons: buildReasons(row, includeReasons),
      source_url: source ? cloudinaryService.generateDrillUrl(`${source}/preview`) : null,
      video_url: source ? cloudinaryService.generateVideoUrl(`${source}/video`) : null,
    };
  });
}

function getRequestedTypes(contentType: ContentTypeFilter): ContentType[] {
  if (contentType === 'techniques') return ['technique'];
  if (contentType === 'drills') return ['drill'];
  if (contentType === 'combinations') return ['combination'];
  return ['technique', 'drill', 'combination'];
}

export async function getPersonalizedContentRecommendations(
  profileId: number,
  options: { contentType?: ContentTypeFilter; limitPerType?: number; includeReasons?: boolean } = {}
): Promise<ContentRecommendations> {
  const contentType = options.contentType ?? 'all';
  const limitPerType = Math.min(Math.max(Number(options.limitPerType) || 8, 1), 20);
  const includeReasons = options.includeReasons ?? true;

  const requestedTypes = getRequestedTypes(contentType);

  const recommendations: ContentRecommendations = {
    techniques: [],
    drills: [],
    combinations: [],
  };

  const results = await Promise.all(
    requestedTypes.map(async (type) => {
      const items = await getRecommendationsForType(profileId, type, limitPerType, includeReasons);
      return { key: CONTENT_CONFIG[type].key, items };
    })
  );

  for (const result of results) {
    recommendations[result.key] = result.items;
  }

  return recommendations;
}

