-- Add generic personalization rules that match with incomplete user profiles
-- These rules use only boxing_style or weight_class matching
-- This ensures users see diverse reasons even if they haven't filled in height/experience

DO $$
DECLARE
  boxing_style_record RECORD;
  weight_class_record RECORD;
  technique_record RECORD;
  drill_record RECORD;
  combo_record RECORD;
  style_idx INT;
  weight_idx INT;
BEGIN
  -- Get counts
  SELECT COUNT(*) INTO style_idx FROM boxing_style;
  SELECT COUNT(*) INTO weight_idx FROM weight_class;
  
  RAISE NOTICE 'Adding generic rules matching by style and weight...';

  -- For each technique, create a rule matching by boxing_style
  FOR technique_record IN SELECT id_techniques, ROW_NUMBER() OVER (ORDER BY id_techniques) as rn FROM techniques LOOP
    SELECT id_boxing_style INTO boxing_style_record
    FROM boxing_style
    LIMIT 1 OFFSET ((technique_record.rn - 1) % GREATEST(1, style_idx));
    
    IF boxing_style_record.id_boxing_style IS NOT NULL THEN
      INSERT INTO public.content_personalization_rules (
        content_type, content_id, boxing_style_id, boost_score, is_active
      ) VALUES (
        'technique', technique_record.id_techniques, boxing_style_record.id_boxing_style, 10, true
      ) ON CONFLICT DO NOTHING;
    END IF;
    
    -- Also create a rule with just experience level (broad range)
    INSERT INTO public.content_personalization_rules (
      content_type, content_id, min_experience_level, max_experience_level, boost_score, is_active
    ) VALUES (
      'technique', technique_record.id_techniques, 'beginner'::character varying, 'advanced'::character varying, 5, true
    ) ON CONFLICT DO NOTHING;
  END LOOP;

  -- For each drill, create multiple matching rules
  FOR drill_record IN SELECT id_drills, ROW_NUMBER() OVER (ORDER BY id_drills) as rn FROM drills LOOP
    -- Rule matching by weight class
    SELECT id_weight_class INTO weight_class_record
    FROM weight_class
    LIMIT 1 OFFSET ((drill_record.rn - 1) % GREATEST(1, weight_idx));
    
    IF weight_class_record.id_weight_class IS NOT NULL THEN
      INSERT INTO public.content_personalization_rules (
        content_type, content_id, weight_class_id, boost_score, is_active
      ) VALUES (
        'drill', drill_record.id_drills, weight_class_record.id_weight_class, 10, true
      ) ON CONFLICT DO NOTHING;
    END IF;
    
    -- Rule matching by boxing style
    SELECT id_boxing_style INTO boxing_style_record
    FROM boxing_style
    LIMIT 1 OFFSET ((drill_record.rn - 1) % GREATEST(1, style_idx));
    
    IF boxing_style_record.id_boxing_style IS NOT NULL THEN
      INSERT INTO public.content_personalization_rules (
        content_type, content_id, boxing_style_id, boost_score, is_active
      ) VALUES (
        'drill', drill_record.id_drills, boxing_style_record.id_boxing_style, 9, true
      ) ON CONFLICT DO NOTHING;
    END IF;
    
    -- Rule matching by experience level
    INSERT INTO public.content_personalization_rules (
      content_type, content_id, min_experience_level, max_experience_level, boost_score, is_active
    ) VALUES (
      'drill', drill_record.id_drills, 'intermediate'::character varying, 'advanced'::character varying, 6, true
    ) ON CONFLICT DO NOTHING;
  END LOOP;

  -- For each combination, create matching rules
  FOR combo_record IN SELECT id_combinations, ROW_NUMBER() OVER (ORDER BY id_combinations) as rn FROM combinations LOOP
    -- Rule matching by weight class
    SELECT id_weight_class INTO weight_class_record
    FROM weight_class
    LIMIT 1 OFFSET ((combo_record.rn - 1) % GREATEST(1, weight_idx));
    
    IF weight_class_record.id_weight_class IS NOT NULL THEN
      INSERT INTO public.content_personalization_rules (
        content_type, content_id, weight_class_id, boost_score, is_active
      ) VALUES (
        'combination', combo_record.id_combinations, weight_class_record.id_weight_class, 10, true
      ) ON CONFLICT DO NOTHING;
    END IF;
    
    -- Rule with height range
    INSERT INTO public.content_personalization_rules (
      content_type, content_id, min_height_cm, max_height_cm, boost_score, is_active
    ) VALUES (
      'combination', combo_record.id_combinations, 160, 200, 8, true
    ) ON CONFLICT DO NOTHING;
  END LOOP;

  RAISE NOTICE 'Generic rules added successfully';

END $$;
