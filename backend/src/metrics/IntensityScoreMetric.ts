import { pool } from '../config/db';
import { SkillLevelMetric } from './SkillLevelMetric';
import { MetricComputationContext, MetricDefinition } from './types';

const resolveMetricValue = async (
  key: string,
  context: MetricComputationContext | undefined,
  fallback: () => Promise<number>
) => {
  const cached = context?.metrics[key];
  if (typeof cached === 'number' && Number.isFinite(cached)) {
    return cached;
  }
  return fallback();
};

export const IntensityScoreMetric: MetricDefinition = {
  key: 'intensity_score',
  name: 'Intensity Score',
  unit: 'score',
  /**
   * Computes a composite 0-100 intensity score for a profile.
   *
   * Edge cases:
   * - New user (0 workouts) => 0
   * - Short, simple workouts => 10-30
   * - Long, complex workouts => 50-70
   * - Advanced user (long, complex workouts + high skill level) => 80-100
   * - Values above caps should still return 100
   * - Skill dependency should map 0-100 skill_level into 0-25 points
   */
  compute: async (profileId, context) => {
    const { rows: workoutCountRows } = await pool.query(
      `SELECT COUNT(*) AS workout_count FROM workout_completions WHERE profile_id = $1`,
      [profileId]
    );

    const workoutCount = Number(workoutCountRows[0]?.workout_count ?? 0);
    if (workoutCount === 0) {
      return 0;
    }

    const { rows: durationRows } = await pool.query(
      `SELECT COALESCE(AVG(duration_seconds), 0) AS avg_seconds
       FROM workout_completions
       WHERE profile_id = $1`,
      [profileId]
    );

    const { rows: componentsRows } = await pool.query(
      `SELECT COALESCE(AVG(component_count), 0) AS avg_components
       FROM (
         SELECT wc.id_workout_completions, COUNT(tc.id_trainings_components) AS component_count
         FROM workout_completions wc
         LEFT JOIN trainings_components tc ON wc.training_id = tc.id_trainings
         WHERE wc.profile_id = $1
         GROUP BY wc.id_workout_completions
       ) subquery`,
      [profileId]
    );

    const { rows: volumeRows } = await pool.query(
      `SELECT COALESCE(SUM(COALESCE(reps, 1) * COALESCE(sets, 1)), 0) AS total_volume
       FROM trainings_components tc
       WHERE tc.id_trainings IN (
         SELECT training_id FROM workout_completions WHERE profile_id = $1
       )`,
      [profileId]
    );

    const avgSeconds = Number(durationRows[0]?.avg_seconds ?? 0);
    const avgComponents = Number(componentsRows[0]?.avg_components ?? 0);
    const totalVolume = Number(volumeRows[0]?.total_volume ?? 0);
    const skillLevel = await resolveMetricValue('skill_level', context, () => SkillLevelMetric.compute(profileId));

    const component1 = Math.min(avgSeconds / 60 / 60, 1) * 25;
    const component2 = Math.min(avgComponents / 10, 1) * 25;
    const component3 = Math.min(totalVolume / 1000, 1) * 25;
    const component4 = Math.min(skillLevel / 100, 1) * 25;

    const intensityScore = Math.round(component1 + component2 + component3 + component4);
    return Math.min(intensityScore, 100);
  },
  validate: (value) => Number.isInteger(value) && value >= 0 && value <= 100,
};
