-- ============================================================================
-- Adlance BYOK Pivot — Phase 2.1 — Drop PATI tables + wipe brand data
-- ============================================================================
-- Drops: clients, app_settings, activity_log, product_markets.
-- Wipes: brands and cascading children (brand_kits, brand_products,
--        persona_profiles, brand_research_summaries, saved_ads,
--        kie_task_results, stealth_scenes).
-- Preserves: concept_prompts (system IP), profiles structure (altered next).
-- ============================================================================

BEGIN;

-- 1. Drop top-level obsolete tables
DROP TABLE IF EXISTS public.app_settings CASCADE;
DROP TABLE IF EXISTS public.activity_log CASCADE;
DROP TABLE IF EXISTS public.product_markets CASCADE;

-- 2. Wipe brand-scoped data (brands cascades to children via FK)
DELETE FROM public.saved_ads;
DELETE FROM public.kie_task_results;
DELETE FROM public.brand_research_summaries;
DELETE FROM public.persona_profiles;
DELETE FROM public.brand_products;
DELETE FROM public.brand_kits;
DELETE FROM public.stealth_scenes;
DELETE FROM public.brands;

-- 3. Drop clients table (no longer needed; brand → user direct)
DROP TABLE IF EXISTS public.clients CASCADE;

-- 4. Drop legacy PATI CEO-protection triggers + functions before wiping profiles.
--    These guarded the CEO account on the PATI baseline and have no place in
--    the public Adlance model.
DROP TRIGGER IF EXISTS prevent_ceo_delete_trigger ON public.profiles;
DROP TRIGGER IF EXISTS protect_ceo_trigger ON public.profiles;
DROP FUNCTION IF EXISTS public.prevent_ceo_delete() CASCADE;
DROP FUNCTION IF EXISTS public.protect_ceo() CASCADE;

-- 5. Wipe profiles (PATI users); auth.users are kept but locked out
--    (no profile row → app login fails; user must delete via Studio Auth UI)
DELETE FROM public.profiles;

COMMIT;
