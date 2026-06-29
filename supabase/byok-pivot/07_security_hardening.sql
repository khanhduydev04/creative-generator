-- ============================================================================
-- Adlance BYOK Pivot — Phase 2.7 — Security advisor follow-up
-- ============================================================================
-- 1. Lock down handle_new_user + set_updated_at search_path (warn:
--    function_search_path_mutable).
-- 2. Revoke RPC execute on handle_new_user from anon + authenticated
--    (warn: security_definer_function_executable). This function should
--    only run via the auth.users insert trigger, never as an RPC call.
-- 3. Drop legacy update_app_settings_timestamp (referenced dropped
--    app_settings table).
-- ============================================================================

BEGIN;

-- 1+2. handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = '' AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;

-- REVOKE FROM PUBLIC also covers anon + authenticated which inherit from PUBLIC.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Drop legacy public-listing policy on the unused campaign-inputs bucket.
-- The bucket itself is left for the operator to delete via Studio.
DROP POLICY IF EXISTS "Public read campaign-inputs" ON storage.objects;

-- 1. set_updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = '' AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 3. Drop legacy timestamp helper that referenced dropped app_settings table
DROP FUNCTION IF EXISTS public.update_app_settings_timestamp() CASCADE;

COMMIT;
