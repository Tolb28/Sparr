import { pool } from '../config/db';
import { EFFECTIVE_DURATION_SECONDS } from './sql';
import { MetricDefinition } from './types';

export const TotalHoursMetric: MetricDefinition = {
  key: 'total_hours',
  name: 'Total Hours',
  unit: 'hours',
  /**
   * Computes total training hours for a profile. Completions logged without a timer
   * value fall back to the training's estimated duration (see EFFECTIVE_DURATION_SECONDS).
   */
  compute: async (profileId) => {
    const { rows } = await pool.query(
      `SELECT COALESCE(SUM(${EFFECTIVE_DURATION_SECONDS}), 0)::bigint AS total_seconds
       FROM workout_completions wc
       WHERE wc.profile_id = $1`,
      [profileId]
    );

    const totalSeconds = Number(rows[0]?.total_seconds ?? 0);
    return totalSeconds / 3600;
  },
  validate: (value) => Number.isFinite(value) && value >= 0,
};
