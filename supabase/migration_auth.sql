-- ============================================================
-- AUTH SYSTEM MIGRATION
-- Tables: profiles, activity_log
-- RLS policies, triggers, CEO protection
-- ============================================================

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('ceo', 'super_admin', 'member')),
  department TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  last_login_at TIMESTAMPTZ
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 2. ACTIVITY LOG TABLE
CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  target_user_id UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. RLS — PROFILES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('ceo', 'super_admin')
      AND is_active = true
    )
  );

CREATE POLICY "Admins can update profiles"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('ceo', 'super_admin')
      AND is_active = true
    )
  );

CREATE POLICY "Users can update own name"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM profiles WHERE id = auth.uid())
  );

-- Service role bypass (for admin API operations)
CREATE POLICY "Service role full access"
  ON profiles
  USING (auth.role() = 'service_role');

-- 4. RLS — ACTIVITY LOG
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view logs"
  ON activity_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('ceo', 'super_admin')
      AND is_active = true
    )
  );

CREATE POLICY "Service role full access on activity_log"
  ON activity_log
  USING (auth.role() = 'service_role');

-- 5. CEO PROTECTION TRIGGERS

-- Prevent deactivation or demotion of CEO
CREATE OR REPLACE FUNCTION protect_ceo()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.role = 'ceo' THEN
    IF NEW.is_active = false THEN
      RAISE EXCEPTION 'Cannot deactivate CEO account';
    END IF;
    IF NEW.role != 'ceo' THEN
      RAISE EXCEPTION 'Cannot change CEO role';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER protect_ceo_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION protect_ceo();

-- Prevent deleting CEO profile
CREATE OR REPLACE FUNCTION prevent_ceo_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.role = 'ceo' THEN
    RAISE EXCEPTION 'Cannot delete CEO account';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_ceo_delete_trigger
  BEFORE DELETE ON profiles
  FOR EACH ROW EXECUTE FUNCTION prevent_ceo_delete();
