import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AnalyticsService } from "@/services/analyticsService";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as {
      path?: string;
      sessionId?: string;
      referrer?: string | null;
    } | null;

    if (!body?.path || !body?.sessionId) {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const service = new AnalyticsService(supabase);
    await service.track({
      path: body.path.slice(0, 500),
      sessionId: body.sessionId.slice(0, 64),
      referrer: body.referrer?.slice(0, 1000) ?? null,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "tracking_failed" }, { status: 500 });
  }
}
