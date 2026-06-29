# PATI Ads Generator — App Workflow

> Tài liệu mô tả toàn bộ luồng sử dụng của tool từ góc nhìn người dùng.
> Version: 1.1.0 | Cập nhật: March 2026

---

## Mục lục

1. [Authentication](#1-authentication)
2. [Client & Brand Selection](#2-client--brand-selection)
3. [Brand Setup](#3-brand-setup)
4. [Standard Ad Generation](#4-standard-ad-generation-workspace)
5. [Stealth Ad Generation](#5-stealth-ad-generation)
6. [Competitor Reference Mode](#6-competitor-reference-mode)
7. [Library](#7-library)
8. [Concepts Management](#8-concepts-management)
9. [User Guide](#9-user-guide)
10. [Admin Panel](#10-admin-panel)
11. [Settings](#11-settings)
12. [Data Dependencies](#12-data-dependencies)

---

## 1. Authentication

### Login (`/login`)

```
User mở app
  → Nhập email (@patigroup.com) + password (8+ ký tự)
  → Click "Sign In"
  → POST /api/auth/verify-login
      ├── ✓ Success → redirect "/" → AuthProvider load profile (GET /api/auth/me)
      └── ✗ Fail → hiện lỗi (wrong password / account deactivated / invalid email)
```

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

## 2. Client & Brand Selection

### Auto-Selection (khi load app)

```
DashboardLayout mount
  → GET /api/clients → load danh sách clients
  → Nếu chưa chọn client:
      → Auto-select client đầu tiên
      → GET /api/brands?clientId={id} → load brands
      → Auto-select brand đầu tiên
  → AppContext lưu: selectedClientId + selectedBrandId
```

### Client CRUD (Header)

```
┌─────────────────────────────────────────────────────────┐
│ [Logo]  Home  Stealth  Brand  Concepts  Library  Guide  │
│                                                         │
│         [Client Dropdown ▾]  [✏️] [🗑️]  [+ New Client]  │
│                                            [? Help] [👤]│
└─────────────────────────────────────────────────────────┘

• New Client    → Modal nhập tên → POST /api/clients → auto-select
• Rename        → Modal sửa tên → PATCH /api/clients/{id}
• Delete        → Modal confirm → DELETE /api/clients/{id} → select next
• Switch Client → Click dropdown item → applyClient() → fetch brands
```

---

## 3. Brand Setup

### Entry: `/brand-setup`

**Yêu cầu:** Đã chọn Client. Nếu chưa có Brand → tự tạo khi Save lần đầu.

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

### Entry: `/` (Home)

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

### Entry: `/stealth-ads`

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

### Trong Workspace (`/` → Generation Mode: Competitor Reference)

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

### Entry: `/library`

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

### Entry: `/concepts`

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

## 9. User Guide

### Entry: `/guide` hoặc click `?` icon trên header

```
Guide Page
├── Header: "User Guide" + version badge + search bar
│
├── Setup Checklist (dismissible, localStorage persist)
│   ├── ☐ Create a Client (Required)
│   ├── ☐ Set up Brand Identity (Required)
│   ├── ☐ Add Products (Required)
│   ├── ☐ Create/Generate Personas
│   └── ☐ Add Brand Research
│   Progress bar: 0/5 → 5/5 "All done!"
│
├── Table of Contents (sticky sidebar, desktop only)
│   └── 11 sections with active highlight + search match dots
│
└── Content Sections (collapsible cards)
    ├── 1. Getting Started
    ├── 2. Dashboard & Navigation
    ├── 3. Brand Setup
    ├── 4. Concepts Management
    ├── 5. Standard Ad Generation
    ├── 6. Stealth Ad Generation
    ├── 7. Library
    ├── 8. Settings & Profile
    ├── 9. Admin Panel (admin only)
    ├── 10. Role Permissions (admin only)
    └── 11. Troubleshooting

Features:
  • Search → real-time filter + yellow highlight matches
  • Role-aware → sections 9-10 ẩn cho Member
  • Mobile → TOC thay bằng dropdown selector
  • Content blocks: paragraphs, steps, tables, tips, warnings, lists
```

---

## 10. Admin Panel

### Entry: `/admin/users` (CEO + Super Admin only)

```
Admin Panel
├── Tab: Users
│   ├── Stats Cards: Total | Active | Inactive | Admins
│   ├── Search bar (name, email, role, department)
│   ├── User Table: Name, Role, Department, Status, Last Login, Actions
│   ├── Create User → Modal: email + name + department + role
│   │   → POST /api/admin/users → temp password (toast hoặc email)
│   └── Per-User Actions (dropdown):
│       ├── Reset Password → POST /api/admin/reset-password
│       ├── Deactivate/Reactivate → PATCH /api/admin/toggle-active
│       ├── Promote/Demote → PATCH /api/admin/change-role (CEO only)
│       └── Delete Account → DELETE /api/admin/delete-user (type email confirm)
│
├── Tab: Settings (API Keys)
│   ├── Google API Key (Gemini) — masked, edit, save
│   ├── KIE API Key (Image gen) — masked, edit, save
│   └── Google Console API Key (Sheets + Fonts) — masked, edit, save
│   → PUT /api/admin/settings → app_settings DB + activity log
│   → Priority: DB value > .env fallback (60s cache)
│
└── Activity Log (bottom)
    └── Recent actions: who did what, to whom, when
```

### Role Hierarchy

```
CEO (1 max)           → full quyền, không thể bị xóa/deactivate
  └── Super Admin (2 max) → quản lý users (trừ CEO)
        └── Member (unlimited) → chỉ generate ads, view only brand/concepts
```

---

## 11. Settings

### Entry: `/settings` (User Menu → Settings)

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

## 12. Data Dependencies

### Khởi tạo ban đầu (first-time flow)

```
1. Login
   ↓
2. Create Client (header → "+ New Client")
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
```

### Dependency Map

```
Client (required)
  └── Brand (auto-created on first save)
        ├── Products (required for generation)
        │   └── Product Images (required, max 5)
        ├── Brand Kit (colors, typography, logos)
        ├── Research Summary (optional)
        └── Personas (optional, improves targeting)

Concepts (global, not per-brand)

API Keys (admin-managed, runtime override)
```

### Yêu cầu tối thiểu để generate

| Field | Standard Ads | Stealth Ads | Competitor Ref |
|-------|:---:|:---:|:---:|
| Client + Brand | ✅ | ✅ | ✅ |
| Product selected | ✅ | ✅ | ✅ |
| Landing Page URL | ✅ | ✅ | ✅ |
| Language | ✅ | ✅ | ✅ |
| Concepts (1+) | ✅ | — | — |
| Personas (1+) | ✅ | ✅ | ✅ |
| Competitor Image | — | — | ✅ |
| Scene Selection | — | ✅ (auto/manual) | — |

---

*Last updated: March 2026 — PATI Group Internal*
