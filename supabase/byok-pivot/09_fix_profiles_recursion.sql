-- ============================================================================
-- Adlance BYOK Pivot — Fix infinite recursion in profiles RLS
-- ============================================================================
-- The original profiles_select policy had an OR clause that read from
-- profiles to check is_platform_admin. That SELECT also went through this
-- policy → infinite recursion → 42P17 errors on every authenticated read.
--
-- Symptom in app: GET /api/user/me returned 404 "profile_not_found" because
-- the inner supabase.from("profiles").select(...).single() always errored
-- under RLS, even though the row existed.
--
-- Fix: drop the admin OR branch. Platform-admin operations use the
-- service-role client (bypasses RLS) anyway.
--
-- profiles_update_self had the same bug in WITH CHECK — same fix.
-- ============================================================================

DROP POLICY IF EXISTS profiles_select ON public.profiles;
CREATE POLICY profiles_select ON public.profiles
  FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS profiles_update_self ON public.profiles;
CREATE POLICY profiles_update_self ON public.profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
