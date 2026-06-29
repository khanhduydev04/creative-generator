-- Adlance Phase 1 — Migration 1/9
-- Version: 20260426144253
-- Name: adlance_drop_alter_v3
-- Dumped from supabase_migrations.schema_migrations on 2026-04-28

BEGIN;

DROP TABLE IF EXISTS public.app_settings CASCADE;
DROP TABLE IF EXISTS public.activity_log CASCADE;

DELETE FROM public.saved_ads;
DELETE FROM public.kie_task_results;
DELETE FROM public.brand_research_summaries;
DELETE FROM public.persona_profiles;
DELETE FROM public.product_markets;
DELETE FROM public.brand_products;
DELETE FROM public.brand_kits;
DELETE FROM public.brands;

DROP TABLE IF EXISTS public.clients CASCADE;

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own name" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role full access" ON public.profiles;

DROP TRIGGER IF EXISTS prevent_ceo_delete_trigger ON public.profiles;
DROP TRIGGER IF EXISTS protect_ceo_trigger ON public.profiles;
DROP FUNCTION IF EXISTS public.prevent_ceo_delete() CASCADE;
DROP FUNCTION IF EXISTS public.protect_ceo() CASCADE;

ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS department;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_active;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS last_login_at;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN NOT NULL DEFAULT false;

DELETE FROM public.profiles;

DROP POLICY IF EXISTS "Allow all for anon" ON public.brands;
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.brands;

ALTER TABLE public.brands DROP COLUMN IF EXISTS client_id;

COMMIT;
