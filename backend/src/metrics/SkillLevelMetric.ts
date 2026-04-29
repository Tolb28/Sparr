import { pool } from '../config/db';
import { InteractionsCountMetric } from './InteractionsCountMetric';
import { StreakDaysMetric } from './StreakDaysMetric';
import { WorkoutsCompletedMetric } from './WorkoutsCompletedMetric';
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

export const SkillLevelMetric: MetricDefinition = {
  key: 'skill_level',
  name: 'Skill Level',
  unit: 'level',
  /**
   * Computes a composite 0-100 skill level score for a profile.
   *
   * Weighting:
   * - Workouts completed: 50 points (primary driver, cap at 150 workouts)
   * - Interactions count: 25 points (cap at 50 interactions)
   * - Techniques learned: 15 points (cap at 40 techniques)
   * - Streak days: 10 points (cap at 20 days)
   *
   * Edge cases:
   * - New user (0 workouts) => 0
   * - 50 workouts, 20 interactions => ~40
   * - 100 workouts, 35 interactions => ~70
   * - 220+ workouts, 50+ interactions => ~90-100
   * - Values above caps still return 100
   */
  compute: async (profileId, context) => {
    const { rows } = await pool.query(
      `SELECT COUNT(DISTINCT tc.id_techniques) AS unique_techniques
       FROM workout_completions wc
       JOIN trainings t ON wc.training_id = t.id_trainings
       JOIN trainings_components tc ON t.id_trainings = tc.id_trainings
       WHERE wc.profile_id = $1`,
      [profileId]
    );

    const uniqueTechniques = Number(rows[0]?.unique_techniques ?? 0);
    const interactionsCount = await resolveMetricValue('interactions_count', context, () =>
      InteractionsCountMetric.compute(profileId)
    );
    const workoutsCompleted = await resolveMetricValue('workouts_completed', context, () =>
      WorkoutsCompletedMetric.compute(profileId)
    );
    const streakDays = await resolveMetricValue('streak_days', context, () => StreakDaysMetric.compute(profileId));

    // If no workouts, skill is 0 (new user edge case)
    if (workoutsCompleted === 0) {
      return 0;
    }

    const workoutsComponent = Math.min(workoutsCompleted / 150, 1) * 50;
    const interactionsComponent = Math.min(interactionsCount / 50, 1) * 25;
    const techniquesComponent = Math.min(uniqueTechniques / 40, 1) * 15;
    const streakComponent = Math.min(streakDays / 20, 1) * 10;

    const skillLevel = Math.round(workoutsComponent + interactionsComponent + techniquesComponent + streakComponent);
    return Math.min(skillLevel, 100);
  },
  validate: (value) => Number.isInteger(value) && value >= 0 && value <= 100,
};
