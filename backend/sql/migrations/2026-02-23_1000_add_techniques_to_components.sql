-- Add techniques support to trainings_components
ALTER TABLE trainings_components
  ADD COLUMN IF NOT EXISTS id_techniques integer;

ALTER TABLE trainings_components
  ADD CONSTRAINT trainings_components_id_techniques_fkey
  FOREIGN KEY (id_techniques) REFERENCES techniques(id_techniques);

-- Add explicit sort order for component reordering
ALTER TABLE trainings_components
  ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

-- Backfill sort_order from existing PK ordering
UPDATE trainings_components tc
SET sort_order = sub.rn
FROM (
  SELECT id_trainings_components,
         ROW_NUMBER() OVER (PARTITION BY id_trainings ORDER BY id_trainings_components) AS rn
  FROM trainings_components
) sub
WHERE tc.id_trainings_components = sub.id_trainings_components;
