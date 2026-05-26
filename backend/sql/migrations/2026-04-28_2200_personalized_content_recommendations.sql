-- Personalization foundation for training content recommendations
-- Adds profile attributes and content-level recommendation rules

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS experience_level character varying,
  ADD COLUMN IF NOT EXISTS height_cm integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_experience_level_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_experience_level_check
      CHECK (
        experience_level IS NULL
        OR experience_level IN ('beginner', 'intermediate', 'advanced')
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_height_cm_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_height_cm_check
      CHECK (height_cm IS NULL OR (height_cm >= 120 AND height_cm <= 240));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.content_personalization_rules (
  id_content_personalization_rules bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  content_type character varying NOT NULL,
  content_id integer NOT NULL,
  boxing_style_id integer,
  weight_class_id integer,
  min_height_cm integer,
  max_height_cm integer,
  min_experience_level character varying,
  max_experience_level character varying,
  boost_score integer NOT NULL DEFAULT 10,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT content_personalization_rules_pkey PRIMARY KEY (id_content_personalization_rules),
  CONSTRAINT content_personalization_rules_content_type_check CHECK (
    content_type IN ('technique', 'drill', 'combination')
  ),
  CONSTRAINT content_personalization_rules_min_experience_check CHECK (
    min_experience_level IS NULL OR min_experience_level IN ('beginner', 'intermediate', 'advanced')
  ),
  CONSTRAINT content_personalization_rules_max_experience_check CHECK (
    max_experience_level IS NULL OR max_experience_level IN ('beginner', 'intermediate', 'advanced')
  ),
  CONSTRAINT content_personalization_rules_height_bounds_check CHECK (
    (min_height_cm IS NULL OR (min_height_cm >= 120 AND min_height_cm <= 240))
    AND (max_height_cm IS NULL OR (max_height_cm >= 120 AND max_height_cm <= 240))
    AND (min_height_cm IS NULL OR max_height_cm IS NULL OR min_height_cm <= max_height_cm)
  ),
  CONSTRAINT content_personalization_rules_boxing_style_fkey FOREIGN KEY (boxing_style_id)
    REFERENCES public.boxing_style(id_boxing_style),
  CONSTRAINT content_personalization_rules_weight_class_fkey FOREIGN KEY (weight_class_id)
    REFERENCES public.weight_class(id_weight_class)
);

CREATE INDEX IF NOT EXISTS idx_content_personalization_rules_content
  ON public.content_personalization_rules (content_type, content_id, is_active);

CREATE INDEX IF NOT EXISTS idx_profiles_personalization
  ON public.profiles (experience_level, height_cm, boxing_style_id_boxing_style, weight_class_id_weight_class);

