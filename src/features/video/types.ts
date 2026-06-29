export type VideoStatus = "pending" | "winner" | "rejected";
export type ScrapeStatus = "success" | "failed";

export interface CompetitorVideo {
  id: string;
  brand_id: string;
  tiktok_url: string;
  video_id: string | null;
  views: number | null;
  likes: number | null;
  shares: number | null;
  comments: number | null;
  author_handle: string | null;
  cover_url: string | null;
  scraped_at: string | null;
  apify_run_id: string | null;
  status: VideoStatus;
  scrape_status: ScrapeStatus;
  created_at: string;
}

export interface AddVideoPayload {
  brandId: string;
  tiktokUrl: string;
}

export interface UpdateVideoStatusPayload {
  status: VideoStatus;
}

export interface FetchCdnResponse {
  cdnUrl: string | null;
}

export interface CompetitorVideosResponse {
  videos: CompetitorVideo[];
}

export interface AddVideoResponse {
  video: CompetitorVideo;
}

export interface UpdateVideoResponse {
  video: CompetitorVideo;
}

export type WhisperStatus = "pending" | "processing" | "done" | "failed";

export interface Transcript {
  id: string;
  video_id: string;
  whisper_status: WhisperStatus;
  raw_text: string | null;
  edited_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface PromptConfig {
  tone?: string;
  notes?: string;
  productId?: string | null;
}

export interface BrandScript {
  id: string;
  transcript_id: string;
  brand_id: string;
  prompt_config: PromptConfig;
  raw_text: string | null;
  final_text: string | null;
  llm_model: string | null;
  created_at: string;
  updated_at: string;
}

export interface TranscriptResponse {
  transcript: Transcript;
}

export type CreateTranscriptResponse = TranscriptResponse;

export interface CreateScriptRequest {
  transcriptId: string;
  brandId: string;
  productId: string | null;
  promptConfig: { tone: string; notes: string };
}

export interface PatchScriptRequest {
  finalText: string;
}

export interface PatchScriptResponse {
  script: BrandScript;
}

export interface CreateScriptResponse {
  script: BrandScript;
}
