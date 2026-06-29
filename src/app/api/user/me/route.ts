import { NextRequest, NextResponse } from "next/server";
import { requireUser, handleApiError, ApiError } from "@/lib/user-context";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { UserService } from "@/services/userService";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await requireUser(req);
    const supabase = await createClient();
    const service = new UserService(supabase, userId);
    return NextResponse.json(await service.getMe());
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await requireUser(req);
    const body = (await req.json().catch(() => null)) as { confirm?: string } | null;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!body || body.confirm !== user?.email) {
      throw new ApiError(400, "confirm_email_required");
    }

    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) throw new ApiError(500, "delete_failed", { message: error.message });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
