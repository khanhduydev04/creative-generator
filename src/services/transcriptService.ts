import type { SupabaseClient } from "@supabase/supabase-js";
import type { Transcript, WhisperStatus } from "@/features/video/types";

export class TranscriptService {
  constructor(private readonly supabase: SupabaseClient) {}

  async getByVideoId(videoId: string): Promise<Transcript | null> {
    const { data, error } = await this.supabase
      .from("transcripts")
      .select("*")
      .eq("video_id", videoId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data as Transcript | null;
  }

  async getById(id: string): Promise<Transcript | null> {
    const { data, error } = await this.supabase
      .from("transcripts")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data as Transcript | null;
  }

  async create(videoId: string): Promise<Transcript> {
    const { data, error } = await this.supabase
      .from("transcripts")
      .insert({ video_id: videoId, whisper_status: "pending" })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") throw new Error("TRANSCRIPT_EXISTS");
      throw new Error(error.message);
    }
    return data as Transcript;
  }

  async updateStatus(id: string, status: WhisperStatus): Promise<void> {
    const { error } = await this.supabase
      .from("transcripts")
      .update({ whisper_status: status })
      .eq("id", id);

    if (error) throw new Error(error.message);
  }

  async saveRawText(id: string, rawText: string): Promise<Transcript> {
    const { data, error } = await this.supabase
      .from("transcripts")
      .update({ raw_text: rawText, whisper_status: "done" })
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as Transcript;
  }

  async saveEditedText(id: string, editedText: string): Promise<Transcript> {
    const { data, error } = await this.supabase
      .from("transcripts")
      .update({ edited_text: editedText })
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as Transcript;
  }
}
