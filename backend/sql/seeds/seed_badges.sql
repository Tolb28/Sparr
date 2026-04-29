-- =============================================================
-- Seed: Badges & Badge Rules
-- Run this in the Supabase SQL editor to populate all badges.
-- Safe to re-run — uses ON CONFLICT DO NOTHING everywhere.
-- =============================================================

-- Helper: ensure icon_name and color columns exist on badges
ALTER TABLE public.badges
  ADD COLUMN IF NOT EXISTS icon_name character varying DEFAULT 'medal-outline',
  ADD COLUMN IF NOT EXISTS color character varying DEFAULT '#f20d0d';

-- =============================================================
-- 1. Insert badges
-- =============================================================
INSERT INTO badges (title, description, icon_path, icon_name, color) VALUES
  -- Workout milestones
  ('First Blood',      'Complete your first workout',                          '/badges/workouts_completed.png', 'fitness-outline',         '#f20d0d'),
  ('Getting Started',  'Complete 10 workouts',                                 '/badges/workouts_completed.png', 'barbell-outline',         '#f59e0b'),
  ('Heavy Hitter',     'Complete 50 workouts',                                 '/badges/workouts_completed.png', 'flash-outline',           '#8b5cf6'),
  ('Iron Will',        'Complete 100 workouts',                                '/badges/workouts_completed.png', 'shield-checkmark-outline','#06b6d4'),
  ('Centurion',        'Complete 200 workouts',                                '/badges/workouts_completed.png', 'trophy-outline',          '#eab308'),
  -- Streak milestones
  ('On Fire',          'Maintain a 3-day training streak',                     '/badges/streak_days.png',        'flame-outline',           '#f97316'),
  ('7-Day Streak',     'Maintain a 7-day training streak',                     '/badges/streak_days.png',        'flame-outline',           '#ef4444'),
  ('30-Day Streak',    'Maintain a 30-day training streak',                    '/badges/streak_days.png',        'bonfire-outline',         '#dc2626'),
  -- Club — joining
  ('Gym Rat',          'Join your first club',                                 '/badges/clubs_joined.png',       'home-outline',            '#3b82f6'),
  ('Club Hopper',      'Join 3 clubs',                                         '/badges/clubs_joined.png',       'business-outline',        '#6366f1'),
  -- Club — sessions
  ('Club Regular',     'Attend 5 club sessions',                               '/badges/club_sessions.png',      'people-outline',          '#3b82f6'),
  ('Sparring Pro',     'Attend 25 club sessions',                              '/badges/club_sessions.png',      'shield-outline',          '#2563eb'),
  -- Social — interactions
  ('First Like',       'Make your first interaction (like or comment)',         '/badges/interactions_count.png', 'heart-outline',           '#f43f5e'),
  ('Community Voice',  'Make 10 interactions',                                 '/badges/interactions_count.png', 'chatbubbles-outline',     '#22c55e'),
  ('Ring Leader',      'Make 50 interactions',                                 '/badges/interactions_count.png', 'megaphone-outline',       '#10b981'),
  -- Social — posts
  ('First Post',       'Create your first post',                               '/badges/posts_created.png',      'create-outline',          '#a855f7'),
  ('Content Creator',  'Create 10 posts',                                      '/badges/posts_created.png',      'newspaper-outline',       '#7c3aed'),
  ('Storyteller',      'Create 25 posts',                                      '/badges/posts_created.png',      'albums-outline',          '#6d28d9'),
  -- Social — friends
  ('First Corner',     'Make your first friend',                               '/badges/friends_count.png',      'person-add-outline',      '#14b8a6'),
  ('Squad Goals',      'Have 5 friends',                                       '/badges/friends_count.png',      'people-outline',          '#0d9488'),
  ('Networking Pro',   'Have 20 friends',                                      '/badges/friends_count.png',      'globe-outline',           '#059669')
ON CONFLICT DO NOTHING;

-- =============================================================
-- 2. Insert badge_rules (one per badge, linking metric + threshold)
-- =============================================================
-- We use a CTE to resolve badge IDs by title so this works on any DB.
DO $$
DECLARE
  _badge_id integer;
BEGIN
  -- Workout milestones
  SELECT id_badges INTO _badge_id FROM badges WHERE title = 'First Blood' LIMIT 1;
  IF _badge_id IS NOT NULL THEN
    INSERT INTO badge_rules (badge_id, metric_key, threshold, rule_window, is_active)
    VALUES (_badge_id, 'workouts_completed', 1, 'lifetime', true) ON CONFLICT DO NOTHING;
  END IF;

  SELECT id_badges INTO _badge_id FROM badges WHERE title = 'Getting Started' LIMIT 1;
  IF _badge_id IS NOT NULL THEN
    INSERT INTO badge_rules (badge_id, metric_key, threshold, rule_window, is_active)
    VALUES (_badge_id, 'workouts_completed', 10, 'lifetime', true) ON CONFLICT DO NOTHING;
  END IF;

  SELECT id_badges INTO _badge_id FROM badges WHERE title = 'Heavy Hitter' LIMIT 1;
  IF _badge_id IS NOT NULL THEN
    INSERT INTO badge_rules (badge_id, metric_key, threshold, rule_window, is_active)
    VALUES (_badge_id, 'workouts_completed', 50, 'lifetime', true) ON CONFLICT DO NOTHING;
  END IF;

  SELECT id_badges INTO _badge_id FROM badges WHERE title = 'Iron Will' LIMIT 1;
  IF _badge_id IS NOT NULL THEN
    INSERT INTO badge_rules (badge_id, metric_key, threshold, rule_window, is_active)
    VALUES (_badge_id, 'workouts_completed', 100, 'lifetime', true) ON CONFLICT DO NOTHING;
  END IF;

  SELECT id_badges INTO _badge_id FROM badges WHERE title = 'Centurion' LIMIT 1;
  IF _badge_id IS NOT NULL THEN
    INSERT INTO badge_rules (badge_id, metric_key, threshold, rule_window, is_active)
    VALUES (_badge_id, 'workouts_completed', 200, 'lifetime', true) ON CONFLICT DO NOTHING;
  END IF;

  -- Streak milestones
  SELECT id_badges INTO _badge_id FROM badges WHERE title = 'On Fire' LIMIT 1;
  IF _badge_id IS NOT NULL THEN
    INSERT INTO badge_rules (badge_id, metric_key, threshold, rule_window, is_active)
    VALUES (_badge_id, 'streak_days', 3, 'lifetime', true) ON CONFLICT DO NOTHING;
  END IF;

  SELECT id_badges INTO _badge_id FROM badges WHERE title = '7-Day Streak' LIMIT 1;
  IF _badge_id IS NOT NULL THEN
    INSERT INTO badge_rules (badge_id, metric_key, threshold, rule_window, is_active)
    VALUES (_badge_id, 'streak_days', 7, 'lifetime', true) ON CONFLICT DO NOTHING;
  END IF;

  SELECT id_badges INTO _badge_id FROM badges WHERE title = '30-Day Streak' LIMIT 1;
  IF _badge_id IS NOT NULL THEN
    INSERT INTO badge_rules (badge_id, metric_key, threshold, rule_window, is_active)
    VALUES (_badge_id, 'streak_days', 30, 'lifetime', true) ON CONFLICT DO NOTHING;
  END IF;

  -- Club — joining
  SELECT id_badges INTO _badge_id FROM badges WHERE title = 'Gym Rat' LIMIT 1;
  IF _badge_id IS NOT NULL THEN
    INSERT INTO badge_rules (badge_id, metric_key, threshold, rule_window, is_active)
    VALUES (_badge_id, 'clubs_joined', 1, 'lifetime', true) ON CONFLICT DO NOTHING;
  END IF;

  SELECT id_badges INTO _badge_id FROM badges WHERE title = 'Club Hopper' LIMIT 1;
  IF _badge_id IS NOT NULL THEN
    INSERT INTO badge_rules (badge_id, metric_key, threshold, rule_window, is_active)
    VALUES (_badge_id, 'clubs_joined', 3, 'lifetime', true) ON CONFLICT DO NOTHING;
  END IF;

  -- Club — sessions
  SELECT id_badges INTO _badge_id FROM badges WHERE title = 'Club Regular' LIMIT 1;
  IF _badge_id IS NOT NULL THEN
    INSERT INTO badge_rules (badge_id, metric_key, threshold, rule_window, is_active)
    VALUES (_badge_id, 'club_sessions', 5, 'lifetime', true) ON CONFLICT DO NOTHING;
  END IF;

  SELECT id_badges INTO _badge_id FROM badges WHERE title = 'Sparring Pro' LIMIT 1;
  IF _badge_id IS NOT NULL THEN
    INSERT INTO badge_rules (badge_id, metric_key, threshold, rule_window, is_active)
    VALUES (_badge_id, 'club_sessions', 25, 'lifetime', true) ON CONFLICT DO NOTHING;
  END IF;

  -- Social — interactions
  SELECT id_badges INTO _badge_id FROM badges WHERE title = 'First Like' LIMIT 1;
  IF _badge_id IS NOT NULL THEN
    INSERT INTO badge_rules (badge_id, metric_key, threshold, rule_window, is_active)
    VALUES (_badge_id, 'interactions_count', 1, 'lifetime', true) ON CONFLICT DO NOTHING;
  END IF;

  SELECT id_badges INTO _badge_id FROM badges WHERE title = 'Community Voice' LIMIT 1;
  IF _badge_id IS NOT NULL THEN
    INSERT INTO badge_rules (badge_id, metric_key, threshold, rule_window, is_active)
    VALUES (_badge_id, 'interactions_count', 10, 'lifetime', true) ON CONFLICT DO NOTHING;
  END IF;

  SELECT id_badges INTO _badge_id FROM badges WHERE title = 'Ring Leader' LIMIT 1;
  IF _badge_id IS NOT NULL THEN
    INSERT INTO badge_rules (badge_id, metric_key, threshold, rule_window, is_active)
    VALUES (_badge_id, 'interactions_count', 50, 'lifetime', true) ON CONFLICT DO NOTHING;
  END IF;

  -- Social — posts
  SELECT id_badges INTO _badge_id FROM badges WHERE title = 'First Post' LIMIT 1;
  IF _badge_id IS NOT NULL THEN
    INSERT INTO badge_rules (badge_id, metric_key, threshold, rule_window, is_active)
    VALUES (_badge_id, 'posts_created', 1, 'lifetime', true) ON CONFLICT DO NOTHING;
  END IF;

  SELECT id_badges INTO _badge_id FROM badges WHERE title = 'Content Creator' LIMIT 1;
  IF _badge_id IS NOT NULL THEN
    INSERT INTO badge_rules (badge_id, metric_key, threshold, rule_window, is_active)
    VALUES (_badge_id, 'posts_created', 10, 'lifetime', true) ON CONFLICT DO NOTHING;
  END IF;

  SELECT id_badges INTO _badge_id FROM badges WHERE title = 'Storyteller' LIMIT 1;
  IF _badge_id IS NOT NULL THEN
    INSERT INTO badge_rules (badge_id, metric_key, threshold, rule_window, is_active)
    VALUES (_badge_id, 'posts_created', 25, 'lifetime', true) ON CONFLICT DO NOTHING;
  END IF;

  -- Social — friends
  SELECT id_badges INTO _badge_id FROM badges WHERE title = 'First Corner' LIMIT 1;
  IF _badge_id IS NOT NULL THEN
    INSERT INTO badge_rules (badge_id, metric_key, threshold, rule_window, is_active)
    VALUES (_badge_id, 'friends_count', 1, 'lifetime', true) ON CONFLICT DO NOTHING;
  END IF;

  SELECT id_badges INTO _badge_id FROM badges WHERE title = 'Squad Goals' LIMIT 1;
  IF _badge_id IS NOT NULL THEN
    INSERT INTO badge_rules (badge_id, metric_key, threshold, rule_window, is_active)
    VALUES (_badge_id, 'friends_count', 5, 'lifetime', true) ON CONFLICT DO NOTHING;
  END IF;

  SELECT id_badges INTO _badge_id FROM badges WHERE title = 'Networking Pro' LIMIT 1;
  IF _badge_id IS NOT NULL THEN
    INSERT INTO badge_rules (badge_id, metric_key, threshold, rule_window, is_active)
    VALUES (_badge_id, 'friends_count', 20, 'lifetime', true) ON CONFLICT DO NOTHING;
  END IF;
END $$;
