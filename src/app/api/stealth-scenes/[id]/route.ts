import { createClient } from "@/lib/supabase/server";
import { requireUser, handleApiError } from "@/lib/user-context";
import { StealthSceneService } from "@/services/stealthSceneService";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const { userId } = await requireUser(request);
    const body = (await request.json()) as {
      scene_id?: string;
      category?: string;
      name?: string;
      description?: string;
      placement_method?: string;
      best_for_products?: string[];
      best_for_audiences?: string[];
    };

    const supabase = await createClient();
    const service = new StealthSceneService(supabase, userId);
    const scene = await service.update(id, body);
    return NextResponse.json({ scene });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const { userId } = await requireUser(request);
    const supabase = await createClient();
    const service = new StealthSceneService(supabase, userId);
    await service.delete(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    return handleApiError(e);
  }
}
