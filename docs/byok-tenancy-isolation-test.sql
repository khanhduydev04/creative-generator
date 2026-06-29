-- ============================================================================
-- Adlance BYOK Pivot — Manual tenancy isolation verification
-- ============================================================================
-- Run in Supabase Studio SQL editor. Use "Run as" to switch auth contexts.
-- This is OPTIONAL — Phase 3 ships an automated integration test
-- (src/__tests__/user-isolation.test.ts) that covers the same checks.
-- ============================================================================

-- SETUP (run as service role — Studio default)

-- Step 1: Create 2 test users via Studio Auth panel:
--   user_a@adlance-test.com / Test1234!
--   user_b@adlance-test.com / Test1234!
-- The handle_new_user trigger auto-creates profiles.

-- Step 2: Capture user IDs:
SELECT id, email FROM auth.users
WHERE email IN ('user_a@adlance-test.com','user_b@adlance-test.com');
-- Note these as :user_a_id and :user_b_id.

-- Step 3: Create one brand per user (run as service role):
INSERT INTO public.brands (name, owner_user_id) VALUES
  ('Brand A1', '<paste user_a_id here>'),
  ('Brand B1', '<paste user_b_id here>');

-- ============================================================================
-- VERIFY isolation
-- ============================================================================

-- In Studio: switch SQL editor "Run as" → user_a@adlance-test.com
SELECT id, name, owner_user_id FROM public.brands;
-- Expected: 1 row only — Brand A1.

SELECT * FROM public.user_api_keys;
-- Expected: 0 rows (none created yet).

-- Switch to user_b@adlance-test.com
SELECT id, name, owner_user_id FROM public.brands;
-- Expected: 1 row only — Brand B1.

-- ============================================================================
-- ATTEMPT cross-tenant write (must fail)
-- ============================================================================

-- As user_a:
-- INSERT INTO public.brands (name, owner_user_id) VALUES
--   ('Hack Attempt', '<user_b_id>');
-- Expected: ERROR — new row violates RLS policy.

-- ============================================================================
-- CLEANUP
-- ============================================================================
-- DELETE FROM auth.users WHERE email IN ('user_a@adlance-test.com','user_b@adlance-test.com');
-- (CASCADE wipes profiles + brands.)
