BEGIN;

ALTER TABLE public.voice_presets
  ADD COLUMN stability NUMERIC NOT NULL DEFAULT 0.5
    CHECK (stability BETWEEN 0 AND 1);

COMMIT;
