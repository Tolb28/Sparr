import { pool } from '../config/db';
import { MetricDefinition } from './types';

export const ClubSessionsMetric: MetricDefinition = {
  key: 'club_sessions',
  name: 'Club Sessions',
  unit: 'sessions',
  /**
   * Computes club sessions for a profile.
   *
   * Limitation: there is no attendance / check-in / RSVP table in the schema, so we
   * cannot know which club trainings a member actually attended. This counts every
   * already-started club training belonging to the member's clubs as a proxy. Replace
   * the proxy with a real join once an attendance table exists.
   */
  compute: async (profileId) => {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM club_trainings ct
       JOIN profiles_clubs pc ON pc.clubs_idclubs = ct.club_id
       WHERE pc.profiles_id_profiles = $1
         AND ct.starts_at <= NOW()`,
      [profileId]
    );

    return rows[0]?.count ?? 0;
  },
  validate: (value) => Number.isInteger(value) && value >= 0,
};
