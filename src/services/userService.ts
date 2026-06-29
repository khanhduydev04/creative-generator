import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/user-context";

export interface UserMe {
  id: string;
  email: string;
  full_name: string;
  is_platform_admin: boolean;
  has_keys: { anthropic: boolean; google: boolean; kie: boolean };
}

export class UserService {
  constructor(private supabase: SupabaseClient, private userId: string) {}

  async getMe(): Promise<UserMe> {
    const { data: profile, error } = await this.supabase
      .from("profiles")
      .select("id, email, full_name, is_platform_admin")
      .eq("id", this.userId)
      .single();
    if (error) throw new ApiError(404, "profile_not_found");

    const { data: keys } = await this.supabase
      .from("user_api_keys")
      .select("provider")
      .eq("user_id", this.userId);

    const presentProviders = new Set((keys ?? []).map((k: { provider: string }) => k.provider));
    return {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name ?? "",
      is_platform_admin: profile.is_platform_admin,
      has_keys: {
        anthropic: presentProviders.has("anthropic"),
        google: presentProviders.has("google"),
        kie: presentProviders.has("kie"),
      },
    };
  }
}
