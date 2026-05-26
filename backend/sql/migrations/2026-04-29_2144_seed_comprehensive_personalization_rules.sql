-- Comprehensive personalization rules seeding
-- Seeds rules for ALL techniques, drills, and combinations with varied match criteria
-- This ensures recommendations generate diverse reasons (Your style, Your weight, Your height, Your level)

DO $$
DECLARE
  boxing_style_record RECORD;
  weight_class_record RECORD;
  technique_record RECORD;
  drill_record RECORD;
  combination_record RECORD;
  rule_count INT;
BEGIN
  -- Get the total rule count to decide if we need to seed
  SELECT COUNT(*) INTO rule_count FROM public.content_personalization_rules;
  
  -- If we already have a good number of rules, skip seeding to avoid duplicates
  IF rule_count > 100 THEN
    RAISE NOTICE 'Already have % rules, skipping bulk seed', rule_count;
    RETURN;
  END IF;

  -- Seed rules for all techniques with varied attributes
  FOR technique_record IN SELECT id_techniques FROM techniques LIMIT 500 LOOP
    -- Create a rule matching by experience level
    INSERT INTO public.content_personalization_rules (
      content_type, content_id, boxing_style_id, weight_class_id, 
      min_experience_level, max_experience_level, boost_score, is_active
    ) VALUES (
      'technique', technique_record.id_techniques, NULL, NULL,
      'beginner', 'advanced', 8, true
    ) ON CONFLICT DO NOTHING;
  END LOOP;

  -- Seed rules for all drills with varied boxing styles
  FOR drill_record IN SELECT id_drills FROM drills LIMIT 500 LOOP
    -- Get a cycling boxing style to distribute across drills
    SELECT bs.id_boxing_style INTO boxing_style_record
    FROM boxing_style bs
    LIMIT 1 OFFSET (drill_record.id_drills % (SELECT COUNT(*) FROM boxing_style));
    
    INSERT INTO public.content_personalization_rules (
      content_type, content_id, boxing_style_id, weight_class_id,
      min_experience_level, max_experience_level, boost_score, is_active
    ) VALUES (
      'drill', drill_record.id_drills, COALESCE(boxing_style_record.id_boxing_style, NULL), NULL,
      'beginner', 'advanced', 10, true
    ) ON CONFLICT DO NOTHING;
    
    -- Also create a rule matching by weight class
    SELECT wc.id_weight_class INTO weight_class_record
    FROM weight_class wc
    LIMIT 1 OFFSET (drill_record.id_drills % (SELECT COUNT(*) FROM weight_class));
    
    INSERT INTO public.content_personalization_rules (
      content_type, content_id, boxing_style_id, weight_class_id,
      min_experience_level, max_experience_level, boost_score, is_active
    ) VALUES (
      'drill', drill_record.id_drills, NULL, COALESCE(weight_class_record.id_weight_class, NULL),
      'beginner', 'advanced', 10, true
    ) ON CONFLICT DO NOTHING;
    
    -- Create a rule matching by experience level
    INSERT INTO public.content_personalization_rules (
      content_type, content_id, boxing_style_id, weight_class_id,
      min_experience_level, max_experience_level, boost_score, is_active
    ) VALUES (
      'drill', drill_record.id_drills, NULL, NULL,
      'intermediate', 'advanced', 8, true
    ) ON CONFLICT DO NOTHING;
  END LOOP;

  -- Seed rules for all combinations with height and experience matching
  FOR combination_record IN SELECT id_combinations FROM combinations LIMIT 500 LOOP
    -- Create a rule matching by height
    INSERT INTO public.content_personalization_rules (
      content_type, content_id, boxing_style_id, weight_class_id,
      min_height_cm, max_height_cm, min_experience_level, max_experience_level, 
      boost_score, is_active
    ) VALUES (
      'combination', combination_record.id_combinations, NULL, NULL,
      170, 195, 'beginner', 'advanced', 9, true
    ) ON CONFLICT DO NOTHING;
    
    -- Create a rule for shorter athletes
    INSERT INTO public.content_personalization_rules (
      content_type, content_id, boxing_style_id, weight_class_id,
      min_height_cm, max_height_cm, min_experience_level, max_experience_level,
      boost_score, is_active
    ) VALUES (
      'combination', combination_record.id_combinations, NULL, NULL,
      160, 180, 'beginner', 'advanced', 9, true
    ) ON CONFLICT DO NOTHING;
  END LOOP;

  -- Final verification
  SELECT COUNT(*) INTO rule_count FROM public.content_personalization_rules WHERE is_active = true;
  RAISE NOTICE 'Seeding complete. Total active rules: %', rule_count;

END $$;
