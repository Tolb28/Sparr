import { pool } from '../config/db';
import { MetricDefinition } from './types';

export const InteractionsCountMetric: MetricDefinition = {
  key: 'interactions_count',
  name: 'Interactions Count',
  unit: 'interactions',
  /**
   * Computes total interactions for a profile.
   */
  compute: async (profileId) => {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS count FROM interactions WHERE profiles_id_profiles = $1`,
      [profileId]
    );

    return rows[0]?.count ?? 0;
  },
  validate: (value) => Number.isInteger(value) && value >= 0,
};
