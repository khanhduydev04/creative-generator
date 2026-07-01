# Static Ads Generator — Tổng quan dự án

## Mục đích

Công cụ nội bộ của PATI Group (Ladospice) cho hai nhóm việc:

**A. Tạo ảnh quảng cáo tĩnh (static ads)** cho Meta (Facebook/Instagram). Người dùng nhập thông tin sản phẩm, chọn chiến lược sáng tạo, và hệ thống tự động:

1. Đọc trang sản phẩm (landing page) → trích xuất thông tin
2. Phân tích đối thủ cạnh tranh từ Google Sheets
3. Tạo nội dung quảng cáo (headline, body, visual direction) bằng AI
4. Ghép prompt hoàn chỉnh
5. Tạo ảnh quảng cáo bằng AI (KIE)

**B. Phân tích video đối thủ (Video feature)** — crawl video TikTok đối thủ, bóc băng lời thoại, viết lại thành kịch bản theo brand, và tạo giọng đọc AI:

1. Crawl video TikTok đối thủ qua Apify (cron tự động hoặc thêm URL thủ công)
2. Bóc băng (transcribe) bằng Gemini 2.5 Flash
3. Viết lại kịch bản theo giọng brand bằng Claude Sonnet
4. Tạo giọng đọc AI (Vbee hoặc ElevenLabs TTS)

Ứng dụng này không phải SaaS đa khách hàng — chỉ dùng nội bộ, không có trang đăng ký công khai và không có API key riêng theo user (BYOK); mọi API key được đọc từ biến môi trường server, dùng chung cho toàn bộ user.

## Tech Stack

| Layer | Công nghệ |
|-------|-----------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 3.4, shadcn/ui (manual install) |
| Icons | lucide-react |
| Database | Supabase (PostgreSQL + Storage + Auth) |
| AI — Text (ads) | Google Gemini 2.5 Flash (`@google/genai`) |
| AI — Image | KIE AI (`nano-banana-2` model, REST API) |
| AI — Video transcribe | Google Gemini 2.5 Flash |
| AI — Script rewrite | Anthropic Claude Sonnet (`claude-sonnet-4-6`) |
| AI — Voice (TTS) | Vbee, ElevenLabs |
| Video crawl | Apify (TikTok scraper actor, cron + manual sync) |
| Image Processing | sharp (server-side resize) |
| Testing | Vitest 4 + @vitest/coverage-v8 |

## Kiến trúc 3 Layer

```
Layer 1: Docs         → /docs, /architecture, *.md
Layer 2: Navigation   → src/app/ (pages, layouts, API routes)
Layer 3: Tools        → src/features/, src/lib/, src/services/
```

## Cấu trúc thư mục chính

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout (AppProvider wrapper)
│   ├── page.tsx                  # Redirect → /app
│   ├── login/page.tsx            # Trang đăng nhập
│   ├── forgot-password/page.tsx  # Quên mật khẩu
│   ├── reset-password/page.tsx   # Đặt lại mật khẩu (từ email)
│   ├── app/                      # Route group — toàn bộ app sau khi login
│   │   ├── layout.tsx            # Bọc AuthProvider + kiểm tra session
│   │   ├── page.tsx              # Workspace — tạo quảng cáo
│   │   ├── onboarding/page.tsx   # First-run wizard
│   │   ├── brands/page.tsx       # Thiết lập thương hiệu (Brand)
│   │   ├── stealth-ads/page.tsx  # Trang stealth ads
│   │   ├── concepts/page.tsx     # Trang quản lý concepts
│   │   ├── library/page.tsx      # Trang thư viện ảnh
│   │   ├── guide/page.tsx        # Trang hướng dẫn sử dụng
│   │   ├── settings/page.tsx     # Trang cài đặt cá nhân
│   │   ├── admin/page.tsx        # Admin analytics dashboard (page views, accounts, ads saved)
│   │   └── video/                # Video feature (crawl → transcribe → script → voice)
│   │       ├── page.tsx          # Video Trending — danh sách video đối thủ
│   │       ├── [id]/page.tsx     # Chi tiết video — pipeline 4 bước
│   │       ├── audio/page.tsx    # Thư viện audio đã tạo
│   │       └── voice-config/page.tsx  # Cấu hình voice preset (Vbee/ElevenLabs)
│   └── api/                      # API routes (REST)
│       ├── brands/               # CRUD brands (top-level workspace unit)
│       ├── brand-kit/            # Brand identity (colors, fonts, logos)
│       ├── brand-products/       # CRUD products + image upload
│       ├── brand-intelligence/   # AI research + persona generation
│       ├── personas/             # CRUD personas
│       ├── concepts/             # CRUD concept prompts + ref images
│       ├── user-concepts/        # Per-user concept preferences
│       ├── generate-ads/         # Main generation pipeline (SSE stream)
│       ├── edit-ad/              # Edit existing ad
│       ├── save-ad/              # Persist generated ad to storage
│       ├── saved-ads/            # List/delete saved ads
│       ├── content-adapt/        # Rewrite ad captions for a product
│       ├── stealth/               # Stealth ads: plan + generate (SSE)
│       ├── stealth-ref/          # Stealth from competitor reference image
│       ├── stealth-scenes/       # Scene library CRUD
│       ├── competitor-ref/       # Upload competitor reference image
│       ├── upload-reference/     # Upload reference image
│       ├── google-fonts/         # Google Fonts proxy
│       ├── analytics/            # Usage analytics
│       ├── admin/stats/          # Usage stats for admin dashboard
│       ├── auth/                 # Login verify, forgot/reset password, me
│       ├── apify/webhook/        # Apify actor-run webhook receiver
│       ├── cron/sync-apify/      # Scheduled Apify sync (Mon+Thu 10am VN)
│       └── video/                # Video feature backend
│           ├── competitors/      # CRUD crawled TikTok videos ([id]/fetch-cdn = re-fetch CDN url)
│           ├── sync-apify/       # Legacy manual trigger: pull explicit Apify dataset
│           ├── apify-config/     # Per-brand Apify task config (sync/ = manual "Sync Apify" button)
│           ├── transcripts/      # Create transcript + run Gemini transcription ([id]/run)
│           ├── scripts/          # Generate/save brand script from transcript (Claude, SSE)
│           ├── audio/            # Generate/list ([id]/ = get/delete) voice-over audio
│           ├── voice-presets/    # CRUD voice presets (Vbee or ElevenLabs)
│           ├── voice-ratings/    # Rate generated audio quality
│           ├── vbee/             # Vbee TTS proxy (voices/, preview/)
│           └── elevenlabs/       # ElevenLabs TTS proxy (voices/)
├── components/
│   ├── layout/                   # DashboardLayout (sidebar nav + brand selector), Modals
│   └── ui/                       # shadcn/ui components (Button, Dialog, etc.)
├── features/
│   ├── app/context.tsx           # Global state (selectedBrandId, persisted to localStorage)
│   ├── auth/                     # Auth context, types (roles, EMAIL_DOMAIN), login
│   ├── brand/components/         # Brand setup UI (tabs, forms, pickers)
│   ├── guide/                    # Interactive user guide (search, TOC, checklist)
│   ├── stealth/                  # Stealth ads (scene planning, generation)
│   ├── video/                    # Video pipeline UI (player, transcript/script editors,
│   │                              #   voice generation panel, pipeline stage bar)
│   └── workspace/components/     # Workspace UI (sections, progress, gallery)
├── lib/                          # Pure utilities + business logic
│   ├── supabase/                 # Supabase client (server.ts, client.ts, admin.ts)
│   ├── key-provider.ts           # Reads API keys from server env vars (no DB override)
│   ├── concepts.ts               # Type definitions (Concept, ConceptWithPrompt)
│   ├── concept-skills.ts         # Gemini: analyze competitors, generate variants
│   ├── concept-prompt-loader.ts  # Load concept prompts from DB
│   ├── competitor-analyzer.ts    # Deep competitor analysis (vision + text)
│   ├── gemini-reader.ts          # Read product pages, analyze competitor ads
│   ├── prompt-assembler.ts       # Assemble final KIE prompt
│   ├── prompt-scorer.ts          # Score & self-improve prompts
│   ├── image-utils.ts            # Resize + upload images
│   ├── json-utils.ts             # Safe JSON parse (Gemini responses)
│   ├── sheet-url-parser.ts       # Parse Google Sheets URLs
│   ├── sheets-reader.ts          # Fetch competitor data from Google Sheets
│   ├── env.ts                    # Environment variable validation
│   ├── version.ts                # App version (from package.json)
│   └── utils.ts                  # cn() class merge utility
├── services/                     # Database service layer (Supabase CRUD)
│   ├── brandService.ts
│   ├── brandProductService.ts
│   ├── brandKitService.ts
│   ├── brandIntelligenceService.ts
│   ├── brandApifyConfigService.ts   # Per-brand Apify task config
│   ├── personaService.ts
│   ├── conceptPromptService.ts
│   ├── userConceptService.ts
│   ├── savedAdService.ts
│   ├── stealthSceneService.ts
│   ├── storageService.ts
│   ├── userService.ts
│   ├── analyticsService.ts
│   ├── apifySyncService.ts       # Fetch Apify actor runs + dataset items
│   ├── competitorVideoService.ts # CRUD crawled competitor videos
│   ├── transcriptService.ts      # Transcript CRUD + status
│   ├── scriptService.ts          # Script CRUD (brand script rewrite)
│   ├── scriptPrompt.ts           # Prompt template for script rewrite
│   ├── generatedAudioService.ts  # Generated voice-over audio CRUD
│   ├── voicePresetService.ts     # Voice preset CRUD (Vbee/ElevenLabs)
│   ├── vbeeService.ts            # Vbee TTS API wrapper
│   ├── elevenlabsService.ts      # ElevenLabs TTS API wrapper
│   ├── geminiClient.ts           # Gemini API wrapper
│   ├── claudeClient.ts           # Claude (Anthropic) API wrapper
│   └── kieClient.ts              # KIE AI API wrapper
└── types/
    └── database.types.ts         # Supabase generated types
```

## Trang chính

| URL | Mô tả |
|-----|-------|
| `/app` | Workspace — tạo quảng cáo (2 cột: form bên trái, kết quả bên phải) |
| `/app/stealth-ads` | Stealth Ads — tạo quảng cáo ngụy trang (2 bước: plan → generate) |
| `/app/brands` | Thiết lập thương hiệu (tabs: Identity, Products, Intelligence, Personas) |
| `/app/concepts` | Quản lý creative concepts (admin) |
| `/app/library` | Thư viện ảnh quảng cáo đã lưu |
| `/app/video` | Video Trending — danh sách video TikTok đối thủ đã crawl |
| `/app/video/[id]` | Chi tiết video — pipeline Bóc băng → Kịch bản → Giọng đọc → Hoàn tất |
| `/app/video/audio` | Thư viện audio (voice-over) đã tạo |
| `/app/video/voice-config` | Cấu hình voice preset (Vbee / ElevenLabs) |
| `/app/guide` | Hướng dẫn sử dụng tương tác (search, TOC, checklist) |
| `/app/settings` | Cài đặt cá nhân + đổi mật khẩu |
| `/app/admin` | Admin analytics dashboard (page views, accounts, ads saved) (CEO, Super Admin only) |
| `/app/onboarding` | Wizard thiết lập lần đầu |
| `/login` | Đăng nhập (email/password hoặc Google) |
| `/forgot-password` | Quên mật khẩu |
| `/reset-password` | Đặt lại mật khẩu |

Ghi chú: các trang app đều nằm dưới route group `src/app/app/`, được bọc bởi `DashboardLayout` (sidebar điều hướng + brand selector). Không còn khái niệm "Client" — **Brand** là đơn vị workspace cấp cao nhất; mỗi Brand có Products/Videos/Ads riêng, chọn qua dropdown ở cuối sidebar.

## Trạng thái hiện tại

- Build: `npm run build` — thành công
- TypeScript: `npx tsc --noEmit` — clean
- Tests: 144/144 pass (Vitest)
- npm audit: 0 vulnerabilities
