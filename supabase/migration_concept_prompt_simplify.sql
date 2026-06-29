-- Migration: Simplify concept_prompts structure
-- Merges creative_strategy + visual_prompt + layout_variants into a single "prompt" column
-- Adds reference_images column (text array, max 2 image URLs)

-- Step 1: Add new columns
ALTER TABLE concept_prompts
  ADD COLUMN IF NOT EXISTS prompt TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS reference_images TEXT[] NOT NULL DEFAULT '{}';

-- Step 2: Migrate existing data — concatenate the 3 old columns into "prompt"
UPDATE concept_prompts
SET prompt = CONCAT_WS(
  E'\n\n---\n\n',
  CASE WHEN creative_strategy <> '' THEN '## CREATIVE STRATEGY' || E'\n\n' || creative_strategy END,
  CASE WHEN visual_prompt <> '' THEN '## VISUAL PROMPT' || E'\n\n' || visual_prompt END,
  CASE WHEN layout_variants <> '' THEN '## LAYOUT VARIANTS' || E'\n\n' || layout_variants END
)
WHERE creative_strategy <> '' OR visual_prompt <> '' OR layout_variants <> '';

-- Step 3: Drop old columns
ALTER TABLE concept_prompts
  DROP COLUMN IF EXISTS creative_strategy,
  DROP COLUMN IF EXISTS visual_prompt,
  DROP COLUMN IF EXISTS layout_variants;

-- Step 4: Add constraint to limit reference_images to max 2
ALTER TABLE concept_prompts
  ADD CONSTRAINT chk_reference_images_max2 CHECK (array_length(reference_images, 1) IS NULL OR array_length(reference_images, 1) <= 2);
