-- Create user_favorites table for bookmarking content
-- Supports techniques, drills, and combinations

CREATE TABLE public.user_favorites (
  id_user_favorites bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  profile_id bigint NOT NULL,
  content_type character varying NOT NULL CHECK (content_type IN ('technique', 'drill', 'combination')),
  content_id integer NOT NULL,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_favorites_pkey PRIMARY KEY (id_user_favorites),
  CONSTRAINT user_favorites_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id_profiles) ON DELETE CASCADE,
  CONSTRAINT user_favorites_unique_content UNIQUE (profile_id, content_type, content_id)
);

-- Create index for efficient querying by profile_id
CREATE INDEX user_favorites_profile_id_idx ON public.user_favorites(profile_id);

-- Create index for efficient filtering by content_type
CREATE INDEX user_favorites_content_type_idx ON public.user_favorites(content_type);

-- Create composite index for listing user's favorites of a specific type
CREATE INDEX user_favorites_profile_content_type_idx ON public.user_favorites(profile_id, content_type);
