import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser, handleApiError } from "@/lib/user-context";
import { assertSafeOutboundUrl, UnsafeUrlError } from "@/lib/url-guard";
import { SavedAdService } from "@/services/savedAdService";

interface SaveAdRequest {
  imageUrl: string;
  prompt: string;
  headline: string;
  concept: string;
  market: string;
  brandId: string;
  productName: string;
  productId?: string;
  source?: string;
}

/**
 * POST /api/save-ad
 *
 * Downloads a generated ad image from KIE AI's temporary URL,
 * uploads it to Supabase Storage (generated-ads bucket),
 * and returns the permanent public URL.
 *
 * KIE images expire after 14 days, so this endpoint persists them.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireUser(request);
    const body = (await request.json()) as SaveAdRequest;

    if (!body.imageUrl || !body.brandId) {
      return NextResponse.json(
        { error: "imageUrl and brandId are required" },
        { status: 400 },
      );
    }

    // Validate URL to prevent SSRF — block internal networks and non-HTTPS
    try {
      assertSafeOutboundUrl(body.imageUrl);
    } catch (e) {
      if (e instanceof UnsafeUrlError) {
        return NextResponse.json(
          { error: "Invalid image URL" },
          { status: 400 },
        );
      }
      throw e;
    }

    // Download the image from KIE's temporary URL
    const imageResponse = await fetch(body.imageUrl);
    if (!imageResponse.ok) {
      return NextResponse.json(
        { error: `Failed to download image (${imageResponse.status})` },
        { status: 502 },
      );
    }

    const imageBytes = await imageResponse.arrayBuffer();
    const contentType = imageResponse.headers.get("content-type") ?? "image/jpeg";
    const ext = contentType.includes("png") ? "png" : "jpg";

    // Encode product name into filename for library filtering
    const productSlug = body.productName
      ? body.productName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
      : "";
    const fileBase = productSlug ? `${Date.now()}___${productSlug}` : `${Date.now()}`;
    const dateFolder = new Date().toISOString().slice(0, 10);
    const fileName = `${userId}/${body.brandId}/${dateFolder}/${fileBase}.${ext}`;

    // Upload to Supabase storage
    const supabase = await createClient();
    const { error: uploadError } = await supabase.storage
      .from("generated-ads")
      .upload(fileName, imageBytes, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Storage upload failed: ${uploadError.message}` },
        { status: 500 },
      );
    }

    // Get permanent public URL
    const { data: urlData } = supabase.storage
      .from("generated-ads")
      .getPublicUrl(fileName);

    const permanentUrl = urlData.publicUrl;

    // Write metadata to saved_ads table (fire-and-forget — don't block response on DB write)
    const savedAdService = new SavedAdService(supabase, userId);
    try {
      await savedAdService.create({
        brand_id: body.brandId,
        product_id: body.productId || null,
        storage_path: fileName,
        image_url: permanentUrl,
        headline: body.headline || null,
        concept: body.concept || null,
        prompt: body.prompt || null,
        source: body.source || "workspace",
      });
    } catch (dbErr) {
      // Log but don't fail — the image is already saved in Storage
      console.warn("[save-ad] Failed to write saved_ads metadata:", dbErr);
    }

    return NextResponse.json({
      success: true,
      storagePath: fileName,
      permanentUrl,
      metadata: {
        headline: body.headline,
        concept: body.concept,
        market: body.market,
        productName: body.productName,
        prompt: body.prompt,
        savedAt: new Date().toISOString(),
      },
    });
  } catch (e) {
    console.error("[save-ad] Error:", e instanceof Error ? e.message : e);
    return handleApiError(e);
  }
}
