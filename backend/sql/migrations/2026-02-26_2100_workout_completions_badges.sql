-- Migration: Add workout_completions table and badge visual fields
-- Apply against production database

-- 1. workout_completions: logs each time a user finishes a training
CREATE TABLE IF NOT EXISTS public.workout_completions (
  id_workout_completions bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  profile_id bigint NOT NULL,
  training_id integer,
  completed_at timestamp without time zone NOT NULL DEFAULT now(),
  duration_seconds integer,
  CONSTRAINT workout_completions_pkey PRIMARY KEY (id_workout_completions),
  CONSTRAINT workout_completions_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id_profiles),
  CONSTRAINT workout_completions_training_id_fkey FOREIGN KEY (training_id) REFERENCES public.trainings(id_trainings)
);

CREATE INDEX IF NOT EXISTS idx_workout_completions_profile_date
  ON public.workout_completions (profile_id, completed_at DESC);

-- 2. Add icon_name and color columns to badges for visual display
ALTER TABLE public.badges
  ADD COLUMN IF NOT EXISTS icon_name character varying DEFAULT 'medal-outline',
  ADD COLUMN IF NOT EXISTS color character varying DEFAULT '#f20d0d';
