import type { ApiKeyProvider } from "@/lib/key-provider";

const PROVIDER_PREFIXES: Record<ApiKeyProvider, RegExp> = {
  anthropic: /^sk-ant-[A-Za-z0-9_-]{8,}$/,
  google: /^AIza[A-Za-z0-9_-]{8,}$/,
  kie: /^[A-Za-z0-9_-]{8,}$/,
  openai: /^sk-[A-Za-z0-9_-]{8,}$/,
  vbee: /^[A-Za-z0-9_-]{8,}$/,
};

export function isValidProvider(provider: string): provider is ApiKeyProvider {
  return Object.keys(PROVIDER_PREFIXES).includes(provider);
}

export function isValidKeyFormat(provider: ApiKeyProvider, key: string): boolean {
  if (!key || key.length < 8) return false;
  return PROVIDER_PREFIXES[provider].test(key);
}

export function maskKey(): string {
  return "•••••••• (set)";
}
