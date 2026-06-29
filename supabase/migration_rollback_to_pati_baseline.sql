-- ============================================================
-- ROLLBACK ADLANCE PHASE 1+2 → PATI BASELINE
-- Applied 2026-04-28 via Supabase MCP `apply_migration`
-- Snapshot of Adlance migrations preserved at supabase/adlance-snapshot/
-- ============================================================

BEGIN;

-- ---------- PART 1: Drop Adlance objects ----------

DROP POLICY IF EXISTS "adlance_buckets_public_read" ON storage.objects;
DROP POLICY IF EXISTS "adlance_buckets_member_insert" ON storage.objects;
DROP POLICY IF EXISTS "adlance_buckets_member_update" ON storage.objects;
DROP POLICY IF EXISTS "adlance_buckets_member_delete" ON storage.objects;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

DROP TRIGGER IF EXISTS prevent_last_owner_delete_trigger ON public.workspace_members;
DROP FUNCTION IF EXISTS public.prevent_last_owner_delete() CASCADE;

DROP TABLE IF EXISTS public.workspace_activity_log CASCADE;
DROP TABLE IF EXISTS public.workspace_invitations CASCADE;
DROP TABLE IF EXISTS public.workspace_concepts CASCADE;
DROP TABLE IF EXISTS public.workspace_api_keys CASCADE;
DROP TABLE IF EXISTS public.workspace_members CASCADE;
DROP TABLE IF EXISTS public.workspaces CASCADE;

DROP FUNCTION IF EXISTS public.transfer_workspace_ownership(UUID, UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.user_in_workspace(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.user_workspace_role(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.is_platform_admin() CASCADE;
DROP FUNCTION IF EXISTS public.set_updated_at() CASCADE;

DROP POLICY IF EXISTS profiles_select ON public.profiles;
DROP POLICY IF EXISTS profiles_update_self ON public.profiles;
DROP POLICY IF EXISTS brands_select ON public.brands;
DROP POLICY IF EXISTS brands_write ON public.brands;
DROP POLICY IF EXISTS brand_kits_all ON public.brand_kits;
DROP POLICY IF EXISTS brand_products_all ON public.brand_products;
DROP POLICY IF EXISTS product_markets_all ON public.product_markets;
DROP POLICY IF EXISTS persona_profiles_all ON public.persona_profiles;
DROP POLICY IF EXISTS brand_research_summaries_all ON public.brand_research_summaries;
DROP POLICY IF EXISTS saved_ads_all ON public.saved_ads;
DROP POLICY IF EXISTS kie_task_results_select ON public.kie_task_results;
DROP POLICY IF EXISTS stealth_scenes_all ON public.stealth_scenes;
DROP POLICY IF EXISTS concept_prompts_select ON public.concept_prompts;
DROP POLICY IF EXISTS concept_prompts_write ON public.concept_prompts;

-- ---------- PART 2: Restore profiles columns ----------

ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_platform_admin;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('ceo', 'super_admin', 'member'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- ---------- PART 3: Recreate clients + restore brands.client_id ----------

CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for anon" ON public.clients FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.clients FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.brands DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS client_id uuid;
ALTER TABLE public.brands DROP CONSTRAINT IF EXISTS brands_client_id_fkey;
ALTER TABLE public.brands ADD CONSTRAINT brands_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;
ALTER TABLE public.brands ALTER COLUMN client_id SET NOT NULL;
DROP INDEX IF EXISTS public.brands_workspace_idx;
CREATE INDEX IF NOT EXISTS idx_brands_client_id ON public.brands(client_id);

-- ---------- PART 4: Restore baseline RLS policies ----------

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('ceo', 'super_admin') AND p.is_active = true)
);
CREATE POLICY "Admins can update profiles" ON public.profiles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('ceo', 'super_admin') AND p.is_active = true)
);
CREATE POLICY "Users can update own name" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (
  auth.uid() = id AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
);
CREATE POLICY "Service role full access" ON public.profiles USING (auth.role() = 'service_role');

CREATE POLICY "Allow all for anon" ON public.brands FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.brands FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for anon" ON public.brand_kits FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.brand_kits FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for anon" ON public.brand_research_summaries FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.brand_research_summaries FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for anon" ON public.persona_profiles FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.persona_profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for anon" ON public.brand_products FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON public.brand_products FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon read product_markets" ON public.product_markets FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert product_markets" ON public.product_markets FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update product_markets" ON public.product_markets FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete product_markets" ON public.product_markets FOR DELETE TO anon USING (true);
CREATE POLICY "Allow authenticated read product_markets" ON public.product_markets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert product_markets" ON public.product_markets FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update product_markets" ON public.product_markets FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated delete product_markets" ON public.product_markets FOR DELETE TO authenticated USING (true);

CREATE POLICY "Users can read stealth scenes for their brands" ON public.stealth_scenes FOR SELECT USING (true);
CREATE POLICY "Users can insert stealth scenes" ON public.stealth_scenes FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update stealth scenes" ON public.stealth_scenes FOR UPDATE USING (true);
CREATE POLICY "Users can delete stealth scenes" ON public.stealth_scenes FOR DELETE USING (true);

CREATE POLICY "Authenticated users can read saved_ads" ON public.saved_ads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert saved_ads" ON public.saved_ads FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can delete saved_ads" ON public.saved_ads FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow all access to kie_task_results" ON public.kie_task_results FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "concept_prompts_select" ON public.concept_prompts FOR SELECT USING (true);
CREATE POLICY "concept_prompts_insert" ON public.concept_prompts FOR INSERT WITH CHECK (true);
CREATE POLICY "concept_prompts_update" ON public.concept_prompts FOR UPDATE USING (true);
CREATE POLICY "concept_prompts_delete" ON public.concept_prompts FOR DELETE USING (true);

-- ---------- PART 5: CEO protection triggers ----------

CREATE OR REPLACE FUNCTION public.protect_ceo()
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

DROP TRIGGER IF EXISTS protect_ceo_trigger ON public.profiles;
CREATE TRIGGER protect_ceo_trigger BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_ceo();

CREATE OR REPLACE FUNCTION public.prevent_ceo_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.role = 'ceo' THEN
    RAISE EXCEPTION 'Cannot delete CEO account';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_ceo_delete_trigger ON public.profiles;
CREATE TRIGGER prevent_ceo_delete_trigger BEFORE DELETE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.prevent_ceo_delete();

-- ---------- PART 6: activity_log ----------

CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view logs" ON public.activity_log FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('ceo', 'super_admin') AND is_active = true)
);
CREATE POLICY "Service role full access on activity_log" ON public.activity_log USING (auth.role() = 'service_role');

-- ---------- PART 7: app_settings ----------

CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE OR REPLACE FUNCTION public.update_app_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_app_settings_updated_at ON public.app_settings;
CREATE TRIGGER trg_app_settings_updated_at BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.update_app_settings_timestamp();

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can view settings" ON public.app_settings FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_active = true AND role IN ('ceo', 'super_admin'))
);
CREATE POLICY "Admin can insert settings" ON public.app_settings FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_active = true AND role IN ('ceo', 'super_admin'))
);
CREATE POLICY "Admin can update settings" ON public.app_settings FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_active = true AND role IN ('ceo', 'super_admin'))
);
CREATE POLICY "CEO can delete settings" ON public.app_settings FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_active = true AND role = 'ceo')
);

INSERT INTO public.app_settings (key, label, value) VALUES
  ('google_api_key',         'Google AI (Gemini)',        ''),
  ('kie_api_key',            'KIE AI (Image Generation)', ''),
  ('google_console_api_key', 'Google Cloud Console',      ''),
  ('anthropic_api_key',      'Anthropic (Claude)',        '')
ON CONFLICT (key) DO NOTHING;

-- ---------- PART 8: updated_at triggers ----------

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON public.clients;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ---------- PART 9: Storage policies (PATI baseline) ----------

CREATE POLICY "Public read brand-assets" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'brand-assets');
CREATE POLICY "Anon upload brand-assets" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'brand-assets');
CREATE POLICY "Anon update brand-assets" ON storage.objects FOR UPDATE TO anon, authenticated USING (bucket_id = 'brand-assets');
CREATE POLICY "Anon delete brand-assets" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'brand-assets');

CREATE POLICY "Public read campaign-inputs" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'campaign-inputs');
CREATE POLICY "Anon upload campaign-inputs" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'campaign-inputs');
CREATE POLICY "Anon update campaign-inputs" ON storage.objects FOR UPDATE TO anon, authenticated USING (bucket_id = 'campaign-inputs');
CREATE POLICY "Anon delete campaign-inputs" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'campaign-inputs');

CREATE POLICY "Public read generated-ads" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'generated-ads');
CREATE POLICY "Anon upload generated-ads" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'generated-ads');
CREATE POLICY "Anon update generated-ads" ON storage.objects FOR UPDATE TO anon, authenticated USING (bucket_id = 'generated-ads');
CREATE POLICY "Anon delete generated-ads" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'generated-ads');

-- ---------- PART 10: Promote pati@patigroup.com to CEO ----------

UPDATE public.profiles
SET role = 'ceo', is_active = true
WHERE email = 'pati@patigroup.com';

COMMIT;
