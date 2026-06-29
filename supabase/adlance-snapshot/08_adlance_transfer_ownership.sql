-- Adlance Phase 1 — Migration 8/9
-- Version: 20260427150709
-- Name: adlance_transfer_ownership
-- Dumped from supabase_migrations.schema_migrations on 2026-04-28

BEGIN;

CREATE OR REPLACE FUNCTION public.transfer_workspace_ownership(
  ws_id UUID,
  current_owner_id UUID,
  new_owner_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.workspace_members WHERE workspace_id = ws_id AND user_id = new_owner_id) THEN
    RAISE EXCEPTION 'Target user is not a member of the workspace';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.workspaces WHERE id = ws_id AND owner_user_id = current_owner_id) THEN
    RAISE EXCEPTION 'Caller is not the current owner';
  END IF;

  IF current_owner_id = new_owner_id THEN
    RAISE EXCEPTION 'Cannot transfer ownership to the same user';
  END IF;

  UPDATE public.workspaces SET owner_user_id = new_owner_id WHERE id = ws_id;
  UPDATE public.workspace_members SET role = 'admin' WHERE workspace_id = ws_id AND user_id = current_owner_id;
  UPDATE public.workspace_members SET role = 'owner' WHERE workspace_id = ws_id AND user_id = new_owner_id;
END;
$$;

COMMIT;
