import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser, handleApiError } from "@/lib/user-context";
import { BrandApifyConfigService } from "@/services/brandApifyConfigService";
import { CompetitorVideoService } from "@/services/competitorVideoService";
import { fetchLastSucceededRun, fetchDatasetItems } from "@/services/apifySyncService";

interface SyncBody {
  brandId?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { userId } = await requireUser(request);
    // Safe: only brandId is consumed and validated immediately below
    const body = (await request.json()) as SyncBody;

    if (!body.brandId) {
      return NextResponse.json({ error: "brandId is required" }, { status: 400 });
    }

    const token = process.env.APIFY_TOKEN;
    if (!token) {
      return NextResponse.json({ error: "apify_token_missing" }, { status: 500 });
    }

    const supabase = await createClient();
    const configService = new BrandApifyConfigService(supabase);
    const config = await configService.getByBrand(body.brandId);

    if (!config) {
      return NextResponse.json({ error: "apify_config_not_found" }, { status: 404 });
    }

    if (!config.is_enabled) {
      return NextResponse.json({ error: "apify_sync_disabled" }, { status: 400 });
    }

    const lastRun = await fetchLastSucceededRun(config.apify_task_id, token);
    if (!lastRun) {
      return NextResponse.json({ error: "no_succeeded_run" }, { status: 404 });
    }

    const items = await fetchDatasetItems(lastRun.datasetId, token);
    const videoService = new CompetitorVideoService(supabase, userId);
    const upserted = await videoService.upsertVideos(body.brandId, items, lastRun.runId);
    await configService.markSynced(body.brandId, lastRun.runId, lastRun.datasetId);

    return NextResponse.json({ ok: true, upserted });
  } catch (error) {
    return handleApiError(error);
  }
}
