import { resizeAndUploadImages } from "@/lib/image-utils";
import { requireUser, handleApiError } from "@/lib/user-context";
import type { KieAspectRatio } from "@/services/kieClient";
import { generateImage } from "@/services/kieClient";
import { NextRequest, NextResponse } from "next/server";

// ─── Request Body Type ───────────────────────────────────────────────────────

interface BrandContext {
  brandName: string;
  logoUrl?: string | null;
  primaryColor1: string;
  primaryColor2: string;
  secondaryColor1: string;
  secondaryColor2: string;
  accentColor1: string;
  accentColor2: string;
  typography: string;
}

interface ProductContext {
  productName: string;
  productDescription: string | null;
  productImages: string[];
}

interface EditAdRequest {
  originalImageUrl: string;
  editPrompt: string;
  originalPrompt?: string; // kept for backwards compat but no longer used in prompt
  brandContext: BrandContext;
  productContext: ProductContext;
  additionalImages?: string[];
  aspectRatio?: string;
  resolution?: string;
}

// ─── Response Types ──────────────────────────────────────────────────────────

interface EditAdResponse {
  success: boolean;
  imageUrl?: string;
  taskId?: string;
  prompt?: string;
  error?: string;
}

// ─── Build Edit Prompt ───────────────────────────────────────────────────────

/**
 * Parse a free-form edit instruction into a structured numbered checklist.
 * Splits on newlines, numbered patterns (1. 2.), bullet points, commas between
 * independent clauses, and "and"/"also"/"plus" conjunctions.
 */
function parseEditInstructions(raw: string): string[] {
  // First split by obvious delimiters: newlines, numbered items, bullet points
  const lines = raw
    .split(/\n+/)
    .flatMap((line) => line.split(/(?:^|\s)(?:\d+[.)]\s)/))
    .flatMap((line) => line.split(/(?:^|\s)[•\-\*]\s/))
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  // If we got only 1 chunk, try splitting by conjunctions and commas
  if (lines.length === 1) {
    const conjunctionSplit = lines[0]
      .split(/,\s*(?:và|and|also|plus|thêm|đồng thời|ngoài ra|sau đó|rồi)\s+/i)
      .flatMap((s) => s.split(/(?:^|[.;])\s*(?:và|and|also|plus|thêm|đồng thời|ngoài ra|sau đó|rồi)\s+/i))
      .map((s) => s.trim())
      .filter((s) => s.length > 3);

    if (conjunctionSplit.length > 1) {
      return conjunctionSplit;
    }

    // Try splitting by sentence-ending punctuation followed by new sentence
    const sentenceSplit = lines[0]
      .split(/[.;!]\s+(?=[A-ZÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬĐÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴ])/u)
      .map((s) => s.trim().replace(/[.;!]+$/, ""))
      .filter((s) => s.length > 3);

    if (sentenceSplit.length > 1) {
      return sentenceSplit;
    }
  }

  return lines;
}

function buildEditPrompt(
  editInstruction: string,
  brand: BrandContext,
  product: ProductContext,
  hasAdditionalImages: boolean,
  hasBrandLogo: boolean,
  productImageCount: number,
): string {
  // Parse the user's edit instruction into structured requirements
  const requirements = parseEditInstructions(editInstruction);
  const hasMultipleRequirements = requirements.length > 1;

  // Build numbered checklist
  const checklist = requirements
    .map((req, i) => `  ${i + 1}. ${req}`)
    .join("\n");

  // Build image map
  const imageMapLines: string[] = [
    "**IMAGE 1 = ORIGINAL AD** — The ad to edit. Keep everything not mentioned in the checklist.",
  ];

  let imgIdx = 2;
  if (productImageCount > 0) {
    const end = imgIdx + productImageCount - 1;
    imageMapLines.push(
      `**IMAGE ${imgIdx}${end > imgIdx ? `-${end}` : ""} = OUR PRODUCT** — Product must match these exactly (packaging, labels, shape, colors).`,
    );
    imgIdx = end + 1;
  }
  if (hasBrandLogo) {
    imageMapLines.push(`**IMAGE ${imgIdx} = BRAND LOGO** — For reference accuracy only.`);
    imgIdx++;
  }
  if (hasAdditionalImages) {
    imageMapLines.push(`**REMAINING IMAGES = EDIT REFERENCE** — Visual context for the requested changes.`);
  }

  return `## TASK — EDIT THE FIRST ATTACHED IMAGE
Apply ALL ${requirements.length} changes listed below to the FIRST image (BLUE banner). Every single change is EQUALLY important — do NOT skip any.

## EDIT CHECKLIST (${requirements.length} REQUIREMENTS — ALL MANDATORY)
${checklist}

${hasMultipleRequirements ? `⚠️ CRITICAL: There are ${requirements.length} separate changes above. You MUST apply EVERY SINGLE ONE.
Do NOT stop after the first change. Do NOT skip any requirement. Do NOT partially apply changes.
After generating, mentally verify each numbered item was applied. If ANY item is missing → the edit is FAILED.

` : ""}## PRESERVATION RULES (what NOT to change)
- Keep EVERYTHING not mentioned in the checklist above — layout, composition, background, effects, shadows, text styling, product placement, colors — all stay identical.
- Preserve the exact aspect ratio and resolution. No cropping, no stretching.
- Product packaging must match the product reference images exactly (shape, labels, colors, proportions).
- Brand colors remain: ${brand.primaryColor1}, ${brand.primaryColor2}, ${brand.secondaryColor1}, ${brand.secondaryColor2} | Font: ${brand.typography}
- Do NOT add elements that weren't requested. Do NOT "improve" things that weren't mentioned.

## CONTEXT
Brand: ${brand.brandName} | Product: ${product.productName}${product.productDescription ? ` — ${product.productDescription}` : ""}

## IMAGE MAP (${imgIdx - 1} images attached)
${imageMapLines.join("\n")}
Preserve the exact aspect ratio and resolution.

## FINAL VERIFICATION (MANDATORY)
Before submitting, check each requirement:
${requirements.map((req, i) => `  ☐ Change ${i + 1}: "${req.length > 60 ? req.substring(0, 60) + "..." : req}" — Applied?`).join("\n")}
ALL boxes must be checked. If any change is missing, redo the edit.`.trim();
}

// ─── Main Handler ────────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
): Promise<NextResponse> {
  try {
    const { userId } = await requireUser(request);
    const body = (await request.json()) as EditAdRequest;

    if (!body.editPrompt?.trim()) {
      return NextResponse.json(
        { success: false, error: "Edit prompt is required" },
        { status: 400 },
      );
    }

    if (!body.originalImageUrl) {
      return NextResponse.json(
        { success: false, error: "Original image URL is required" },
        { status: 400 },
      );
    }

    const hasAdditionalImages = (body.additionalImages?.length ?? 0) > 0;

    // Resize product images for consistent handling
    let resizedProductImages: string[] = [];
    if (body.productContext.productImages.length > 0) {
      try {
        resizedProductImages = await resizeAndUploadImages(
          body.productContext.productImages,
          1024,
        );
      } catch {
        resizedProductImages = body.productContext.productImages;
      }
    }

    // Include brand logo if available (for accurate packaging reproduction)
    let resizedBrandLogo: string | null = null;
    if (body.brandContext.logoUrl) {
      try {
        const [resized] = await resizeAndUploadImages(
          [body.brandContext.logoUrl],
          512,
        );
        resizedBrandLogo = resized;
      } catch {
        // Logo resize failed — skip, product packaging still has it
      }
    }

    // Process additional images: upload data URLs to Supabase for KIE compatibility
    let processedAdditionalImages: string[] = [];
    if (body.additionalImages && body.additionalImages.length > 0) {
      try {
        processedAdditionalImages = await resizeAndUploadImages(
          body.additionalImages,
          1024,
        );
      } catch (err) {
        console.warn(
          "[edit-ad] Failed to process additional images, using originals:",
          err,
        );
        processedAdditionalImages = body.additionalImages;
      }
    }

    const prompt = buildEditPrompt(
      body.editPrompt.trim(),
      body.brandContext,
      body.productContext,
      hasAdditionalImages,
      resizedBrandLogo !== null,
      resizedProductImages.length,
    );

    // Image input: original ad + product images + brand logo + additional
    // KIE supports up to 14 images per call
    const MAX_IMAGES = 14;
    const imageInput: string[] = [
      body.originalImageUrl,
      ...resizedProductImages,
      ...(resizedBrandLogo ? [resizedBrandLogo] : []),
      ...processedAdditionalImages,
    ].slice(0, MAX_IMAGES);

    const result = await generateImage(userId, prompt, {
      aspectRatio: (body.aspectRatio ?? "1:1") as KieAspectRatio,
      resolution: (body.resolution ?? "1K") as "1K" | "2K" | "4K",
      imageInput,
    });

    return NextResponse.json({
      success: true,
      imageUrl: result.imageUrl,
      taskId: result.taskId,
      prompt,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[edit-ad] Error:", message);
    return handleApiError(e);
  }
}
