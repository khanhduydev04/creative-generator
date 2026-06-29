import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CompetitorVideoService } from "@/services/competitorVideoService";
import type { ApifyVideoItem } from "@/services/competitorVideoService";

const APIFY_BASE = "https://api.apify.com/v2";
const DATASET_FETCH_TIMEOUT_MS = 25_000;

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const brandId = searchParams.get("brandId");
  const datasetId = searchParams.get("datasetId");

  if (!brandId || !datasetId) {
    console.warn("[apify/webhook] Missing brandId or datasetId");
    return NextResponse.json({ ok: true });
  }

  let items: ApifyVideoItem[] = [];
  try {
    const apifyRes = await fetch(
      `${APIFY_BASE}/datasets/${datasetId}/items?clean=true&format=json`,
      { signal: AbortSignal.timeout(DATASET_FETCH_TIMEOUT_MS) },
    );

    if (!apifyRes.ok) {
      console.error(`[apify/webhook] Dataset fetch failed: ${apifyRes.status}`);
      return NextResponse.json({ error: "dataset_fetch_failed" }, { status: 500 });
    }

    // Safe: Apify dataset endpoint returns a JSON array of items matching ApifyVideoItem shape
    items = (await apifyRes.json()) as ApifyVideoItem[];
  } catch (error) {
    console.error("[apify/webhook] Fetch error:", error);
    return NextResponse.json({ error: "fetch_error" }, { status: 500 });
  }

  try {
    const supabase = createAdminClient();

    const { data: brand } = await supabase
      .from("brands")
      .select("id")
      .eq("id", brandId)
      .maybeSingle();

    if (!brand) {
      console.warn(`[apify/webhook] Unknown brandId: ${brandId}`);
      return NextResponse.json({ ok: true });
    }

    const service = new CompetitorVideoService(supabase, "webhook");
    const count = await service.upsertVideos(brandId, items, datasetId);

    console.info(`[apify/webhook] Upserted ${count} videos for brand ${brandId}`);
    return NextResponse.json({ ok: true, upserted: count });
  } catch (error) {
    console.error("[apify/webhook] Upsert error:", error);
    return NextResponse.json({ ok: true });
  }
}
