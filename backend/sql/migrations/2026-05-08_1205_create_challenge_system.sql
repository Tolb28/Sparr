-- Challenge system schema for calendar challenges + badge rewards

CREATE TABLE IF NOT EXISTS public.challenge_catalog (
  id_challenges bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  slug character varying NOT NULL,
  title character varying NOT NULL,
  description text,
  difficulty character varying NOT NULL DEFAULT 'beginner'::character varying
    CHECK (difficulty IN ('beginner', 'intermediate', 'advanced', 'elite')),
  visibility character varying NOT NULL DEFAULT 'public'::character varying
    CHECK (visibility IN ('public', 'private')),
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT challenge_catalog_pkey PRIMARY KEY (id_challenges)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_challenge_catalog_slug
  ON public.challenge_catalog (slug);

CREATE INDEX IF NOT EXISTS idx_challenge_catalog_active_sort
  ON public.challenge_catalog (is_active, sort_order, id_challenges);

CREATE TABLE IF NOT EXISTS public.challenge_requirements (
  id_challenge_requirements bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  challenge_id bigint NOT NULL REFERENCES public.challenge_catalog(id_challenges) ON DELETE CASCADE,
  requirement_key character varying NOT NULL,
  title character varying NOT NULL,
  unit character varying NOT NULL,
  target_value integer NOT NULL CHECK (target_value > 0),
  progress_source character varying NOT NULL DEFAULT 'manual'::character varying
    CHECK (progress_source IN ('manual', 'auto')),
  auto_metric_key character varying,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT challenge_requirements_pkey PRIMARY KEY (id_challenge_requirements),
  CONSTRAINT challenge_requirements_auto_metric_check CHECK (
    (progress_source = 'auto' AND auto_metric_key IS NOT NULL)
    OR progress_source = 'manual'
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_challenge_requirement_key
  ON public.challenge_requirements (challenge_id, requirement_key);

CREATE INDEX IF NOT EXISTS idx_challenge_requirements_active
  ON public.challenge_requirements (challenge_id, is_active, sort_order);

CREATE TABLE IF NOT EXISTS public.profile_challenges (
  id_profile_challenges bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  profile_id bigint NOT NULL REFERENCES public.profiles(id_profiles) ON DELETE CASCADE,
  challenge_id bigint NOT NULL REFERENCES public.challenge_catalog(id_challenges) ON DELETE CASCADE,
  status character varying NOT NULL DEFAULT 'in_progress'::character varying
    CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  started_at timestamp without time zone NOT NULL DEFAULT now(),
  completed_at timestamp without time zone,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT profile_challenges_pkey PRIMARY KEY (id_profile_challenges),
  CONSTRAINT uq_profile_challenges UNIQUE (profile_id, challenge_id)
);

CREATE INDEX IF NOT EXISTS idx_profile_challenges_profile_status
  ON public.profile_challenges (profile_id, status, challenge_id);

CREATE TABLE IF NOT EXISTS public.profile_challenge_progress (
  id_profile_challenge_progress bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  profile_challenge_id bigint NOT NULL REFERENCES public.profile_challenges(id_profile_challenges) ON DELETE CASCADE,
  challenge_requirement_id bigint NOT NULL REFERENCES public.challenge_requirements(id_challenge_requirements) ON DELETE CASCADE,
  progress_value integer NOT NULL DEFAULT 0 CHECK (progress_value >= 0),
  source character varying NOT NULL DEFAULT 'manual'::character varying
    CHECK (source IN ('manual', 'auto')),
  last_logged_at timestamp without time zone NOT NULL DEFAULT now(),
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT profile_challenge_progress_pkey PRIMARY KEY (id_profile_challenge_progress),
  CONSTRAINT uq_profile_challenge_requirement UNIQUE (profile_challenge_id, challenge_requirement_id)
);

CREATE INDEX IF NOT EXISTS idx_profile_challenge_progress_profile
  ON public.profile_challenge_progress (profile_challenge_id, challenge_requirement_id);

CREATE TABLE IF NOT EXISTS public.challenge_badges (
  id_challenge_badges bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  challenge_id bigint NOT NULL REFERENCES public.challenge_catalog(id_challenges) ON DELETE CASCADE,
  badge_id integer NOT NULL REFERENCES public.badges(id_badges) ON DELETE CASCADE,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT challenge_badges_pkey PRIMARY KEY (id_challenge_badges),
  CONSTRAINT uq_challenge_badges_challenge UNIQUE (challenge_id),
  CONSTRAINT uq_challenge_badges_badge UNIQUE (badge_id)
);

