-- ============================================================================
-- Adlance BYOK Pivot — Handle Google OAuth full_name fallback
-- ============================================================================
-- Google OAuth populates raw_user_meta_data.name (not full_name). The original
-- trigger only checked full_name; this version falls back to name for Google
-- and still works for email/password signups (which set full_name explicitly
-- via /api/auth/signup options.data).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = '' AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      ''
    )
  );
  RETURN NEW;
END;
$$;
