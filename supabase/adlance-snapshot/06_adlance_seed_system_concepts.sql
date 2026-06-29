-- Adlance Phase 1 — Migration 6/9
-- Version: 20260426145059
-- Name: adlance_seed_system_concepts
-- Dumped from supabase_migrations.schema_migrations on 2026-04-28

BEGIN;

DO $$
DECLARE
  cnt INTEGER;
BEGIN
  SELECT count(*) INTO cnt FROM public.concept_prompts;
  IF cnt < 1 THEN
    RAISE EXCEPTION 'concept_prompts table is empty. Re-seed required before Phase 2.';
  END IF;
END $$;

COMMIT;
