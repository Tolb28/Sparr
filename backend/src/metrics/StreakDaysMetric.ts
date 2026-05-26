import { pool } from '../config/db';
import { MetricDefinition } from './types';

export const StreakDaysMetric: MetricDefinition = {
  key: 'streak_days',
  name: 'Streak Days',
  unit: 'days',
  /**
   * Computes the current training streak in days.
   */
  compute: async (profileId) => {
    const { rows } = await pool.query(
      `WITH daily AS (
         SELECT DISTINCT completed_at::date AS d
         FROM workout_completions
         WHERE profile_id = $1
       ),
       numbered AS (
         SELECT d, d - (ROW_NUMBER() OVER (ORDER BY d))::int AS grp
         FROM daily
       ),
       streaks AS (
         SELECT grp, MIN(d) AS streak_start, MAX(d) AS streak_end, COUNT(*)::int AS len
         FROM numbered
         GROUP BY grp
       )
       SELECT COALESCE(MAX(len), 0)::int AS streak
       FROM streaks
       WHERE streak_end >= CURRENT_DATE - 1`,
      [profileId]
    );

    return rows[0]?.streak ?? 0;
  },
  validate: (value) => Number.isInteger(value) && value >= 0,
};
