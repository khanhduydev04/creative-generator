import { createClient } from "@/lib/supabase/server";
import { requireUser, handleApiError } from "@/lib/user-context";
import { StealthSceneService } from "@/services/stealthSceneService";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireUser(request);
    const brandId = request.nextUrl.searchParams.get("brandId");
    if (!brandId) {
      return NextResponse.json(
        { error: "brandId is required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const service = new StealthSceneService(supabase, userId);
    const scenes = await service.getByBrandId(brandId);
    return NextResponse.json({ scenes });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireUser(request);
    const body = (await request.json()) as {
      brand_id: string;
      scene_id: string;
      category: string;
      name: string;
      description: string;
      placement_method: string;
      best_for_products?: string[];
      best_for_audiences?: string[];
    };

    if (!body.brand_id || !body.scene_id || !body.category || !body.name || !body.description || !body.placement_method) {
      return NextResponse.json(
        { error: "brand_id, scene_id, category, name, description, and placement_method are required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const service = new StealthSceneService(supabase, userId);
    const scene = await service.create({
      brand_id: body.brand_id,
      scene_id: body.scene_id,
      category: body.category,
      name: body.name,
      description: body.description,
      placement_method: body.placement_method,
      best_for_products: body.best_for_products ?? [],
      best_for_audiences: body.best_for_audiences ?? [],
    });

    return NextResponse.json({ scene }, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
