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
  },
  competitorVideos: {
    list: (brandId: string, status?: string) =>
      status
        ? (["competitor-videos", brandId, status] as const)
        : (["competitor-videos", brandId] as const),
  },
  transcripts: {
    detail: (videoId: string) => ["transcripts", videoId] as const,
  },
  scripts: {
    list: (transcriptId: string) => ["scripts", transcriptId] as const,
  },
} as const;
