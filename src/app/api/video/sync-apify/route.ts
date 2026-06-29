import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser, handleApiError } from "@/lib/user-context";
import { CompetitorVideoService } from "@/services/competitorVideoService";
import type { ApifyVideoItem } from "@/services/competitorVideoService";

const APIFY_BASE = "https://api.apify.com/v2";
const DATASET_FETCH_TIMEOUT_MS = 25_000;

interface SyncApifyBody {
  brandId?: string;
  apifyDatasetId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireUser(request);
    // Safe: only consuming brandId and apifyDatasetId which are validated below
    const body = (await request.json()) as SyncApifyBody;

    if (!body.brandId || !body.apifyDatasetId) {
      return NextResponse.json(
        { error: "brandId and apifyDatasetId are required" },
        { status: 400 },
      );
    }

    const apifyRes = await fetch(
      `${APIFY_BASE}/datasets/${body.apifyDatasetId}/items?clean=true&format=json`,
      { signal: AbortSignal.timeout(DATASET_FETCH_TIMEOUT_MS) },
    );

    if (!apifyRes.ok) {
      return NextResponse.json({ error: "apify_dataset_fetch_failed" }, { status: 502 });
    }

    // Safe: Apify dataset endpoint returns a JSON array of items matching ApifyVideoItem shape
    const items = (await apifyRes.json()) as ApifyVideoItem[];

    const supabase = await createClient();
    const service = new CompetitorVideoService(supabase, userId);
    const count = await service.upsertVideos(body.brandId, items, body.apifyDatasetId);

    return NextResponse.json({ ok: true, upserted: count });
  } catch (error) {
    return handleApiError(error);
  }
}
