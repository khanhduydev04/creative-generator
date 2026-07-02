-- supabase/migrations/18_minimax_provider.sql
BEGIN;

-- 1. Widen provider CHECK constraints to include 'minimax'
ALTER TABLE public.voice_presets DROP CONSTRAINT IF EXISTS voice_presets_provider_check;
ALTER TABLE public.voice_presets
  ADD CONSTRAINT voice_presets_provider_check
  CHECK (provider IN ('vbee', 'elevenlabs', 'minimax'));

ALTER TABLE public.generated_audios DROP CONSTRAINT IF EXISTS generated_audios_provider_check;
ALTER TABLE public.generated_audios
  ADD CONSTRAINT generated_audios_provider_check
  CHECK (provider IN ('vbee', 'elevenlabs', 'minimax'));

-- 2. Provider-specific config blob (used by MiniMax; nullable, does not affect existing rows)
ALTER TABLE public.voice_presets ADD COLUMN IF NOT EXISTS provider_config JSONB;

-- 3. Per-brand MiniMax cloned voices
CREATE TABLE IF NOT EXISTS public.minimax_cloned_voices (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id             UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  voice_id             TEXT NOT NULL,
  display_name         TEXT NOT NULL,
  model                TEXT NOT NULL DEFAULT 'speech-2.6-hd',
  status               TEXT NOT NULL DEFAULT 'ready'
                         CHECK (status IN ('pending', 'ready', 'failed')),
  source_storage_path  TEXT,
  preview_storage_path TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (brand_id, voice_id)
);

ALTER TABLE public.minimax_cloned_voices ENABLE ROW LEVEL SECURITY;

CREATE POLICY minimax_cloned_voices_owner ON public.minimax_cloned_voices
  USING (EXISTS (SELECT 1 FROM public.brands b
                 WHERE b.id = brand_id AND b.owner_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.brands b
                 WHERE b.id = brand_id AND b.owner_user_id = auth.uid()));

COMMIT;
