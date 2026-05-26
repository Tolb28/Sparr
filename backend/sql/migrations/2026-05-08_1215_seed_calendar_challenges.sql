-- Seed curated calendar challenges and dedicated challenge badges

DO $$
DECLARE
  v_challenge_id bigint;
  v_badge_id integer;
BEGIN
  -- Mike Tyson challenge
  INSERT INTO public.challenge_catalog (
    slug, title, description, difficulty, visibility, is_active, sort_order
  ) VALUES (
    'mike-tyson-iron-circuit',
    'Mike Tyson Workout Challenge',
    'A legendary high-volume conditioning challenge: complete every target and claim the Tyson badge.',
    'advanced',
    'public',
    true,
    1
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

  SELECT id_badges INTO v_badge_id FROM public.badges WHERE title = 'Tyson Iron Badge' LIMIT 1;
  IF v_badge_id IS NULL THEN
    INSERT INTO public.badges (title, description, icon_path, icon_name, color)
    VALUES (
      'Tyson Iron Badge',
      'Awarded for conquering the Mike Tyson Workout Challenge.',
      '/badges/challenge-tyson-iron.png',
      'flame-outline',
      '#ef4444'
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
    (v_challenge_id, 'squats', 'Squats', 'reps', 2000, 'manual', NULL, 1, true),
    (v_challenge_id, 'situps', 'Sit-ups', 'reps', 2000, 'manual', NULL, 2, true),
    (v_challenge_id, 'pushups', 'Pushups', 'reps', 500, 'manual', NULL, 3, true),
    (v_challenge_id, 'bench_dips', 'Bench Dips', 'reps', 500, 'manual', NULL, 4, true),
    (v_challenge_id, 'barbell_shrugs', 'Barbell Shrugs', 'reps', 500, 'manual', NULL, 5, true),
    (v_challenge_id, 'wrestler_bridges', 'Wrestler Bridges', 'minutes', 20, 'manual', NULL, 6, true)
  ON CONFLICT (challenge_id, requirement_key) DO UPDATE
    SET title = EXCLUDED.title,
        unit = EXCLUDED.unit,
        target_value = EXCLUDED.target_value,
        progress_source = EXCLUDED.progress_source,
        auto_metric_key = EXCLUDED.auto_metric_key,
        sort_order = EXCLUDED.sort_order,
        is_active = EXCLUDED.is_active,
        updated_at = NOW();

  -- Consistency Starter challenge
  INSERT INTO public.challenge_catalog (
    slug, title, description, difficulty, visibility, is_active, sort_order
  ) VALUES (
    'consistency-starter-14',
    'Consistency Starter (14 Sessions)',
    'Build the habit: complete sessions consistently and log your jump-rope volume.',
    'beginner',
    'public',
    true,
    2
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

  SELECT id_badges INTO v_badge_id FROM public.badges WHERE title = 'Consistency Starter Badge' LIMIT 1;
  IF v_badge_id IS NULL THEN
    INSERT INTO public.badges (title, description, icon_path, icon_name, color)
    VALUES (
      'Consistency Starter Badge',
      'Awarded for finishing the Consistency Starter challenge.',
      '/badges/challenge-consistency-starter.png',
      'calendar-outline',
      '#22c55e'
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
    (v_challenge_id, 'sessions_completed', 'Workout Sessions Completed', 'sessions', 14, 'auto', 'workouts_completed', 1, true),
    (v_challenge_id, 'jump_rope_reps', 'Jump Rope', 'reps', 3000, 'manual', NULL, 2, true)
  ON CONFLICT (challenge_id, requirement_key) DO UPDATE
    SET title = EXCLUDED.title,
        unit = EXCLUDED.unit,
        target_value = EXCLUDED.target_value,
        progress_source = EXCLUDED.progress_source,
        auto_metric_key = EXCLUDED.auto_metric_key,
        sort_order = EXCLUDED.sort_order,
        is_active = EXCLUDED.is_active,
        updated_at = NOW();

  -- Roadwork Discipline challenge
  INSERT INTO public.challenge_catalog (
    slug, title, description, difficulty, visibility, is_active, sort_order
  ) VALUES (
    'roadwork-discipline-30',
    'Roadwork Discipline Challenge',
    'Develop fight-ready endurance through consistent roadwork and total training output.',
    'intermediate',
    'public',
    true,
    3
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

  SELECT id_badges INTO v_badge_id FROM public.badges WHERE title = 'Roadwork Discipline Badge' LIMIT 1;
  IF v_badge_id IS NULL THEN
    INSERT INTO public.badges (title, description, icon_path, icon_name, color)
    VALUES (
      'Roadwork Discipline Badge',
      'Awarded for completing the Roadwork Discipline challenge.',
      '/badges/challenge-roadwork-discipline.png',
      'walk-outline',
      '#06b6d4'
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
    (v_challenge_id, 'run_minutes', 'Roadwork Running', 'minutes', 600, 'manual', NULL, 1, true),
    (v_challenge_id, 'cooldown_walk_minutes', 'Cooldown Walk', 'minutes', 300, 'manual', NULL, 2, true),
    (v_challenge_id, 'sessions_completed', 'Workout Sessions Completed', 'sessions', 20, 'auto', 'workouts_completed', 3, true)
  ON CONFLICT (challenge_id, requirement_key) DO UPDATE
    SET title = EXCLUDED.title,
        unit = EXCLUDED.unit,
        target_value = EXCLUDED.target_value,
        progress_source = EXCLUDED.progress_source,
        auto_metric_key = EXCLUDED.auto_metric_key,
        sort_order = EXCLUDED.sort_order,
        is_active = EXCLUDED.is_active,
        updated_at = NOW();

  -- Heavy Bag Volume challenge
  INSERT INTO public.challenge_catalog (
    slug, title, description, difficulty, visibility, is_active, sort_order
  ) VALUES (
    'heavy-bag-volume-builder',
    'Heavy Bag Volume Builder',
    'Increase output and conditioning through round volume, session time, and accessory work.',
    'intermediate',
    'public',
    true,
    4
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

  SELECT id_badges INTO v_badge_id FROM public.badges WHERE title = 'Heavy Bag Volume Badge' LIMIT 1;
  IF v_badge_id IS NULL THEN
    INSERT INTO public.badges (title, description, icon_path, icon_name, color)
    VALUES (
      'Heavy Bag Volume Badge',
      'Awarded for completing the Heavy Bag Volume Builder challenge.',
      '/badges/challenge-heavy-bag-volume.png',
      'barbell-outline',
      '#f59e0b'
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
    (v_challenge_id, 'heavy_bag_rounds', 'Heavy Bag Rounds', 'rounds', 180, 'manual', NULL, 1, true),
    (v_challenge_id, 'training_minutes', 'Training Minutes', 'minutes', 1200, 'auto', 'workout_duration_minutes', 2, true),
    (v_challenge_id, 'pushups', 'Pushups', 'reps', 1500, 'manual', NULL, 3, true)
  ON CONFLICT (challenge_id, requirement_key) DO UPDATE
    SET title = EXCLUDED.title,
        unit = EXCLUDED.unit,
        target_value = EXCLUDED.target_value,
        progress_source = EXCLUDED.progress_source,
        auto_metric_key = EXCLUDED.auto_metric_key,
        sort_order = EXCLUDED.sort_order,
        is_active = EXCLUDED.is_active,
        updated_at = NOW();

  -- Defensive mastery challenge
  INSERT INTO public.challenge_catalog (
    slug, title, description, difficulty, visibility, is_active, sort_order
  ) VALUES (
    'defensive-mastery-camp',
    'Defensive Mastery Camp',
    'Refine defensive mechanics while maintaining consistent training volume.',
    'advanced',
    'public',
    true,
    5
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

  SELECT id_badges INTO v_badge_id FROM public.badges WHERE title = 'Defensive Mastery Badge' LIMIT 1;
  IF v_badge_id IS NULL THEN
    INSERT INTO public.badges (title, description, icon_path, icon_name, color)
    VALUES (
      'Defensive Mastery Badge',
      'Awarded for completing the Defensive Mastery Camp challenge.',
      '/badges/challenge-defensive-mastery.png',
      'shield-outline',
      '#8b5cf6'
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
    (v_challenge_id, 'slips', 'Slip Repetitions', 'reps', 3000, 'manual', NULL, 1, true),
    (v_challenge_id, 'roll_unders', 'Roll-under Counters', 'reps', 2000, 'manual', NULL, 2, true),
    (v_challenge_id, 'sessions_completed', 'Workout Sessions Completed', 'sessions', 25, 'auto', 'workouts_completed', 3, true),
    (v_challenge_id, 'active_training_minutes', 'Active Training Minutes', 'minutes', 1500, 'auto', 'workout_duration_minutes', 4, true)
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

