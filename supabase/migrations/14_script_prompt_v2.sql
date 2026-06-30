-- supabase/migrations/14_script_prompt_v2.sql
BEGIN;

ALTER TABLE public.brand_products
  ADD COLUMN IF NOT EXISTS price TEXT;

ALTER TABLE public.brand_scripts
  ADD COLUMN IF NOT EXISTS tts_provider TEXT NOT NULL DEFAULT 'vbee'
    CHECK (tts_provider IN ('vbee', 'elevenlabs')),
  ADD COLUMN IF NOT EXISTS elevenlabs_model TEXT
    CHECK (elevenlabs_model IN ('eleven_v3', 'eleven_flash_v2_5'));

COMMIT;
