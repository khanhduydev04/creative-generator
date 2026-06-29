import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser, handleApiError } from "@/lib/user-context";
import { ScriptService } from "@/services/scriptService";
import type { PatchScriptRequest } from "@/features/video/types";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    await requireUser(request);
    const { id } = await params;
    // Safe: the only consumed field (finalText) is validated by the typeof guard below.
    const body = (await request.json()) as PatchScriptRequest;

    if (typeof body.finalText !== "string") {
      return NextResponse.json({ error: "finalText is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const service = new ScriptService(supabase);
    const script = await service.saveFinalText(id, body.finalText);
    return NextResponse.json({ script });
  } catch (error) {
    return handleApiError(error);
  }
}
