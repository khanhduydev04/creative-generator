-- ============================================================================
-- Adlance BYOK Pivot — Phase 2.3 — Create user-scoped tables
-- ============================================================================

BEGIN;

-- Per-user encrypted API keys
CREATE TABLE public.user_api_keys (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('anthropic','google','kie')),
  encrypted_key TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, provider)
);

-- Per-user custom concepts (system concepts stay in concept_prompts)
CREATE TABLE public.user_concepts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  description TEXT,
  prompt TEXT NOT NULL,
  reference_images TEXT[] NOT NULL DEFAULT '{}',
  requires_competitor BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX user_concepts_owner_idx ON public.user_concepts(owner_user_id);

-- Auto-update updated_at on user_concepts
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_concepts_set_updated_at ON public.user_concepts;
CREATE TRIGGER user_concepts_set_updated_at
  BEFORE UPDATE ON public.user_concepts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMIT;
