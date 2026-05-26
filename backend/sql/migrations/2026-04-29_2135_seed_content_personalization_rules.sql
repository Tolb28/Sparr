-- Seed sample content personalization rules to enable personalization features
-- These rules allow the recommendation engine to suggest techniques/drills/combinations
-- based on user profile attributes (style, weight class, height, experience)

-- Seed some basic personalization rules for testing
-- These should be populated based on real boxing knowledge and content
-- For now, adding foundational rules that match various profile types

DO $$
DECLARE
  technique_count INT;
  drill_count INT;
  combination_count INT;
BEGIN
  -- Check if we already have rules
  SELECT COUNT(*) INTO technique_count FROM public.content_personalization_rules WHERE content_type = 'technique';
  
  IF technique_count = 0 THEN
    INSERT INTO public.content_personalization_rules (
      content_type, 
      content_id, 
      boxing_style_id, 
      weight_class_id, 
      min_height_cm, 
      max_height_cm, 
      min_experience_level, 
      max_experience_level, 
      boost_score, 
      is_active
    )
    SELECT 
      'technique' as content_type,
      id_techniques,
      NULL::integer as boxing_style_id,
      NULL::integer as weight_class_id,
      NULL::integer as min_height_cm,
      NULL::integer as max_height_cm,
      'beginner' as min_experience_level,
      'advanced' as max_experience_level,
      5 as boost_score,
      true as is_active
    FROM techniques
    LIMIT 50;
  END IF;

  SELECT COUNT(*) INTO drill_count FROM public.content_personalization_rules WHERE content_type = 'drill';
  
  IF drill_count = 0 THEN
    INSERT INTO public.content_personalization_rules (
      content_type, 
      content_id, 
      boxing_style_id, 
      weight_class_id, 
      min_height_cm, 
      max_height_cm, 
      min_experience_level, 
      max_experience_level, 
      boost_score, 
      is_active
    )
    SELECT 
      'drill' as content_type,
      id_drills,
      NULL::integer as boxing_style_id,
      NULL::integer as weight_class_id,
      NULL::integer as min_height_cm,
      NULL::integer as max_height_cm,
      'beginner' as min_experience_level,
      'advanced' as max_experience_level,
      5 as boost_score,
      true as is_active
    FROM drills
    LIMIT 50;
  END IF;

  SELECT COUNT(*) INTO combination_count FROM public.content_personalization_rules WHERE content_type = 'combination';
  
  IF combination_count = 0 THEN
    INSERT INTO public.content_personalization_rules (
      content_type, 
      content_id, 
      boxing_style_id, 
      weight_class_id, 
      min_height_cm, 
      max_height_cm, 
      min_experience_level, 
      max_experience_level, 
      boost_score, 
      is_active
    )
    SELECT 
      'combination' as content_type,
      id_combinations,
      NULL::integer as boxing_style_id,
      NULL::integer as weight_class_id,
      NULL::integer as min_height_cm,
      NULL::integer as max_height_cm,
      'beginner' as min_experience_level,
      'advanced' as max_experience_level,
      5 as boost_score,
      true as is_active
    FROM combinations
    LIMIT 50;
  END IF;
END $$;
