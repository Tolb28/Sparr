import { pool } from '../config/db';
import { METRICS } from '../metrics';
import { AllowedRange, MetricComputationContext, validateProfileId, validateRange } from '../metrics/types';
import { cacheService } from './cacheService';
import { createError, logError } from './errorService';

type ProgressRange = AllowedRange;

/* ------------------------------------------------------------------ */
/* Default badge definitions                                          */
/* ------------------------------------------------------------------ */
const DEFAULT_BADGES = [
  // Workout milestones
  { title: 'First Blood',     description: 'Complete your first workout',                metric_key: 'workouts_completed', threshold: 1,   icon_name: 'fitness-outline',         color: '#f20d0d' },
  { title: 'Getting Started', description: 'Complete 10 workouts',                       metric_key: 'workouts_completed', threshold: 10,  icon_name: 'barbell-outline',         color: '#f59e0b' },
  { title: 'Heavy Hitter',    description: 'Complete 50 workouts',                       metric_key: 'workouts_completed', threshold: 50,  icon_name: 'flash-outline',           color: '#8b5cf6' },
  { title: 'Iron Will',       description: 'Complete 100 workouts',                      metric_key: 'workouts_completed', threshold: 100, icon_name: 'shield-checkmark-outline', color: '#06b6d4' },
  { title: 'Centurion',       description: 'Complete 200 workouts',                      metric_key: 'workouts_completed', threshold: 200, icon_name: 'trophy-outline',          color: '#eab308' },
  // Streak milestones
  { title: 'On Fire',         description: 'Maintain a 3-day training streak',           metric_key: 'streak_days', threshold: 3,   icon_name: 'flame-outline',    color: '#f97316' },
  { title: '7-Day Streak',    description: 'Maintain a 7-day training streak',           metric_key: 'streak_days', threshold: 7,   icon_name: 'flame-outline',    color: '#ef4444' },
  { title: '30-Day Streak',   description: 'Maintain a 30-day training streak',          metric_key: 'streak_days', threshold: 30,  icon_name: 'bonfire-outline',  color: '#dc2626' },
  // Club participation
  { title: 'Gym Rat',         description: 'Join your first club',                       metric_key: 'clubs_joined', threshold: 1,   icon_name: 'home-outline',     color: '#3b82f6' },
  { title: 'Club Hopper',     description: 'Join 3 clubs',                               metric_key: 'clubs_joined', threshold: 3,   icon_name: 'business-outline', color: '#6366f1' },
  { title: 'Club Regular',    description: 'Attend 5 club sessions',                     metric_key: 'club_sessions', threshold: 5,  icon_name: 'people-outline',   color: '#3b82f6' },
  { title: 'Sparring Pro',    description: 'Attend 25 club sessions',                    metric_key: 'club_sessions', threshold: 25, icon_name: 'shield-outline',   color: '#2563eb' },
  // Social — interactions
  { title: 'First Like',      description: 'Make your first interaction (like or comment)', metric_key: 'interactions_count', threshold: 1,  icon_name: 'heart-outline',        color: '#f43f5e' },
  { title: 'Community Voice',  description: 'Make 10 interactions',                       metric_key: 'interactions_count', threshold: 10, icon_name: 'chatbubbles-outline',  color: '#22c55e' },
  { title: 'Ring Leader',     description: 'Make 50 interactions',                        metric_key: 'interactions_count', threshold: 50, icon_name: 'megaphone-outline',    color: '#10b981' },
  // Social — posts
  { title: 'First Post',      description: 'Create your first post',                     metric_key: 'posts_created', threshold: 1,  icon_name: 'create-outline',   color: '#a855f7' },
  { title: 'Content Creator',  description: 'Create 10 posts',                           metric_key: 'posts_created', threshold: 10, icon_name: 'newspaper-outline', color: '#7c3aed' },
  { title: 'Storyteller',     description: 'Create 25 posts',                             metric_key: 'posts_created', threshold: 25, icon_name: 'albums-outline',   color: '#6d28d9' },
  // Social — friends
  { title: 'First Corner',    description: 'Make your first friend',                      metric_key: 'friends_count', threshold: 1,  icon_name: 'person-add-outline', color: '#14b8a6' },
  { title: 'Squad Goals',     description: 'Have 5 friends',                              metric_key: 'friends_count', threshold: 5,  icon_name: 'people-outline',     color: '#0d9488' },
  { title: 'Networking Pro',  description: 'Have 20 friends',                             metric_key: 'friends_count', threshold: 20, icon_name: 'globe-outline',      color: '#059669' },
];

/* ------------------------------------------------------------------ */
/* Seed default badges + rules                                        */
/* ------------------------------------------------------------------ */
async function ensureDefaultRules() {
  const { rows: countRows } = await pool.query('SELECT COUNT(*)::int AS count FROM badge_rules');
  if ((countRows[0]?.count ?? 0) > 0) return;

  for (const item of DEFAULT_BADGES) {
    const { rows: badgeRows } = await pool.query(
      `INSERT INTO badges (title, description, icon_path, icon_name, color)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING
       RETURNING id_badges`,
      [item.title, item.description, `/badges/${item.metric_key}.png`, item.icon_name, item.color]
    );

    let badgeId = badgeRows[0]?.id_badges;
    if (!badgeId) {
      const { rows: existing } = await pool.query(`SELECT id_badges FROM badges WHERE title = $1 LIMIT 1`, [item.title]);
      badgeId = existing[0]?.id_badges;
    }
    if (!badgeId) continue;

    await pool.query(
      `INSERT INTO badge_rules (badge_id, metric_key, threshold, rule_window, is_active)
       VALUES ($1, $2, $3, 'lifetime', true)
       ON CONFLICT DO NOTHING`,
      [badgeId, item.metric_key, item.threshold]
    );
  }
}

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */
export async function getProfileIdForUser(userId: string | number) {
  const { rows } = await pool.query('SELECT id_profiles FROM profiles WHERE user_id = $1', [userId]);
  const profileId = rows[0]?.id_profiles;
  return profileId ? Number(profileId) : null;
}

/* ------------------------------------------------------------------ */
/* Workout completion logging                                         */
/* ------------------------------------------------------------------ */
export async function logWorkoutCompletion(
  profileId: number,
  trainingId: number | null,
  durationSeconds: number | null
) {
  const { rows } = await pool.query(
    `INSERT INTO workout_completions (profile_id, training_id, completed_at, duration_seconds)
     VALUES ($1, $2, NOW(), $3)
     RETURNING *`,
    [profileId, trainingId, durationSeconds]
  );

  try {
    await cacheService.delPattern(`progress:${profileId}:*`);
  } catch (error) {
    logError(error, { profileId, endpoint: 'logWorkoutCompletion' });
  }

  // Auto-recalculate gamification after logging
  await recalculateProfileGamification(profileId);

  return rows[0];
}

/* ------------------------------------------------------------------ */
/* Metric computation (uses real workout_completions data)             */
/* ------------------------------------------------------------------ */
export async function computeProfileMetrics(profileId: number) {
  try {
    validateProfileId(profileId);
  } catch (error) {
    throw createError(400, error instanceof Error ? error.message : 'Invalid profile ID', 'INVALID_INPUT');
  }

  const results: Record<string, number> = {};
  const context: MetricComputationContext = { metrics: results };

  for (const metric of METRICS) {
    try {
      const value = await metric.compute(profileId, context);
      if (!metric.validate(value)) {
        throw new Error(`Invalid ${metric.key}: validation failed`);
      }
      results[metric.key] = value;
    } catch (error) {
      logError(error, { metric: metric.key, profileId, endpoint: 'computeProfileMetrics' });
      throw createError(500, `Failed to compute ${metric.key}`, 'METRIC_COMPUTATION_ERROR');
    }
  }

  const computeCountMetric = async (key: string, query: string) => {
    try {
      const { rows } = await pool.query(query, [profileId]);
      return rows[0]?.count ?? 0;
    } catch (error) {
      logError(error, { metric: key, profileId, endpoint: 'computeProfileMetrics' });
      throw createError(500, `Failed to compute ${key}`, 'METRIC_COMPUTATION_ERROR');
    }
  };

  const clubsJoined = await computeCountMetric(
    'clubs_joined',
    `SELECT COUNT(DISTINCT clubs_idclubs)::int AS count FROM profiles_clubs WHERE profiles_id_profiles = $1`
  );

  const postsCreated = await computeCountMetric(
    'posts_created',
    `SELECT COUNT(*)::int AS count FROM profiles_posts WHERE profiles_id_profiles = $1`
  );

  const friendsCount = await computeCountMetric(
    'friends_count',
    `SELECT COUNT(*)::int AS count FROM friends
     WHERE (profiles_id_profiles = $1 OR id_friend = $1)
       AND status = 'accepted'`
  );

  results.clubs_joined = clubsJoined;
  results.posts_created = postsCreated;
  results.friends_count = friendsCount;

  const workoutsCompleted = results.workouts_completed ?? 0;
  const clubSessions = results.club_sessions ?? 0;
  const interactionsCount = results.interactions_count ?? 0;

  results.score =
    workoutsCompleted * 10 +
    clubSessions * 15 +
    interactionsCount * 2 +
    clubsJoined * 20 +
    postsCreated * 5 +
    friendsCount * 5;

  return results;
}

/* ------------------------------------------------------------------ */
/* Recalculate: snapshot + badge awards                                */
/* ------------------------------------------------------------------ */
export async function recalculateProfileGamification(profileId: number) {
  await ensureDefaultRules();
  const metrics = await computeProfileMetrics(profileId);

  await pool.query(
    `INSERT INTO profile_progress_snapshots
      (profile_id, snapshot_date, workouts_completed, club_sessions, streak_days, interactions_count, skill_level, intensity_score, score, created_at, updated_at)
     VALUES
      ($1, CURRENT_DATE, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
     ON CONFLICT (profile_id, snapshot_date)
     DO UPDATE SET workouts_completed = EXCLUDED.workouts_completed,
                   club_sessions = EXCLUDED.club_sessions,
                   streak_days = EXCLUDED.streak_days,
                   interactions_count = EXCLUDED.interactions_count,
                   skill_level = EXCLUDED.skill_level,
                   intensity_score = EXCLUDED.intensity_score,
                   score = EXCLUDED.score,
                   updated_at = NOW()`,
    [
      profileId,
      metrics.workouts_completed,
      metrics.club_sessions,
      metrics.streak_days,
      metrics.interactions_count,
      metrics.skill_level,
      metrics.intensity_score,
      metrics.score,
    ]
  );

  // Evaluate all active rules and award badges
  const { rows: rules } = await pool.query(
    `SELECT br.*, b.title AS badge_title
     FROM badge_rules br
     JOIN badges b ON b.id_badges = br.badge_id
     WHERE br.is_active = true`
  );

  const newlyAwarded: string[] = [];

  for (const rule of rules) {
    const value = (metrics as any)[rule.metric_key] ?? 0;
    if (value >= Number(rule.threshold)) {
      const { rowCount } = await pool.query(
        `INSERT INTO profiles_badges (profiles_id_profiles, badges_id_badges, awarded_at, awarded_reason)
         VALUES ($1, $2, NOW(), $3)
         ON CONFLICT (profiles_id_profiles, badges_id_badges) DO NOTHING`,
        [profileId, rule.badge_id, `Reached ${rule.metric_key} >= ${rule.threshold}`]
      );
      if (rowCount && rowCount > 0) {
        newlyAwarded.push(rule.badge_title);
      }
    }
  }

  return { metrics, newlyAwarded };
}

/* ------------------------------------------------------------------ */
/* Badge catalog (with earned status + progress)                      */
/* ------------------------------------------------------------------ */
export async function getBadgeCatalog(profileId?: number | null) {
  const metrics = profileId ? await computeProfileMetrics(profileId) : null;

  const { rows } = await pool.query(
    `SELECT b.id_badges,
            b.title,
            b.description,
            b.icon_path,
            b.icon_name,
            b.color,
            br.metric_key,
            br.threshold,
            br.rule_window,
            CASE WHEN $1::bigint IS NULL THEN false
                 ELSE EXISTS (
                   SELECT 1 FROM profiles_badges pb
                   WHERE pb.badges_id_badges = b.id_badges
                     AND pb.profiles_id_profiles = $1
                 )
            END AS earned
     FROM badges b
     LEFT JOIN badge_rules br ON br.badge_id = b.id_badges AND br.is_active = true
     ORDER BY b.id_badges ASC`,
    [profileId ?? null]
  );

  // Attach current progress value for each badge
  return rows.map((badge) => {
    const current = metrics ? ((metrics as any)[badge.metric_key] ?? 0) : 0;
    const threshold = Number(badge.threshold) || 1;
    return {
      ...badge,
      current_value: current,
      progress: Math.min(1, current / threshold),
    };
  });
}

export async function getProfileBadges(profileId: number) {
  const { rows } = await pool.query(
    `SELECT b.id_badges, b.title, b.description, b.icon_path, b.icon_name, b.color,
            pb.awarded_at, pb.awarded_reason
     FROM profiles_badges pb
     JOIN badges b ON b.id_badges = pb.badges_id_badges
     WHERE pb.profiles_id_profiles = $1
     ORDER BY pb.awarded_at DESC NULLS LAST, b.id_badges ASC`,
    [profileId]
  );
  return rows;
}

export async function getProfileProgress(profileId: number, range: ProgressRange = 'week') {
  try {
    validateProfileId(profileId);
    validateRange(range);
  } catch (error) {
    throw createError(
      400,
      error instanceof Error ? error.message : 'Invalid input',
      'INVALID_INPUT'
    );
  }

  const metrics = await computeProfileMetrics(profileId);

  const daysMap: Record<ProgressRange, number | null> = {
    week: 7,
    month: 30,
    year: 365,
    lifetime: null,
  };
  const days = daysMap[range];

  const baseQuery = `SELECT snapshot_date,
                            workouts_completed,
                            club_sessions,
                            streak_days,
                            interactions_count,
                            skill_level,
                            intensity_score,
                            score
                     FROM profile_progress_snapshots
                     WHERE profile_id = $1`;
  const query =
    days === null
      ? `${baseQuery} ORDER BY snapshot_date ASC`
      : `${baseQuery}
         AND snapshot_date >= CURRENT_DATE - ($2::int - 1)
         ORDER BY snapshot_date ASC`;

  const params = days === null ? [profileId] : [profileId, days];
  try {
    const { rows: snapshots } = await pool.query(query, params);

    return { range, metrics, snapshots };
  } catch (error) {
    logError(error, { profileId, endpoint: 'getProfileProgress' });
    throw createError(500, 'Failed to fetch progress', 'DATABASE_ERROR');
  }
}
