-- ============================================================================
-- Migration: app_settings table for runtime API key management
-- ============================================================================

-- Table: app_settings
-- Stores key-value pairs for API keys and other runtime config.
-- Only accessible by admin roles (ceo, super_admin) via RLS.
CREATE TABLE IF NOT EXISTS app_settings (
  key       TEXT PRIMARY KEY,
  value     TEXT NOT NULL,
  label     TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_app_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_app_settings_timestamp();

-- ─── Row Level Security ─────────────────────────────────────────────────────

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Only admin roles can SELECT
CREATE POLICY "Admin can view settings"
  ON app_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.is_active = true
        AND profiles.role IN ('ceo', 'super_admin')
    )
  );

-- Only admin roles can INSERT
CREATE POLICY "Admin can insert settings"
  ON app_settings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.is_active = true
        AND profiles.role IN ('ceo', 'super_admin')
    )
  );

-- Only admin roles can UPDATE
CREATE POLICY "Admin can update settings"
  ON app_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.is_active = true
        AND profiles.role IN ('ceo', 'super_admin')
    )
  );

-- Only CEO can DELETE (dangerous operation)
CREATE POLICY "CEO can delete settings"
  ON app_settings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.is_active = true
        AND profiles.role = 'ceo'
    )
  );

-- Service role bypasses RLS (for server-side key-provider reads)
-- This is automatic in Supabase for service_role key.

-- ─── Seed default key entries (empty values — filled via admin UI) ──────────

INSERT INTO app_settings (key, label, value) VALUES
  ('google_api_key',         'Google AI (Gemini)',        ''),
  ('kie_api_key',            'KIE AI (Image Generation)', ''),
  ('google_console_api_key', 'Google Cloud Console',      '')
ON CONFLICT (key) DO NOTHING;
