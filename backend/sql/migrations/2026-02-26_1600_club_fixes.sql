-- Fix: ensure the partial unique index used by createJoinRequest() exists.
-- The index was declared in 2026-02-18_1200_clubs_gamification.sql but may not
-- have been applied to the live database, causing ON CONFLICT to fail at runtime.

CREATE UNIQUE INDEX IF NOT EXISTS uq_cjr_pending_per_pair
  ON public.club_join_requests(club_id, profile_id)
  WHERE status = 'pending';

-- Add event_type to club_trainings (for special events like "Cross Club Sparring").
ALTER TABLE public.club_trainings
  ADD COLUMN IF NOT EXISTS event_type CHARACTER VARYING NOT NULL DEFAULT 'training';
