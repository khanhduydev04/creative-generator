# Static Ads Generator — Tổng quan dự án

## Mục đích

Ứng dụng web giúp tạo ảnh quảng cáo tĩnh (static ads) cho Meta (Facebook/Instagram). Người dùng nhập thông tin sản phẩm, chọn chiến lược sáng tạo, và hệ thống tự động:

1. Đọc trang sản phẩm (landing page) → trích xuất thông tin
2. Phân tích đối thủ cạnh tranh từ Google Sheets
3. Tạo nội dung quảng cáo (headline, body, visual direction) bằng AI
4. Ghép prompt hoàn chỉnh
5. Tạo ảnh quảng cáo bằng AI (KIE)

## Tech Stack

| Layer | Công nghệ |
|-------|-----------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 3.4, shadcn/ui (manual install) |
| Icons | lucide-react |
| Database | Supabase (PostgreSQL + Storage + Auth) |
| AI — Text | Google Gemini 2.5 Flash (`@google/genai`) |
| AI — Image | KIE AI (`nano-banana-2` model, REST API) |
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
│   ├── page.tsx                  # Trang chính — Workspace
│   ├── login/page.tsx            # Trang đăng nhập
│   ├── brand-setup/page.tsx      # Trang thiết lập thương hiệu
│   ├── stealth-ads/page.tsx      # Trang stealth ads
│   ├── concepts/page.tsx         # Trang quản lý concepts
│   ├── library/page.tsx          # Trang thư viện ảnh
│   ├── guide/page.tsx            # Trang hướng dẫn sử dụng
│   ├── settings/page.tsx         # Trang cài đặt cá nhân
│   ├── admin/users/page.tsx      # Quản lý người dùng (admin)
│   ├── admin/settings/page.tsx   # Quản lý API keys (admin)
│   └── api/                      # 31+ API routes (REST)
│       ├── clients/              # CRUD clients
│       ├── brands/               # CRUD brands
│       ├── brand-kit/            # Brand identity (colors, fonts, logos)
│       ├── brand-products/       # CRUD products + image upload
│       ├── brand-intelligence/   # AI research + persona generation
│       ├── personas/             # CRUD personas
│       ├── concepts/             # CRUD concept prompts + ref images
│       ├── product-markets/      # Per-product markets + sheet fetch
│       ├── generate-ads/         # Main generation pipeline (SSE stream)
│       ├── edit-ad/              # Edit existing ad
│       ├── save-ad/              # Persist generated ad to storage
│       ├── saved-ads/            # List/delete saved ads
│       ├── google-fonts/         # Google Fonts proxy
│       ├── competitor-ref/       # Upload competitor reference image
│       └── upload-reference/     # Upload reference image
├── components/
│   ├── layout/                   # DashboardLayout, Header, Modals
│   └── ui/                       # shadcn/ui components (Button, Dialog, etc.)
├── features/
│   ├── app/context.tsx           # Global state (selectedClient, selectedBrand)
│   ├── auth/                     # Auth context, types, login
│   ├── brand/components/         # Brand setup UI (tabs, forms, pickers)
│   ├── guide/                    # Interactive user guide (search, TOC, checklist)
│   ├── stealth/                  # Stealth ads (scene planning, generation)
│   └── workspace/components/     # Workspace UI (sections, progress, gallery)
├── lib/                          # Pure utilities + business logic
│   ├── supabase/                 # Supabase client (server.ts, client.ts)
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
│   ├── clientService.ts
│   ├── brandService.ts
│   ├── brandProductService.ts
│   ├── brandKitService.ts
│   ├── brandIntelligenceService.ts
│   ├── personaService.ts
│   ├── conceptPromptService.ts
│   ├── productMarketService.ts
│   ├── storageService.ts
│   ├── geminiClient.ts           # Gemini API wrapper
│   └── kieClient.ts              # KIE AI API wrapper
└── types/
    └── database.types.ts         # Supabase generated types
```

## Trang chính

| URL | Mô tả |
|-----|-------|
| `/` | Workspace — tạo quảng cáo (2 cột: form bên trái, kết quả bên phải) |
| `/stealth-ads` | Stealth Ads — tạo quảng cáo ngụy trang (2 bước: plan → generate) |
| `/brand-setup` | Thiết lập thương hiệu (tabs: Identity, Products, Intelligence, Personas) |
| `/concepts` | Quản lý creative concepts (admin) |
| `/library` | Thư viện ảnh quảng cáo đã lưu |
| `/guide` | Hướng dẫn sử dụng tương tác (search, TOC, checklist) |
| `/settings` | Cài đặt cá nhân + đổi mật khẩu |
| `/admin/users` | Quản lý người dùng (CEO, Super Admin only) |
| `/admin/settings` | Quản lý API keys runtime (CEO, Super Admin only) |
| `/login` | Đăng nhập |
| `/forgot-password` | Quên mật khẩu |

## Trạng thái hiện tại

- Build: `npm run build` — thành công
- TypeScript: `npx tsc --noEmit` — clean
- Tests: 144/144 pass (Vitest)
- npm audit: 0 vulnerabilities
