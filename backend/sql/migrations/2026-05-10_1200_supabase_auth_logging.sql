BEGIN;

ALTER TABLE public.users
  ALTER COLUMN password_hash DROP NOT NULL;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS auth_provider character varying NOT NULL DEFAULT 'local',
  ADD COLUMN IF NOT EXISTS google_sub text,
  ADD COLUMN IF NOT EXISTS account_status character varying NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS inaccessible_reason text,
  ADD COLUMN IF NOT EXISTS inaccessible_at timestamp with time zone;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_auth_provider_check'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_auth_provider_check
      CHECK (auth_provider IN ('local', 'google'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_account_status_check'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_account_status_check
      CHECK (account_status IN ('active', 'inaccessible'));
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_sub_unique
  ON public.users (google_sub)
  WHERE google_sub IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.auth_events (
  id_auth_event bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  event_type character varying NOT NULL,
  status character varying NOT NULL,
  provider character varying NOT NULL,
  user_id uuid,
  profile_id bigint,
  request_id character varying,
  ip_address character varying,
  user_agent text,
  message text,
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT auth_events_pkey PRIMARY KEY (id_auth_event),
  CONSTRAINT auth_events_user_fk FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT auth_events_profile_fk FOREIGN KEY (profile_id) REFERENCES public.profiles(id_profiles),
  CONSTRAINT auth_events_status_check CHECK (status IN ('success', 'failure', 'info')),
  CONSTRAINT auth_events_provider_check CHECK (provider IN ('local', 'google', 'supabase'))
);

CREATE INDEX IF NOT EXISTS idx_auth_events_created_at
  ON public.auth_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auth_events_user_id
  ON public.auth_events (user_id);

CREATE INDEX IF NOT EXISTS idx_auth_events_event_type
  ON public.auth_events (event_type);

COMMIT;

