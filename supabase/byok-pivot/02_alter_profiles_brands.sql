-- ============================================================================
-- Adlance BYOK Pivot — Phase 2.2 — Alter profiles + brands
-- ============================================================================

BEGIN;

-- 0. Drop legacy PATI RLS policies that reference dropped columns / no longer match
--    the solo-user model. New Adlance policies are installed in migration 04.
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own name" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role full access" ON public.profiles;
DROP POLICY IF EXISTS "Allow all for anon" ON public.brands;
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.brands;
DROP POLICY IF EXISTS "Allow all for anon" ON public.brand_kits;
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.brand_kits;
DROP POLICY IF EXISTS "Allow all for anon" ON public.brand_products;
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.brand_products;
DROP POLICY IF EXISTS "Allow all for anon" ON public.brand_research_summaries;
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.brand_research_summaries;
DROP POLICY IF EXISTS "Allow all for anon" ON public.persona_profiles;
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.persona_profiles;
DROP POLICY IF EXISTS "Allow all access to kie_task_results" ON public.kie_task_results;
DROP POLICY IF EXISTS "Authenticated users can read saved_ads" ON public.saved_ads;
DROP POLICY IF EXISTS "Authenticated users can insert saved_ads" ON public.saved_ads;
DROP POLICY IF EXISTS "Authenticated users can delete saved_ads" ON public.saved_ads;
DROP POLICY IF EXISTS "Users can read stealth scenes for their brands" ON public.stealth_scenes;
DROP POLICY IF EXISTS "Users can insert stealth scenes" ON public.stealth_scenes;
DROP POLICY IF EXISTS "Users can update stealth scenes" ON public.stealth_scenes;
DROP POLICY IF EXISTS "Users can delete stealth scenes" ON public.stealth_scenes;
DROP POLICY IF EXISTS concept_prompts_select ON public.concept_prompts;
DROP POLICY IF EXISTS concept_prompts_insert ON public.concept_prompts;
DROP POLICY IF EXISTS concept_prompts_update ON public.concept_prompts;
DROP POLICY IF EXISTS concept_prompts_delete ON public.concept_prompts;

-- 1. profiles: drop PATI role columns, add platform admin flag
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS department;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_active;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS last_login_at;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN NOT NULL DEFAULT false;

-- brands: drop client_id, add owner_user_id (FK to profiles)
ALTER TABLE public.brands DROP COLUMN IF EXISTS client_id;
ALTER TABLE public.brands
  ADD COLUMN owner_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS brands_owner_idx ON public.brands(owner_user_id);

COMMIT;
