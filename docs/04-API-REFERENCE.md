# API Reference

Tất cả API routes nằm trong `src/app/api/`. Sử dụng Next.js App Router convention (export GET/POST/PUT/PATCH/DELETE).

> **Lưu ý:** Hiện tại chưa có authentication middleware. Mọi request đều được xử lý. Xem [Security TODO](#security-todo) cuối trang.

---

## Clients

### GET /api/clients
Lấy danh sách tất cả clients.

**Response:** `{ clients: Client[] }`

### POST /api/clients
Tạo client mới.

**Body:** `{ name: string }`
**Response:** `201 { client: Client }`

### PATCH /api/clients/[id]
Đổi tên client.

**Body:** `{ name: string }`
**Response:** `{ client: Client }`

### DELETE /api/clients/[id]
Soft-delete client.

**Response:** `{ success: true }`

---

## Brands

### GET /api/brands?clientId=xxx
Lấy brands theo client. `clientId` bắt buộc.

**Response:** `{ brands: Brand[] }`

### POST /api/brands
Tạo brand mới.

**Body:** `{ clientId: string, name: string, description?: string }`
**Response:** `201 { brand: Brand }`

### GET /api/brands/[id]
Lấy brand theo ID.

### PATCH /api/brands/[id]
Cập nhật brand.

**Body:** `{ name?: string, description?: string }`

### DELETE /api/brands/[id]
Xóa brand.

---

## Brand Kit (Colors, Fonts, Logos)

### GET /api/brand-kit/[brandId]
Lấy brand kit + logo URLs.

**Response:** `{ kit: BrandKit | null, logoUrls: LogoUrls | null }`

### PUT /api/brand-kit/[brandId]
Cập nhật brand kit.

**Body:**
```typescript
{
  typography?: string,          // Tên font
  font_source?: 'google' | 'local',
  primary_color_1?: string,     // Hex color
  primary_color_2?: string,
  secondary_color_1?: string,
  secondary_color_2?: string,
  accent_color_1?: string,
  accent_color_2?: string,
}
```

### POST /api/brand-kit/[brandId]/logo
Upload logo (FormData: `file` + `type=light|dark`). Max 10MB, JPG/PNG/WEBP/SVG.

### POST /api/brand-kit/[brandId]/font
Upload font files (FormData: `files[]` + `fontName` + optional `specimen`). Max 5MB.

---

## Brand Products

### GET /api/brand-products?brandId=xxx
Lấy products theo brand.

### POST /api/brand-products
Tạo product mới.

**Body:** `{ brand_id: string, name: string, description?: string, images: string[] }` (1-5 images)

### GET/PUT/DELETE /api/brand-products/[id]
CRUD product. PUT body: `{ name?, description?, images? }`

### POST /api/brand-products/[id]/upload
Upload ảnh sản phẩm (FormData: `file`). Max 10MB, JPG/PNG/WEBP.

**Response:** `{ url: string, path: string }`

---

## Product Markets

### GET /api/product-markets?productId=xxx
Lấy markets theo product.

### POST /api/product-markets
Tạo market mới.

**Body:**
```typescript
{
  product_id: string,
  market_code: string,    // "US", "UK", "DE"
  market_label: string,   // "United States"
  language?: string,      // Default: "en-US"
  sheet_url?: string,     // Google Sheets URL
  sheet_name?: string,    // Tên tab trong sheet
}
```

### GET/PUT/DELETE /api/product-markets/[id]
CRUD market.

### POST /api/product-markets/[id]/fetch-data
Fetch CSV từ Google Sheets và cache vào DB.

**Response:** `{ rowCount: number, cachedAt: string, hasUrls: boolean }`

---

## Concepts

### GET /api/concepts
Lấy tất cả concept prompts.

### POST /api/concepts
Tạo concept mới.

**Body:**
```typescript
{
  concept_id: string,           // ID ngắn: "data_hook", "before_after"
  label: string,
  description: string,
  requires_competitor?: boolean, // Default: false
  prompt?: string,              // Creative strategy prompt
  reference_images?: string[],  // Max 2 URLs
}
```

### PUT/DELETE /api/concepts/[conceptId]
Cập nhật/xóa concept.

### POST /api/concepts/[conceptId]/upload
Upload reference image cho concept. Max 10MB, JPG/PNG/WEBP.

---

## Brand Intelligence & Personas

### GET/PUT /api/brand-intelligence/[brandId]
Lấy/lưu brand research summary (markdown).

### POST /api/brand-intelligence/[brandId]/generate-personas
AI tự động tạo 10 personas từ research summary.

### GET /api/personas?brandId=xxx
Lấy personas theo brand.

### POST /api/personas
Tạo persona thủ công.

**Body:** `{ brandId, title, pain?, angle?, emotion?, researchSummaryId? }`

### GET/PATCH/DELETE /api/personas/[id]
CRUD persona.

---

## Ad Generation (Core Pipeline)

### POST /api/generate-ads
**Endpoint quan trọng nhất.** Tạo ảnh quảng cáo qua SSE stream.

**Response type:** `text/event-stream` (Server-Sent Events)

**Body:**
```typescript
{
  productId: string,
  productName: string,
  productDescription?: string,
  productImages: string[],         // URLs ảnh sản phẩm
  landingPageUrl: string,          // URL trang sản phẩm
  market: string,                  // Market code
  marketId?: string,               // DB market ID (new system)
  language?: string,               // "en-US", "de", "fr", "es", "vi"
  generationMode?: "concept" | "competitor_ref",
  competitorRefImageUrl?: string,  // Chỉ cho mode competitor_ref
  conceptIds: string[],            // Chỉ cho mode concept
  adCopyOverride?: {
    headline?: string,
    bodyText?: string,
    additionalNotes?: string,
  },
  targetAudience: {
    title: string,
    pain: string | null,
    angle: string | null,
    emotion: string | null,
  },
  brandProfile: {
    brandName: string,
    logoUrl: string | null,
    primaryColor1: string,         // Hex colors
    primaryColor2: string,
    secondaryColor1: string,
    secondaryColor2: string,
    accentColor1: string,
    accentColor2: string,
    typography: string,
  },
  deepAnalysis?: boolean,          // Deep competitor analysis (slow)
  outputConfig: {
    aspectRatio: string,           // "1:1", "4:5", "9:16", "16:9"
    resolution?: string,           // "1K", "2K", "4K"
    funnelStage?: string,          // "awareness", "consideration"
    count?: number,                // 1-10 ads
  },
}
```

**SSE Events:**
```
event: step    → { step, status: "running"|"completed"|"failed", message }
event: meta    → { totalExpected }
event: result  → { imageUrl, taskId, prompt, headline, concept, market }
event: imageError → { error, headline, concept }
event: error   → { error }
event: done    → { totalResults, totalFailed }
```

### POST /api/edit-ad
Chỉnh sửa ảnh đã tạo.

**Body:** `{ originalImageUrl, editPrompt, originalPrompt, brandContext, productContext, additionalImages?, aspectRatio?, resolution? }`

### POST /api/save-ad
Lưu ảnh từ URL tạm (KIE) vào Supabase Storage + ghi metadata vào `saved_ads` table.

**Body:**
```json
{
  "imageUrl": "https://...",
  "prompt": "...",
  "headline": "...",
  "concept": "data_hook",
  "market": "",
  "brandId": "uuid",
  "productId": "uuid (optional)",
  "productName": "Creatine Gummies",
  "source": "workspace | stealth | edit"
}
```
**SSRF Protection:** Chặn localhost, private IPs, .internal, .local, non-HTTPS.
**Response:** `{ success, storagePath, permanentUrl, metadata }`

### GET /api/saved-ads?brandId=xxx&productId=yyy
Lấy danh sách ảnh đã lưu. Query `saved_ads` DB table trước (hỗ trợ filter theo `productId`), fallback tới Storage listing cho legacy ads.

**Query params:**
- `brandId` (required) — filter theo brand
- `productId` (optional) — filter theo product

**Response:** `{ ads: [{ name, storagePath, publicUrl, createdAt, productId, headline, concept, source }] }`

### DELETE /api/saved-ads
Xóa ảnh đã lưu khỏi cả Storage và `saved_ads` table.
**Body:** `{ path: string }` hoặc `{ paths: string[] }` (bulk delete)

---

## Utility

### GET /api/google-fonts
Proxy Google Fonts API (ẩn API key khỏi client). Cache 24h.

### POST /api/competitor-ref/upload
Upload ảnh đối thủ để dùng trong competitor_ref mode.

### POST /api/upload-reference
Upload ảnh tham khảo.

---

## Security TODO

- [ ] Thêm `supabase.auth.getUser()` check ở đầu mỗi route
- [ ] Thêm rate limiting cho `/api/generate-ads`, `/api/edit-ad`
- [ ] Validate UUID format cho query params (brandId, clientId, etc.)
- [ ] Sanitize error messages (không leak internal details)
