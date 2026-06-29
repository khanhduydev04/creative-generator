import { NextRequest, NextResponse } from "next/server";
import { requireUser, handleApiError, ApiError } from "@/lib/user-context";
import { createClient } from "@/lib/supabase/server";
import { UserConceptService } from "@/services/userConceptService";

interface PatchBody {
  label?: string;
  prompt?: string;
  description?: string;
  reference_images?: string[];
  requires_competitor?: boolean;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await requireUser(req);
    const { id } = await params;
    const body = await req.json().catch(() => null) as PatchBody | null;
    if (!body) throw new ApiError(400, "validation");

    const supabase = await createClient();
    const service = new UserConceptService(supabase, userId);
    const updated = await service.update(id, body);
    return NextResponse.json(updated);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await requireUser(req);
    const { id } = await params;
    const supabase = await createClient();
    const service = new UserConceptService(supabase, userId);
    await service.delete(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
