import { pool } from '../config/db';
import { MetricDefinition } from './types';

export const TotalHoursMetric: MetricDefinition = {
  key: 'total_hours',
  name: 'Total Hours',
  unit: 'hours',
  /**
   * Computes total training hours for a profile.
   */
  compute: async (profileId) => {
    const { rows } = await pool.query(
      `SELECT COALESCE(SUM(duration_seconds), 0)::int AS total_seconds
       FROM workout_completions
       WHERE profile_id = $1`,
      [profileId]
    );

    const totalSeconds = Number(rows[0]?.total_seconds ?? 0);
    return totalSeconds / 3600;
  },
  validate: (value) => Number.isFinite(value) && value >= 0,
};
