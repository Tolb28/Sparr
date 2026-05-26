import { pool } from '../config/db';
import { MetricDefinition } from './types';

export const ClubSessionsMetric: MetricDefinition = {
  key: 'club_sessions',
  name: 'Club Sessions',
  unit: 'sessions',
  /**
   * Computes club sessions attended for a profile.
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
