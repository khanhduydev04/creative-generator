-- ============================================================================
-- Adlance BYOK Pivot — Phase 2.4 — RLS policies (solo-user tenancy)
-- ============================================================================

BEGIN;

-- profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select ON public.profiles
  FOR SELECT USING (
    id = auth.uid()
    OR (SELECT is_platform_admin FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY profiles_update_self ON public.profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND is_platform_admin = (SELECT is_platform_admin FROM public.profiles WHERE id = auth.uid())
  );

-- user_api_keys
ALTER TABLE public.user_api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_api_keys_all ON public.user_api_keys
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- user_concepts
ALTER TABLE public.user_concepts ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_concepts_all ON public.user_concepts
  FOR ALL USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

-- brands
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY brands_select ON public.brands
  FOR SELECT USING (owner_user_id = auth.uid());
CREATE POLICY brands_write ON public.brands
  FOR ALL USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

-- brand-scoped tables
ALTER TABLE public.brand_kits ENABLE ROW LEVEL SECURITY;
CREATE POLICY brand_kits_all ON public.brand_kits
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.brands b WHERE b.id = brand_id AND b.owner_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.brands b WHERE b.id = brand_id AND b.owner_user_id = auth.uid()
  ));

ALTER TABLE public.brand_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY brand_products_all ON public.brand_products
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.brands b WHERE b.id = brand_id AND b.owner_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.brands b WHERE b.id = brand_id AND b.owner_user_id = auth.uid()
  ));

ALTER TABLE public.persona_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY persona_profiles_all ON public.persona_profiles
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.brands b WHERE b.id = brand_id AND b.owner_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.brands b WHERE b.id = brand_id AND b.owner_user_id = auth.uid()
  ));

ALTER TABLE public.brand_research_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY brand_research_summaries_all ON public.brand_research_summaries
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.brands b WHERE b.id = brand_id AND b.owner_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.brands b WHERE b.id = brand_id AND b.owner_user_id = auth.uid()
  ));

ALTER TABLE public.saved_ads ENABLE ROW LEVEL SECURITY;
CREATE POLICY saved_ads_all ON public.saved_ads
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.brands b WHERE b.id = brand_id AND b.owner_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.brands b WHERE b.id = brand_id AND b.owner_user_id = auth.uid()
  ));

-- kie_task_results: server-side polling cache. RLS enabled with NO client
-- policy — only the service role (bypasses RLS) reads/writes. End users
-- never query this table directly; they call /api/generate-ads which polls
-- KIE server-side and surfaces results via SSE.
ALTER TABLE public.kie_task_results ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.stealth_scenes ENABLE ROW LEVEL SECURITY;
CREATE POLICY stealth_scenes_all ON public.stealth_scenes
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.brands b WHERE b.id = brand_id AND b.owner_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.brands b WHERE b.id = brand_id AND b.owner_user_id = auth.uid()
  ));

-- concept_prompts (system, read-only for users; admin write)
ALTER TABLE public.concept_prompts ENABLE ROW LEVEL SECURITY;
CREATE POLICY concept_prompts_select ON public.concept_prompts
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY concept_prompts_write ON public.concept_prompts
  FOR ALL USING (
    (SELECT is_platform_admin FROM public.profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    (SELECT is_platform_admin FROM public.profiles WHERE id = auth.uid())
  );

COMMIT;
