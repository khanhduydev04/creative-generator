import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BrandApifyConfigService } from "@/services/brandApifyConfigService";
import { CompetitorVideoService } from "@/services/competitorVideoService";
import { fetchLastSucceededRun, fetchDatasetItems } from "@/services/apifySyncService";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface BrandSyncResult {
  brandId: string;
  status: "synced" | "skipped" | "error";
  upserted?: number;
  message?: string;
}

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const token = process.env.APIFY_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "apify_token_missing" }, { status: 500 });
  }

  const supabase = createAdminClient();
  const configService = new BrandApifyConfigService(supabase);
  const videoService = new CompetitorVideoService(supabase, "cron");

  const configs = await configService.listEnabled();
  const results: BrandSyncResult[] = [];

  for (const cfg of configs) {
    try {
      const lastRun = await fetchLastSucceededRun(cfg.apify_task_id, token);

      if (!lastRun) {
        results.push({ brandId: cfg.brand_id, status: "skipped", message: "no_succeeded_run" });
        continue;
      }

      if (lastRun.runId === cfg.last_run_id) {
        results.push({ brandId: cfg.brand_id, status: "skipped", message: "already_synced" });
        continue;
      }

      const items = await fetchDatasetItems(lastRun.datasetId, token);
      const upserted = await videoService.upsertVideos(cfg.brand_id, items, lastRun.runId);
      await configService.markSynced(cfg.brand_id, lastRun.runId, lastRun.datasetId);

      results.push({ brandId: cfg.brand_id, status: "synced", upserted });
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown_error";
      console.error(`[cron/sync-apify] brand ${cfg.brand_id} failed:`, message);
      await configService.markError(cfg.brand_id, message).catch(() => undefined);
      results.push({ brandId: cfg.brand_id, status: "error", message });
    }
  }

  return NextResponse.json({ ok: true, processed: results.length, results });
}
