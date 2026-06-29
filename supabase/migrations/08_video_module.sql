-- supabase/migrations/08_video_module.sql
-- Video Module tables: competitor_videos, transcripts, brand_scripts,
-- voice_presets, voice_ratings, generated_audios (in FK-safe order)

BEGIN;

-- ── set_updated_at trigger function (idempotent) ────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ── competitor_videos ───────────────────────────────────────────────────────
CREATE TABLE public.competitor_videos (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id      UUID        NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  tiktok_url    TEXT        NOT NULL,
  video_id      TEXT,
  views         BIGINT,
  likes         BIGINT,
  shares        BIGINT,
  comments      BIGINT,
  author_handle TEXT,
  cover_url     TEXT,
  scraped_at    TIMESTAMPTZ,
  apify_run_id  TEXT,
  status        TEXT        NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'winner', 'rejected')),
  scrape_status TEXT        NOT NULL DEFAULT 'success'
                CHECK (scrape_status IN ('success', 'failed')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (brand_id, tiktok_url)
);
CREATE INDEX competitor_videos_brand_status_idx
  ON public.competitor_videos(brand_id, status);

ALTER TABLE public.competitor_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY competitor_videos_all ON public.competitor_videos
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.brands b
    WHERE b.id = brand_id AND b.owner_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.brands b
    WHERE b.id = brand_id AND b.owner_user_id = auth.uid()
  ));

-- ── transcripts ─────────────────────────────────────────────────────────────
CREATE TABLE public.transcripts (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id       UUID        NOT NULL UNIQUE
                             REFERENCES public.competitor_videos(id) ON DELETE CASCADE,
  whisper_status TEXT        NOT NULL DEFAULT 'pending'
                 CHECK (whisper_status IN ('pending', 'processing', 'done', 'failed')),
  raw_text       TEXT,
  edited_text    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS transcripts_set_updated_at ON public.transcripts;
CREATE TRIGGER transcripts_set_updated_at
  BEFORE UPDATE ON public.transcripts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;
CREATE POLICY transcripts_all ON public.transcripts
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.competitor_videos cv
    JOIN public.brands b ON b.id = cv.brand_id
    WHERE cv.id = video_id AND b.owner_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.competitor_videos cv
    JOIN public.brands b ON b.id = cv.brand_id
    WHERE cv.id = video_id AND b.owner_user_id = auth.uid()
  ));

-- ── brand_scripts ────────────────────────────────────────────────────────────
CREATE TABLE public.brand_scripts (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript_id UUID        NOT NULL REFERENCES public.transcripts(id) ON DELETE CASCADE,
  brand_id      UUID        NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  prompt_config JSONB       NOT NULL DEFAULT '{}',
  raw_text      TEXT,
  final_text    TEXT,
  llm_model     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX brand_scripts_transcript_idx ON public.brand_scripts(transcript_id);
CREATE INDEX brand_scripts_brand_idx      ON public.brand_scripts(brand_id);

DROP TRIGGER IF EXISTS brand_scripts_set_updated_at ON public.brand_scripts;
CREATE TRIGGER brand_scripts_set_updated_at
  BEFORE UPDATE ON public.brand_scripts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.brand_scripts ENABLE ROW LEVEL SECURITY;
CREATE POLICY brand_scripts_all ON public.brand_scripts
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.brands b
    WHERE b.id = brand_id AND b.owner_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.brands b
    WHERE b.id = brand_id AND b.owner_user_id = auth.uid()
  ));

-- ── voice_presets ────────────────────────────────────────────────────────────
-- Created before generated_audios (FK dependency)
CREATE TABLE public.voice_presets (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id     UUID        NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  display_name TEXT        NOT NULL,
  voice_code   TEXT        NOT NULL,
  speed        NUMERIC     NOT NULL DEFAULT 1.0,
  pitch        NUMERIC     NOT NULL DEFAULT 1.0,
  pause_config JSONB,
  is_default   BOOLEAN     NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX voice_presets_brand_idx ON public.voice_presets(brand_id);

ALTER TABLE public.voice_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY voice_presets_all ON public.voice_presets
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.brands b
    WHERE b.id = brand_id AND b.owner_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.brands b
    WHERE b.id = brand_id AND b.owner_user_id = auth.uid()
  ));

-- ── voice_ratings ────────────────────────────────────────────────────────────
CREATE TABLE public.voice_ratings (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id        UUID        NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  vbee_voice_code TEXT        NOT NULL,
  score           SMALLINT    NOT NULL CHECK (score BETWEEN 1 AND 5),
  note            TEXT,
  rated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX voice_ratings_brand_voice_idx
  ON public.voice_ratings(brand_id, vbee_voice_code);

ALTER TABLE public.voice_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY voice_ratings_all ON public.voice_ratings
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.brands b
    WHERE b.id = brand_id AND b.owner_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.brands b
    WHERE b.id = brand_id AND b.owner_user_id = auth.uid()
  ));

-- ── generated_audios ─────────────────────────────────────────────────────────
-- After voice_presets (FK dependency)
CREATE TABLE public.generated_audios (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id       UUID        NOT NULL REFERENCES public.brand_scripts(id) ON DELETE CASCADE,
  brand_id        UUID        NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  voice_preset_id UUID        REFERENCES public.voice_presets(id) ON DELETE SET NULL,
  storage_path    TEXT,
  vbee_audio_url  TEXT,
  duration_secs   NUMERIC,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX generated_audios_script_idx ON public.generated_audios(script_id);
CREATE INDEX generated_audios_brand_idx  ON public.generated_audios(brand_id);

ALTER TABLE public.generated_audios ENABLE ROW LEVEL SECURITY;
CREATE POLICY generated_audios_all ON public.generated_audios
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.brands b
    WHERE b.id = brand_id AND b.owner_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.brands b
    WHERE b.id = brand_id AND b.owner_user_id = auth.uid()
  ));

COMMIT;
