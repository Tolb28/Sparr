-- Seed two quick freebie challenges (manual tracking, small targets)

DO $$
DECLARE
  v_challenge_id bigint;
  v_badge_id integer;
BEGIN
  -- Freebie: 5 Clicks
  INSERT INTO public.challenge_catalog (
    slug, title, description, difficulty, visibility, is_active, sort_order
  ) VALUES (
    'freebie-5-clicks',
    'Freebie: 5 Clicks',
    'A tiny test challenge: log 5 manual clicks to complete.',
    'beginner',
    'public',
    true,
    100
  )
  ON CONFLICT (slug) DO UPDATE
    SET title = EXCLUDED.title,
        description = EXCLUDED.description,
        difficulty = EXCLUDED.difficulty,
        visibility = EXCLUDED.visibility,
        is_active = EXCLUDED.is_active,
        sort_order = EXCLUDED.sort_order,
        updated_at = NOW()
  RETURNING id_challenges INTO v_challenge_id;

  SELECT id_badges INTO v_badge_id FROM public.badges WHERE title = 'Freebie Clicks Badge' LIMIT 1;
  IF v_badge_id IS NULL THEN
    INSERT INTO public.badges (title, description, icon_path, icon_name, color)
    VALUES (
      'Freebie Clicks Badge',
      'Awarded for completing the Freebie clicks challenge.',
      '/badges/freebie-clicks.png',
      'hand-left-outline',
      '#60a5fa'
    )
    RETURNING id_badges INTO v_badge_id;
  END IF;

  INSERT INTO public.challenge_badges (challenge_id, badge_id)
  VALUES (v_challenge_id, v_badge_id)
  ON CONFLICT (challenge_id) DO UPDATE
    SET badge_id = EXCLUDED.badge_id;

  INSERT INTO public.challenge_requirements
    (challenge_id, requirement_key, title, unit, target_value, progress_source, auto_metric_key, sort_order, is_active)
  VALUES
    (v_challenge_id, 'clicks', 'Click the button', 'clicks', 5, 'manual', NULL, 1, true)
  ON CONFLICT (challenge_id, requirement_key) DO UPDATE
    SET title = EXCLUDED.title,
        unit = EXCLUDED.unit,
        target_value = EXCLUDED.target_value,
        progress_source = EXCLUDED.progress_source,
        auto_metric_key = EXCLUDED.auto_metric_key,
        sort_order = EXCLUDED.sort_order,
        is_active = EXCLUDED.is_active,
        updated_at = NOW();

  -- Freebie: 10 Clicks
  INSERT INTO public.challenge_catalog (
    slug, title, description, difficulty, visibility, is_active, sort_order
  ) VALUES (
    'freebie-10-clicks',
    'Freebie: 10 Clicks',
    'A slightly larger freebie: log 10 manual clicks.',
    'beginner',
    'public',
    true,
    101
  )
  ON CONFLICT (slug) DO UPDATE
    SET title = EXCLUDED.title,
        description = EXCLUDED.description,
        difficulty = EXCLUDED.difficulty,
        visibility = EXCLUDED.visibility,
        is_active = EXCLUDED.is_active,
        sort_order = EXCLUDED.sort_order,
        updated_at = NOW()
  RETURNING id_challenges INTO v_challenge_id;

  SELECT id_badges INTO v_badge_id FROM public.badges WHERE title = 'Freebie Clicks Badge (10)' LIMIT 1;
  IF v_badge_id IS NULL THEN
    INSERT INTO public.badges (title, description, icon_path, icon_name, color)
    VALUES (
      'Freebie Clicks Badge (10)',
      'Awarded for completing the 10-click freebie challenge.',
      '/badges/freebie-clicks-10.png',
      'hand-right-outline',
      '#34d399'
    )
    RETURNING id_badges INTO v_badge_id;
  END IF;

  INSERT INTO public.challenge_badges (challenge_id, badge_id)
  VALUES (v_challenge_id, v_badge_id)
  ON CONFLICT (challenge_id) DO UPDATE
    SET badge_id = EXCLUDED.badge_id;

  INSERT INTO public.challenge_requirements
    (challenge_id, requirement_key, title, unit, target_value, progress_source, auto_metric_key, sort_order, is_active)
  VALUES
    (v_challenge_id, 'clicks', 'Click the button', 'clicks', 10, 'manual', NULL, 1, true)
  ON CONFLICT (challenge_id, requirement_key) DO UPDATE
    SET title = EXCLUDED.title,
        unit = EXCLUDED.unit,
        target_value = EXCLUDED.target_value,
        progress_source = EXCLUDED.progress_source,
        auto_metric_key = EXCLUDED.auto_metric_key,
        sort_order = EXCLUDED.sort_order,
        is_active = EXCLUDED.is_active,
        updated_at = NOW();
END $$;
