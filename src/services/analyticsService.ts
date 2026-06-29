import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/user-context";

interface TrackInput {
  path: string;
  sessionId: string;
  referrer: string | null;
}

interface DailyCount {
  date: string;
  views: number;
  visitors: number;
}

interface AdminStats {
  totalPageViews: number;
  totalVisitors: number;
  totalAccounts: number;
  totalAdsSaved: number;
  daily: DailyCount[];
  topPages: { path: string; views: number }[];
}

export class AnalyticsService {
  constructor(private supabase: SupabaseClient) {}

  async track(input: TrackInput): Promise<void> {
    const { error } = await this.supabase.from("page_views").insert({
      path: input.path,
      session_id: input.sessionId,
      referrer: input.referrer,
    });
    if (error) throw new ApiError(500, "tracking_failed", error.message);
  }

  async getStats(days: number): Promise<AdminStats> {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceISO = since.toISOString();

    const [viewsRes, visitorsRes, accountsRes, adsRes, dailyRes, topPagesRes] =
      await Promise.all([
        this.supabase
          .from("page_views")
          .select("*", { count: "exact", head: true })
          .gte("created_at", sinceISO),
        this.supabase.rpc("count_unique_sessions", { since_date: sinceISO }),
        this.supabase
          .from("profiles")
          .select("*", { count: "exact", head: true }),
        this.supabase
          .from("saved_ads")
          .select("*", { count: "exact", head: true }),
        this.supabase.rpc("daily_page_view_stats", {
          since_date: sinceISO,
        }),
        this.supabase.rpc("top_pages", {
          since_date: sinceISO,
          page_limit: 10,
        }),
      ]);

    return {
      totalPageViews: viewsRes.count ?? 0,
      totalVisitors: (visitorsRes.data as number) ?? 0,
      totalAccounts: accountsRes.count ?? 0,
      totalAdsSaved: adsRes.count ?? 0,
      daily: (dailyRes.data as DailyCount[]) ?? [],
      topPages:
        (topPagesRes.data as { path: string; views: number }[]) ?? [],
    };
  }
}
