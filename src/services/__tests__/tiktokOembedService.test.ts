import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchTikTokOembed } from "@/services/tiktokOembedService";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

describe("fetchTikTokOembed", () => {
  it("extracts the handle from author_url and the cover from thumbnail_url", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          author_name: "Some Display Name",
          author_url: "https://www.tiktok.com/@somehandle",
          thumbnail_url: "https://p16-sign.tiktokcdn.com/cover.jpeg",
        }),
    }) as unknown as typeof fetch;

    const result = await fetchTikTokOembed("https://www.tiktok.com/@somehandle/video/123");

    expect(result).toEqual({
      authorHandle: "somehandle",
      coverUrl: "https://p16-sign.tiktokcdn.com/cover.jpeg",
    });
  });

  it("returns null when the oEmbed request fails", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;

    const result = await fetchTikTokOembed("https://www.tiktok.com/@somehandle/video/123");

    expect(result).toBeNull();
  });

  it("returns null when the fetch throws (network error, timeout)", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network down")) as unknown as typeof fetch;

    const result = await fetchTikTokOembed("https://www.tiktok.com/@somehandle/video/123");

    expect(result).toBeNull();
  });

  it("returns a null authorHandle when author_url is missing", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ thumbnail_url: "https://cdn/cover.jpeg" }),
    }) as unknown as typeof fetch;

    const result = await fetchTikTokOembed("https://www.tiktok.com/@somehandle/video/123");

    expect(result).toEqual({ authorHandle: null, coverUrl: "https://cdn/cover.jpeg" });
  });
});
