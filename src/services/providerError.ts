import type { ApiKeyProvider } from "@/lib/key-provider";

export type ProviderErrorKind =
  | "quota_exceeded"
  | "invalid_key"
  | "key_missing"
  | "rate_limited"
  | "unknown";

const KIND_STATUS: Record<ProviderErrorKind, number> = {
  quota_exceeded: 402,
  invalid_key: 401,
  key_missing: 400,
  rate_limited: 429,
  unknown: 502,
};

export function providerErrorStatus(kind: ProviderErrorKind): number {
  return KIND_STATUS[kind];
}

export class ProviderError extends Error {
  constructor(
    public readonly provider: ApiKeyProvider,
    public readonly kind: ProviderErrorKind,
    public readonly httpStatus: number,
    message?: string,
  ) {
    super(message ?? `${provider}_${kind}`);
    this.name = "ProviderError";
  }
}

export function mapMiniMaxStatusCode(code: number | undefined): ProviderErrorKind {
  switch (code) {
    case 1004:
      return "invalid_key";
    case 1002:
    case 1039:
      return "rate_limited";
    case 2038:
      return "quota_exceeded";
    default:
      return "unknown";
  }
}
