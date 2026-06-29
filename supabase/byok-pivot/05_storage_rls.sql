-- ============================================================================
-- Adlance BYOK Pivot — Phase 2.5 — Storage RLS (path-based by user_id)
-- ============================================================================
-- Path convention: {user_id}/{brand_id}/{filename}
-- First path segment (storage.foldername(name))[1] = user UUID.
-- ============================================================================

BEGIN;

-- Drop legacy bucket-level policies (best effort)
DROP POLICY IF EXISTS "Public read brand-assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated write brand-assets" ON storage.objects;
DROP POLICY IF EXISTS "Public read generated-ads" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated write generated-ads" ON storage.objects;
DROP POLICY IF EXISTS "Public read images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated write images" ON storage.objects;

-- Drop snapshot policies if they leaked
DROP POLICY IF EXISTS "adlance_buckets_public_read" ON storage.objects;
DROP POLICY IF EXISTS "adlance_buckets_member_insert" ON storage.objects;
DROP POLICY IF EXISTS "adlance_buckets_member_update" ON storage.objects;
DROP POLICY IF EXISTS "adlance_buckets_member_delete" ON storage.objects;

-- Public READ for hot-linking ads/brand assets/images
CREATE POLICY "byok_buckets_public_read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id IN ('brand-assets','generated-ads','images'));

-- Authenticated INSERT — owner only
CREATE POLICY "byok_buckets_owner_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id IN ('brand-assets','generated-ads','images')
  AND (storage.foldername(name))[1]::uuid = auth.uid()
);

-- Authenticated UPDATE — owner only
CREATE POLICY "byok_buckets_owner_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id IN ('brand-assets','generated-ads','images')
  AND (storage.foldername(name))[1]::uuid = auth.uid()
)
WITH CHECK (
  bucket_id IN ('brand-assets','generated-ads','images')
  AND (storage.foldername(name))[1]::uuid = auth.uid()
);

-- Authenticated DELETE — owner only
CREATE POLICY "byok_buckets_owner_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id IN ('brand-assets','generated-ads','images')
  AND (storage.foldername(name))[1]::uuid = auth.uid()
);

COMMIT;
