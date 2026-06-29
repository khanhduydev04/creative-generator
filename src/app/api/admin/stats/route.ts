import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, handleApiError } from "@/lib/user-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { AnalyticsService } from "@/services/analyticsService";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const days = Number(req.nextUrl.searchParams.get("days") ?? "30");
    const safeDays = Math.min(Math.max(days, 1), 90);

    const supabase = createAdminClient();
    const service = new AnalyticsService(supabase);
    const stats = await service.getStats(safeDays);

    return NextResponse.json(stats);
  } catch (e) {
    return handleApiError(e);
  }
}
