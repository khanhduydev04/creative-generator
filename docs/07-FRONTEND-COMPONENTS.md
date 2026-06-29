# Frontend Components — Giao diện người dùng

## Layout

### DashboardLayout (`src/components/layout/DashboardLayout.tsx`)
- **Type:** Client Component
- **Mục đích:** Wrapper chính cho tất cả trang (trừ login)
- **Gồm:** Header (logo + nav links với icons + client selector + help button + avatar) + content area
- **Nav links:** Home (Sparkles), Stealth Ads (EyeOff), Brand Setup (Palette), Concepts (Lightbulb), Library (FolderOpen), Guide (BookOpen), Admin (Shield — admin only)
- **State:** selectedClientId, selectedBrandId (từ AppProvider context)

### AppProvider (`src/features/app/context.tsx`)
- **Global state:** `selectedClientId`, `selectedBrandId`
- **Hook:** `useApp()` — dùng trong mọi client component cần biết brand/client hiện tại

## Trang Workspace (`/`)

Layout 2 cột:

```
┌──────────────────────────────────────────────────────┐
│ DashboardLayout (Header + Navigation)                 │
├──────────────┬───────────────────────────────────────┤
│ Left (420px) │ Right (flexible)                       │
│              │                                        │
│ Product      │ GenerateProgress                       │
│ Language     │  ├── Step status indicators            │
│ Concepts     │  ├── Result gallery (AdCards)          │
│ Audience     │  └── Bulk actions (save/delete/dl)     │
│ Ad Copy      │                                        │
│ Output       │ hoặc                                   │
│ [Generate]   │                                        │
│              │ LibraryView (saved ads gallery)         │
└──────────────┴───────────────────────────────────────┘
```

### Left Column Components

| Component | File | Mô tả |
|-----------|------|-------|
| **BrandProductSection** | `BrandProductSection.tsx` | Dropdown chọn product + input landing page URL |
| **LanguageSection** | `LanguageSection.tsx` | Dropdown chọn ngôn ngữ cho ad copy |
| **ConceptSection** | `ConceptSection.tsx` | Multi-select concepts (checkboxes) |
| **TargetAudienceSection** | `TargetAudienceSection.tsx` | Multi-select personas |
| **AdCopySection** | `AdCopySection.tsx` | Headline, body text, additional notes (manual override) |
| **OutputVolumeSection** | `OutputVolumeSection.tsx` | Count (1-10), aspect ratio, resolution |

### Right Column Components

| Component | File | Mô tả |
|-----------|------|-------|
| **GenerateProgress** | `GenerateProgress.tsx` | Hiển thị tiến trình SSE + gallery kết quả |
| **AdCard** | `AdCard.tsx` | Card ảnh đơn lẻ (view/save/download/delete) |
| **LibraryView** | `LibraryView.tsx` | Gallery ảnh đã lưu từ Supabase Storage |

### Generation Flow (UI)

1. User chọn product, language, concepts, audience, output config
2. Click "Generate" → POST `/api/generate-ads`
3. `GenerateProgress` nhận SSE events:
   - `step` → hiển thị trạng thái từng bước (running/completed/failed)
   - `result` → thêm ảnh vào gallery
   - `done` → hiển thị tổng kết
4. User có thể: View full size, Save (persist), Download, Delete, Bulk actions

## Trang Brand Setup (`/brand-setup`)

### BrandSetupForm (`src/features/brand/components/BrandSetupForm.tsx`)

Tab-based form với 5 tabs:

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
| **Concepts** | `ConceptsTab.tsx` | CRUD concept prompts + reference image upload |
| **Personas** | Inline | List personas + add/edit/delete modals |

### Key Brand Components

| Component | File | Mô tả |
|-----------|------|-------|
| **GoogleFontPicker** | `GoogleFontPicker.tsx` | Dropdown font từ Google Fonts API (proxy) |
| **ProductsTab** | `ProductsTab.tsx` | Product list + create/edit form + image upload |
| **ConceptsTab** | `ConceptsTab.tsx` | Concept list + prompt editor + ref image upload |
| **AddProfileModal** | `AddProfileModal.tsx` | Modal tạo persona mới |
| **EditProfileModal** | `EditProfileModal.tsx` | Modal sửa persona |
| **DeleteConfirmModal** | `DeleteConfirmModal.tsx` | Modal xác nhận xóa persona |

## Trang Guide (`/guide`)

### GuideView (`src/features/guide/components/GuideView.tsx`)
- **Type:** Client Component
- **Mục đích:** Hướng dẫn sử dụng tương tác — searchable, collapsible, role-aware
- **Layout:** 2 cột: TOC sidebar (260px, ẩn trên mobile) + content area
- **Data:** Static TypeScript data từ `guide-data.ts` (11 sections từ USER_GUIDE.md)

| Component | File | Mô tả |
|-----------|------|-------|
| **GuideView** | `GuideView.tsx` | Orchestrator: search, expand/collapse, IntersectionObserver, role filter |
| **GuideSearch** | `GuideSearch.tsx` | Search input với clear button + result count |
| **GuideSection** | `GuideSection.tsx` | Collapsible section + content block renderer (tables, steps, tips) |
| **GuideTableOfContents** | `GuideTableOfContents.tsx` | Sticky sidebar TOC với active section highlight |
| **SetupChecklist** | `SetupChecklist.tsx` | Interactive checklist, localStorage persistence |

### Guide Data (`src/features/guide/guide-data.ts`)
- 11 sections mapped từ `docs/USER_GUIDE.md`
- Types: `GuideSection`, `GuideSubSection`, `GuideContentBlock` (discriminated union)
- Admin-only sections (9, 10) ẩn cho Member role

## UI Components (`src/components/ui/`)

Sử dụng shadcn/ui (manual install, không CLI). Các component có sẵn:

- `Button`, `Dialog`, `Input`, `Label`, `Select`
- `Separator`, `Switch`, `Tooltip`
- Class utility: `cn()` từ `src/lib/utils.ts`

## Rules khi thêm component mới

1. **Server Component** là mặc định. Chỉ dùng `"use client"` khi cần: useState, useEffect, event handlers, browser APIs
2. Khi thêm `"use client"`, **bắt buộc** comment lý do phía trên: `// Client Component: [reason]`
3. **1 component = 1 file**, tên file = tên component (PascalCase)
4. Props interface đặt tên: `[ComponentName]Props`
5. **Không dùng barrel index.ts** — import trực tiếp từ file
6. Tailwind CSS là styling chính. Không dùng inline `style` trừ khi dynamic
