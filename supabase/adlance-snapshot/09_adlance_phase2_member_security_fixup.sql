-- Adlance Phase 2 — Migration 9/9
-- Version: 20260427151057
-- Name: adlance_phase2_member_security_fixup
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
  IF auth.uid() IS DISTINCT FROM current_owner_id THEN
    RAISE EXCEPTION 'Unauthorized: JWT does not match claimed current_owner_id'
      USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.workspace_members WHERE workspace_id = ws_id AND user_id = new_owner_id) THEN
    RAISE EXCEPTION 'Target user is not a member of the workspace'
      USING ERRCODE = 'P0002';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.workspaces WHERE id = ws_id AND owner_user_id = current_owner_id) THEN
    RAISE EXCEPTION 'Caller is not the current owner'
      USING ERRCODE = '42501';
  END IF;

  IF current_owner_id = new_owner_id THEN
    RAISE EXCEPTION 'Cannot transfer ownership to the same user'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.workspaces SET owner_user_id = new_owner_id WHERE id = ws_id;
  UPDATE public.workspace_members SET role = 'admin' WHERE workspace_id = ws_id AND user_id = current_owner_id;
  UPDATE public.workspace_members SET role = 'owner' WHERE workspace_id = ws_id AND user_id = new_owner_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_last_owner_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  remaining_owners INT;
BEGIN
  IF OLD.role = 'owner' THEN
    SELECT count(*) INTO remaining_owners
    FROM public.workspace_members
    WHERE workspace_id = OLD.workspace_id AND role = 'owner';
    IF remaining_owners <= 1 THEN
      RAISE EXCEPTION 'Cannot remove the last owner of workspace %; transfer ownership first', OLD.workspace_id
        USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS prevent_last_owner_delete_trigger ON public.workspace_members;
CREATE TRIGGER prevent_last_owner_delete_trigger
  BEFORE DELETE ON public.workspace_members
  FOR EACH ROW EXECUTE FUNCTION public.prevent_last_owner_delete();

COMMIT;
