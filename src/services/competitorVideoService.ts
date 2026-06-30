import type { SupabaseClient } from "@supabase/supabase-js";
import type { CompetitorVideo, VideoStatus } from "@/features/video/types";

export interface ApifyVideoItem {
  webVideoUrl?: string;
  id?: string;
  playCount?: number;
  diggCount?: number;
  shareCount?: number;
  commentCount?: number;
  authorMeta?: { name?: string; nickName?: string };
  videoMeta?: { coverUrl?: string; duration?: number };
  createTimeISO?: string;
  isAd?: boolean;
  searchKey?: string;
}

export class CompetitorVideoService {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly userId: string,
  ) {}

  async listVideos(
    brandId: string,
    status?: VideoStatus,
    page = 1,
    limit = 20,
    q?: string,
  ): Promise<{ videos: CompetitorVideo[]; total: number }> {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = this.supabase
      .from("competitor_videos")
      .select("*", { count: "exact" })
      .eq("brand_id", brandId)
      // Newest-first within null-views group so manually-added videos surface at top
      .order("views", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (status) {
      query = query.eq("status", status);
    }
    if (q && q.trim()) {
      const like = `%${q.trim()}%`;
      query = query.or(`tiktok_url.ilike.${like},author_handle.ilike.${like}`);
    }

    const { data, error, count } = await query;
    if (error) throw new Error(error.message);
    return { videos: (data ?? []) as CompetitorVideo[], total: count ?? 0 };
  }

  async addVideo(brandId: string, tiktokUrl: string): Promise<CompetitorVideo> {
    const videoId = extractTikTokVideoId(tiktokUrl);
    const { data, error } = await this.supabase
      .from("competitor_videos")
      .insert({
        brand_id: brandId,
        tiktok_url: tiktokUrl,
        video_id: videoId,
        status: "pending",
        scrape_status: "success",
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") throw new Error("URL_EXISTS");
      throw new Error(error.message);
    }
    return data as CompetitorVideo;
  }

  async updateStatus(videoId: string, status: VideoStatus): Promise<CompetitorVideo> {
    const { data, error } = await this.supabase
      .from("competitor_videos")
      .update({ status })
      .eq("id", videoId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as CompetitorVideo;
  }

  async upsertVideos(
    brandId: string,
    items: ApifyVideoItem[],
    apifyRunId?: string,
  ): Promise<number> {
    if (items.length === 0) return 0;

    const rows = items
      .filter((item) => item.isAd === true && item.webVideoUrl?.includes("tiktok.com"))
      .map((item) => ({
        tiktok_url: item.webVideoUrl!,
        video_id: item.id ?? extractTikTokVideoId(item.webVideoUrl!),
        views: item.playCount ?? null,
        likes: item.diggCount ?? null,
        shares: item.shareCount ?? null,
        comments: item.commentCount ?? null,
        author_handle: item.authorMeta?.name ?? null,
        cover_url: item.videoMeta?.coverUrl ?? null,
        scraped_at: item.createTimeISO ?? new Date().toISOString(),
      }));

    if (rows.length === 0) return 0;

    // RPC preserves human-set status on conflict — only metrics are updated.
    // brand_id, status='pending', scrape_status='success' are set by the function.
    const { data, error } = await this.supabase.rpc("upsert_competitor_videos", {
      p_brand_id: brandId,
      p_videos: rows,
      p_apify_run_id: apifyRunId ?? null,
    });

    if (error) throw new Error(error.message);
    // Safe: RPC returns integer row count
    return typeof data === "number" ? data : rows.length;
  }
}

function extractTikTokVideoId(url: string): string | null {
  const match = url.match(/\/video\/(\d+)/);
  return match ? match[1] : null;
}
