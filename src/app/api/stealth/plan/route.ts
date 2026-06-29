import type { StealthPlanRequest } from "@/features/stealth/types";
import { readProductPage } from "@/lib/gemini-reader";
import { STEALTH_SCENES, mergeScenes } from "@/lib/stealth-scenes";
import { planStealthScenes } from "@/lib/stealth-planner";
import { createClient } from "@/lib/supabase/server";
import { requireUser, handleApiError } from "@/lib/user-context";
import { StealthSceneService } from "@/services/stealthSceneService";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: StealthPlanRequest;
  try {
    body = (await request.json()) as StealthPlanRequest;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 },
    );
  }

  // Validate required fields
  if (!body.productName || !body.landingPageUrl || !body.targetAudience) {
    return NextResponse.json(
      { success: false, error: "Missing required fields: productName, landingPageUrl, targetAudience" },
      { status: 400 },
    );
  }

  const quantity = Math.min(Math.max(body.quantity ?? 1, 1), 10);

  try {
    const { userId } = await requireUser(request);

    // Load custom scenes if brandId provided — fall back to built-in on error
    let allScenes = STEALTH_SCENES;
    if (body.brandId) {
      try {
        const supabase = await createClient();
        const sceneService = new StealthSceneService(supabase, userId);
        const customScenes = await sceneService.getByBrandId(body.brandId);
        if (customScenes.length > 0) {
          allScenes = mergeScenes(STEALTH_SCENES, customScenes);
        }
      } catch (sceneErr) {
        console.warn("[stealth/plan] Failed to load custom scenes, using built-in:", sceneErr);
      }
    }

    // Read product page for context
    console.log("[stealth/plan] Reading product page:", body.landingPageUrl);
    const productContext = await readProductPage(userId, body.landingPageUrl);

    // Plan scenes with Gemini
    console.log(`[stealth/plan] Planning ${quantity} scenes (${allScenes.length} scenes available)...`);
    const plans = await planStealthScenes(
      userId,
      body.productName,
      body.productDescription,
      JSON.stringify(productContext),
      body.targetAudience,
      body.sceneSelection,
      body.market || "US",
      quantity,
      body.language,
      body.aspectRatio ?? "1:1",
      body.sensitivityLevel ?? "normal",
      body.audienceAgeRange,
      allScenes,
    );

    return NextResponse.json({ success: true, plans });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[stealth/plan] Error:", message);
    return handleApiError(e);
  }
}
