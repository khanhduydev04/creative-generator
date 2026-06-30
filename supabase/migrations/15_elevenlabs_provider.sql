-- supabase/migrations/15_elevenlabs_provider.sql
BEGIN;

ALTER TABLE public.voice_presets
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'vbee'
    CHECK (provider IN ('vbee', 'elevenlabs')),
  ADD COLUMN IF NOT EXISTS provider_voice_id TEXT,
  ADD COLUMN IF NOT EXISTS elevenlabs_model TEXT
    CHECK (elevenlabs_model IN ('eleven_v3', 'eleven_flash_v2_5'));

ALTER TABLE public.generated_audios
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'vbee'
    CHECK (provider IN ('vbee', 'elevenlabs'));

COMMIT;
