-- supabase/migrations/13_shared_workspace_child_rls.sql
-- Replace owner-based policies with shared-pool model.
-- brand_apify_config: read = active user, write = admin only.
-- All other child tables: full access = active user.
-- product_markets excluded: table does not exist on live DB.
BEGIN;

-- brand_apify_config: read for all active users, write restricted to admin
ALTER TABLE public.brand_apify_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS brand_apify_config_all         ON public.brand_apify_config;
DROP POLICY IF EXISTS brand_apify_config_select      ON public.brand_apify_config;
DROP POLICY IF EXISTS brand_apify_config_write_admin ON public.brand_apify_config;
CREATE POLICY brand_apify_config_select ON public.brand_apify_config
  FOR SELECT USING (public.is_active_user());
CREATE POLICY brand_apify_config_write_admin ON public.brand_apify_config
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Remaining child tables: shared-pool FOR ALL = is_active_user()
DO $$
DECLARE t text;
DECLARE tables text[] := ARRAY[
  'brand_kits','brand_products','brand_research_summaries','persona_profiles',
  'saved_ads','stealth_scenes','competitor_videos',
  'transcripts','brand_scripts','voice_presets','voice_ratings','generated_audios'
];
DECLARE oldpolicies text[] := ARRAY[
  'brand_kits_all','brand_products_all','brand_research_summaries_all','persona_profiles_all',
  'saved_ads_all','stealth_scenes_all','competitor_videos_all',
  'transcripts_all','brand_scripts_all','voice_presets_all','voice_ratings_all','generated_audios_all'
];
DECLARE i int;
BEGIN
  FOR i IN 1 .. array_length(tables,1) LOOP
    t := tables[i];
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', oldpolicies[i], t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', t || '_shared', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL USING (public.is_active_user()) WITH CHECK (public.is_active_user());',
      t || '_shared', t);
  END LOOP;
END $$;

COMMIT;
