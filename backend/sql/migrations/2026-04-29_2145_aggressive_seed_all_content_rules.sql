-- Aggressive comprehensive personalization rules seeding
-- Seeds rules for ALL techniques, drills, and combinations
-- Creates multiple rules per content item with varied match criteria

DO $$
DECLARE
  technique_count INT;
  drill_count INT;
  combination_count INT;
  boxing_style_count INT;
  weight_class_count INT;
BEGIN
  -- Count existing content
  SELECT COUNT(*) INTO technique_count FROM techniques;
  SELECT COUNT(*) INTO drill_count FROM drills;
  SELECT COUNT(*) INTO combination_count FROM combinations;
  SELECT COUNT(*) INTO boxing_style_count FROM boxing_style;
  SELECT COUNT(*) INTO weight_class_count FROM weight_class;
  
  RAISE NOTICE 'Found % techniques, % drills, % combinations', technique_count, drill_count, combination_count;
  RAISE NOTICE 'Found % boxing styles, % weight classes', boxing_style_count, weight_class_count;

  -- Seed techniques with cycling through boxing styles
  WITH technique_ids AS (
    SELECT id_techniques, ROW_NUMBER() OVER (ORDER BY id_techniques) as rn FROM techniques
  ),
  styles AS (
    SELECT id_boxing_style, ROW_NUMBER() OVER (ORDER BY id_boxing_style) as rn FROM boxing_style
  )
  INSERT INTO public.content_personalization_rules (
    content_type, content_id, boxing_style_id, min_experience_level, max_experience_level, boost_score, is_active
  )
  SELECT 
    'technique' as content_type,
    t.id_techniques,
    s.id_boxing_style,
    'beginner'::character varying,
    'advanced'::character varying,
    (5 + (t.rn % 10))::integer,
    true
  FROM technique_ids t
  LEFT JOIN styles s ON s.rn = ((t.rn - 1) % GREATEST(1, boxing_style_count)) + 1
  ON CONFLICT DO NOTHING;

  -- Seed drills with cycling through weight classes
  WITH drill_ids AS (
    SELECT id_drills, ROW_NUMBER() OVER (ORDER BY id_drills) as rn FROM drills
  ),
  weights AS (
    SELECT id_weight_class, ROW_NUMBER() OVER (ORDER BY id_weight_class) as rn FROM weight_class
  )
  INSERT INTO public.content_personalization_rules (
    content_type, content_id, weight_class_id, min_experience_level, max_experience_level, boost_score, is_active
  )
  SELECT 
    'drill' as content_type,
    d.id_drills,
    w.id_weight_class,
    'beginner'::character varying,
    'advanced'::character varying,
    (8 + (d.rn % 8))::integer,
    true
  FROM drill_ids d
  LEFT JOIN weights w ON w.rn = ((d.rn - 1) % GREATEST(1, weight_class_count)) + 1
  ON CONFLICT DO NOTHING;

  -- Seed drills with experience levels
  WITH drill_ids AS (
    SELECT id_drills, ROW_NUMBER() OVER (ORDER BY id_drills) as rn FROM drills
  )
  INSERT INTO public.content_personalization_rules (
    content_type, content_id, min_experience_level, max_experience_level, boost_score, is_active
  )
  SELECT 
    'drill' as content_type,
    d.id_drills,
    CASE WHEN (d.rn % 3) = 0 THEN 'beginner'::character varying WHEN (d.rn % 3) = 1 THEN 'intermediate'::character varying ELSE 'advanced'::character varying END,
    'advanced'::character varying,
    6::integer,
    true
  FROM drill_ids d
  ON CONFLICT DO NOTHING;

  -- Seed combinations with height ranges
  WITH combo_ids AS (
    SELECT id_combinations, ROW_NUMBER() OVER (ORDER BY id_combinations) as rn FROM combinations
  )
  INSERT INTO public.content_personalization_rules (
    content_type, content_id, min_height_cm, max_height_cm, boost_score, is_active
  )
  SELECT 
    'combination' as content_type,
    c.id_combinations,
    CASE WHEN (c.rn % 3) = 0 THEN 160 WHEN (c.rn % 3) = 1 THEN 170 ELSE 180 END,
    CASE WHEN (c.rn % 3) = 0 THEN 180 WHEN (c.rn % 3) = 1 THEN 190 ELSE 200 END,
    7::integer,
    true
  FROM combo_ids c
  ON CONFLICT DO NOTHING;

  -- Verify
  SELECT COUNT(*) INTO technique_count FROM content_personalization_rules WHERE content_type = 'technique' AND is_active = true;
  SELECT COUNT(*) INTO drill_count FROM content_personalization_rules WHERE content_type = 'drill' AND is_active = true;
  SELECT COUNT(*) INTO combination_count FROM content_personalization_rules WHERE content_type = 'combination' AND is_active = true;
  
  RAISE NOTICE 'Seeded % technique rules, % drill rules, % combination rules', technique_count, drill_count, combination_count;

END $$;
