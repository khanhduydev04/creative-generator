import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/user-context";
import { encryptKey } from "@/lib/crypto";
import type { ApiKeyProvider } from "@/lib/key-provider";

interface UserApiKeyRow {
  provider: string;
  updated_at: string;
}

export class UserApiKeyService {
  constructor(private supabase: SupabaseClient, private userId: string) {}

  async list(): Promise<UserApiKeyRow[]> {
    const { data, error } = await this.supabase
      .from("user_api_keys")
      .select("provider, updated_at")
      .eq("user_id", this.userId)
      .order("provider");
    if (error) throw new ApiError(500, "db_error", error.message);
    return data ?? [];
  }

  async upsert(provider: ApiKeyProvider, plaintextKey: string): Promise<void> {
    const encrypted = encryptKey(plaintextKey);
    const { error } = await this.supabase
      .from("user_api_keys")
      .upsert({
        user_id: this.userId,
        provider,
        encrypted_key: encrypted,
        updated_at: new Date().toISOString(),
      });
    if (error) throw new ApiError(500, "db_error", error.message);
  }

  async delete(provider: ApiKeyProvider): Promise<void> {
    const { error } = await this.supabase
      .from("user_api_keys")
      .delete()
      .eq("user_id", this.userId)
      .eq("provider", provider);
    if (error) throw new ApiError(500, "db_error", error.message);
  }
}
