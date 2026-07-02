-- supabase/migrations/17_brand_script_product_id.sql
BEGIN;

ALTER TABLE public.brand_scripts
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.brand_products(id) ON DELETE SET NULL;

UPDATE public.brand_scripts bs
SET product_id = (bs.prompt_config->>'productId')::uuid
WHERE bs.prompt_config->>'productId' IS NOT NULL
  AND bs.prompt_config->>'productId' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND EXISTS (
    SELECT 1 FROM public.brand_products bp WHERE bp.id = (bs.prompt_config->>'productId')::uuid
  );

COMMIT;
