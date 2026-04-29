import { pool } from '../config/db';
import { MetricDefinition } from './types';

export const WorkoutsCompletedMetric: MetricDefinition = {
  key: 'workouts_completed',
  name: 'Workouts Completed',
  unit: 'workouts',
  /**
   * Computes total completed workouts for a profile.
   */
  compute: async (profileId) => {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS count FROM workout_completions WHERE profile_id = $1`,
      [profileId]
    );

    return rows[0]?.count ?? 0;
  },
  validate: (value) => Number.isInteger(value) && value >= 0,
};
