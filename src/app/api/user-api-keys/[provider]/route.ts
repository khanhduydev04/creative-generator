import { NextRequest, NextResponse } from "next/server";
import { requireUser, handleApiError, ApiError } from "@/lib/user-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { UserApiKeyService } from "@/services/userApiKeyService";
import { isValidProvider } from "@/lib/validators/api-key";
import { clearUserKeyCache } from "@/lib/key-provider";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  try {
    const { userId } = await requireUser(req);
    const { provider } = await params;
    if (!isValidProvider(provider)) throw new ApiError(400, "validation");

    const supabase = createAdminClient();
    const service = new UserApiKeyService(supabase, userId);
    await service.delete(provider);
    clearUserKeyCache(userId);

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
