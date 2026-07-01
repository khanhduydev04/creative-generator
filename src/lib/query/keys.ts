export const queryKeys = {
  brands: {
    all: ["brands"] as const,
    detail: (brandId: string) => ["brands", brandId] as const,
  },
  brandKit: {
    detail: (brandId: string) => ["brand-kit", brandId] as const,
  },
  intelligence: {
    detail: (brandId: string) => ["intelligence", brandId] as const,
  },
  personas: {
    list: (brandId: string) => ["personas", brandId] as const,
  },
  products: {
    list: (brandId: string) => ["products", brandId] as const,
  },
  concepts: {
    all: ["concepts"] as const,
  },
  library: {
    list: (brandId: string, productId?: string) =>
      productId
        ? (["library", brandId, productId] as const)
        : (["library", brandId] as const),
  },
  apiKeys: {
    all: ["api-keys"] as const,
  },
  admin: {
    stats: (days: number) => ["admin", "stats", days] as const,
    users: ["admin", "users"] as const,
  },
  competitorVideos: {
    all: (brandId: string) => ["competitor-videos", brandId] as const,
    list: (brandId: string, status: string, page: number, q?: string) =>
      ["competitor-videos", brandId, status, page, q ?? ""] as const,
    detail: (brandId: string, videoId: string) =>
      ["competitor-videos", brandId, "detail", videoId] as const,
  },
  transcripts: {
    detail: (videoId: string) => ["transcripts", videoId] as const,
  },
  scripts: {
    list: (transcriptId: string) => ["scripts", transcriptId] as const,
  },
  voicePresets: {
    list: (brandId: string) => ["voice-presets", brandId] as const,
  },
  voiceRatings: {
    avg: (brandId: string) => ["voice-ratings", brandId] as const,
  },
  generatedAudios: {
    list: (brandId: string) => ["generated-audios", brandId] as const,
    byScript: (scriptId: string) => ["generated-audios", "script", scriptId] as const,
  },
  vbeeVoices: {
    all: ["vbee-voices"] as const,
  },
  apifyConfig: {
    detail: (brandId: string) => ["apify-config", brandId] as const,
  },
} as const;
