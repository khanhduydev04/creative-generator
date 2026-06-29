-- Adlance Phase 1 — Migration 4/9
-- Version: 20260426144940
-- Name: adlance_storage_rls
-- Dumped from supabase_migrations.schema_migrations on 2026-04-28

BEGIN;

DROP POLICY IF EXISTS "Anon delete brand-assets" ON storage.objects;
DROP POLICY IF EXISTS "Anon delete campaign-inputs" ON storage.objects;
DROP POLICY IF EXISTS "Anon delete generated-ads" ON storage.objects;
DROP POLICY IF EXISTS "Anon update brand-assets" ON storage.objects;
DROP POLICY IF EXISTS "Anon update campaign-inputs" ON storage.objects;
DROP POLICY IF EXISTS "Anon update generated-ads" ON storage.objects;
DROP POLICY IF EXISTS "Anon upload brand-assets" ON storage.objects;
DROP POLICY IF EXISTS "Anon upload campaign-inputs" ON storage.objects;
DROP POLICY IF EXISTS "Anon upload generated-ads" ON storage.objects;
DROP POLICY IF EXISTS "Public read brand-assets" ON storage.objects;
DROP POLICY IF EXISTS "Public read campaign-inputs" ON storage.objects;
DROP POLICY IF EXISTS "Public read generated-ads" ON storage.objects;

CREATE POLICY "adlance_buckets_public_read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id IN ('brand-assets', 'generated-ads'));

CREATE POLICY "adlance_buckets_member_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id IN ('brand-assets', 'generated-ads')
  AND public.user_in_workspace((storage.foldername(name))[1]::uuid)
);

CREATE POLICY "adlance_buckets_member_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id IN ('brand-assets', 'generated-ads')
  AND public.user_in_workspace((storage.foldername(name))[1]::uuid)
)
WITH CHECK (
  bucket_id IN ('brand-assets', 'generated-ads')
  AND public.user_in_workspace((storage.foldername(name))[1]::uuid)
);

CREATE POLICY "adlance_buckets_member_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id IN ('brand-assets', 'generated-ads')
  AND public.user_workspace_role((storage.foldername(name))[1]::uuid) IN ('owner', 'admin')
);

COMMIT;
