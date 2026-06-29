import 'server-only';

/**
 * Server-only — per-user API key provider.
 * Fetches from user_api_keys, decrypts via crypto.ts, caches 60s.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { decryptKey } from "@/lib/crypto";
import { MissingApiKeyError } from "@/lib/user-context";

export type ApiKeyProvider = "anthropic" | "google" | "kie" | "openai";

interface CachedKey {
  value: string;
  cachedAt: number;
}

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, CachedKey>();

export async function getUserApiKey(
  userId: string,
  provider: ApiKeyProvider,
): Promise<string> {
  const cacheKey = `${userId}:${provider}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) return cached.value;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("user_api_keys")
    .select("encrypted_key")
    .eq("user_id", userId)
    .eq("provider", provider)
    .single();

  // PostgREST returns "PGRST116" specifically when no rows match .single().
  // Anything else (network failure, RLS denial, transient outage) is a real
  // error — surfacing it as MissingApiKeyError would tell the user "add your
  // key" when in fact the DB is down. Re-throw so handleApiError maps it to 500.
  if (error && error.code !== "PGRST116") throw error;
  if (!data) throw new MissingApiKeyError(provider);

  const value = decryptKey(data.encrypted_key);
  cache.set(cacheKey, { value, cachedAt: Date.now() });
  return value;
}

export function clearUserKeyCache(userId: string): void {
  for (const cacheKey of [...cache.keys()]) {
    if (cacheKey.startsWith(`${userId}:`)) cache.delete(cacheKey);
  }
}

export function clearAllKeyCache(): void {
  cache.clear();
}
