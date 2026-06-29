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
  attributes?: string | null;
  targetAudience?: string | null;
  sellingPoints?: string | null;
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
  promptConfig: {
    tone: string;
    notes: string;
    attributes?: string | null;
    targetAudience?: string | null;
    sellingPoints?: string | null;
  };
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

export interface VoicePreset {
  id: string;
  brand_id: string;
  display_name: string;
  voice_code: string;
  speed: number;
  pitch: number;
  pause_config: Record<string, unknown> | null;
  is_default: boolean;
  created_at: string;
}

export interface VoiceRating {
  id: string;
  brand_id: string;
  vbee_voice_code: string;
  score: number;
  note: string | null;
  rated_at: string;
}

export interface GeneratedAudio {
  id: string;
  script_id: string;
  brand_id: string;
  voice_preset_id: string | null;
  storage_path: string | null;
  vbee_audio_url: string | null;
  duration_secs: number | null;
  created_at: string;
  voice_preset?: Pick<VoicePreset, "display_name" | "voice_code" | "speed"> | null;
  brand_script?: Pick<BrandScript, "final_text" | "raw_text"> | null;
}

export interface VbeeVoice {
  voice_code: string;
  name: string;
  gender: "male" | "female";
  region: "north" | "central" | "south";
  sample_url?: string;
}

export interface VoiceAvgRating {
  vbee_voice_code: string;
  avg_score: number;
  count: number;
}

export interface GenerateAudioRequest {
  scriptId: string;
  voicePresetId: string;
}

export interface GenerateAudioResponse {
  audio: GeneratedAudio;
}

export interface BrandApifyConfig {
  id: string;
  brand_id: string;
  apify_task_id: string;
  is_enabled: boolean;
  last_run_id: string | null;
  last_dataset_id: string | null;
  last_synced_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}
