# PATI Ads Generator — App Workflow

> Tài liệu mô tả toàn bộ luồng sử dụng của tool từ góc nhìn người dùng.
> Version: 1.2.0 | Cập nhật: July 2026

---

## Mục lục

1. [Authentication](#1-authentication)
2. [Brand Selection](#2-brand-selection)
3. [Brand Setup](#3-brand-setup)
4. [Standard Ad Generation](#4-standard-ad-generation-workspace)
5. [Stealth Ad Generation](#5-stealth-ad-generation)
6. [Competitor Reference Mode](#6-competitor-reference-mode)
7. [Library](#7-library)
8. [Concepts Management](#8-concepts-management)
9. [Video Pipeline](#9-video-pipeline)
10. [User Guide](#10-user-guide)
11. [Admin Panel](#11-admin-panel)
12. [Settings](#12-settings)
13. [Data Dependencies](#13-data-dependencies)

---

## 1. Authentication

### Login (`/login`)

```
User mở app
  → Option A: Click "Sign in with Google" (GoogleSignInButton) → OAuth flow → redirect "/app"
  → Option B: Nhập email (@patigroup.com) + password (8+ ký tự) → Click "Sign In"
      → supabase.auth.signInWithPassword()
      → POST /api/auth/verify-login
          ├── ✓ Success → redirect "/app" → AuthProvider load profile (GET /api/auth/me)
          └── ✗ Fail → hiện lỗi (invalid credentials / account deactivated / account not found)
```

Email phải kết thúc bằng `@patigroup.com` (`EMAIL_DOMAIN` trong `src/features/auth/types.ts`), validate ngay trên client trước khi gọi Supabase.

### Forgot Password (`/forgot-password`)

```
Click "Forgot password?" trên login page
  → Nhập email
  → POST /api/auth/forgot-password
  → Supabase gửi temporary password qua email
  → User login bằng password mới → đổi password trong Settings
```

### Sign Out

```
Click avatar (header phải) → "Sign Out"
  → Supabase signOut()
  → Redirect "/login"
  → AuthContext clear profile
```

---

## 2. Brand Selection

**Brand** là đơn vị workspace cấp cao nhất (không còn khái niệm "Client"). Mỗi Brand có Products, Videos, Ads riêng. Brand selector nằm ở cuối sidebar trái (`DashboardLayout`), không phải trên header.

### Auto-Selection (khi load app)

```
AppProvider mount
  → Đọc "selected-brand-id" từ localStorage (brandHydrated = true sau khi đọc xong)
DashboardLayout mount
  → GET /api/brands (useBrands hook) → load danh sách brands của user
  → Sau khi brandHydrated && brands.length > 0:
      → Nếu brand đã lưu (localStorage) không còn tồn tại → auto-select brand đầu tiên
      → Ngược lại giữ nguyên brand đã chọn (persist qua reload)
  → AppContext lưu: selectedBrandId (localStorage key "selected-brand-id")
```

### Brand selector (Sidebar, cuối menu điều hướng)

```
┌───────────────────────────────┐
│ THƯƠNG HIỆU                   │
│ [Tên brand ▾]           [⋯]  │
└───────────────────────────────┘

Click dropdown ▾  → danh sách brands → click 1 brand để chuyển
  (nếu là Admin) → mục "+ Thêm thương hiệu" ở cuối danh sách

Click [⋯] (brand actions)
  → "Đổi tên"  → mọi user đều dùng được → PATCH /api/brands/{id}
  → "Xóa"      → chỉ Admin (CEO/Super Admin) → DELETE /api/brands/{id} → tự chọn brand khác

Thêm thương hiệu (chỉ Admin) → Modal nhập tên → POST /api/brands → auto-select brand mới
```

**Permission:** `POST /api/brands` (tạo) và `DELETE /api/brands/{id}` (xóa) yêu cầu quyền Admin (CEO/Super Admin — `verifyAdmin()`). `PATCH /api/brands/{id}` (đổi tên) mở cho mọi user đã đăng nhập.

---

## 3. Brand Setup

### Entry: `/app/brands`

**Yêu cầu:** Đã chọn Brand (xem mục 2). Nếu chưa có Brand nào, Admin cần tạo trước qua "+ Thêm thương hiệu" ở sidebar.

```
Brand Setup Page
├── Visual Identity (left column)
│   ├── Brand Name (text input)
│   ├── Brand Description (textarea)
│   ├── Typography (Google Font picker hoặc upload font)
│   ├── Color Palette (6 color pickers: primary×2, secondary×2, accent×2)
│   ├── Logo Light (upload SVG/PNG/JPG, max 2MB)
│   └── Logo Dark (upload SVG/PNG/JPG, max 2MB)
│
├── Live Preview (right column) — realtime preview khi chỉnh sửa
│
├── Products Tab
│   ├── Add Product → Modal: name + images (max 5) → POST /api/brand-products
│   ├── Edit Product → Modal sửa → PATCH /api/brand-products/{id}
│   └── Delete Product → Confirm → DELETE /api/brand-products/{id}
│
├── Brand Intelligence Tab
│   ├── Research Summary → Textarea paste competitor research
│   │   └── Save → PUT /api/brand-intelligence/{brandId}
│   └── Generate Personas → Click "Generate 10 Profiles"
│       └── POST /api/brand-intelligence/{brandId}/generate-personas
│           → Gemini phân tích research → trả về 10 persona profiles
│
└── Personas Tab
    ├── Auto-generated profiles (title, pain, angle, emotion)
    ├── Add Manual → Modal → POST /api/personas
    ├── Edit → Modal → PATCH /api/personas/{id}
    └── Delete → Confirm → DELETE /api/personas/{id}

Save Brand Kit → PATCH /api/brands/{id} + PUT /api/brand-kit/{id}
```

**Permission:**
- Admin (CEO, Super Admin): full edit
- Member: view only (yellow banner)

---

## 4. Standard Ad Generation (Workspace)

### Entry: `/app` (Home)

**Layout:** 2 cột — Left (420px inputs) | Right (flexible output)

### Left Column — Configuration

```
[1] Brand Product (required)
    ├── Select Product (dropdown) → load từ brand
    └── Landing Page URL (input) → AI đọc trang này để hiểu sản phẩm

[2] Language
    └── Select language (en-US, en-UK, de, fr, es, vi)
        → Tất cả text trên ad sẽ sinh bằng ngôn ngữ này

[3] Generation Mode (radio toggle)
    ├── Concept-Based (default) → dùng creative concepts
    └── Competitor Reference → upload ảnh đối thủ
        ├── Sub-mode: Standard Ad → replicate layout
        └── Sub-mode: Stealth Ad → plan scenes from reference

[4] Concepts (required — chỉ Concept mode)
    └── Multi-select checkboxes
        ├── Data Hook — số liệu, data-driven
        ├── Before/After — transformation
        ├── VS Competitor — so sánh (cần competitor data)
        ├── Social Proof — reviews, testimonials
        ├── Ingredient Callout — highlight thành phần
        └── Urgency/Scarcity — giới hạn thời gian/số lượng

[5] Ad Copy Override (optional, collapsible)
    ├── Headline — ghi đè headline AI
    ├── Body Text — ghi đè body AI
    └── Additional Notes — hướng dẫn thêm cho AI

[6] Target Audience (required)
    └── Multi-select personas → mỗi persona tạo variant riêng

[7] Output Configuration
    ├── Aspect Ratio: 1:1 | 4:5 | 9:16
    └── Ad Count: 1-10

[Generate Ads] button
```

### Right Column — Progress & Results

```
Click "Generate Ads"
  → POST /api/generate-ads (SSE stream)

Pipeline Steps:
  1. Reading product page...       → Gemini đọc landing page URL
  2. Analyzing competitor data...  → Đọc competitor sheet (nếu có market)
  3. Applying concept strategy...  → Gemini tạo N variants (headline, body, direction)
  4. Assembling prompt...          → Ghép prompt hoàn chỉnh cho KIE
     (enforced: text capitalization nhất quán, logo chỉ dùng nguyên bản)
  5. Generating image...           → KIE AI tạo ảnh (polling ~5 phút max)

Mỗi step hiển thị: ⏳ Pending → 🔄 Running → ✅ Completed / ❌ Failed

Results (stream về real-time):
  ┌──────────┐
  │ [Image]  │  Headline: "73% saw results..."
  │          │  Concept: data_hook
  │          │  ──────────────────────
  │          │  [💾 Save] [📋 Copy] [⬇️ Download] [🗑️ Delete]
  └──────────┘

Bulk Actions:
  • Save All → persist tất cả vào Library
  • Download All as ZIP → tải về 1 file ZIP
  • Clear → xóa kết quả

Cache: Results lưu localStorage 1 giờ (survive navigation)
```

---

## 5. Stealth Ad Generation

### Entry: `/app/stealth-ads`

**Mục đích:** Tạo quảng cáo trông như nội dung organic (ảnh iPhone, screenshots, candid)

### 2-Step Flow

```
STEP 1: Plan Scenes
─────────────────────
Left Column:
  [1] Brand Product + Landing Page URL
  [2] Target Audience (personas)
  [3] Audience Tuning
      ├── Sensitivity: Normal / High
      │   (High = no before/after, no enhancement language)
      └── Age Range: 18-25, 25-35, 35-45, 45-55, 55+
  [4] Scene Selection
      ├── Auto Mode → AI chọn scenes tối ưu
      └── Manual Mode → User chọn từ 45 scenes:
          ├── HUM (17 scenes) — Human-Centric: person is hero
          ├── ENV (10 scenes) — Environment: product in settings
          ├── FMT (10 scenes) — Content Format: screenshots, chats
          └── STR (8 scenes)  — Story: product in narratives
  [5] Language
  [6] Output Volume

Click "Plan Scenes"
  → POST /api/stealth/plan
  → Gemini tạo N scene plans (structured output)

Right Column hiển thị Scene Plan Cards (editable):
  ┌─────────────────────────────────────────┐
  │ Scene: Gym Mirror Selfie [HUM]          │
  │ Visibility: Physical                    │
  │ Composition: iPhone selfie, gym mirror  │
  │ Product: bottom-left shelf, 8% frame    │
  │ Text: "day 14 💪" (caption style)       │
  │ ─────────────────────────────────────── │
  │ [Edit] [↑] [↓] [🔄 Regenerate] [🗑️]    │
  └─────────────────────────────────────────┘

User có thể: edit inline, reorder, delete, regenerate, add from library

STEP 2: Generate Images
────────────────────────
Click "Generate"
  → POST /api/stealth/generate (SSE stream)
  → Mỗi plan → resize images → assemble stealth prompt → KIE generate
  → Results stream về real-time

Results: Save / Download / Download All ZIP
```

---

## 6. Competitor Reference Mode

### Trong Workspace (`/app` → Generation Mode: Competitor Reference)

```
Upload competitor ad image
  → POST /api/competitor-ref/upload → lưu Supabase Storage

Sub-Mode Toggle:
┌─────────────────┬────────────────────┐
│  Standard Ad    │   Stealth Ad       │
└─────────────────┴────────────────────┘

A) Standard Ad (1 step)
   → AI phân tích layout, colors, typography, composition
   → Tạo ad replicate layout nhưng dùng brand/product của mình
   → Competitor color scheme bị BLOCK

B) Stealth Ad (2 steps)
   → Thêm tuning: Sensitivity + Age Range
   → Step 1: POST /api/stealth-ref/plan
     → Phân tích competitor image → plan scenes inspired by reference
   → Step 2: Review plans → Generate
     → POST /api/stealth/generate (reuse stealth generate endpoint)
```

---

## 7. Library

### Entry: `/app/library`

```
Library Page
├── Controls (top bar)
│   ├── View Mode: Grid | List
│   ├── Sort: Newest | Oldest
│   ├── Product Filter: All Products | [Product Name] | Untagged
│   ├── Date Filter: All Time | Today | This Week | This Month | Last Month
│   ├── Search (by filename)
│   ├── Adapt Content (bulk — chọn ads → chọn product → adapt captions)
│   └── Refresh button
│
├── Grid View
│   └── Cards với image preview + date + actions
│
├── List View
│   └── Table: thumbnail, filename, date, actions
│
├── Per-Ad Actions
│   ├── Click image → Detail Modal (với Product Reference auto-fill)
│   ├── Download → single image
│   └── Delete → confirm → xóa khỏi Storage + saved_ads DB
│
├── Bulk Actions
│   ├── Select multiple (checkboxes)
│   ├── Download selected as ZIP
│   ├── Adapt Content (content adaptation cho selected ads)
│   └── Delete selected
│
└── Detail Modal
    ├── Full-size preview
    ├── Product Reference (auto-filled từ ad's product_id hoặc active filter)
    ├── Edit prompt + edit images → POST /api/edit-ad
    └── Save edited → POST /api/save-ad (với product_id)

Data Source:
  Primary: GET /api/saved-ads?brandId=X&productId=Y → saved_ads DB table
  Fallback: Supabase Storage listing (cho legacy ads chưa có DB record)
```

---

## 8. Concepts Management

### Entry: `/app/concepts`

```
Concepts Page (Admin: full CRUD | Member: view only)

Concept Cards (expandable):
  ┌──────────────────────────────────────────────────┐
  │ ▶ Data Hook  [data_hook]  [Competitor badge]      │
  │   Statistics, numbers, data-driven messaging      │
  │                                    [✏️] [🗑️] [▼]  │
  └──────────────────────────────────────────────────┘

Expanded View:
  ├── Full creative prompt (có thể chứa ### Variant A/B/C)
  ├── Reference images (max 2, visual style guide)
  └── Requires competitor flag

Add Concept (Admin):
  → Modal: ID + Label + Description + Requires Competitor? + Prompt + Ref Images
  → POST /api/concepts

Edit/Delete (Admin):
  → PATCH/DELETE /api/concepts/{id}
```

---

## 9. Video Pipeline

**Mục đích:** Crawl video TikTok của đối thủ, bóc băng lời thoại, viết lại thành kịch bản theo giọng brand của mình, và tạo giọng đọc AI — phục vụ team Content/Creative tái sử dụng ý tưởng viral nhanh hơn.

### 9.1 Video Trending — danh sách video (`/app/video`)

```
CompetitorVideosPage
├── Filter theo Status: Pending | Approved | Rejected (tabs)
├── Search (server-side, debounce 300ms)
├── Pagination (20 video/trang, server-side)
├── [+ Add Video] → AddVideoModal
│     → Nhập TikTok URL thủ công → validate url chứa "tiktok.com"
│     → POST /api/video/competitors → 409 nếu URL đã tồn tại
├── [🔄 Sync Apify] → gọi lại Apify dataset mới nhất cho brand hiện tại
│     → POST /api/video/apify-config/sync
└── Video Cards (CompetitorVideoCard)
      ├── Thumbnail (CDN, tự fetch lại nếu hết hạn)
      ├── Caption, tác giả, lượt xem
      ├── Đổi Status (Pending/Approved/Rejected)
      └── Click card → vào trang chi tiết `/app/video/{id}`
```

**Nguồn video:**
- **Tự động (cron):** `GET /api/cron/sync-apify` chạy theo lịch (Thứ 2 + Thứ 5, 10:00 sáng giờ VN — cấu hình trong `vercel.json`), lặp qua tất cả brand đã bật Apify config (`BrandApifyConfigService`), lấy run gần nhất thành công từ Apify actor task, upsert video mới (chỉ lấy item có `isAd: true` và URL chứa `tiktok.com`).
- **Thủ công:** nút "Sync Apify" trên trang, hoặc thêm 1 URL TikTok cụ thể qua "+ Add Video".
- Apify cũng có thể gọi ngược vào app qua webhook (`POST /api/apify/webhook`).

### 9.2 Chi tiết video — Pipeline 4 bước (`/app/video/{id}`)

```
VideoDetailPage
├── VideoPlayer (preview TikTok video)
├── PipelineStageBar — 4 giai đoạn: Bóc băng → Kịch bản → Giọng đọc → Hoàn tất
│     (mỗi stage: idle / running / done — done tự suy ra từ dữ liệu đã lưu, không phải bước riêng)
│
├── [1] BÓC BĂNG (Transcribe)
│     → Click "Bóc băng" → POST /api/video/transcripts (tạo record) 
│       → POST /api/video/transcripts/{id}/run
│       → Server tải audio từ TikTok (qua tikwm.com), gửi cho Gemini 2.5 Flash
│       → Gemini trả về lời thoại tiếng Việt → lưu vào transcript, status = done
│     → TranscriptEditor: xem/sửa lại lời thoại đã bóc băng
│
├── [2] KỊCH BẢN (Script) — mở khi đã có transcript
│     → Chọn Product (để AI biết USP, chèn tên brand)
│     → Generate → POST /api/video/scripts (SSE stream)
│       → Claude Sonnet phân tích transcript gốc (hook, cấu trúc, tông giọng, CTA)
│       → Viết lại HOÀN TOÀN kịch bản mới, giữ nhịp/cấu trúc gốc, chèn tên brand,
│         điều chỉnh hướng dẫn đọc theo TTS provider đã chọn (Vbee/ElevenLabs)
│     → ScriptEditor: sửa kịch bản → Save
│
├── [3] GIỌNG ĐỌC (Voice) — mở khi đã lưu Script
│     → VoiceGenerationPanel: chọn Voice Preset (đã tạo sẵn ở /app/video/voice-config)
│     → Generate → POST /api/video/audio
│         → Preset provider = "elevenlabs" → ElevenLabsService.synthesize()
│         → Preset provider = "vbee" → VbeeService.synthesize()
│       → File audio lưu vào Supabase Storage bucket "generated-audio"
│     → Nghe thử (AudioPlayer), có thể tạo nhiều bản với preset khác nhau, xoá bản không ưng
│
└── [4] HOÀN TẤT (Done)
      → Trạng thái suy ra tự động khi đã có audio (không phải thao tác riêng)
      → Audio xuất hiện trong Audio Library (/app/video/audio) để tải về/dùng
```

### 9.3 Thư viện Audio (`/app/video/audio`)

```
Audio Library Page
├── Danh sách audio đã tạo (tất cả video/script trong brand)
├── Click 1 audio → AudioDetailModal (read-only)
│     ├── AudioPlayer (nghe lại)
│     ├── Metadata: voice preset, provider, speed, thời lượng, ngày tạo
│     └── Toàn bộ nội dung script đã dùng để tạo audio
└── Đánh giá chất lượng (Voice Rating — sao) → POST /api/video/voice-ratings
```

### 9.4 Cấu hình Giọng đọc (`/app/video/voice-config`)

```
Voice Config Page ("Voice Lab")
├── Tabs theo provider: Vbee | ElevenLabs
├── Danh sách Voice Preset hiện có (sort theo điểm viral từ voice_ratings)
├── Live preview giọng đọc trước khi lưu preset
└── Tạo Preset mới
      ├── Vbee: chọn voice_code + speed/pitch/pause
      └── ElevenLabs: chọn provider_voice_id + model (mặc định eleven_flash_v2_5)
      → POST /api/video/voice-presets
```

---

## 10. User Guide

### Entry: `/app/guide` hoặc click icon Guide trong sidebar

```
Guide Page
├── Header: "User Guide" + version badge + search bar
│
├── Setup Checklist (dismissible, localStorage persist)
│   ├── ☐ Chọn hoặc tạo Thương hiệu (Required)
│   ├── ☐ Thiết lập nhận diện thương hiệu (Required)
│   ├── ☐ Thêm sản phẩm kèm ảnh (Required)
│   ├── ☐ Tạo/generate Personas (optional)
│   └── ☐ Thêm nghiên cứu thương hiệu (optional)
│   Progress bar: 0/5 → 5/5 "All done!"
│
├── Table of Contents (sticky sidebar, desktop only)
│   └── 18 sections, nhóm theo Ảnh / Video / Thương hiệu / Cài đặt, active highlight + search match dots
│
└── Content Sections (collapsible cards)
    ├── Tạo quảng cáo
    ├── Stealth Ads
    ├── Concept
    ├── Thư viện
    ├── Video Trending
    ├── Pipeline xử lý video
    ├── Voice Lab (Cấu Hình Giọng)
    ├── Thư Viện Audio
    ├── Chọn & quản lý thương hiệu
    ├── Nhận diện thương hiệu
    ├── Sản phẩm
    ├── Brand Intelligence
    ├── Đồng bộ video đối thủ (Apify)
    ├── Đăng nhập & truy cập lần đầu
    ├── Hồ sơ cá nhân
    ├── Quản trị (admin only)
    ├── Phân quyền vai trò (admin only)
    └── Xử lý sự cố & mẹo hay

Features:
  • Search → real-time filter + yellow highlight matches
  • Role-aware → "Quản trị" và "Phân quyền vai trò" ẩn cho Member
  • Mobile → TOC thay bằng dropdown selector
  • Content blocks: paragraphs, steps, tables, tips, warnings, lists
```

---

## 11. Admin Panel

### Entry: `/app/admin` (CEO + Super Admin only)

Trang admin hiện là **1 page duy nhất, thuần analytics dashboard** (`AdminDashboard`) — không còn quản lý user (tạo/reset password/deactivate/đổi role/xóa) và không còn tab API Keys. Non-admin bị redirect về `/app` (`router.replace("/app")`).

```
Admin Dashboard (GET /api/admin/stats?days=1|7|30)
├── Range toggle: Today | Last 7 Days | Last 30 Days
├── Stat Cards: Total Page Views | Total Visitors | Total Accounts | Total Ads Saved
├── Daily Trend — bar chart views/visitors theo ngày
└── Top Pages — bảng path + views
```

**API keys** (ANTHROPIC_API_KEY, GOOGLE_API_KEY, KIE_API_KEY, VBEE_API_KEY, ELEVENLABS_API_KEY, APIFY_TOKEN) không còn chỉnh được từ UI — chỉ đọc trực tiếp từ biến môi trường server (`src/lib/key-provider.ts`), dùng chung cho toàn bộ user, không có DB override. Muốn đổi key phải sửa env var trên server/hosting và deploy lại.

**Quản lý user** (tạo tài khoản, đổi role, deactivate...) hiện không có UI trong app — thực hiện trực tiếp qua Supabase (bảng `profiles` + Supabase Auth) nếu cần.

### Role Hierarchy

```
CEO           → full quyền
  └── Super Admin → xem được Admin Dashboard
        └── Member → chỉ generate ads, view only brand/concepts
```

(`isAdmin(role)` = `role === "ceo" || role === "super_admin"`, định nghĩa tại `src/features/auth/types.ts`.)

---

## 12. Settings

### Entry: `/app/settings` (User Menu → Settings)

```
Settings Page
├── Profile Card (read-only)
│   ├── Avatar (initials)
│   ├── Full Name
│   ├── Email
│   ├── Role (badge)
│   ├── Department
│   ├── Join Date
│   └── Last Login
│
└── Change Password
    ├── Current Password
    ├── New Password (8+ chars)
    ├── Confirm Password
    └── [Change Password] → Supabase auth update
```

---

## 13. Data Dependencies

### Khởi tạo ban đầu (first-time flow)

```
1. Login
   ↓
2. Tạo/chọn Brand (Admin tạo qua sidebar "+ Thêm thương hiệu")
   ↓
3. Brand Setup
   ├── 3a. Set brand name + colors + typography + logos
   ├── 3b. Add products (name + images)
   ├── 3c. Add research (optional, giúp AI tốt hơn)
   └── 3d. Generate/add personas (optional, giúp target tốt hơn)
   ↓
4. Ready to Generate!
   ├── Home → Concept-Based Ads
   ├── Home → Competitor Reference Ads
   └── Stealth Ads → Scene-Based Ads
   ↓
5. Results → Save to Library → Download

(Song song) Video Pipeline:
   Video Trending → chọn video → Bóc băng → Kịch bản → Giọng đọc → Hoàn tất
```

### Dependency Map

```
Brand (đơn vị workspace cấp cao nhất — Admin tạo)
  ├── Products (required for generation)
  │   └── Product Images (required, max 5)
  ├── Brand Kit (colors, typography, logos)
  ├── Research Summary (optional)
  ├── Personas (optional, improves targeting)
  ├── Competitor Videos (crawl qua Apify — cron hoặc thêm URL thủ công)
  │   └── Transcript → Script → Generated Audio
  └── Voice Presets (Vbee / ElevenLabs, dùng cho bước Giọng đọc)

Concepts (global, not per-brand)

API Keys (đọc từ server env vars — dùng chung toàn app, không có DB override)
```

### Yêu cầu tối thiểu để generate

| Field | Standard Ads | Stealth Ads | Competitor Ref |
|-------|:---:|:---:|:---:|
| Brand đã chọn | ✅ | ✅ | ✅ |
| Product selected | ✅ | ✅ | ✅ |
| Landing Page URL | ✅ | ✅ | ✅ |
| Language | ✅ | ✅ | ✅ |
| Concepts (1+) | ✅ | — | — |
| Personas (1+) | ✅ | ✅ | ✅ |
| Competitor Image | — | — | ✅ |
| Scene Selection | — | ✅ (auto/manual) | — |

### Yêu cầu tối thiểu cho Video Pipeline

| Field | Bóc băng | Kịch bản | Giọng đọc |
|-------|:---:|:---:|:---:|
| Video đã crawl/thêm | ✅ | ✅ | ✅ |
| Transcript hoàn tất | — | ✅ | ✅ |
| Script đã lưu | — | — | ✅ |
| Voice Preset đã tạo | — | — | ✅ |

---

*Last updated: July 2026 — PATI Group Internal*
