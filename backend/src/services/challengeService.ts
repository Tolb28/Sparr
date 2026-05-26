import { pool } from '../config/db';
import { createError, logError } from './errorService';

export type ChallengeStatus = 'not_started' | 'in_progress' | 'completed';

export interface ChallengeBadge {
  id_badges: number;
  title: string;
  description: string;
  icon_name: string;
  color: string;
  earned: boolean;
}

export interface ChallengeRequirement {
  id_challenge_requirements: number;
  requirement_key: string;
  title: string;
  unit: string;
  target_value: number;
  current_value: number;
  source: 'manual' | 'auto';
  auto_metric_key: string | null;
  is_complete: boolean;
}

export interface ChallengeSummary {
  id_challenges: number;
  slug: string;
  title: string;
  description: string;
  difficulty: string;
  status: ChallengeStatus;
  progress: number;
  started_at: string | null;
  completed_at: string | null;
  requirements: ChallengeRequirement[];
  badge: ChallengeBadge | null;
}

export interface ChallengeActionResult {
  challenge: ChallengeSummary;
  newlyAwardedBadge: ChallengeBadge | null;
}

interface ChallengeRow {
  id_challenges: number;
  slug: string;
  challenge_title: string;
  challenge_description: string | null;
  difficulty: string | null;
  profile_challenge_id: number | null;
  enrollment_status: string | null;
  started_at: string | Date | null;
  completed_at: string | Date | null;
  badge_id: number | null;
  badge_title: string | null;
  badge_description: string | null;
  badge_icon_name: string | null;
  badge_color: string | null;
  badge_earned: boolean | null;
  id_challenge_requirements: number | null;
  requirement_key: string | null;
  requirement_title: string | null;
  unit: string | null;
  target_value: number | null;
  progress_source: string | null;
  auto_metric_key: string | null;
  requirement_sort_order: number | null;
  manual_progress_value: number | null;
}

interface ChallengeSummaryInternal extends ChallengeSummary {
  profile_challenge_id: number | null;
}

function toPublicChallenge(challenge: ChallengeSummaryInternal): ChallengeSummary {
  const { profile_challenge_id: _profileChallengeId, ...publicChallenge } = challenge;
  return publicChallenge;
}

function toIsoTimestamp(value: string | Date | null): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function normalizeStatus(value: string | null, profileChallengeId: number | null, completedAt: string | null): ChallengeStatus {
  if (completedAt) return 'completed';
  if (!profileChallengeId) return 'not_started';
  if (value === 'completed') return 'completed';
  return 'in_progress';
}

function isChallengeCompletable(challenge: ChallengeSummary) {
  if (challenge.status === 'completed') return false;
  if (challenge.status === 'not_started') return false;
  if (challenge.requirements.length === 0) return true;
  return challenge.requirements.every((requirement) => requirement.is_complete);
}

async function fetchChallengeRows(profileId: number, challengeId?: number): Promise<ChallengeRow[]> {
  const params: Array<number | boolean> = [profileId, true];
  let challengeFilter = '';
  if (challengeId !== undefined) {
    params.push(challengeId);
    challengeFilter = ` AND c.id_challenges = $${params.length}`;
  }

  const { rows } = await pool.query<ChallengeRow>(
    `SELECT
        c.id_challenges,
        c.slug,
        c.title AS challenge_title,
        c.description AS challenge_description,
        c.difficulty,
        pc.id_profile_challenges AS profile_challenge_id,
        pc.status AS enrollment_status,
        pc.started_at,
        pc.completed_at,
        cb.badge_id,
        b.title AS badge_title,
        b.description AS badge_description,
        b.icon_name AS badge_icon_name,
        b.color AS badge_color,
        EXISTS (
          SELECT 1
          FROM profiles_badges pb
          WHERE pb.profiles_id_profiles = $1
            AND pb.badges_id_badges = cb.badge_id
        ) AS badge_earned,
        cr.id_challenge_requirements,
        cr.requirement_key,
        cr.title AS requirement_title,
        cr.unit,
        cr.target_value,
        cr.progress_source,
        cr.auto_metric_key,
        cr.sort_order AS requirement_sort_order,
        pcp.progress_value AS manual_progress_value
     FROM challenge_catalog c
     LEFT JOIN profile_challenges pc
       ON pc.challenge_id = c.id_challenges
      AND pc.profile_id = $1
     LEFT JOIN challenge_badges cb
       ON cb.challenge_id = c.id_challenges
     LEFT JOIN badges b
       ON b.id_badges = cb.badge_id
     LEFT JOIN challenge_requirements cr
       ON cr.challenge_id = c.id_challenges
      AND cr.is_active = $2
     LEFT JOIN profile_challenge_progress pcp
       ON pcp.profile_challenge_id = pc.id_profile_challenges
      AND pcp.challenge_requirement_id = cr.id_challenge_requirements
     WHERE c.is_active = true${challengeFilter}
     ORDER BY c.sort_order ASC, c.id_challenges ASC, cr.sort_order ASC NULLS LAST, cr.id_challenge_requirements ASC`,
    params
  );
  return rows;
}

async function computeAutoMetricValue(
  profileId: number,
  metricKey: string,
  startedAt: string | null,
  cache: Map<string, number>
): Promise<number> {
  const cacheKey = `${metricKey}:${startedAt ?? 'not_started'}`;
  const cached = cache.get(cacheKey);
  if (cached !== undefined) return cached;

  if (!startedAt) {
    cache.set(cacheKey, 0);
    return 0;
  }

  if (metricKey === 'workouts_completed') {
    const { rows } = await pool.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count
       FROM workout_completions
       WHERE profile_id = $1
         AND completed_at >= $2::timestamp`,
      [profileId, startedAt]
    );
    const count = Number(rows[0]?.count ?? 0);
    cache.set(cacheKey, count);
    return count;
  }

  if (metricKey === 'workout_duration_seconds') {
    const { rows } = await pool.query<{ total: number }>(
      `SELECT COALESCE(SUM(duration_seconds), 0)::int AS total
       FROM workout_completions
       WHERE profile_id = $1
         AND completed_at >= $2::timestamp`,
      [profileId, startedAt]
    );
    const total = Number(rows[0]?.total ?? 0);
    cache.set(cacheKey, total);
    return total;
  }

  if (metricKey === 'workout_duration_minutes') {
    const { rows } = await pool.query<{ total: number }>(
      `SELECT COALESCE(SUM(duration_seconds), 0)::int AS total
       FROM workout_completions
       WHERE profile_id = $1
         AND completed_at >= $2::timestamp`,
      [profileId, startedAt]
    );
    const minutes = Math.floor(Number(rows[0]?.total ?? 0) / 60);
    cache.set(cacheKey, minutes);
    return minutes;
  }

  cache.set(cacheKey, 0);
  return 0;
}

async function buildChallengeSummaries(profileId: number, challengeId?: number): Promise<ChallengeSummaryInternal[]> {
  const rows = await fetchChallengeRows(profileId, challengeId);
  if (rows.length === 0) return [];

  const autoMetricCache = new Map<string, number>();
  const challengeMap = new Map<number, ChallengeSummaryInternal>();

  for (const row of rows) {
    const challengeIdValue = Number(row.id_challenges);
    const startedAtIso = toIsoTimestamp(row.started_at);
    const completedAtIso = toIsoTimestamp(row.completed_at);

    let challenge = challengeMap.get(challengeIdValue);
    if (!challenge) {
      challenge = {
        id_challenges: challengeIdValue,
        slug: row.slug,
        title: row.challenge_title,
        description: row.challenge_description || '',
        difficulty: row.difficulty || 'unranked',
        status: normalizeStatus(row.enrollment_status, row.profile_challenge_id, completedAtIso),
        progress: 0,
        started_at: startedAtIso,
        completed_at: completedAtIso,
        requirements: [],
        badge: row.badge_id
          ? {
              id_badges: Number(row.badge_id),
              title: row.badge_title || 'Challenge Badge',
              description: row.badge_description || '',
              icon_name: row.badge_icon_name || 'ribbon-outline',
              color: row.badge_color || '#f20d0d',
              earned: Boolean(row.badge_earned),
            }
          : null,
        profile_challenge_id: row.profile_challenge_id ? Number(row.profile_challenge_id) : null,
      };
      challengeMap.set(challengeIdValue, challenge);
    }

    const requirementId = row.id_challenge_requirements;
    if (!requirementId || !row.requirement_key || !row.requirement_title || !row.unit || !row.target_value) {
      continue;
    }

    const source = row.progress_source === 'auto' ? 'auto' : 'manual';
    const targetValue = Math.max(1, Number(row.target_value));
    const currentValue =
      source === 'auto'
        ? await computeAutoMetricValue(profileId, row.auto_metric_key || '', challenge.started_at, autoMetricCache)
        : Math.max(0, Number(row.manual_progress_value ?? 0));

    challenge.requirements.push({
      id_challenge_requirements: Number(requirementId),
      requirement_key: row.requirement_key,
      title: row.requirement_title,
      unit: row.unit,
      target_value: targetValue,
      current_value: currentValue,
      source,
      auto_metric_key: row.auto_metric_key || null,
      is_complete: currentValue >= targetValue,
    });
  }

  const summaries = Array.from(challengeMap.values());
  for (const challenge of summaries) {
    const targetTotal = challenge.requirements.reduce((sum, requirement) => sum + requirement.target_value, 0);
    const currentTotal = challenge.requirements.reduce(
      (sum, requirement) => sum + Math.min(requirement.current_value, requirement.target_value),
      0
    );
    challenge.progress = targetTotal > 0 ? currentTotal / targetTotal : 0;

    if (challenge.status === 'completed') {
      challenge.progress = 1;
      continue;
    }
    challenge.status = challenge.profile_challenge_id ? 'in_progress' : 'not_started';
  }

  return summaries;
}

async function awardChallengeBadge(profileId: number, challengeId: number): Promise<ChallengeBadge | null> {
  const { rows: mappingRows } = await pool.query<{
    badge_id: number;
    title: string;
    description: string;
    icon_name: string;
    color: string;
  }>(
    `SELECT cb.badge_id, b.title, b.description, b.icon_name, b.color
     FROM challenge_badges cb
     JOIN badges b ON b.id_badges = cb.badge_id
     WHERE cb.challenge_id = $1
     LIMIT 1`,
    [challengeId]
  );

  const badge = mappingRows[0];
  if (!badge) return null;

  const { rowCount } = await pool.query(
    `INSERT INTO profiles_badges
      (profiles_id_profiles, badges_id_badges, awarded_at, awarded_reason)
     VALUES ($1, $2, NOW(), $3)
     ON CONFLICT (profiles_id_profiles, badges_id_badges) DO NOTHING`,
    [profileId, badge.badge_id, `Completed challenge: ${badge.title}`]
  );

  if (!rowCount || rowCount === 0) return null;

  return {
    id_badges: Number(badge.badge_id),
    title: badge.title,
    description: badge.description || '',
    icon_name: badge.icon_name || 'ribbon-outline',
    color: badge.color || '#f20d0d',
    earned: true,
  };
}

async function finalizeChallenge(profileId: number, challengeId: number): Promise<ChallengeBadge | null> {
  await pool.query(
    `UPDATE profile_challenges
     SET status = 'completed',
         completed_at = COALESCE(completed_at, NOW()),
         updated_at = NOW()
     WHERE profile_id = $1
       AND challenge_id = $2`,
    [profileId, challengeId]
  );
  return awardChallengeBadge(profileId, challengeId);
}

async function synchronizeChallengeCompletion(profileId: number, challengeId: number): Promise<ChallengeActionResult> {
  let challenge = (await buildChallengeSummaries(profileId, challengeId))[0];
  if (!challenge) {
    throw createError(404, 'Challenge not found', 'CHALLENGE_NOT_FOUND');
  }

  let newlyAwardedBadge: ChallengeBadge | null = null;
  if (isChallengeCompletable(challenge)) {
    newlyAwardedBadge = await finalizeChallenge(profileId, challengeId);
    const refreshed = (await buildChallengeSummaries(profileId, challengeId))[0];
    if (refreshed) {
      challenge = refreshed;
    }
  }

  return {
    challenge: toPublicChallenge(challenge),
    newlyAwardedBadge,
  };
}

async function ensureChallengeStarted(profileId: number, challengeId: number) {
  await pool.query(
    `INSERT INTO profile_challenges
      (profile_id, challenge_id, status, started_at, created_at, updated_at)
     VALUES ($1, $2, 'in_progress', NOW(), NOW(), NOW())
     ON CONFLICT (profile_id, challenge_id)
     DO UPDATE SET
       status = CASE WHEN profile_challenges.status = 'completed'
                     THEN profile_challenges.status
                     ELSE 'in_progress' END,
       started_at = COALESCE(profile_challenges.started_at, NOW()),
       updated_at = NOW()`,
    [profileId, challengeId]
  );
}

async function getProfileChallengeId(profileId: number, challengeId: number): Promise<number> {
  const { rows } = await pool.query<{ id_profile_challenges: number }>(
    `SELECT id_profile_challenges
     FROM profile_challenges
     WHERE profile_id = $1
       AND challenge_id = $2
     LIMIT 1`,
    [profileId, challengeId]
  );
  const profileChallengeId = rows[0]?.id_profile_challenges;
  if (!profileChallengeId) {
    throw createError(400, 'Challenge must be started before logging progress', 'CHALLENGE_NOT_STARTED');
  }
  return Number(profileChallengeId);
}

export async function listChallengesForProfile(profileId: number): Promise<ChallengeSummary[]> {
  try {
    let challenges = await buildChallengeSummaries(profileId);
    const completableChallengeIds = challenges
      .filter((challenge) => isChallengeCompletable(challenge))
      .map((challenge) => challenge.id_challenges);

    if (completableChallengeIds.length > 0) {
      for (const challengeId of completableChallengeIds) {
        await finalizeChallenge(profileId, challengeId);
      }
      challenges = await buildChallengeSummaries(profileId);
    }

    return challenges.map((challenge) => toPublicChallenge(challenge));
  } catch (error) {
    logError(error, { profileId, endpoint: 'listChallengesForProfile' });
    throw createError(500, 'Failed to load challenges', 'DATABASE_ERROR');
  }
}

export async function getChallengeForProfile(profileId: number, challengeId: number): Promise<ChallengeSummary | null> {
  try {
    const summaries = await buildChallengeSummaries(profileId, challengeId);
    const challenge = summaries[0];
    if (!challenge) return null;

    if (isChallengeCompletable(challenge)) {
      await finalizeChallenge(profileId, challengeId);
      const refreshed = (await buildChallengeSummaries(profileId, challengeId))[0];
      if (!refreshed) return null;
      return toPublicChallenge(refreshed);
    }

    return toPublicChallenge(challenge);
  } catch (error) {
    logError(error, { profileId, endpoint: 'getChallengeForProfile' });
    throw createError(500, 'Failed to load challenge', 'DATABASE_ERROR');
  }
}

export async function startChallengeForProfile(profileId: number, challengeId: number): Promise<ChallengeActionResult> {
  try {
    const challenge = (await buildChallengeSummaries(profileId, challengeId))[0];
    if (!challenge) {
      throw createError(404, 'Challenge not found', 'CHALLENGE_NOT_FOUND');
    }
    if (challenge.status === 'completed') {
      return { challenge: toPublicChallenge(challenge), newlyAwardedBadge: null };
    }

    await ensureChallengeStarted(profileId, challengeId);
    return synchronizeChallengeCompletion(profileId, challengeId);
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'statusCode' in error &&
      typeof (error as { statusCode?: unknown }).statusCode === 'number'
    ) {
      throw error;
    }
    logError(error, { profileId, endpoint: 'startChallengeForProfile' });
    throw createError(500, 'Failed to start challenge', 'DATABASE_ERROR');
  }
}

export async function logManualChallengeProgressForProfile(
  profileId: number,
  challengeId: number,
  requirementId: number,
  increment: number
): Promise<ChallengeActionResult> {
  try {
    if (!Number.isInteger(increment) || increment <= 0) {
      throw createError(400, 'Increment must be a positive integer', 'INVALID_INPUT');
    }

    const challenge = (await buildChallengeSummaries(profileId, challengeId))[0];
    if (!challenge) {
      throw createError(404, 'Challenge not found', 'CHALLENGE_NOT_FOUND');
    }
    if (challenge.status === 'completed') {
      throw createError(400, 'Challenge already completed', 'CHALLENGE_COMPLETED');
    }

    await ensureChallengeStarted(profileId, challengeId);
    const profileChallengeId = await getProfileChallengeId(profileId, challengeId);

    const { rows: requirementRows } = await pool.query<{ progress_source: string }>(
      `SELECT progress_source
       FROM challenge_requirements
       WHERE id_challenge_requirements = $1
         AND challenge_id = $2
         AND is_active = true
       LIMIT 1`,
      [requirementId, challengeId]
    );
    const requirement = requirementRows[0];
    if (!requirement) {
      throw createError(404, 'Challenge requirement not found', 'CHALLENGE_REQUIREMENT_NOT_FOUND');
    }
    if (requirement.progress_source !== 'manual') {
      throw createError(400, 'This requirement is tracked automatically', 'CHALLENGE_REQUIREMENT_AUTO');
    }

    await pool.query(
      `INSERT INTO profile_challenge_progress
        (profile_challenge_id, challenge_requirement_id, progress_value, source, last_logged_at, created_at, updated_at)
       VALUES ($1, $2, $3, 'manual', NOW(), NOW(), NOW())
       ON CONFLICT (profile_challenge_id, challenge_requirement_id)
       DO UPDATE SET
         progress_value = profile_challenge_progress.progress_value + EXCLUDED.progress_value,
         source = 'manual',
         last_logged_at = NOW(),
         updated_at = NOW()`,
      [profileChallengeId, requirementId, increment]
    );

    return synchronizeChallengeCompletion(profileId, challengeId);
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'statusCode' in error &&
      typeof (error as { statusCode?: unknown }).statusCode === 'number'
    ) {
      throw error;
    }
    logError(error, { profileId, endpoint: 'logManualChallengeProgressForProfile' });
    throw createError(500, 'Failed to update challenge progress', 'DATABASE_ERROR');
  }
}

export async function completeChallengeForProfile(profileId: number, challengeId: number): Promise<ChallengeActionResult> {
  try {
    const challenge = (await buildChallengeSummaries(profileId, challengeId))[0];
    if (!challenge) {
      throw createError(404, 'Challenge not found', 'CHALLENGE_NOT_FOUND');
    }
    if (challenge.status === 'not_started') {
      throw createError(400, 'Start the challenge before completing it', 'CHALLENGE_NOT_STARTED');
    }

    const result = await synchronizeChallengeCompletion(profileId, challengeId);
    if (result.challenge.status !== 'completed') {
      throw createError(400, 'Challenge requirements are not complete yet', 'CHALLENGE_REQUIREMENTS_INCOMPLETE');
    }
    return result;
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'statusCode' in error &&
      typeof (error as { statusCode?: unknown }).statusCode === 'number'
    ) {
      throw error;
    }
    logError(error, { profileId, endpoint: 'completeChallengeForProfile' });
    throw createError(500, 'Failed to complete challenge', 'DATABASE_ERROR');
  }
}

