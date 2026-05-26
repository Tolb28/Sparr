-- Lightweight PostgreSQL migration for Clubs + Gamification features

-- 1) Clubs table extensions
ALTER TABLE public.clubs
  ADD COLUMN IF NOT EXISTS join_policy character varying DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS created_by_profile_id bigint,
  ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS cover_path character varying;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'clubs'
      AND constraint_name = 'clubs_created_by_profile_id_fkey'
  ) THEN
    ALTER TABLE public.clubs
      ADD CONSTRAINT clubs_created_by_profile_id_fkey
      FOREIGN KEY (created_by_profile_id) REFERENCES public.profiles(id_profiles);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_clubs_title ON public.clubs(title);
CREATE INDEX IF NOT EXISTS idx_clubs_location ON public.clubs(location);

-- 2) Club join requests
CREATE TABLE IF NOT EXISTS public.club_join_requests (
  id_club_join_requests bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  club_id integer NOT NULL REFERENCES public.clubs(idclubs) ON DELETE CASCADE,
  profile_id bigint NOT NULL REFERENCES public.profiles(id_profiles) ON DELETE CASCADE,
  status character varying NOT NULL DEFAULT 'pending',
  reviewed_by bigint REFERENCES public.profiles(id_profiles),
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT club_join_requests_status_check CHECK (status IN ('pending','approved','rejected','cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_cjr_club_status ON public.club_join_requests(club_id, status);
CREATE INDEX IF NOT EXISTS idx_cjr_profile_status ON public.club_join_requests(profile_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS uq_cjr_pending_per_pair
  ON public.club_join_requests(club_id, profile_id)
  WHERE status = 'pending';

-- 3) Club trainings
CREATE TABLE IF NOT EXISTS public.club_trainings (
  id_club_trainings bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  club_id integer NOT NULL REFERENCES public.clubs(idclubs) ON DELETE CASCADE,
  id_trainings integer REFERENCES public.trainings(id_trainings) ON DELETE SET NULL,
  title character varying NOT NULL,
  description text,
  starts_at timestamp without time zone NOT NULL,
  ends_at timestamp without time zone,
  coach_profile_id bigint REFERENCES public.profiles(id_profiles),
  capacity integer,
  location_text character varying,
  created_by_profile_id bigint REFERENCES public.profiles(id_profiles),
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_club_trainings_club_starts_at ON public.club_trainings(club_id, starts_at);

-- 4) Gamification rules and snapshots
CREATE TABLE IF NOT EXISTS public.badge_rules (
  id_badge_rules bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  badge_id integer NOT NULL REFERENCES public.badges(id_badges) ON DELETE CASCADE,
  metric_key character varying NOT NULL,
  threshold integer NOT NULL,
  rule_window character varying DEFAULT 'lifetime',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_badge_rules_metric_active ON public.badge_rules(metric_key, is_active);

CREATE TABLE IF NOT EXISTS public.profile_progress_snapshots (
  id_profile_progress_snapshots bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  profile_id bigint NOT NULL REFERENCES public.profiles(id_profiles) ON DELETE CASCADE,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  workouts_completed integer NOT NULL DEFAULT 0,
  club_sessions integer NOT NULL DEFAULT 0,
  streak_days integer NOT NULL DEFAULT 0,
  interactions_count integer NOT NULL DEFAULT 0,
  score integer NOT NULL DEFAULT 0,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT uq_profile_progress_daily UNIQUE (profile_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_progress_profile_date ON public.profile_progress_snapshots(profile_id, snapshot_date);

-- 5) Optional enrichment for earned badges
ALTER TABLE public.profiles_badges
  ADD COLUMN IF NOT EXISTS awarded_at timestamp without time zone DEFAULT now(),
  ADD COLUMN IF NOT EXISTS awarded_reason character varying;
