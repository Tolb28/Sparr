-- Add skill_level and intensity_score to profile_progress_snapshots
ALTER TABLE profile_progress_snapshots
ADD COLUMN IF NOT EXISTS skill_level INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS intensity_score INTEGER DEFAULT 0 NOT NULL;

-- Describes the composite 0-100 skill level score
COMMENT ON COLUMN profile_progress_snapshots.skill_level IS 'Composite 0-100 skill level score.';

-- Describes the composite 0-100 intensity score
COMMENT ON COLUMN profile_progress_snapshots.intensity_score IS 'Composite 0-100 intensity score.';

-- Create index for performance if needed
CREATE INDEX IF NOT EXISTS idx_profile_progress_snapshots_skill ON profile_progress_snapshots(profile_id, skill_level);
