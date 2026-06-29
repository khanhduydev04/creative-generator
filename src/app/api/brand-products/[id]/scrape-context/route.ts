import { createClient } from "@/lib/supabase/server";
import { requireUser, handleApiError } from "@/lib/user-context";
import { BrandProductService } from "@/services/brandProductService";
import { readProductPage } from "@/lib/gemini-reader";
import { NextRequest, NextResponse } from "next/server";

interface ScrapeRequest {
  /** Optional URL override — if provided, also saves to product_url */
  url?: string;
}

/**
 * POST /api/brand-products/[id]/scrape-context
 * Scrapes the product landing page via Gemini and caches the full ProductContext.
 * If the product has a saved product_url and no URL is provided in body, uses the saved one.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let body: ScrapeRequest = {};
  try {
    body = (await request.json()) as ScrapeRequest;
  } catch {
    // Empty body is fine — will use saved product_url
  }

  try {
    const { userId } = await requireUser(request);
    const supabase = await createClient();
    const service = new BrandProductService(supabase, userId);
    const product = await service.getById(id);

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const url = body.url || product.product_url;

    if (!url) {
      return NextResponse.json(
        { error: "No product URL provided. Pass a URL in the request body or save one on the product first." },
        { status: 400 },
      );
    }

    console.log(`[scrape-context] Scraping product page for "${product.name}": ${url}`);

    const productContext = await readProductPage(userId, url);

    // Save URL (if new/changed) + cached context + timestamp
    const updates: Record<string, unknown> = {
      cached_product_context: productContext,
      context_cached_at: new Date().toISOString(),
    };
    if (body.url && body.url !== product.product_url) {
      updates.product_url = body.url;
    }

    await service.update(id, updates);

    return NextResponse.json({
      success: true,
      productContext,
      cachedAt: updates.context_cached_at,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
