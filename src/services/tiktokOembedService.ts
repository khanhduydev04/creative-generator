const OEMBED_TIMEOUT_MS = 8_000;

export interface TikTokOembedResult {
  authorHandle: string | null;
  coverUrl: string | null;
}

interface TikTokOembedResponse {
  author_url?: string;
  thumbnail_url?: string;
}

/** Best-effort lookup via TikTok's public oEmbed endpoint. Never throws — callers get null on any failure. */
export async function fetchTikTokOembed(tiktokUrl: string): Promise<TikTokOembedResult | null> {
  try {
    const url = `https://www.tiktok.com/oembed?url=${encodeURIComponent(tiktokUrl)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(OEMBED_TIMEOUT_MS) });
    if (!res.ok) return null;

    const json = (await res.json()) as TikTokOembedResponse;
    return {
      authorHandle: extractHandle(json.author_url),
      coverUrl: json.thumbnail_url ?? null,
    };
  } catch {
    return null;
  }
}

function extractHandle(authorUrl?: string): string | null {
  if (!authorUrl) return null;
  const match = authorUrl.match(/\/@([^/?]+)/);
  return match ? match[1] : null;
}
