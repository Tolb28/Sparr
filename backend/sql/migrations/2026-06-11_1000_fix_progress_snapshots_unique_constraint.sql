-- Fix: profile_progress_snapshots is missing UNIQUE (profile_id, snapshot_date)
-- The ON CONFLICT upsert in recalculateProfileGamification requires this constraint.
-- If duplicate rows exist, keep only the most recently updated row per (profile_id, snapshot_date).

DELETE FROM public.profile_progress_snapshots
WHERE id_profile_progress_snapshots NOT IN (
  SELECT DISTINCT ON (profile_id, snapshot_date)
    id_profile_progress_snapshots
  FROM public.profile_progress_snapshots
  ORDER BY profile_id, snapshot_date, updated_at DESC
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_profile_progress_daily'
      AND conrelid = 'public.profile_progress_snapshots'::regclass
  ) THEN
    ALTER TABLE public.profile_progress_snapshots
      ADD CONSTRAINT uq_profile_progress_daily UNIQUE (profile_id, snapshot_date);
  END IF;
END $$;
