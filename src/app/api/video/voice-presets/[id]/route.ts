import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser, handleApiError } from "@/lib/user-context";
import { VoicePresetService } from "@/services/voicePresetService";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireUser(request);
    const { id } = await params;
    // Safe: request.json() returns the parsed PATCH body
    const body = await request.json() as Record<string, unknown>;

    const supabase = await createClient();
    const service = new VoicePresetService(supabase);
    const preset = await service.update(id, {
      ...(body.display_name !== undefined && { display_name: String(body.display_name) }),
      ...(body.speed !== undefined && { speed: Number(body.speed) }),
      ...(body.pitch !== undefined && { pitch: Number(body.pitch) }),
      ...(body.is_default !== undefined && { is_default: Boolean(body.is_default) }),
    });

    return NextResponse.json({ preset });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireUser(request);
    const { id } = await params;

    const supabase = await createClient();
    const service = new VoicePresetService(supabase);
    await service.delete(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
