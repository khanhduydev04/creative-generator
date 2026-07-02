import 'server-only';
import { ProviderError } from "@/services/providerError";

export type ApiKeyProvider =
  | "anthropic" | "google" | "kie" | "openai" | "vbee" | "minimax";

const PROVIDER_ENV_MAP: Record<ApiKeyProvider, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  google: "GOOGLE_API_KEY",
  kie: "KIE_API_KEY",
  openai: "OPENAI_API_KEY",
  vbee: "VBEE_API_KEY",
  minimax: "MINIMAX_API_KEY",
};

// userId param kept for call-site compatibility — not used (shared env keys)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getUserApiKey(
  _userId: string,
  provider: ApiKeyProvider,
): Promise<string> {
  const envVar = PROVIDER_ENV_MAP[provider];
  const value = process.env[envVar];
  if (!value) {
    throw new Error(
      `Missing required environment variable ${envVar} for provider "${provider}". Add it to .env.local.`,
    );
  }
  return value;
}

export function clearUserKeyCache(_userId: string): void {
  // No-op: keys are read directly from env, no cache needed.
}

export function clearAllKeyCache(): void {
  // No-op: keys are read directly from env, no cache needed.
}

export function getMiniMaxCredentials(): { apiKey: string; groupId: string } {
  const apiKey = process.env.MINIMAX_API_KEY;
  const groupId = process.env.MINIMAX_GROUP_ID;
  if (!apiKey || !groupId) {
    throw new ProviderError("minimax", "key_missing", 400);
  }
  return { apiKey, groupId };
}
