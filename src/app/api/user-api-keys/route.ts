import { NextRequest, NextResponse } from "next/server";
import { requireUser, handleApiError, ApiError } from "@/lib/user-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { UserApiKeyService } from "@/services/userApiKeyService";
import { isValidProvider, isValidKeyFormat, maskKey } from "@/lib/validators/api-key";
import { clearUserKeyCache } from "@/lib/key-provider";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await requireUser(req);
    const supabase = createAdminClient();
    const service = new UserApiKeyService(supabase, userId);
    const rows = await service.list();
    const keys = rows.map((r) => ({
      provider: r.provider,
      masked: maskKey(),
      updated_at: r.updated_at,
    }));
    return NextResponse.json({ keys });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { userId } = await requireUser(req);
    const body = await req.json().catch(() => null) as { provider?: string; key?: string } | null;
    if (!body || !body.provider || !body.key) {
      throw new ApiError(400, "validation", { issues: ["provider and key required"] });
    }
    if (!isValidProvider(body.provider)) {
      throw new ApiError(400, "validation", { issues: ["unknown provider"] });
    }
    if (!isValidKeyFormat(body.provider, body.key)) {
      throw new ApiError(400, "validation", { issues: ["key format invalid"] });
    }

    const supabase = createAdminClient();
    const service = new UserApiKeyService(supabase, userId);
    await service.upsert(body.provider, body.key);
    clearUserKeyCache(userId);

    return NextResponse.json({ ok: true, masked: maskKey() });
  } catch (e) {
    return handleApiError(e);
  }
}
