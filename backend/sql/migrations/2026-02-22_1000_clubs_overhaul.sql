-- =====================================================================
-- Migration: Clubs Overhaul
-- Date: 2026-02-22
-- Description:
--   1. Add is_club_profile flag to profiles
--   2. Add club_profile_id FK on clubs
--   3. Add social link columns to clubs (instagram_url, website_url)
--   4. Performance indexes
--   5. Backfill: create a club profile row for each existing club
-- =====================================================================

-- -----------------------------------------------------------------------
-- 1. profiles: add is_club_profile flag
-- -----------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_club_profile BOOLEAN NOT NULL DEFAULT false;

-- -----------------------------------------------------------------------
-- 2. clubs: add club_profile_id FK
-- -----------------------------------------------------------------------
ALTER TABLE public.clubs
  ADD COLUMN IF NOT EXISTS club_profile_id BIGINT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name   = 'clubs'
      AND constraint_name = 'clubs_club_profile_id_fkey'
  ) THEN
    ALTER TABLE public.clubs
      ADD CONSTRAINT clubs_club_profile_id_fkey
      FOREIGN KEY (club_profile_id) REFERENCES public.profiles(id_profiles);
  END IF;
END $$;

-- -----------------------------------------------------------------------
-- 3. clubs: social links
-- -----------------------------------------------------------------------
ALTER TABLE public.clubs
  ADD COLUMN IF NOT EXISTS instagram_url CHARACTER VARYING,
  ADD COLUMN IF NOT EXISTS website_url   CHARACTER VARYING;

-- -----------------------------------------------------------------------
-- 4. Performance indexes
--    (uq_cjr_pending_per_pair already created in previous migration)
-- -----------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_clubs_club_profile_id
  ON public.clubs (club_profile_id);

CREATE INDEX IF NOT EXISTS idx_profiles_is_club_profile
  ON public.profiles (is_club_profile)
  WHERE is_club_profile = true;

-- Speeds up "get posts by club profile" in global feed
CREATE INDEX IF NOT EXISTS idx_profiles_posts_profile
  ON public.profiles_posts (profiles_id_profiles);

-- club_trainings already has idx_club_trainings_club_starts_at from prev migration

-- -----------------------------------------------------------------------
-- 5. Backfill: create a club profile for each existing club
--    Uses the club creator's user_id (multi-profile is already supported).
--    username format: club_<idclubs>  (guaranteed unique)
-- -----------------------------------------------------------------------
DO $$
DECLARE
  rec             RECORD;
  new_profile_id  BIGINT;
  creator_user_id UUID;
  slug            CHARACTER VARYING;
BEGIN
  FOR rec IN
    SELECT c.idclubs, c.title, c.avatar_path, c.cover_path, c.created_by_profile_id
    FROM   public.clubs c
    WHERE  c.club_profile_id IS NULL
      AND  c.created_by_profile_id IS NOT NULL
  LOOP
    SELECT p.user_id
    INTO   creator_user_id
    FROM   public.profiles p
    WHERE  p.id_profiles = rec.created_by_profile_id
    LIMIT  1;

    IF creator_user_id IS NULL THEN
      CONTINUE;
    END IF;

    slug := 'club_' || rec.idclubs::text;

    -- Avoid duplicate slugs if the script is re-run
    IF EXISTS (SELECT 1 FROM public.profiles WHERE username = slug) THEN
      SELECT id_profiles INTO new_profile_id
      FROM   public.profiles
      WHERE  username = slug
      LIMIT  1;
    ELSE
      INSERT INTO public.profiles
        (display_name, username, user_id, is_club_profile, avatar, created_at, updated_at)
      VALUES
        (rec.title, slug, creator_user_id, true, rec.avatar_path, NOW(), NOW())
      RETURNING id_profiles INTO new_profile_id;
    END IF;

    UPDATE public.clubs
    SET    club_profile_id = new_profile_id
    WHERE  idclubs = rec.idclubs;
  END LOOP;
END $$;
