/**
 * Reusable SQL fragments shared across metric queries.
 */

/**
 * Effective training duration in seconds for a `workout_completions wc` row.
 *
 * Many completions are logged without a timer value (`duration_seconds IS NULL`),
 * which would otherwise make every hours metric read 0. When the logged duration is
 * missing we fall back to the training's *estimated* duration, derived from its
 * components the same way `trainingService` computes `estimated_duration_seconds`.
 *
 * The referencing query MUST alias the completions table as `wc`.
 */
export const EFFECTIVE_DURATION_SECONDS = `COALESCE(
  wc.duration_seconds,
  (SELECT COALESCE(SUM(
            CASE
              WHEN tc.length IS NOT NULL AND tc.length > 0 THEN tc.length * COALESCE(tc.sets, 1)
              WHEN tc.reps   IS NOT NULL AND tc.reps   > 0 THEN COALESCE(tc.sets, 1) * tc.reps * 3
              ELSE 0
            END), 0)
     FROM trainings_components tc
     WHERE tc.id_trainings = wc.training_id),
  0)`;
