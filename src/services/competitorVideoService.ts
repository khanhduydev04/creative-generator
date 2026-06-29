import type { SupabaseClient } from "@supabase/supabase-js";
import type { CompetitorVideo, VideoStatus } from "@/features/video/types";

export interface ApifyVideoItem {
  webVideoUrl?: string;
  id?: string;
  playCount?: number;
  diggCount?: number;
  shareCount?: number;
  commentCount?: number;
  // authorMeta.name = TikTok handle (username), nickName = display name
  authorMeta?: { name?: string; nickName?: string };
  // clockworks actors return covers as object {default, origin}, some older formats as string[]
  covers?: { default?: string; origin?: string } | string[];
  createTime?: number;
  searchKey?: string;
}

export class CompetitorVideoService {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly userId: string,
  ) {}

  async listVideos(brandId: string, status?: VideoStatus): Promise<CompetitorVideo[]> {
    let query = this.supabase
      .from("competitor_videos")
      .select("*")
      .eq("brand_id", brandId)
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []) as CompetitorVideo[];
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
      .filter((item) => item.webVideoUrl?.includes("tiktok.com"))
      .map((item) => ({
        tiktok_url: item.webVideoUrl!,
        video_id: item.id ?? extractTikTokVideoId(item.webVideoUrl!),
        views: item.playCount ?? null,
        likes: item.diggCount ?? null,
        shares: item.shareCount ?? null,
        comments: item.commentCount ?? null,
        author_handle: item.authorMeta?.name ?? null,
        // Safe: handles both object {default} format (clockworks) and legacy string[] format
        cover_url: Array.isArray(item.covers)
          ? (item.covers[0] ?? null)
          : (item.covers?.default ?? null),
        scraped_at: item.createTime
          ? new Date(item.createTime * 1000).toISOString()
          : new Date().toISOString(),
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
