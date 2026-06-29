import type { ProductContext } from "@/lib/gemini-reader";
import { readProductPage, analyzeCompetitorAdImage } from "@/lib/gemini-reader";
import { planScenesFromReference, buildAnalysisSummary } from "@/lib/stealth-ref-planner";
import { requireUser, handleApiError } from "@/lib/user-context";
import { NextRequest, NextResponse } from "next/server";

interface StealthRefPlanRequestBody {
  productName: string;
  productDescription?: string | null;
  landingPageUrl: string;
  competitorRefImageUrl: string;
  targetAudience: {
    title: string;
    pain: string;
    angle: string;
    emotion: string;
  };
  market?: string;
  language?: string;
  quantity: number;
  aspectRatio: string;
  sensitivityLevel?: "normal" | "high";
  audienceAgeRange?: string;
  // Pre-cached data from /api/prepare-generation (pack mode optimization)
  cachedProductContext?: ProductContext;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: StealthRefPlanRequestBody;
  try {
    body = (await request.json()) as StealthRefPlanRequestBody;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 },
    );
  }

  if (
    !body.productName ||
    !body.landingPageUrl ||
    !body.competitorRefImageUrl ||
    !body.targetAudience
  ) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Missing required fields: productName, landingPageUrl, competitorRefImageUrl, targetAudience",
      },
      { status: 400 },
    );
  }

  const quantity = Math.min(Math.max(body.quantity ?? 1, 1), 10);

  try {
    const { userId } = await requireUser(request);

    // Step 1: Read product page for context (skip if cached)
    let productContext: ProductContext;
    if (body.cachedProductContext) {
      console.log("[stealth-ref/plan] Using cached product context");
      productContext = body.cachedProductContext;
    } else {
      console.log("[stealth-ref/plan] Reading product page:", body.landingPageUrl);
      productContext = await readProductPage(userId, body.landingPageUrl);
    }

    // Step 2: Analyze the competitor reference image
    console.log("[stealth-ref/plan] Analyzing reference image...");
    const analysis = await analyzeCompetitorAdImage(userId, body.competitorRefImageUrl);
    console.log(
      `[stealth-ref/plan] Reference analyzed — type: ${analysis.adType}, category: ${analysis.stealthCategory}`,
    );

    // Step 3: Plan stealth scenes inspired by the reference
    console.log(
      `[stealth-ref/plan] Planning ${quantity} scenes from reference...`,
    );
    const plans = await planScenesFromReference(
      userId,
      analysis,
      body.productName,
      body.productDescription,
      JSON.stringify(productContext),
      body.targetAudience,
      body.market || "US",
      quantity,
      body.language,
      body.aspectRatio ?? "1:1",
      body.sensitivityLevel ?? "normal",
      body.audienceAgeRange,
    );

    return NextResponse.json({
      success: true,
      plans,
      analysis: {
        adType: analysis.adType,
        stealthCategory: analysis.stealthCategory,
        mood: analysis.mood,
        creativeConcept: analysis.creativeConcept,
      },
      analysisSummary: buildAnalysisSummary(analysis),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[stealth-ref/plan] Error:", message);
    return handleApiError(e);
  }
}
