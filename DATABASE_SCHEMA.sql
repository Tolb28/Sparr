-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.badge_rules (
  id_badge_rules bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  badge_id integer NOT NULL,
  metric_key character varying NOT NULL,
  threshold integer NOT NULL,
  rule_window character varying DEFAULT 'lifetime'::character varying,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT badge_rules_pkey PRIMARY KEY (id_badge_rules),
  CONSTRAINT badge_rules_badge_id_fkey FOREIGN KEY (badge_id) REFERENCES public.badges(id_badges)
);
CREATE TABLE public.badges (
  id_badges integer NOT NULL DEFAULT nextval('badges_id_badges_seq'::regclass),
  title character varying NOT NULL,
  description character varying NOT NULL,
  icon_path character varying NOT NULL,
  icon_name character varying DEFAULT 'medal-outline'::character varying,
  color character varying DEFAULT '#f20d0d'::character varying,
  CONSTRAINT badges_pkey PRIMARY KEY (id_badges)
);
CREATE TABLE public.boxing_style (
  id_boxing_style integer NOT NULL DEFAULT nextval('boxing_style_idboxing_style_seq'::regclass),
  title_style character varying NOT NULL,
  description_style character varying,
  CONSTRAINT boxing_style_pkey PRIMARY KEY (id_boxing_style)
);
CREATE TABLE public.category (
  id_category bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name character varying,
  CONSTRAINT category_pkey PRIMARY KEY (id_category)
);
CREATE TABLE public.club_join_requests (
  id_club_join_requests bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  club_id integer NOT NULL,
  profile_id bigint NOT NULL,
  status character varying NOT NULL DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying, 'cancelled'::character varying]::text[])),
  reviewed_by bigint,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT club_join_requests_pkey PRIMARY KEY (id_club_join_requests),
  CONSTRAINT club_join_requests_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(idclubs),
  CONSTRAINT club_join_requests_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id_profiles),
  CONSTRAINT club_join_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id_profiles)
);
CREATE TABLE public.club_roles (
  idclub_roles integer NOT NULL DEFAULT nextval('club_roles_idclub_roles_seq'::regclass),
  title character varying NOT NULL,
  description character varying,
  CONSTRAINT club_roles_pkey PRIMARY KEY (idclub_roles)
);
CREATE TABLE public.club_trainings (
  id_club_trainings bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  club_id integer NOT NULL,
  id_trainings integer,
  title character varying NOT NULL,
  description text,
  starts_at timestamp without time zone NOT NULL,
  ends_at timestamp without time zone,
  coach_profile_id bigint,
  capacity integer,
  location_text character varying,
  created_by_profile_id bigint,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  event_type character varying NOT NULL DEFAULT 'training'::character varying,
  CONSTRAINT club_trainings_pkey PRIMARY KEY (id_club_trainings),
  CONSTRAINT club_trainings_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(idclubs),
  CONSTRAINT club_trainings_id_trainings_fkey FOREIGN KEY (id_trainings) REFERENCES public.trainings(id_trainings),
  CONSTRAINT club_trainings_coach_profile_id_fkey FOREIGN KEY (coach_profile_id) REFERENCES public.profiles(id_profiles),
  CONSTRAINT club_trainings_created_by_profile_id_fkey FOREIGN KEY (created_by_profile_id) REFERENCES public.profiles(id_profiles)
);
CREATE TABLE public.clubs (
  idclubs integer NOT NULL DEFAULT nextval('clubs_idclubs_seq'::regclass),
  title character varying NOT NULL,
  bio character varying,
  avatar_path character varying,
  created_at timestamp without time zone NOT NULL,
  updated_at timestamp without time zone,
  location character varying,
  join_policy character varying DEFAULT 'open'::character varying,
  created_by_profile_id bigint,
  is_verified boolean DEFAULT false,
  cover_path character varying,
  club_profile_id bigint,
  instagram_url character varying,
  website_url character varying,
  CONSTRAINT clubs_pkey PRIMARY KEY (idclubs),
  CONSTRAINT clubs_created_by_profile_id_fkey FOREIGN KEY (created_by_profile_id) REFERENCES public.profiles(id_profiles),
  CONSTRAINT clubs_club_profile_id_fkey FOREIGN KEY (club_profile_id) REFERENCES public.profiles(id_profiles)
);
CREATE TABLE public.combinations (
  id_combinations integer NOT NULL DEFAULT nextval('combinations_id_combinations_seq'::regclass),
  title character varying NOT NULL,
  description character varying,
  source character varying,
  category_id_category bigint,
  CONSTRAINT combinations_pkey PRIMARY KEY (id_combinations),
  CONSTRAINT combinations_category_id_category_fkey FOREIGN KEY (category_id_category) REFERENCES public.category(id_category)
);
CREATE TABLE public.combinations_techniques (
  combinations_id_combinations integer NOT NULL,
  techniques_id_techniques integer NOT NULL,
  CONSTRAINT combinations_techniques_pkey PRIMARY KEY (combinations_id_combinations, techniques_id_techniques),
  CONSTRAINT combinations_techniques_combinations_id_combinations_fkey FOREIGN KEY (combinations_id_combinations) REFERENCES public.combinations(id_combinations),
  CONSTRAINT combinations_techniques_techniques_id_techniques_fkey FOREIGN KEY (techniques_id_techniques) REFERENCES public.techniques(id_techniques)
);
CREATE TABLE public.comments (
  id_comments integer NOT NULL DEFAULT nextval('comments_id_comments_seq'::regclass),
  posts_id_posts integer NOT NULL,
  id_profile integer NOT NULL,
  content text NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT comments_pkey PRIMARY KEY (id_comments),
  CONSTRAINT comments_posts_id_posts_fkey FOREIGN KEY (posts_id_posts) REFERENCES public.posts(id_posts),
  CONSTRAINT comments_id_profile_fkey FOREIGN KEY (id_profile) REFERENCES public.profiles(id_profiles)
);
CREATE TABLE public.conversations (
  id_conversations integer NOT NULL DEFAULT nextval('conversations_id_conversations_seq'::regclass),
  is_group smallint,
  title character varying,
  created_at timestamp without time zone NOT NULL,
  CONSTRAINT conversations_pkey PRIMARY KEY (id_conversations)
);
CREATE TABLE public.conversations_profiles (
  conversations_id_conversations integer NOT NULL,
  profiles_id_profiles integer NOT NULL,
  joined_at timestamp without time zone NOT NULL,
  id_last_read integer,
  CONSTRAINT conversations_profiles_pkey PRIMARY KEY (conversations_id_conversations, profiles_id_profiles),
  CONSTRAINT conversations_profiles_conversations_id_conversations_fkey FOREIGN KEY (conversations_id_conversations) REFERENCES public.conversations(id_conversations),
  CONSTRAINT conversations_profiles_id_last_read_fkey FOREIGN KEY (id_last_read) REFERENCES public.messages(id_messages),
  CONSTRAINT conversations_profiles_profiles_id_profiles_fkey FOREIGN KEY (profiles_id_profiles) REFERENCES public.profiles(id_profiles)
);
CREATE TABLE public.drills (
  id_drills integer NOT NULL DEFAULT nextval('drills_id_drills_seq'::regclass),
  title character varying NOT NULL,
  description text,
  source character varying,
  category_id_category bigint,
  CONSTRAINT drills_pkey PRIMARY KEY (id_drills),
  CONSTRAINT drills_category_id_category_fkey FOREIGN KEY (category_id_category) REFERENCES public.category(id_category)
);
CREATE TABLE public.friends (
  profiles_id_profiles integer NOT NULL,
  id_friend integer NOT NULL,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  status USER-DEFINED,
  updated_at timestamp without time zone,
  CONSTRAINT friends_pkey PRIMARY KEY (profiles_id_profiles, id_friend),
  CONSTRAINT friends_profiles_id_profiles_fkey FOREIGN KEY (profiles_id_profiles) REFERENCES public.profiles(id_profiles),
  CONSTRAINT friends_id_friend_fkey FOREIGN KEY (id_friend) REFERENCES public.profiles(id_profiles)
);
CREATE TABLE public.hashtag (
  id_hashtag integer NOT NULL DEFAULT nextval('hashtag_id_hashtag_seq'::regclass),
  title character varying NOT NULL,
  CONSTRAINT hashtag_pkey PRIMARY KEY (id_hashtag)
);
CREATE TABLE public.interaction_type (
  id_interaction_type integer NOT NULL DEFAULT nextval('interaction_type_id_interaction_type_seq'::regclass),
  title character varying NOT NULL,
  img_path character varying,
  CONSTRAINT interaction_type_pkey PRIMARY KEY (id_interaction_type)
);
CREATE TABLE public.interactions (
  posts_id_posts integer,
  profiles_id_profiles integer NOT NULL,
  interaction_type_idinteraction_type integer NOT NULL,
  comments_id_comments integer,
  id_interactions bigint GENERATED ALWAYS AS IDENTITY NOT NULL UNIQUE,
  CONSTRAINT interactions_pkey PRIMARY KEY (id_interactions),
  CONSTRAINT interactions_duplicate_comments_id_comments_fkey FOREIGN KEY (comments_id_comments) REFERENCES public.comments(id_comments),
  CONSTRAINT interactions_duplicate_interaction_type_idinteraction_type_fkey FOREIGN KEY (interaction_type_idinteraction_type) REFERENCES public.interaction_type(id_interaction_type),
  CONSTRAINT interactions_duplicate_posts_id_posts_fkey FOREIGN KEY (posts_id_posts) REFERENCES public.posts(id_posts),
  CONSTRAINT interactions_duplicate_profiles_id_profiles_fkey FOREIGN KEY (profiles_id_profiles) REFERENCES public.profiles(id_profiles)
);
CREATE TABLE public.messages (
  id_messages integer NOT NULL DEFAULT nextval('messages_id_messages_seq'::regclass),
  content text NOT NULL,
  attachments_path character varying,
  created_at timestamp without time zone NOT NULL,
  edited_at timestamp without time zone,
  id_sender integer NOT NULL,
  conversations_id_conversations integer NOT NULL,
  source character varying,
  CONSTRAINT messages_pkey PRIMARY KEY (id_messages),
  CONSTRAINT messages_conversations_id_conversations_fkey FOREIGN KEY (conversations_id_conversations) REFERENCES public.conversations(id_conversations),
  CONSTRAINT messages_id_sender_fkey FOREIGN KEY (id_sender) REFERENCES public.profiles(id_profiles)
);
CREATE TABLE public.posts (
  id_posts integer NOT NULL DEFAULT nextval('posts_id_posts_seq'::regclass),
  description character varying,
  source character varying,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT posts_pkey PRIMARY KEY (id_posts)
);
CREATE TABLE public.posts_hashtags (
  posts_id_posts integer NOT NULL,
  hashtag_id_hashtag integer NOT NULL,
  CONSTRAINT posts_hashtags_pkey PRIMARY KEY (posts_id_posts, hashtag_id_hashtag),
  CONSTRAINT posts_hashtags_posts_id_posts_fkey FOREIGN KEY (posts_id_posts) REFERENCES public.posts(id_posts),
  CONSTRAINT posts_hashtags_hashtag_id_hashtag_fkey FOREIGN KEY (hashtag_id_hashtag) REFERENCES public.hashtag(id_hashtag)
);
CREATE TABLE public.profile_progress_snapshots (
  id_profile_progress_snapshots bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  profile_id bigint NOT NULL,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  workouts_completed integer NOT NULL DEFAULT 0,
  club_sessions integer NOT NULL DEFAULT 0,
  streak_days integer NOT NULL DEFAULT 0,
  interactions_count integer NOT NULL DEFAULT 0,
  score integer NOT NULL DEFAULT 0,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT profile_progress_snapshots_pkey PRIMARY KEY (id_profile_progress_snapshots),
  CONSTRAINT profile_progress_snapshots_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id_profiles)
);
CREATE TABLE public.profiles (
  id_profiles bigint GENERATED ALWAYS AS IDENTITY NOT NULL UNIQUE,
  weight_class_id_weight_class integer,
  boxing_style_id_boxing_style integer,
  bio character varying,
  avatar character varying,
  display_name character varying NOT NULL,
  username character varying NOT NULL,
  location character varying,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  user_id uuid NOT NULL,
  is_club_profile boolean NOT NULL DEFAULT false,
  CONSTRAINT profiles_pkey PRIMARY KEY (id_profiles),
  CONSTRAINT profiles_weight_class_id_weight_class_fkey FOREIGN KEY (weight_class_id_weight_class) REFERENCES public.weight_class(id_weight_class),
  CONSTRAINT fk_profiles_user FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT profiles_boxing_style_id_boxing_style_fkey FOREIGN KEY (boxing_style_id_boxing_style) REFERENCES public.boxing_style(id_boxing_style)
);
CREATE TABLE public.profiles_badges (
  profiles_id_profiles integer NOT NULL,
  badges_id_badges integer NOT NULL,
  awarded_at timestamp without time zone DEFAULT now(),
  awarded_reason character varying,
  CONSTRAINT profiles_badges_pkey PRIMARY KEY (profiles_id_profiles, badges_id_badges),
  CONSTRAINT profiles_badges_badges_id_badges_fkey FOREIGN KEY (badges_id_badges) REFERENCES public.badges(id_badges),
  CONSTRAINT profiles_badges_profiles_id_profiles_fkey FOREIGN KEY (profiles_id_profiles) REFERENCES public.profiles(id_profiles)
);
CREATE TABLE public.profiles_clubs (
  profiles_id_profiles integer NOT NULL,
  clubs_idclubs integer NOT NULL,
  club_roles_idclub_roles integer NOT NULL,
  joined_at timestamp without time zone NOT NULL,
  role USER-DEFINED NOT NULL,
  CONSTRAINT profiles_clubs_pkey PRIMARY KEY (profiles_id_profiles, clubs_idclubs, club_roles_idclub_roles),
  CONSTRAINT profiles_clubs_clubs_idclubs_fkey FOREIGN KEY (clubs_idclubs) REFERENCES public.clubs(idclubs),
  CONSTRAINT profiles_clubs_club_roles_idclub_roles_fkey FOREIGN KEY (club_roles_idclub_roles) REFERENCES public.club_roles(idclub_roles),
  CONSTRAINT profiles_clubs_profiles_id_profiles_fkey FOREIGN KEY (profiles_id_profiles) REFERENCES public.profiles(id_profiles)
);
CREATE TABLE public.profiles_posts (
  profiles_id_profiles integer NOT NULL,
  posts_id_posts integer NOT NULL,
  CONSTRAINT profiles_posts_pkey PRIMARY KEY (profiles_id_profiles, posts_id_posts),
  CONSTRAINT profiles_posts_posts_id_posts_fkey FOREIGN KEY (posts_id_posts) REFERENCES public.posts(id_posts),
  CONSTRAINT profiles_posts_profiles_id_profiles_fkey FOREIGN KEY (profiles_id_profiles) REFERENCES public.profiles(id_profiles)
);
CREATE TABLE public.profiles_training_calendar (
  profiles_id_profiles integer NOT NULL,
  training_calendar_id_training_calendar integer NOT NULL,
  visibility USER-DEFINED,
  id_profiles_training_calendar bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  CONSTRAINT profiles_training_calendar_pkey PRIMARY KEY (id_profiles_training_calendar),
  CONSTRAINT profiles_training_calendar_training_calendar_id_training_c_fkey FOREIGN KEY (training_calendar_id_training_calendar) REFERENCES public.training_calendar(id_training_calendar),
  CONSTRAINT profiles_training_calendar_profiles_id_profiles_fkey FOREIGN KEY (profiles_id_profiles) REFERENCES public.profiles(id_profiles)
);
CREATE TABLE public.techniques (
  id_techniques integer NOT NULL DEFAULT nextval('techniques_id_techniques_seq'::regclass),
  title character varying NOT NULL,
  description character varying,
  source character varying,
  category_id_category bigint,
  CONSTRAINT techniques_pkey PRIMARY KEY (id_techniques),
  CONSTRAINT techniques_category_id_category_fkey FOREIGN KEY (category_id_category) REFERENCES public.category(id_category)
);
CREATE TABLE public.training_calendar (
  id_training_calendar integer NOT NULL DEFAULT nextval('training_calendar_id_training_calendar_seq'::regclass),
  title character varying NOT NULL,
  id_created_by integer,
  created_at timestamp without time zone DEFAULT now(),
  privacy USER-DEFINED,
  calendar_type character varying NOT NULL DEFAULT 'order'::character varying CHECK (calendar_type::text = ANY (ARRAY['day'::character varying, 'order'::character varying]::text[])),
  num_weeks integer NOT NULL DEFAULT 1 CHECK (num_weeks >= 1),
  order_start_date date,
  CONSTRAINT training_calendar_pkey PRIMARY KEY (id_training_calendar),
  CONSTRAINT training_calendar_id_created_by_fkey FOREIGN KEY (id_created_by) REFERENCES public.profiles(id_profiles)
);
CREATE TABLE public.training_calendar_trainings (
  id_training_calendar integer NOT NULL,
  id_trainings integer,
  order integer,
  icon_name character varying,
  id_training_calendar_trainings bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  week_number integer CHECK (week_number IS NULL OR week_number >= 1),
  day_of_week integer CHECK (day_of_week IS NULL OR day_of_week >= 0 AND day_of_week <= 6),
  start_time time without time zone,
  CONSTRAINT training_calendar_trainings_pkey PRIMARY KEY (id_training_calendar_trainings),
  CONSTRAINT training_calendar_trainings_id_training_calendar_fkey FOREIGN KEY (id_training_calendar) REFERENCES public.training_calendar(id_training_calendar),
  CONSTRAINT training_calendar_trainings_id_trainings_fkey FOREIGN KEY (id_trainings) REFERENCES public.trainings(id_trainings)
);
CREATE TABLE public.trainings (
  id_trainings integer NOT NULL DEFAULT nextval('trainings_id_trainings_seq'::regclass),
  title character varying NOT NULL,
  description character varying,
  CONSTRAINT trainings_pkey PRIMARY KEY (id_trainings)
);
CREATE TABLE public.trainings_components (
  id_trainings_components integer NOT NULL DEFAULT nextval('trainings_components_id_trainings_components_seq'::regclass),
  id_trainings integer NOT NULL,
  id_drills integer,
  id_combinations integer,
  length integer,
  reps integer,
  sets integer,
  id_techniques integer,
  sort_order integer DEFAULT 0,
  CONSTRAINT trainings_components_pkey PRIMARY KEY (id_trainings_components),
  CONSTRAINT trainings_components_id_trainings_fkey FOREIGN KEY (id_trainings) REFERENCES public.trainings(id_trainings),
  CONSTRAINT trainings_components_id_drills_fkey FOREIGN KEY (id_drills) REFERENCES public.drills(id_drills),
  CONSTRAINT trainings_components_id_combinations_fkey FOREIGN KEY (id_combinations) REFERENCES public.combinations(id_combinations),
  CONSTRAINT trainings_components_id_techniques_fkey FOREIGN KEY (id_techniques) REFERENCES public.techniques(id_techniques)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  email character varying NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);
CREATE TABLE public.weight_class (
  id_weight_class integer NOT NULL DEFAULT nextval('weight_class_id_weight_class_seq'::regclass),
  title_weight character varying NOT NULL,
  description_weight character varying NOT NULL,
  CONSTRAINT weight_class_pkey PRIMARY KEY (id_weight_class)
);
CREATE TABLE public.workout_completions (
  id_workout_completions bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  profile_id bigint NOT NULL,
  training_id integer,
  completed_at timestamp without time zone NOT NULL DEFAULT now(),
  duration_seconds integer,
  CONSTRAINT workout_completions_pkey PRIMARY KEY (id_workout_completions),
  CONSTRAINT workout_completions_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id_profiles),
  CONSTRAINT workout_completions_training_id_fkey FOREIGN KEY (training_id) REFERENCES public.trainings(id_trainings)
);