-- Adlance Phase 1 — Migration 3/9
-- Version: 20260426144833
-- Name: adlance_rls_policies_v2
-- Dumped from supabase_migrations.schema_migrations on 2026-04-28

BEGIN;

DROP TABLE IF EXISTS public.generated_ads CASCADE;

DROP POLICY IF EXISTS "Allow all for anon" ON public.brand_kits;
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.brand_kits;
DROP POLICY IF EXISTS "Allow all for anon" ON public.brand_products;
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.brand_products;
DROP POLICY IF EXISTS "Allow all for anon" ON public.brand_research_summaries;
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.brand_research_summaries;
DROP POLICY IF EXISTS "Allow all for anon" ON public.persona_profiles;
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.persona_profiles;
DROP POLICY IF EXISTS "Allow anon delete product_markets" ON public.product_markets;
DROP POLICY IF EXISTS "Allow anon insert product_markets" ON public.product_markets;
DROP POLICY IF EXISTS "Allow anon read product_markets" ON public.product_markets;
DROP POLICY IF EXISTS "Allow anon update product_markets" ON public.product_markets;
DROP POLICY IF EXISTS "Allow authenticated delete product_markets" ON public.product_markets;
DROP POLICY IF EXISTS "Allow authenticated insert product_markets" ON public.product_markets;
DROP POLICY IF EXISTS "Allow authenticated read product_markets" ON public.product_markets;
DROP POLICY IF EXISTS "Allow authenticated update product_markets" ON public.product_markets;
DROP POLICY IF EXISTS "Authenticated users can delete saved_ads" ON public.saved_ads;
DROP POLICY IF EXISTS "Authenticated users can insert saved_ads" ON public.saved_ads;
DROP POLICY IF EXISTS "Authenticated users can read saved_ads" ON public.saved_ads;
DROP POLICY IF EXISTS "Allow all access to kie_task_results" ON public.kie_task_results;
DROP POLICY IF EXISTS "Users can delete stealth scenes" ON public.stealth_scenes;
DROP POLICY IF EXISTS "Users can insert stealth scenes" ON public.stealth_scenes;
DROP POLICY IF EXISTS "Users can read stealth scenes for their brands" ON public.stealth_scenes;
DROP POLICY IF EXISTS "Users can update stealth scenes" ON public.stealth_scenes;
DROP POLICY IF EXISTS "concept_prompts_select" ON public.concept_prompts;
DROP POLICY IF EXISTS "concept_prompts_insert" ON public.concept_prompts;
DROP POLICY IF EXISTS "concept_prompts_update" ON public.concept_prompts;
DROP POLICY IF EXISTS "concept_prompts_delete" ON public.concept_prompts;

CREATE OR REPLACE FUNCTION public.user_in_workspace(ws_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = ws_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.user_workspace_role(ws_id UUID)
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM public.workspace_members
  WHERE workspace_id = ws_id AND user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(
    (SELECT is_platform_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select ON public.profiles
  FOR SELECT USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm1
      JOIN public.workspace_members wm2 ON wm2.workspace_id = wm1.workspace_id
      WHERE wm1.user_id = auth.uid() AND wm2.user_id = profiles.id
    )
    OR public.is_platform_admin()
  );

CREATE POLICY profiles_update_self ON public.profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY workspaces_select ON public.workspaces
  FOR SELECT USING (public.user_in_workspace(id) OR public.is_platform_admin());

CREATE POLICY workspaces_insert ON public.workspaces
  FOR INSERT WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY workspaces_update ON public.workspaces
  FOR UPDATE USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid() OR public.is_platform_admin());

CREATE POLICY workspaces_delete ON public.workspaces
  FOR DELETE USING (owner_user_id = auth.uid());

ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY workspace_members_select ON public.workspace_members
  FOR SELECT USING (public.user_in_workspace(workspace_id) OR public.is_platform_admin());

CREATE POLICY workspace_members_insert ON public.workspace_members
  FOR INSERT WITH CHECK (
    public.user_workspace_role(workspace_id) IN ('owner','admin')
    OR user_id = auth.uid()
  );

CREATE POLICY workspace_members_update ON public.workspace_members
  FOR UPDATE USING (public.user_workspace_role(workspace_id) = 'owner');

CREATE POLICY workspace_members_delete ON public.workspace_members
  FOR DELETE USING (
    public.user_workspace_role(workspace_id) IN ('owner','admin')
    OR user_id = auth.uid()
  );

ALTER TABLE public.workspace_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY workspace_api_keys_select ON public.workspace_api_keys
  FOR SELECT USING (public.user_in_workspace(workspace_id));

CREATE POLICY workspace_api_keys_write ON public.workspace_api_keys
  FOR ALL USING (public.user_workspace_role(workspace_id) IN ('owner','admin'))
  WITH CHECK (public.user_workspace_role(workspace_id) IN ('owner','admin'));

ALTER TABLE public.workspace_concepts ENABLE ROW LEVEL SECURITY;

CREATE POLICY workspace_concepts_select ON public.workspace_concepts
  FOR SELECT USING (public.user_in_workspace(workspace_id));

CREATE POLICY workspace_concepts_write ON public.workspace_concepts
  FOR ALL USING (public.user_workspace_role(workspace_id) IN ('owner','admin'))
  WITH CHECK (public.user_workspace_role(workspace_id) IN ('owner','admin'));

ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY workspace_invitations_select ON public.workspace_invitations
  FOR SELECT USING (public.user_workspace_role(workspace_id) IN ('owner','admin'));

CREATE POLICY workspace_invitations_write ON public.workspace_invitations
  FOR ALL USING (public.user_workspace_role(workspace_id) IN ('owner','admin'))
  WITH CHECK (public.user_workspace_role(workspace_id) IN ('owner','admin'));

ALTER TABLE public.workspace_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY workspace_activity_log_select ON public.workspace_activity_log
  FOR SELECT USING (public.user_in_workspace(workspace_id));

ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY brands_select ON public.brands
  FOR SELECT USING (public.user_in_workspace(workspace_id));

CREATE POLICY brands_write ON public.brands
  FOR ALL USING (public.user_in_workspace(workspace_id))
  WITH CHECK (public.user_in_workspace(workspace_id));

ALTER TABLE public.brand_kits ENABLE ROW LEVEL SECURITY;
CREATE POLICY brand_kits_all ON public.brand_kits
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.brands b WHERE b.id = brand_id AND public.user_in_workspace(b.workspace_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.brands b WHERE b.id = brand_id AND public.user_in_workspace(b.workspace_id)
  ));

ALTER TABLE public.brand_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY brand_products_all ON public.brand_products
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.brands b WHERE b.id = brand_id AND public.user_in_workspace(b.workspace_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.brands b WHERE b.id = brand_id AND public.user_in_workspace(b.workspace_id)
  ));

ALTER TABLE public.product_markets ENABLE ROW LEVEL SECURITY;
CREATE POLICY product_markets_all ON public.product_markets
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.brand_products p
    JOIN public.brands b ON b.id = p.brand_id
    WHERE p.id = product_id AND public.user_in_workspace(b.workspace_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.brand_products p
    JOIN public.brands b ON b.id = p.brand_id
    WHERE p.id = product_id AND public.user_in_workspace(b.workspace_id)
  ));

ALTER TABLE public.persona_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY persona_profiles_all ON public.persona_profiles
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.brands b WHERE b.id = brand_id AND public.user_in_workspace(b.workspace_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.brands b WHERE b.id = brand_id AND public.user_in_workspace(b.workspace_id)
  ));

ALTER TABLE public.brand_research_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY brand_research_summaries_all ON public.brand_research_summaries
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.brands b WHERE b.id = brand_id AND public.user_in_workspace(b.workspace_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.brands b WHERE b.id = brand_id AND public.user_in_workspace(b.workspace_id)
  ));

ALTER TABLE public.saved_ads ENABLE ROW LEVEL SECURITY;
CREATE POLICY saved_ads_all ON public.saved_ads
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.brands b WHERE b.id = brand_id AND public.user_in_workspace(b.workspace_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.brands b WHERE b.id = brand_id AND public.user_in_workspace(b.workspace_id)
  ));

ALTER TABLE public.kie_task_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY kie_task_results_select ON public.kie_task_results
  FOR SELECT USING (auth.uid() IS NOT NULL);

ALTER TABLE public.stealth_scenes ENABLE ROW LEVEL SECURITY;
CREATE POLICY stealth_scenes_all ON public.stealth_scenes
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.brands b WHERE b.id = brand_id AND public.user_in_workspace(b.workspace_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.brands b WHERE b.id = brand_id AND public.user_in_workspace(b.workspace_id)
  ));

ALTER TABLE public.concept_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY concept_prompts_select ON public.concept_prompts
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY concept_prompts_write ON public.concept_prompts
  FOR ALL USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

COMMIT;
