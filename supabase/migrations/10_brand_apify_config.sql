-- supabase/migrations/10_brand_apify_config.sql
-- Per-brand Apify pull-sync config. One row per brand (UNIQUE brand_id).
-- Cron reads this with admin client (bypass RLS). User CRUD goes through RLS.

BEGIN;

CREATE TABLE public.brand_apify_config (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id        UUID        NOT NULL UNIQUE REFERENCES public.brands(id) ON DELETE CASCADE,
  apify_task_id   TEXT        NOT NULL,
  is_enabled      BOOLEAN     NOT NULL DEFAULT true,
  last_run_id     TEXT,
  last_dataset_id TEXT,
  last_synced_at  TIMESTAMPTZ,
  last_error      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX brand_apify_config_enabled_idx
  ON public.brand_apify_config(is_enabled) WHERE is_enabled = true;

DROP TRIGGER IF EXISTS brand_apify_config_set_updated_at ON public.brand_apify_config;
CREATE TRIGGER brand_apify_config_set_updated_at
  BEFORE UPDATE ON public.brand_apify_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.brand_apify_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY brand_apify_config_all ON public.brand_apify_config
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
