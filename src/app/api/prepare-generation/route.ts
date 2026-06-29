import type { ProductContext } from "@/lib/gemini-reader";
import { readProductPage } from "@/lib/gemini-reader";
import { resizeAndUploadImages } from "@/lib/image-utils";
import { requireUser, handleApiError } from "@/lib/user-context";
import { NextRequest, NextResponse } from "next/server";

interface PrepareGenerationRequest {
  landingPageUrl: string;
  productImages: string[];
  brandLogoUrl?: string;
}

interface PrepareGenerationResponse {
  success: true;
  productContext: ProductContext;
  resizedProductImageUrls: string[];
  resizedBrandLogoUrl: string | null;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: PrepareGenerationRequest;
  try {
    body = (await request.json()) as PrepareGenerationRequest;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 },
    );
  }

  if (!body.landingPageUrl) {
    return NextResponse.json(
      { success: false, error: "Missing landingPageUrl" },
      { status: 400 },
    );
  }

  try {
    const { userId } = await requireUser(request);

    // Run all three operations in parallel
    const [productContext, resizedProductImageUrls, resizedBrandLogoResult] =
      await Promise.all([
        // 1. Read product page via Gemini
        readProductPage(userId, body.landingPageUrl),

        // 2. Resize + upload product images
        body.productImages.length > 0
          ? resizeAndUploadImages(body.productImages, 1024).catch(() => {
              console.warn(
                "[prepare-generation] Product image resize failed, using originals",
              );
              return body.productImages;
            })
          : Promise.resolve([]),

        // 3. Resize + upload brand logo
        body.brandLogoUrl
          ? resizeAndUploadImages([body.brandLogoUrl], 512)
              .then(([url]) => url)
              .catch(() => {
                console.warn(
                  "[prepare-generation] Brand logo resize failed, skipping",
                );
                return null;
              })
          : Promise.resolve(null),
      ]);

    console.log(
      `[prepare-generation] Done: productContext=${productContext.productName}, ` +
        `images=${resizedProductImageUrls.length}, logo=${resizedBrandLogoResult ? "yes" : "no"}`,
    );

    const response: PrepareGenerationResponse = {
      success: true,
      productContext,
      resizedProductImageUrls,
      resizedBrandLogoUrl: resizedBrandLogoResult,
    };

    return NextResponse.json(response);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[prepare-generation] Error:", message);
    return handleApiError(e);
  }
}
