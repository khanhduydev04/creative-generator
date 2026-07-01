# Frontend Components — Giao diện người dùng

## Layout

### DashboardLayout (`src/components/layout/DashboardLayout.tsx`)
- **Type:** Client Component (`// Client Component: main dashboard layout with collapsible sidebar navigation + i18n`)
- **Mục đích:** Wrapper chính cho mọi trang trong `/app/*` (không dùng header top-nav như trước — đã thay bằng **sidebar bên trái**)
- **Cấu trúc:** `aside` sidebar (260px, fixed trên mobile/collapsible qua `Menu` button, `lg:static` trên desktop) + content area với top bar mỏng (chỉ chứa nút mở sidebar mobile + `LanguageToggle` + user menu mobile)
- **Sidebar gồm 4 phần** (từ trên xuống):
  1. Logo (`Ladospice`)
  2. 3 **nav section có thể thu gọn** (`SidebarSection`, state lưu ở `localStorage` theo key `sidebar-open-<sectionKey>`):
     - **`image`** ("Ảnh", mặc định mở): Tạo quảng cáo (`/app`, icon `Sparkles`), Stealth Ads (`/app/stealth-ads`, icon `EyeOff`), Thư viện (`/app/library`, icon `FolderOpen`)
     - **`video`** ("Video", mặc định mở): Video Trending (`/app/video`, icon `Film`), Thư Viện Audio (`/app/video/audio`, icon `Music`), Cấu Hình Giọng (`/app/video/voice-config`, icon `Mic`)
     - **`setup`** ("Cài đặt", mặc định đóng): Thương hiệu (`/app/brands`, icon `Palette`), Concept (`/app/concepts`, icon `Lightbulb`), Cài đặt (`/app/settings`, icon `Settings`)
  3. **"Tài khoản"** — luôn hiển thị, KHÔNG thu gọn được: Hướng dẫn (`/app/guide`, icon `BookOpen`), Quản trị (`/app/admin`, icon `ShieldAlert`, chỉ hiện khi `isAdmin(profile.role)`)
  4. **Brand selector** — dropdown chọn brand hiện tại + nút "..." (`MoreHorizontal`) mở menu Đổi tên/Xóa. Tạo brand mới và xóa brand chỉ khả dụng khi `canManageBrands` (admin); đổi tên khả dụng cho mọi user.
  5. User info + nút đăng xuất (`signOut`) ở cuối sidebar
- **Modals nội bộ:** `BrandModal` (tạo/đổi tên brand — dùng chung 1 component cho 2 mode), `DeleteConfirm` (xác nhận xóa brand)
- **State:** `selectedBrandId` từ `useApp()` (KHÔNG còn `selectedClientId` — model client đã bị loại bỏ hoàn toàn khi chuyển sang single-tenant); danh sách brand qua `useBrands()`/`useCreateBrand()`/`useRenameBrand()`/`useDeleteBrand()` (`src/hooks/api/useBrands.ts`)
- **Auto-select brand:** khi `brandHydrated` true và brand đã lưu không còn tồn tại, tự chọn brand đầu tiên trong danh sách

### AppProvider (`src/features/app/context.tsx`)
- **Type:** Client Component (`// Client Component: manages global app state for brand selection (persisted to localStorage)`)
- **Global state:** chỉ còn **`selectedBrandId`** (`string | null`) + `setSelectedBrandId` + `brandHydrated` (đánh dấu đã đọc xong `localStorage` trên client, tránh hydration mismatch)
- **Hook:** `useApp()` — dùng trong mọi client component cần biết brand hiện tại
- **Lưu ý:** không còn `selectedClientId`. Model multi-tenant (client → nhiều brand) đã bị gỡ bỏ; giờ chỉ có brand, thuộc về 1 tổ chức duy nhất.

## i18n (song ngữ Việt/Anh)

- `src/lib/i18n/` chứa hệ thống dịch: `vi.ts` và `en.ts` (2 dictionary object khớp interface `Dictionary` trong `types.ts`), `context.tsx` (`LocaleProvider` — lưu locale vào `localStorage` + cookie `ladospice-locale` để tránh flicker khi SSR), `useTranslation.ts` (hook `useT()` trả về `{ t, locale, setLocale }`), `server.ts` (đọc locale từ cookie phía server).
- **Cách dùng trong component:** `const { t } = useT();` rồi truy cập text qua `t.<namespace>.<key>` (vd: `t.nav.brand`, `t.workspace.cancel`, `t.video.stageTranscribe`). Không hard-code chuỗi tiếng Việt/Anh trực tiếp trong JSX của client component mới — thêm key vào cả `vi.ts` và `en.ts`.
- **Language toggle:** `src/components/ui/LanguageToggle.tsx` (Client Component, icon `Globe`) — đặt ở top bar của `DashboardLayout`, gọi `setLocale()` rồi `router.refresh()` để đồng bộ server-rendered content (vd: `metadata`) với locale mới.
- Đây là bổ sung mới so với bản trước — tài liệu cũ không đề cập vì lúc đó UI chỉ có tiếng Việt.

## Trang Workspace (`/app`)

Layout 2 cột (`WorkspaceView` / `WorkspaceViewClient` trong `src/features/workspace/components/`):

```
┌──────────────────────────────────────────────────────┐
│ DashboardLayout (Sidebar + top bar)                    │
├──────────────┬───────────────────────────────────────┤
│ Left (420px) │ Right (flexible)                       │
│              │                                        │
│ Product      │ GenerateProgress                       │
│ Market       │  ├── Step status indicators            │
│ Language     │  ├── Result gallery (AdCards)          │
│ Competitor   │  ├── Content Adaptation modal (opt-in) │
│ Ref.         │  └── Bulk actions (save/delete/dl)     │
│ Concepts     │                                        │
│ Audience     │ hoặc                                   │
│ Ad Copy      │                                        │
│ Output       │ LibraryView (saved ads gallery)         │
│ [Generate]   │                                        │
└──────────────┴───────────────────────────────────────┘
```

### Left Column Components (`src/features/workspace/components/`)

| Component | File | Mô tả |
|-----------|------|-------|
| **BrandProductSection** | `BrandProductSection.tsx` | Dropdown chọn product + input landing page URL |
| **MarketSection** | `MarketSection.tsx` | Chọn thị trường mục tiêu cho ad copy |
| **LanguageSection** | `LanguageSection.tsx` | Dropdown chọn ngôn ngữ cho ad copy |
| **CompetitorReferenceSection** | `CompetitorReferenceSection.tsx` | Ảnh/link tham khảo đối thủ dùng làm reference khi generate |
| **ConceptSection** | `ConceptSection.tsx` | Multi-select concepts (checkboxes) |
| **TargetAudienceSection** | `TargetAudienceSection.tsx` | Multi-select personas |
| **AdCopySection** | `AdCopySection.tsx` | Headline, body text, additional notes (manual override) |
| **OutputVolumeSection** | `OutputVolumeSection.tsx` | Count (1-10), aspect ratio, resolution |

### Right Column Components (`src/features/workspace/components/`)

| Component | File | Mô tả |
|-----------|------|-------|
| **GenerateProgress** | `GenerateProgress.tsx` | Hiển thị tiến trình SSE + gallery kết quả + nút mở Content Adaptation modal |
| **LibraryView** | `LibraryView.tsx` | Gallery ảnh đã lưu từ Supabase Storage (dùng ở `/app/library`) |

### Content Adaptation (`src/features/content-adapt/components/`)
- **ContentAdaptPanel** (`ContentAdaptPanel.tsx`) — full-screen modal, 3 bước: Upload/Input (Excel) → Pair → Results. Được mở từ `GenerateProgress`, `LibraryView` và `StealthProgress` (không phải route riêng).
- **ExcelUploadZone**, **ContentPairingGrid**, **ProductContextSelector**, **AdaptationResults** — các bước con của panel trên.

### Generation Flow (UI)

1. User chọn product, market, language, competitor reference, concepts, audience, output config
2. Click "Generate" → POST `/api/generate-ads`
3. `GenerateProgress` nhận SSE events:
   - `step` → hiển thị trạng thái từng bước (running/completed/failed)
   - `result` → thêm ảnh vào gallery
   - `done` → hiển thị tổng kết
4. User có thể: View full size, Save (persist), Download, Delete, Bulk actions, mở Content Adaptation modal để tái sử dụng nội dung

## Trang Stealth Ads (`/app/stealth-ads`)

### StealthView / StealthViewClient (`src/features/stealth/components/`)
- **Type:** Client Component (`// Client Component: main stealth ads view with 2-column layout — inputs (left) + output (right)`)
- **Layout:** giống Workspace — 2 cột, tái dùng `BrandProductSection`, `LanguageSection`, `OutputVolumeSection`, `TargetAudienceSection` từ `src/features/workspace/components/`
- **Component riêng của stealth:**

| Component | File | Mô tả |
|-----------|------|-------|
| **SceneSelectionSection** | `SceneSelectionSection.tsx` | Chọn/tùy biến scene từ `STEALTH_SCENES` (`src/lib/stealth-scenes.ts`), hỗ trợ custom scene row |
| **ScenePlanPreview** | `ScenePlanPreview.tsx` | Preview kế hoạch scene trước khi generate |
| **StealthProgress** | `StealthProgress.tsx` | Tiến trình SSE + gallery kết quả, có nút mở Content Adaptation modal |

## Trang Video (`/app/video`, `/app/video/[id]`, `/app/video/audio`, `/app/video/voice-config`)

Feature mới hoàn toàn (không có trong bản tài liệu cũ) — pipeline phân tích video đối thủ (TikTok) → transcript → script → voice.

### Danh sách trang (`src/app/app/video/`)
| Route | Mô tả |
|-------|-------|
| `/app/video` | Danh sách video trending/đối thủ (bảng), lọc theo status + search server-side, phân trang server-side |
| `/app/video/[id]` | Chi tiết 1 video: pipeline stage bar → transcript → script → voice generation |
| `/app/video/audio` | Thư viện audio đã generate (toàn brand) |
| `/app/video/voice-config` | Cấu hình voice preset (ElevenLabs) |

### Key Components (`src/features/video/components/`)

| Component | File | Mô tả |
|-----------|------|-------|
| **PipelineStageBar** | `PipelineStageBar.tsx` | Thanh tiến trình 4 bước có thể click (transcribe → script → voice → done), state suy ra từ `derivePipelineStages()` (`utils/pipelineStages.ts`) dựa trên `whisperStatus`, `hasSavedScript`, `hasAudio` |
| **TranscriptEditor** | `TranscriptEditor.tsx` | Textarea sửa transcript (Gemini transcription), badge trạng thái (pending/processing/done/failed), nút lưu + re-transcribe (`useRunTranscription`, `usePatchTranscript`) |
| **ScriptEditor** | `ScriptEditor.tsx` | Sinh kịch bản qua SSE streaming (tone: humor/authentic/dramatic), textarea streaming + nút lưu (`usePatchScript`) |
| **VoiceGenerationPanel** | `VoiceGenerationPanel.tsx` | Stage 5 — chọn voice preset (`useVoicePresets`) và generate audio từ script đã lưu (`useGenerateAudio`), danh sách audio đã tạo (`useGeneratedAudiosByScript`) |
| **AudioPlayer** | `AudioPlayer.tsx` | HTML5 audio player với play/pause, download, delete |
| **AudioDetailModal** | `AudioDetailModal.tsx` | Modal xem full script + audio player cho 1 audio đã generate |
| **VoiceRatingStars** | `VoiceRatingStars.tsx` | Rating 1-5 sao cho chất lượng giọng đọc, có hover state |
| **VideoPlayer** | `VideoPlayer.tsx` | Lấy CDN URL qua tikwm khi mount, phát video TikTok trực tiếp trong app |
| **CompetitorVideoCard** | `CompetitorVideoCard.tsx` | Row bảng video: modal preview, nút đánh dấu winner/reject |
| **AddVideoModal** | `AddVideoModal.tsx` | Modal thêm video bằng TikTok URL thủ công |
| **VideoStatusFilter** | `VideoStatusFilter.tsx` | Tab lọc theo status (pending/winner/rejected) + ô tìm kiếm |

## Trang Brand Setup (`/app/brands`)

### BrandSetupForm (`src/features/brand/components/BrandSetupForm.tsx`)

Tab-based form:

```
┌─────────────────────────────────────────────┐
│ [Info] [Kit] [Products] [Concepts] [Personas]│
├─────────────────────────────────────────────┤
│                                             │
│  Tab content area                           │
│                                             │
└─────────────────────────────────────────────┘
```

| Tab | Component | Mô tả |
|-----|-----------|-------|
| **Info** | Inline | Brand name, description |
| **Kit** | Inline | Colors (6 pickers), typography (GoogleFontPicker), logos (upload) |
| **Products** | `ProductsTab.tsx` | CRUD products + multi-image upload |
| **Concepts** | `ConceptsTab.tsx` | CRUD concept prompts + reference image upload (cũng render độc lập ở trang `/app/concepts`) |
| **Personas** | Inline | List personas + `AddProfileModal`/`EditProfileModal`/`DeleteConfirmModal`, sinh persona tự động qua `useGeneratePersonas` (brand intelligence) |

Cuối form còn có **ApifySyncSection** — hiển thị trạng thái sync và nút "Sync ngay" cho mọi user; riêng phần cấu hình Apify task ID + toggle auto-sync mới admin-gated (`canManage = isAdmin(profile.role)`).

### Key Brand Components (`src/features/brand/components/`)

| Component | File | Mô tả |
|-----------|------|-------|
| **GoogleFontPicker** | `GoogleFontPicker.tsx` | Dropdown font từ Google Fonts API (proxy) |
| **ProductsTab** | `ProductsTab.tsx` | Product list + create/edit form + image upload |
| **ConceptsTab** | `ConceptsTab.tsx` | Concept list + prompt editor + ref image upload |
| **AddProfileModal** | `AddProfileModal.tsx` | Modal tạo persona mới |
| **EditProfileModal** | `EditProfileModal.tsx` | Modal sửa persona |
| **DeleteConfirmModal** | `DeleteConfirmModal.tsx` | Modal xác nhận xóa persona |
| **ApifySyncSection** | `ApifySyncSection.tsx` | Cấu hình + trigger đồng bộ Apify (admin-gated) cho pipeline video |

## Trang Guide (`/app/guide`)

### GuideView (`src/features/guide/components/GuideView.tsx`)
- **Type:** Client Component
- **Mục đích:** Hướng dẫn sử dụng tương tác — searchable, collapsible, role-aware
- **Layout:** 2 cột: TOC sidebar (260px, ẩn trên mobile) + content area
- **Data:** Static TypeScript data từ `guide-data.ts` (data mapped từ `docs/USER_GUIDE.md`)

| Component | File | Mô tả |
|-----------|------|-------|
| **GuideView** | `GuideView.tsx` | Orchestrator: search, expand/collapse, IntersectionObserver, role filter |
| **GuideSearch** | `GuideSearch.tsx` | Search input với clear button + result count |
| **GuideSection** | `GuideSection.tsx` | Collapsible section + content block renderer (tables, steps, tips) |
| **GuideTableOfContents** | `GuideTableOfContents.tsx` | Sticky sidebar TOC với active section highlight |
| **SetupChecklist** | `SetupChecklist.tsx` | Interactive checklist, localStorage persistence |

### Guide Data (`src/features/guide/guide-data.ts`)
- Sections mapped từ `docs/USER_GUIDE.md`
- Types: `GuideSection`, `GuideSubSection`, `GuideContentBlock` (discriminated union)
- Một số section admin-only ẩn cho Member role

## Trang Admin (`/app/admin`)

### AdminDashboard (`src/features/admin/components/AdminDashboard.tsx`)
- **Type:** Client Component
- **Mục đích:** Trang quản trị (chỉ role admin truy cập, gate ở layout/`isAdmin(profile.role)`)

## UI Components (`src/components/ui/`)

Sử dụng shadcn/ui (manual install, không CLI) cùng một số component tự viết:

- `Button`, `Dialog`, `Input`, `Label`, `Select`, `Separator`, `Switch`, `Tooltip`
- `LanguageToggle` — toggle VI/EN, đặt trong `DashboardLayout` top bar
- `ProductDropdown`, `SimpleModal`, `streaming-text`, `typing-indicator` — dùng cho SSE streaming UI (script generation, ad copy)
- Class utility: `cn()` từ `src/lib/utils.ts`

## Rules khi thêm component mới

1. **Server Component** là mặc định. Chỉ dùng `"use client"` khi cần: useState, useEffect, event handlers, browser APIs
2. Khi thêm `"use client"`, **bắt buộc** comment lý do phía trên: `// Client Component: [reason]`
3. **1 component = 1 file**, tên file = tên component (PascalCase)
4. Props interface đặt tên: `[ComponentName]Props`
5. **Không dùng barrel index.ts** — import trực tiếp từ file
6. Tailwind CSS là styling chính. Không dùng inline `style` trừ khi dynamic
7. Text hiển thị cho user phải qua `useT()` + key trong `src/lib/i18n/vi.ts` và `en.ts` — không hard-code chuỗi
