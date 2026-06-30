-- supabase/migrations/12_shared_workspace_helpers.sql
-- Shared workspace: helper fns, profiles admin-flag sync, brands RLS + soft-delete guard.
BEGIN;

-- 0) Ensure profiles has the columns the helpers depend on.
--    These columns may not exist if the base migration predates the shared-workspace design.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role        text    NOT NULL DEFAULT 'member'
                                                CHECK (role IN ('ceo','super_admin','member')),
  ADD COLUMN IF NOT EXISTS is_active   boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS department  text,
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

-- 1) Helper: currently logged-in + active
CREATE OR REPLACE FUNCTION public.is_active_user()
  RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_active
  );
$$;

-- 2) Helper: admin (ceo/super_admin) + active
CREATE OR REPLACE FUNCTION public.is_admin()
  RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_active AND role IN ('ceo','super_admin')
  );
$$;

-- 3) Sync is_platform_admin = (role is admin) — client gating reads this via /api/user/me
UPDATE public.profiles
  SET is_platform_admin = (role IN ('ceo','super_admin'));

CREATE OR REPLACE FUNCTION public.sync_platform_admin_flag()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
  BEGIN
    NEW.is_platform_admin := (NEW.role IN ('ceo','super_admin'));
    RETURN NEW;
  END;
$$;

DROP TRIGGER IF EXISTS profiles_sync_platform_admin ON public.profiles;
CREATE TRIGGER profiles_sync_platform_admin
  BEFORE INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_platform_admin_flag();

-- 4) brands RLS: shared read; admin-only create/delete; any active user may update
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS brands_select        ON public.brands;
DROP POLICY IF EXISTS brands_write         ON public.brands;
DROP POLICY IF EXISTS brands_select_shared ON public.brands;
DROP POLICY IF EXISTS brands_insert_admin  ON public.brands;
DROP POLICY IF EXISTS brands_update_active ON public.brands;
DROP POLICY IF EXISTS brands_delete_admin  ON public.brands;

CREATE POLICY brands_select_shared ON public.brands
  FOR SELECT USING (public.is_active_user());
CREATE POLICY brands_insert_admin ON public.brands
  FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY brands_update_active ON public.brands
  FOR UPDATE USING (public.is_active_user()) WITH CHECK (public.is_active_user());
CREATE POLICY brands_delete_admin ON public.brands
  FOR DELETE USING (public.is_admin());

-- 5) Soft-delete guard: only admin may change deleted_at or owner_user_id
CREATE OR REPLACE FUNCTION public.guard_brand_admin_columns()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
  BEGIN
    IF (NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
        OR NEW.owner_user_id IS DISTINCT FROM OLD.owner_user_id)
       AND NOT public.is_admin() THEN
      RAISE EXCEPTION 'only admin can change deleted_at/owner_user_id';
    END IF;
    RETURN NEW;
  END;
$$;

DROP TRIGGER IF EXISTS brands_guard_admin_columns ON public.brands;
CREATE TRIGGER brands_guard_admin_columns
  BEFORE UPDATE ON public.brands
  FOR EACH ROW EXECUTE FUNCTION public.guard_brand_admin_columns();

COMMIT;
