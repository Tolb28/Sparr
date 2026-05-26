import { pool } from '../config/db';
import { cloudinaryService } from './cloudinaryService';

export interface NearbyClub {
  idclubs: number;
  title: string;
  location: string;
  members_count: number;
  avatar_url: string | null;
  join_policy: string;
}

export interface PopularTraining {
  id_trainings: number;
  title: string;
  description: string | null;
  popularity: number;
}

export interface SuggestedBoxer {
  id_profiles: number;
  display_name: string;
  username: string;
  location: string | null;
  title_style: string | null;
  title_weight: string | null;
  avatar_url: string | null;
}

/**
 * Get clubs near the user's location.
 * Returns empty array if userLocation is null or empty.
 */
export const getNearbyClubs = async (
  userLocation: string | null,
  limit: number
): Promise<NearbyClub[]> => {
  if (!userLocation || !userLocation.trim()) {
    return [];
  }

  const query = `
    SELECT
      c.idclubs,
      c.title,
      c.location,
      c.avatar_path,
      c.updated_at,
      c.join_policy,
      COUNT(pc.profiles_id_profiles)::int AS members_count
    FROM clubs c
    LEFT JOIN profiles_clubs pc ON pc.clubs_idclubs = c.idclubs
    WHERE c.location ILIKE $1
    GROUP BY c.idclubs
    ORDER BY members_count DESC
    LIMIT $2
  `;

  const { rows } = await pool.query(query, [`%${userLocation.trim()}%`, limit]);

  return rows.map((row) => ({
    idclubs: row.idclubs,
    title: row.title,
    location: row.location,
    members_count: row.members_count,
    avatar_url: row.avatar_path
      ? cloudinaryService.generateAvatarUrl(row.avatar_path, row.updated_at)
      : null,
    join_policy: row.join_policy ?? 'open',
  }));
};

/**
 * Get popular trainings based on workout completions and club training usage.
 */
export const getPopularTrainings = async (
  limit: number
): Promise<PopularTraining[]> => {
  const query = `
    WITH workout_counts AS (
      SELECT training_id AS id_trainings, COUNT(*)::int AS cnt
      FROM workout_completions
      WHERE training_id IS NOT NULL
      GROUP BY training_id
    ),
    club_training_counts AS (
      SELECT id_trainings, COUNT(*)::int AS cnt
      FROM club_trainings
      WHERE id_trainings IS NOT NULL
      GROUP BY id_trainings
    ),
    combined AS (
      SELECT
        COALESCE(wc.id_trainings, ct.id_trainings) AS id_trainings,
        COALESCE(wc.cnt, 0) + COALESCE(ct.cnt, 0) AS popularity
      FROM workout_counts wc
      FULL OUTER JOIN club_training_counts ct
        ON wc.id_trainings = ct.id_trainings
    )
    SELECT
      t.id_trainings,
      t.title,
      t.description,
      COALESCE(c.popularity, 0)::int AS popularity
    FROM trainings t
    LEFT JOIN combined c ON c.id_trainings = t.id_trainings
    ORDER BY popularity DESC, t.id_trainings ASC
    LIMIT $1
  `;

  const { rows } = await pool.query(query, [limit]);

  return rows.map((row) => ({
    id_trainings: row.id_trainings,
    title: row.title,
    description: row.description ?? null,
    popularity: row.popularity,
  }));
};

export interface PopularCalendar {
  id_training_calendar: number;
  calendar_name: string;
  privacy: string;
  id_created_by: number;
  creator_name: string | null;
  creator_avatar: string | null;
  subscriber_count: number;
  training_count: number;
}

/**
 * Get popular public calendars based on subscriber and training counts.
 */
export const getPopularCalendars = async (
  limit: number = 5
): Promise<PopularCalendar[]> => {
  const query = `
    SELECT 
      tc.id_training_calendar,
      tc.title AS calendar_name,
      tc.privacy,
      tc.id_created_by,
      p.display_name AS creator_name,
      p.avatar AS creator_avatar,
      p.updated_at AS profile_updated_at,
      COUNT(DISTINCT ptc.profiles_id_profiles)::int AS subscriber_count,
      COUNT(DISTINCT tct.id_training_calendar_trainings)::int AS training_count
    FROM training_calendar tc
    LEFT JOIN profiles p ON tc.id_created_by = p.id_profiles
    LEFT JOIN profiles_training_calendar ptc ON ptc.training_calendar_id_training_calendar = tc.id_training_calendar
    LEFT JOIN training_calendar_trainings tct ON tct.id_training_calendar = tc.id_training_calendar
    WHERE tc.privacy = 'public'
    GROUP BY tc.id_training_calendar, tc.title, tc.privacy, tc.id_created_by, p.display_name, p.avatar, p.updated_at
    ORDER BY subscriber_count DESC, training_count DESC
    LIMIT $1
  `;

  const { rows } = await pool.query(query, [limit]);

  return rows.map((row) => ({
    id_training_calendar: row.id_training_calendar,
    calendar_name: row.calendar_name,
    privacy: row.privacy,
    id_created_by: row.id_created_by,
    creator_name: row.creator_name ?? null,
    creator_avatar: row.creator_avatar
      ? cloudinaryService.generateAvatarUrl(row.creator_avatar, row.profile_updated_at)
      : null,
    subscriber_count: row.subscriber_count,
    training_count: row.training_count,
  }));
};

/**
 * Get suggested boxers based on matching style, weight class, or location.
 * Excludes the current user profile.
 */
export const getSuggestedBoxers = async (
  profileId: number,
  style: number | null,
  weightClass: number | null,
  location: string | null,
  limit: number
): Promise<SuggestedBoxer[]> => {
  // Build dynamic scoring - each match adds 1 to the score
  const scoreComponents: string[] = [];
  const values: (number | string)[] = [profileId];
  let paramIndex = 2;

  if (style !== null) {
    scoreComponents.push(`CASE WHEN p.boxing_style_id_boxing_style = $${paramIndex} THEN 1 ELSE 0 END`);
    values.push(style);
    paramIndex++;
  }

  if (weightClass !== null) {
    scoreComponents.push(`CASE WHEN p.weight_class_id_weight_class = $${paramIndex} THEN 1 ELSE 0 END`);
    values.push(weightClass);
    paramIndex++;
  }

  if (location && location.trim()) {
    scoreComponents.push(`CASE WHEN p.location ILIKE $${paramIndex} THEN 1 ELSE 0 END`);
    values.push(`%${location.trim()}%`);
    paramIndex++;
  }

  // If no criteria, return empty (no useful suggestions)
  if (scoreComponents.length === 0) {
    return [];
  }

  const scoreExpr = scoreComponents.join(' + ');

  values.push(limit);
  const limitParamIndex = paramIndex;

  const query = `
    SELECT
      p.id_profiles,
      p.display_name,
      p.username,
      p.location,
      p.avatar,
      p.updated_at,
      bs.title_style,
      wc.title_weight,
      (${scoreExpr}) AS match_score
    FROM profiles p
    LEFT JOIN boxing_style bs ON p.boxing_style_id_boxing_style = bs.id_boxing_style
    LEFT JOIN weight_class wc ON p.weight_class_id_weight_class = wc.id_weight_class
    WHERE p.id_profiles != $1
      AND p.is_club_profile = false
      AND (${scoreExpr}) > 0
    ORDER BY match_score DESC, p.id_profiles ASC
    LIMIT $${limitParamIndex}
  `;

  const { rows } = await pool.query(query, values);

  return rows.map((row) => ({
    id_profiles: row.id_profiles,
    display_name: row.display_name,
    username: row.username,
    location: row.location ?? null,
    title_style: row.title_style ?? null,
    title_weight: row.title_weight ?? null,
    avatar_url: row.avatar
      ? cloudinaryService.generateAvatarUrl(row.avatar, row.updated_at)
      : null,
  }));
};
