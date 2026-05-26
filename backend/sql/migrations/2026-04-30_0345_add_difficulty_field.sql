-- Add difficulty level column to techniques, drills, and combinations
-- Migration for adding skill level indicators

ALTER TABLE public.techniques
ADD COLUMN difficulty character varying DEFAULT 'Intermediate';

ALTER TABLE public.drills
ADD COLUMN difficulty character varying DEFAULT 'Intermediate';

ALTER TABLE public.combinations
ADD COLUMN difficulty character varying DEFAULT 'Intermediate';

-- Add constraint to ensure valid difficulty values
ALTER TABLE public.techniques
ADD CONSTRAINT techniques_difficulty_check 
CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced', 'Expert'));

ALTER TABLE public.drills
ADD CONSTRAINT drills_difficulty_check 
CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced', 'Expert'));

ALTER TABLE public.combinations
ADD CONSTRAINT combinations_difficulty_check 
CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced', 'Expert'));
