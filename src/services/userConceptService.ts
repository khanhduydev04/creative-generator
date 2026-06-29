import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/user-context";

export interface UserConceptInput {
  label: string;
  description?: string;
  prompt: string;
  reference_images?: string[];
  requires_competitor?: boolean;
}

interface UserConceptRow {
  id: string;
  owner_user_id: string;
  label: string;
  description?: string | null;
  prompt: string;
  reference_images?: string[] | null;
  requires_competitor?: boolean | null;
  created_at: string;
  updated_at: string;
}

export class UserConceptService {
  constructor(private supabase: SupabaseClient, private userId: string) {}

  async list(): Promise<UserConceptRow[]> {
    const { data, error } = await this.supabase
      .from("user_concepts")
      .select("*")
      .eq("owner_user_id", this.userId)
      .order("created_at", { ascending: false });
    if (error) throw new ApiError(500, "db_error", error.message);
    return data ?? [];
  }

  async create(input: UserConceptInput): Promise<UserConceptRow> {
    const { data, error } = await this.supabase
      .from("user_concepts")
      .insert({ ...input, owner_user_id: this.userId })
      .select()
      .single();
    if (error) throw new ApiError(500, "db_error", error.message);
    return data;
  }

  async update(id: string, patch: Partial<UserConceptInput>): Promise<UserConceptRow> {
    const { data, error } = await this.supabase
      .from("user_concepts")
      .update(patch)
      .eq("id", id)
      .eq("owner_user_id", this.userId)
      .select()
      .single();
    if (error) throw new ApiError(404, "concept_not_found");
    return data;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("user_concepts")
      .delete()
      .eq("id", id)
      .eq("owner_user_id", this.userId);
    if (error) throw new ApiError(500, "db_error", error.message);
  }
}
