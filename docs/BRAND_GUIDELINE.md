# THÍCH CAY — Brand Guideline & Design System

> **Phiên bản:** v3.1 (2026) · Optimized for AI-assisted development
> **Trạng thái:** Production-ready
> **Sử dụng cho:** Web (Next.js + Tailwind), Mobile, Marketing assets, ERP/CRM nội bộ
> **Tagline:** Sáng tạo gia vị Việt

---

## Mục lục

- [Part A — Brand Identity](#part-a--brand-identity)
  - [1. Về Thích Cay](#1-về-thích-cay)
  - [2. Tone of Voice](#2-tone-of-voice)
  - [3. Logo System](#3-logo-system)
- [Part B — Design Tokens](#part-b--design-tokens)
  - [4. Color System](#4-color-system)
  - [5. Typography](#5-typography)
  - [6. Spacing, Radius, Shadow](#6-spacing-radius-shadow)
  - [7. Breakpoints & Z-index](#7-breakpoints--z-index)
  - [8. Motion](#8-motion)
- [Part C — Components](#part-c--components)
  - [9. Iconography](#9-iconography)
  - [10. Buttons](#10-buttons)
  - [11. Inputs & Form States](#11-inputs--form-states)
  - [12. Product Card](#12-product-card)
- [Part D — Implementation](#part-d--implementation)
  - [13. Tailwind Config](#13-tailwind-config)
  - [14. CSS Variables](#14-css-variables)
  - [15. Figma / Design Tokens JSON](#15-figma--design-tokens-json)
  - [16. AI Prompting Guide](#16-ai-prompting-guide)

---

# Part A — Brand Identity

## 1. Về Thích Cay

### Định vị thương hiệu

THÍCH CAY là thương hiệu **gia vị Việt** xuất phát từ tinh hoa nông sản Việt Nam, kết hợp công thức chế biến sáng tạo. Mục tiêu là giúp người Việt **tiết kiệm thời gian nấu nướng** mà vẫn có những bữa ăn ngon, đậm vị.

### Giá trị cốt lõi

- **Tinh hoa Việt** — Nguyên liệu nội địa, công thức truyền thống được nâng cấp
- **Sáng tạo** — Sản phẩm độc đáo, không sao chép
- **Tiện lợi** — Tiết kiệm thời gian cho người tiêu dùng hiện đại
- **Đậm vị** — Không thoả hiệp về chất lượng hương vị

### Tầm nhìn

> Trở thành thương hiệu gia vị sáng tạo hàng đầu Việt Nam, đại diện cho ẩm thực Việt hiện đại.

### Sứ mệnh

> Mang đến những dòng gia vị độc đáo, giúp mỗi bữa ăn Việt nhanh hơn, ngon hơn, đậm vị hơn.

---

## 2. Tone of Voice

Ngôn ngữ THÍCH CAY hướng tới sự **chân thành, gần gũi, trẻ trung**. Dù trong bất kỳ hình thức giao tiếp nào, tinh thần phải nhất quán.

### Theo phân loại nội dung

| Phân loại                | Đặc điểm tông giọng                          | Mục tiêu cảm xúc                     |
| ------------------------ | -------------------------------------------- | ------------------------------------ |
| **Văn bản chính thống**  | Chuyên nghiệp, chuẩn mực, minh bạch          | Tạo sự tin tưởng, khẳng định uy tín  |
| **Văn bản tiếp thị**     | Trẻ trung, tích cực, vui vẻ, truyền cảm hứng | Kết nối cảm xúc, thúc đẩy hành động  |
| **Giao tiếp khách hàng** | Tận tình, lắng nghe, gần gũi, sẻ chia        | Xây dựng niềm tin, thể hiện thấu cảm |

### Theo hình thức

| Hình thức     | Đặc điểm                                                | Mục đích                                      |
| ------------- | ------------------------------------------------------- | --------------------------------------------- |
| **Văn viết**  | Chính xác, mạch lạc, ngắn gọn, dễ hiểu, truyền cảm hứng | Xây dựng sự tin tưởng                         |
| **Văn nói**   | Gần gũi, tận tâm, nhiệt tình, vui tươi, lắng nghe       | Hình ảnh trẻ trung, năng động nhưng chuẩn mực |
| **Tương tác** | Nhanh nhạy, bắt trend, cầu thị, thẳng thắn              | Thương hiệu chuyên nghiệp, chủ động lắng nghe |

### Forbidden words (cấm dùng)

Để tránh giọng văn sáo rỗng, **không** dùng các cụm:

- "Tận dụng sức mạnh của…"
- "Đột phá", "cách mạng hoá", "định nghĩa lại"
- "Nâng tầm trải nghiệm"
- "Giải pháp toàn diện"
- "Tối ưu hoá hiệu suất"

**Thay bằng:** số liệu cụ thể, lợi ích đo lường được, ví dụ thực tế.

---

## 3. Logo System

### 3.1 Logo variants

| Variant            | Mô tả                                                    | Use case                                |
| ------------------ | -------------------------------------------------------- | --------------------------------------- |
| **Primary Logo**   | Brand Mark (vòng Enso + ớt + lửa) + Logotype "THÍCH CAY" | Mặt chính: bao bì, banner, website hero |
| **Secondary Logo** | Brand Mark trong khung vuông tròn cạnh                   | Avatar, favicon, app icon               |
| **Logotype only**  | Chỉ chữ "THÍCH CAY"                                      | Khi không gian nhỏ, watermark mờ        |

### 3.2 Logo components

- **Brand Mark:** Vòng tròn Enso + Quả ớt với ngọn lửa + Cuống ớt xanh
- **Logotype font:** `Gagalin Regular`

### 3.3 Clear space (vùng an toàn)

Khoảng cách an toàn xung quanh logo: **X** = chiều cao của chữ "THÍCH" trong logotype.

Không có yếu tố nào (text, hình, viền) được vi phạm vùng X này.

### 3.4 Vị trí đặt logo

**Ưu tiên cao (default):**

- **Chính giữa – trên:** Poster, billboard, bìa tạp chí
- **Góc trái – trên:** Slide, website, tài liệu

**Linh hoạt:**

- **Góc phải – trên:** Tài liệu hành chính, biểu mẫu
- **Chính giữa:** TVC, video intro
- **Chính giữa – dưới:** Thư mời, chứng nhận
- **Góc dưới – phải:** Bao bì sản phẩm
- **Góc dưới – trái:** Profile, thiết kế nghệ thuật

### 3.5 Logo trên background

| Background                                | Quy tắc                                                                                                              |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Solid sáng** (#FEF6E7, trắng, kem nhạt) | Dùng Primary Logo trực tiếp                                                                                          |
| **Solid tối** (đỏ Primary, đen)           | Dùng Logo phiên bản trắng/kem (inverted)                                                                             |
| **Ảnh đơn giản, sáng**                    | Dùng Primary Logo trực tiếp                                                                                          |
| **Ảnh phức tạp, nhiều chi tiết**          | **Cấm** đặt trực tiếp. Bắt buộc: (a) chọn vùng ít chi tiết, hoặc (b) giảm opacity background tại vùng logo xuống 50% |

### 3.6 Cấm khi sử dụng logo

- ❌ Kéo giãn, bóp méo tỷ lệ
- ❌ Đổi màu logo (chỉ dùng bộ màu chính thức)
- ❌ Tách rời các yếu tố (chỉ dùng vòng Enso, chỉ dùng chữ rời…)
- ❌ Thêm shadow, glow, gradient không quy chuẩn
- ❌ Xoay logo (trừ trường hợp animation có chủ ý)
- ❌ Đặt logo trên background gây nhiễu mà không xử lý opacity

### 3.7 Minimum size

- **Print:** 15mm chiều rộng
- **Digital:** 64px chiều rộng (favicon 32px, dùng Secondary Logo)

---

# Part B — Design Tokens

## 4. Color System

> **Note:** Tất cả màu được cung cấp dưới 2 dạng: **HEX** (cho Figma, Photoshop, Canva) và **OKLCH** (cho CSS/Tailwind v4, AI code generation). Hai dạng tương đương về mặt thị giác.

### 4.1 Brand colors (core)

| Token                         | Tên        | HEX       | OKLCH                     | Vai trò                                   |
| ----------------------------- | ---------- | --------- | ------------------------- | ----------------------------------------- |
| `--brand-primary`             | Chilli Red | `#B41A1A` | `oklch(0.473 0.184 27.5)` | Màu chủ đạo — logo, headline, CTA primary |
| `--brand-surface`             | Cream      | `#FEF6E7` | `oklch(0.971 0.024 88)`   | Background mặc định, bao bì               |
| `--brand-accent`              | Coral      | `#FF766A` | `oklch(0.731 0.165 28.4)` | Container, icon, hover state              |
| `--brand-secondary`           | Caramel    | `#8A4C00` | `oklch(0.443 0.105 53.4)` | Phụ kiện, accent đậm                      |
| `--brand-secondary-container` | Peach      | `#FFC697` | `oklch(0.850 0.077 60.5)` | Container nhẹ, secondary surface          |

### 4.2 Logo analysis colors (reference only)

Các màu này **xuất hiện trong logo** nhưng không phải tokens cho UI. Chỉ dùng để mô tả/in ấn logo, **không dùng cho web/app**.

| Element                    | HEX                           | OKLCH                                                                       | Ghi chú                   |
| -------------------------- | ----------------------------- | --------------------------------------------------------------------------- | ------------------------- |
| Vòng Enso (gradient)       | `#B41A1A → #8B0000 → #3D0000` | `oklch(0.473 0.184 27.5) → oklch(0.359 0.158 27.7) → oklch(0.190 0.083 30)` | Gradient đỏ → crimson tối |
| Ngọn lửa + Ớt (gradient)   | `#E74C3C → #C0392B → #1C0A00` | `oklch(0.620 0.207 29.2) → oklch(0.523 0.193 28.9) → oklch(0.119 0.027 41)` | Gradient dọc fire-red     |
| Cuống ớt                   | `#2E7D32`                     | `oklch(0.510 0.144 144)`                                                    | Chilli Green              |
| Chữ "THÍCH CAY" trong logo | `#3D2B28`                     | `oklch(0.282 0.020 26.4)`                                                   | Dark Brown, ấm            |

### 4.3 Primary color scale (Chilli Red)

Scale 50–950 để dùng cho hover, active, background tints, dark mode.

| Token           | HEX       | OKLCH                     | Use case                        |
| --------------- | --------- | ------------------------- | ------------------------------- |
| `--primary-50`  | `#FDF2F2` | `oklch(0.974 0.014 27)`   | Background nhạt nhất, hover row |
| `--primary-100` | `#FBE3E3` | `oklch(0.937 0.030 27)`   | Tag background                  |
| `--primary-200` | `#F7C0C0` | `oklch(0.860 0.069 27)`   | Border nhẹ                      |
| `--primary-300` | `#F09494` | `oklch(0.770 0.118 27)`   | Disabled text trên đỏ           |
| `--primary-400` | `#E66666` | `oklch(0.668 0.169 27)`   | Hover state secondary           |
| `--primary-500` | `#D63838` | `oklch(0.570 0.198 27)`   | Lighter primary                 |
| `--primary-600` | `#B41A1A` | `oklch(0.473 0.184 27.5)` | **★ Brand Primary**             |
| `--primary-700` | `#921616` | `oklch(0.396 0.158 27.5)` | Hover trên primary              |
| `--primary-800` | `#701111` | `oklch(0.320 0.130 27.5)` | Active/pressed                  |
| `--primary-900` | `#4E0C0C` | `oklch(0.240 0.099 27.5)` | Text trên surface               |
| `--primary-950` | `#2C0707` | `oklch(0.158 0.063 27.5)` | Cao nhất, dark mode bg          |

### 4.4 Neutral scale

| Token           | HEX       | OKLCH                   | Use case            |
| --------------- | --------- | ----------------------- | ------------------- |
| `--neutral-0`   | `#FFFFFF` | `oklch(1 0 0)`          | Pure white          |
| `--neutral-50`  | `#FEF6E7` | `oklch(0.971 0.024 88)` | **★ Brand Surface** |
| `--neutral-100` | `#F8F0DC` | `oklch(0.944 0.030 88)` | Subtle bg           |
| `--neutral-200` | `#EDE3CC` | `oklch(0.896 0.034 86)` | Border, divider     |
| `--neutral-300` | `#D6CAB0` | `oklch(0.815 0.040 86)` | Disabled border     |
| `--neutral-400` | `#A89B82` | `oklch(0.674 0.034 80)` | Placeholder         |
| `--neutral-500` | `#7A6E58` | `oklch(0.508 0.028 75)` | Muted text          |
| `--neutral-600` | `#5C5142` | `oklch(0.395 0.022 70)` | Body text secondary |
| `--neutral-700` | `#3D352B` | `oklch(0.282 0.018 60)` | Body text primary   |
| `--neutral-800` | `#2B241E` | `oklch(0.213 0.014 50)` | Heading text        |
| `--neutral-900` | `#1A1612` | `oklch(0.137 0.010 45)` | Highest contrast    |

### 4.5 Semantic colors

| Token          | HEX       | OKLCH                    | Use case                       |
| -------------- | --------- | ------------------------ | ------------------------------ |
| `--success`    | `#16A34A` | `oklch(0.628 0.184 142)` | Toast success, order confirmed |
| `--success-bg` | `#DCFCE7` | `oklch(0.951 0.072 144)` | Success badge bg               |
| `--warning`    | `#EAB308` | `oklch(0.795 0.165 85)`  | Cảnh báo nhẹ                   |
| `--warning-bg` | `#FEF9C3` | `oklch(0.965 0.085 95)`  | Warning badge bg               |
| `--error`      | `#DC2626` | `oklch(0.578 0.222 27)`  | Form error, destructive action |
| `--error-bg`   | `#FEE2E2` | `oklch(0.937 0.030 25)`  | Error badge bg                 |
| `--info`       | `#2563EB` | `oklch(0.546 0.219 263)` | Tooltip, banner thông báo      |
| `--info-bg`    | `#DBEAFE` | `oklch(0.928 0.040 250)` | Info badge bg                  |

### 4.6 Signature gradient

Dùng **chỉ** cho CTA Primary và Hero highlights.

```css
background: linear-gradient(135deg, #b41a1a 0%, #ff766a 100%);
/* OKLCH equivalent */
background: linear-gradient(
  135deg,
  oklch(0.473 0.184 27.5) 0%,
  oklch(0.731 0.165 28.4) 100%
);
```

### 4.7 Color usage rules

- ✅ Tỷ lệ Primary trong một layout: **tối thiểu 30%**
- ✅ Background mặc định: Cream `#FEF6E7`, không dùng pure white
- ✅ Text trên Cream: Neutral-700/800 (`#3D352B` / `#2B241E`)
- ✅ Text trên Primary đỏ: Cream (`#FEF6E7`) hoặc trắng
- ❌ Không bao giờ dùng pure black (`#000000`) — thay bằng `--neutral-900`
- ❌ Không bao giờ kết hợp Primary với màu cam neon hoặc hồng fluo

### 4.8 Contrast ratios (WCAG AA)

| Cặp màu                | Ratio  | Đạt chuẩn                  |
| ---------------------- | ------ | -------------------------- |
| Neutral-800 trên Cream | 12.8:1 | ✅ AAA                     |
| Primary-600 trên Cream | 7.2:1  | ✅ AAA                     |
| Cream trên Primary-600 | 7.2:1  | ✅ AAA                     |
| Neutral-500 trên Cream | 4.6:1  | ✅ AA                      |
| Neutral-400 trên Cream | 2.9:1  | ❌ Chỉ dùng cho decorative |

---

## 5. Typography

### 5.1 Font families

```css
--font-display: "DVN Luckiest Guy", "Luckiest Guy", cursive;
--font-body: "Plus Jakarta Sans", system-ui, -apple-system, sans-serif;
--font-logo: "Gagalin", sans-serif; /* Chỉ dùng trong logo, không dùng ở UI */
```

| Font                  | Weights                                | Vai trò                                              |
| --------------------- | -------------------------------------- | ---------------------------------------------------- |
| **DVN Luckiest Guy**  | Regular                                | Heading lớn, tagline, hero text — **luôn UPPERCASE** |
| **Plus Jakarta Sans** | Light (300), Regular (400), Bold (700) | Body, label, button, price, mọi UI text              |
| **Gagalin Regular**   | Regular                                | **Chỉ trong logo**, cấm dùng cho UI                  |

### 5.2 Type scale

| Token                 | Size             | Line-height | Letter-spacing   | Font                      | Use case         |
| --------------------- | ---------------- | ----------- | ---------------- | ------------------------- | ---------------- |
| `text-display-2xl`    | 72px / 4.5rem    | 1.1 (79px)  | -0.02em          | Display                   | Hero homepage    |
| `text-display-xl`     | 60px / 3.75rem   | 1.1 (66px)  | -0.02em          | Display                   | Section hero     |
| `text-display-lg`     | 48px / 3rem      | 1.1 (53px)  | -0.01em          | Display                   | Page title       |
| `text-display-md`     | 36px / 2.25rem   | 1.1 (40px)  | 0                | Display                   | Card hero        |
| `text-h1`             | 30px / 1.875rem  | 1.2 (36px)  | 0                | Body Bold                 | H1 nội dung      |
| `text-h2`             | 24px / 1.5rem    | 1.3 (32px)  | 0                | Body Bold                 | H2               |
| `text-h3`             | 20px / 1.25rem   | 1.4 (28px)  | 0                | Body Bold                 | H3, card title   |
| `text-h4`             | 18px / 1.125rem  | 1.4 (25px)  | 0                | Body Bold                 | H4               |
| `text-body-lg`        | 18px / 1.125rem  | 1.5 (27px)  | 0                | Body Regular              | Lead paragraph   |
| `text-body`           | 16px / 1rem      | 1.5 (24px)  | 0                | Body Regular              | **Default body** |
| `text-body-sm`        | 14px / 0.875rem  | 1.5 (21px)  | 0                | Body Regular              | Secondary text   |
| `text-caption`        | 12px / 0.75rem   | 1.4 (17px)  | 0.02em           | Body Regular              | Caption, helper  |
| `text-overline`       | 11px / 0.6875rem | 1.4 (15px)  | 0.08em UPPERCASE | Body Bold                 | Label, eyebrow   |
| `text-button`         | 14px / 0.875rem  | 1 (14px)    | 0.04em UPPERCASE | Body Bold                 | Button label     |
| `text-price`          | 18px / 1.125rem  | 1.2 (22px)  | 0                | Body Bold                 | Giá sản phẩm     |
| `text-price-original` | 14px / 0.875rem  | 1.2 (17px)  | 0                | Body Regular line-through | Giá gốc          |

> **Lưu ý fix từ guideline gốc:** Trong guideline v3 ghi "Khoảng cách dòng 1.5 px, khoảng cách chữ 4 px" — đây là **lỗi đơn vị**. Đúng phải là `line-height: 1.5` (tỷ lệ) và `letter-spacing: 0` đến `0.02em` (em-based).

### 5.3 Heading rules

**Headline tiêu chuẩn (DVN Luckiest Guy):**

- ✅ Luôn UPPERCASE
- ✅ Viết hoa chữ đầu trong câu chủ đề
- ✅ Line-height = 1.1 × font-size
- ✅ Letter-spacing = 0 (optical)
- ✅ Màu: Primary (`#B41A1A`) trên Cream, hoặc Cream trên Primary
- ✅ Khuyến khích: drop-shadow hoặc outline khi đặt trên ảnh
- ❌ Không dùng cho body, button, price, label

**Subheading & body (Plus Jakarta Sans):**

- ✅ Regular là default, Bold cho emphasis
- ✅ Line-height 1.5 cho body, 1.4 cho heading nhỏ
- ✅ Letter-spacing 0 cho size ≥ 14px, 0.02em cho size < 14px
- ✅ Trên ảnh tối: dùng Bold để tăng contrast

---

## 6. Spacing, Radius, Shadow

### 6.1 Spacing scale (4px base)

```
--space-0:  0
--space-1:  4px   (0.25rem)
--space-2:  8px   (0.5rem)
--space-3:  12px  (0.75rem)
--space-4:  16px  (1rem)     ← base
--space-5:  20px  (1.25rem)
--space-6:  24px  (1.5rem)
--space-8:  32px  (2rem)
--space-10: 40px  (2.5rem)
--space-12: 48px  (3rem)
--space-16: 64px  (4rem)
--space-20: 80px  (5rem)
--space-24: 96px  (6rem)
```

### 6.2 Border radius

```
--radius-none: 0
--radius-sm:   4px   - chips, tags
--radius-md:   8px   - inputs, small cards
--radius-lg:   12px  - cards, containers      ← default
--radius-xl:   16px  - product cards
--radius-2xl:  24px  - large containers
--radius-pill: 9999px - buttons, badges       ← button default
--radius-full: 50%   - avatars, circle icons
```

### 6.3 Shadow tokens

```css
--shadow-xs: 0 1px 2px 0 rgba(180, 26, 26, 0.05);
--shadow-sm:
  0 1px 3px 0 rgba(180, 26, 26, 0.08), 0 1px 2px -1px rgba(180, 26, 26, 0.06);
--shadow-md:
  0 4px 6px -1px rgba(180, 26, 26, 0.08), 0 2px 4px -2px rgba(180, 26, 26, 0.06);
--shadow-lg:
  0 10px 15px -3px rgba(180, 26, 26, 0.1),
  0 4px 6px -4px rgba(180, 26, 26, 0.05);
--shadow-xl:
  0 20px 25px -5px rgba(180, 26, 26, 0.12),
  0 8px 10px -6px rgba(180, 26, 26, 0.08);
--shadow-cta: 0 8px 24px -8px rgba(180, 26, 26, 0.45); /* Cho CTA primary nổi bật */
```

> **Note:** Shadow dùng tint đỏ (primary) thay vì đen pure để hài hoà với brand palette ấm.

---

## 7. Breakpoints & Z-index

### 7.1 Responsive breakpoints

```
--screen-sm:  640px   - Mobile landscape, small tablet
--screen-md:  768px   - Tablet portrait
--screen-lg:  1024px  - Tablet landscape, small laptop
--screen-xl:  1280px  - Desktop
--screen-2xl: 1536px  - Large desktop
```

**Mobile-first strategy:** Default styles cho mobile (< 640px), dùng `md:` `lg:` để override lên up.

### 7.2 Z-index scale

```
--z-base:        0
--z-dropdown:    10
--z-sticky:      20    - Sticky header/nav
--z-overlay:     30    - Backdrop, scrim
--z-drawer:      40    - Side drawer, sheet
--z-modal:       50    - Modal dialog
--z-popover:     60    - Popover, dropdown menu
--z-tooltip:     70    - Tooltip
--z-toast:       80    - Toast notification
--z-max:         9999  - Critical (alert overlay)
```

---

## 8. Motion

### 8.1 Duration

```
--duration-instant:  100ms  - Color change
--duration-fast:     150ms  - Hover, focus     ← default
--duration-normal:   250ms  - Modal, drawer
--duration-slow:     400ms  - Page transition
--duration-slower:   600ms  - Hero animation
```

### 8.2 Easing

```css
--ease-linear: linear;
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1); /* ← default cho enter */
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1); /* ← default cho transition */
--ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1); /* Cho CTA, fun moments */
```

### 8.3 Reduced motion

Luôn respect user preference:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

# Part C — Components

## 9. Iconography

### 9.1 Specs

| Property          | Value                                                                    |
| ----------------- | ------------------------------------------------------------------------ |
| **Default color** | `#FF766A` (Brand Accent)                                                 |
| **Sizes**         | 16px (sm), 20px (md), 24px (lg), 32px (xl)                               |
| **Stroke width**  | 1.5px (sm/md), 2px (lg/xl)                                               |
| **Style**         | Outline (default), Filled (cho active state)                             |
| **Container**     | Square với `border-radius: var(--radius-md)`, padding bằng 25% size icon |

### 9.2 Recommended icon library

**Lucide Icons** (`lucide-react`) — outline-based, customizable stroke, đã chuẩn React/Vue/Svelte.

```bash
npm install lucide-react
```

### 9.3 Standard icon set cho THÍCH CAY

| Function   | Icon name (Lucide)     | Vietnamese label |
| ---------- | ---------------------- | ---------------- |
| Tích điểm  | `Award`                | TÍCH ĐIỂM        |
| Đổi thưởng | `Gift`                 | ĐỔI THƯỞNG       |
| Đặt hàng   | `ShoppingBag`          | ĐẶT HÀNG         |
| Liên hệ    | `Phone`                | LIÊN HỆ          |
| Đặt lịch   | `CalendarDays`         | ĐẶT LỊCH         |
| Tin tức    | `Megaphone`            | TIN TỨC          |
| Hỗ trợ     | `Headset`              | HỖ TRỢ           |
| Góp ý      | `MessageCircleWarning` | GÓP Ý            |
| Tìm kiếm   | `Search`               | TÌM KIẾM         |
| Giỏ hàng   | `ShoppingCart`         | GIỎ HÀNG         |
| Chat       | `MessageCircle`        | CHAT             |
| User       | `User`                 | TÀI KHOẢN        |

### 9.4 Rules

- ❌ **Cấm dùng emoji thay icon** trong production (chỉ dùng emoji cho social caption, không UI)
- ✅ Icon trong button cùng màu với text label
- ✅ Icon đứng độc lập (không có label) phải có `aria-label` cho accessibility
- ✅ Khi hover/active, icon đổi sang fill (nếu có) hoặc đậm hơn 1 step trong scale

---

## 10. Buttons

### 10.1 Button variants

| Variant                | Background                                  | Text color | Border                | Use case                      |
| ---------------------- | ------------------------------------------- | ---------- | --------------------- | ----------------------------- |
| **Primary (Gradient)** | `linear-gradient(135deg, #B41A1A, #FF766A)` | `#FEF6E7`  | none                  | CTA chính: Mua hàng, Mua ngay |
| **Solid**              | `#B41A1A`                                   | `#FEF6E7`  | none                  | Action quan trọng             |
| **Outline**            | transparent                                 | `#B41A1A`  | 1.5px solid `#B41A1A` | Action thứ cấp                |
| **Ghost**              | transparent                                 | `#B41A1A`  | none                  | Action nhẹ, link-style        |
| **Accent**             | `#FF766A`                                   | `#FEF6E7`  | none                  | Secondary CTA                 |
| **Warning**            | `#EAB308`                                   | `#1A1612`  | none                  | "Xem chi tiết" highlight      |
| **Disabled**           | `#A89B82`                                   | `#EDE3CC`  | none                  | Inactive state                |

### 10.2 Button sizes

| Size | Height | Padding X | Font-size | Use case                 |
| ---- | ------ | --------- | --------- | ------------------------ |
| `sm` | 32px   | 12px      | 13px      | Inline action, table row |
| `md` | 40px   | 16px      | 14px      | **Default**              |
| `lg` | 48px   | 24px      | 16px      | CTA quan trọng           |
| `xl` | 56px   | 32px      | 18px      | Hero CTA                 |

### 10.3 Button states (full set)

| State              | Visual change                                                                     |
| ------------------ | --------------------------------------------------------------------------------- |
| **Default**        | Như spec variant                                                                  |
| **Hover**          | Background đậm hơn 1 step (Primary-700), shadow `--shadow-cta`                    |
| **Focus**          | Outline 2px `#FF766A` offset 2px                                                  |
| **Active/Pressed** | Background đậm hơn 2 steps (Primary-800), translate-y 1px                         |
| **Loading**        | Disabled visually + spinner thay text, giữ width                                  |
| **Disabled**       | Background `--neutral-400`, text `--neutral-200`, cursor not-allowed, opacity 0.6 |

### 10.4 Button anatomy

```
[ Icon (optional) ] [ Label (UPPERCASE, font-bold) ] [ Trailing icon (optional, e.g. →) ]
```

- Border radius: `--radius-pill` (9999px)
- Min-width: 96px
- Gap giữa icon và label: 8px
- Cấm dùng nhiều hơn 2 icon trong 1 button

### 10.5 Standard CTA labels

| Action   | Label                                         |
| -------- | --------------------------------------------- |
| Mua      | `MUA NGAY` (primary) / `MUA HÀNG` (secondary) |
| Thêm giỏ | `THÊM VÀO GIỎ HÀNG`                           |
| Xem      | `XEM CHI TIẾT` / `XEM THÊM`                   |
| Voucher  | `NHẬN VOUCHER`                                |
| Chat     | `CHAT NGAY`                                   |
| Đăng ký  | `ĐĂNG KÝ`                                     |

---

## 11. Inputs & Form States

### 11.1 Input specs

| Property              | Value                                |
| --------------------- | ------------------------------------ |
| Height                | 40px (default), 48px (lg), 32px (sm) |
| Padding X             | 12px                                 |
| Border                | 1px solid `--neutral-200` (default)  |
| Border (focus)        | 1.5px solid `--brand-primary`        |
| Border (error)        | 1.5px solid `--error`                |
| Border radius         | `--radius-md` (8px)                  |
| Background            | `#FFFFFF`                            |
| Background (disabled) | `--neutral-100`                      |
| Font-size             | 14px                                 |
| Placeholder color     | `--neutral-400`                      |

### 11.2 Input states

| State        | Border                  | Background              | Notes                                    |
| ------------ | ----------------------- | ----------------------- | ---------------------------------------- |
| **Default**  | `--neutral-200` 1px     | white                   | —                                        |
| **Hover**    | `--neutral-300` 1px     | white                   | —                                        |
| **Focus**    | `--brand-primary` 1.5px | white                   | + outline 2px primary-100                |
| **Filled**   | `--neutral-300` 1px     | white                   | —                                        |
| **Error**    | `--error` 1.5px         | `--error-bg` (tint nhẹ) | + helper text màu error                  |
| **Success**  | `--success` 1.5px       | white                   | + check icon trailing                    |
| **Disabled** | `--neutral-200` 1px     | `--neutral-100`         | text `--neutral-400`, cursor not-allowed |

### 11.3 Helper text & error message

- Position: dưới input, gap 4px
- Font: 12px, Regular
- Color: `--neutral-500` (helper) / `--error` (error)
- Pattern: `[icon] Mô tả ngắn gọn dưới 12 từ`

---

## 12. Product Card

### 12.1 Anatomy

```
┌─────────────────────────────┐
│                             │
│       [Product Image]       │  ← Aspect 1:1, radius-xl ở top
│                             │
├─────────────────────────────┤
│ Tên sản phẩm (2 lines max)  │  ← H4, neutral-800
│ 102.000đ  65.000đ          │  ← Original strikethrough + Sale price red
│ ★★★★★ | Đã bán 5K          │  ← Star rating + sales count
│ [120ml] [250ml]            │  ← Variant chips
│ ┌────┬──────┬─────────────┐ │
│ │CHAT│GIỎ HG│ THÊM │MUA   │ │  ← Action row
│ └────┴──────┴─────────────┘ │
└─────────────────────────────┘
```

### 12.2 Specs

| Element            | Spec                                                                                     |
| ------------------ | ---------------------------------------------------------------------------------------- |
| **Card**           | Background Cream, border 1px `--neutral-200`, radius `--radius-xl`, shadow `--shadow-sm` |
| **Image**          | Aspect ratio 1:1, object-fit cover, radius top-left + top-right `--radius-xl`            |
| **Title**          | `text-h4`, color `--neutral-800`, max 2 lines (CSS line-clamp 2)                         |
| **Sale price**     | `text-price`, color `--brand-primary`, font-bold                                         |
| **Original price** | `text-price-original`, color `--neutral-500`, line-through                               |
| **Star rating**    | 16px stars, color `--warning` (`#EAB308`)                                                |
| **Sales count**    | `text-caption`, color `--neutral-600`                                                    |
| **Variant chip**   | radius pill, border 1px `--brand-accent`, text 12px primary, padding 4px 10px            |
| **Action buttons** | Mix: ghost (chat, cart) + accent (thêm) + primary (mua)                                  |

### 12.3 Action button hierarchy

1. **MUA NGAY** — Primary solid (đỏ đậm)
2. **THÊM VÀO GIỎ HÀNG** — Accent (coral)
3. **GIỎ HÀNG** — Ghost (icon + label nhỏ)
4. **CHAT** — Ghost (icon + label nhỏ)

---

# Part D — Implementation

## 13. Tailwind Config

`tailwind.config.ts` — dùng cho Next.js 16, Tailwind v4:

```ts
import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Brand
        primary: {
          50: "oklch(0.974 0.014 27)",
          100: "oklch(0.937 0.030 27)",
          200: "oklch(0.860 0.069 27)",
          300: "oklch(0.770 0.118 27)",
          400: "oklch(0.668 0.169 27)",
          500: "oklch(0.570 0.198 27)",
          600: "oklch(0.473 0.184 27.5)", // ★ Brand
          700: "oklch(0.396 0.158 27.5)",
          800: "oklch(0.320 0.130 27.5)",
          900: "oklch(0.240 0.099 27.5)",
          950: "oklch(0.158 0.063 27.5)",
          DEFAULT: "oklch(0.473 0.184 27.5)",
        },
        accent: {
          DEFAULT: "oklch(0.731 0.165 28.4)", // #FF766A Coral
        },
        secondary: {
          DEFAULT: "oklch(0.443 0.105 53.4)", // #8A4C00 Caramel
          container: "oklch(0.850 0.077 60.5)", // #FFC697 Peach
        },
        cream: {
          DEFAULT: "oklch(0.971 0.024 88)", // #FEF6E7
        },
        // Neutral
        neutral: {
          0: "oklch(1 0 0)",
          50: "oklch(0.971 0.024 88)",
          100: "oklch(0.944 0.030 88)",
          200: "oklch(0.896 0.034 86)",
          300: "oklch(0.815 0.040 86)",
          400: "oklch(0.674 0.034 80)",
          500: "oklch(0.508 0.028 75)",
          600: "oklch(0.395 0.022 70)",
          700: "oklch(0.282 0.018 60)",
          800: "oklch(0.213 0.014 50)",
          900: "oklch(0.137 0.010 45)",
        },
        // Semantic
        success: {
          DEFAULT: "oklch(0.628 0.184 142)",
          bg: "oklch(0.951 0.072 144)",
        },
        warning: {
          DEFAULT: "oklch(0.795 0.165 85)",
          bg: "oklch(0.965 0.085 95)",
        },
        error: {
          DEFAULT: "oklch(0.578 0.222 27)",
          bg: "oklch(0.937 0.030 25)",
        },
        info: {
          DEFAULT: "oklch(0.546 0.219 263)",
          bg: "oklch(0.928 0.040 250)",
        },
      },
      fontFamily: {
        display: ['"DVN Luckiest Guy"', '"Luckiest Guy"', "cursive"],
        sans: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
      },
      fontSize: {
        "display-2xl": [
          "4.5rem",
          { lineHeight: "1.1", letterSpacing: "-0.02em" },
        ],
        "display-xl": [
          "3.75rem",
          { lineHeight: "1.1", letterSpacing: "-0.02em" },
        ],
        "display-lg": ["3rem", { lineHeight: "1.1", letterSpacing: "-0.01em" }],
        "display-md": ["2.25rem", { lineHeight: "1.1" }],
        overline: ["0.6875rem", { lineHeight: "1.4", letterSpacing: "0.08em" }],
        button: ["0.875rem", { lineHeight: "1", letterSpacing: "0.04em" }],
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        "2xl": "24px",
        pill: "9999px",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgba(180, 26, 26, 0.05)",
        sm: "0 1px 3px 0 rgba(180, 26, 26, 0.08), 0 1px 2px -1px rgba(180, 26, 26, 0.06)",
        md: "0 4px 6px -1px rgba(180, 26, 26, 0.08), 0 2px 4px -2px rgba(180, 26, 26, 0.06)",
        lg: "0 10px 15px -3px rgba(180, 26, 26, 0.10), 0 4px 6px -4px rgba(180, 26, 26, 0.05)",
        xl: "0 20px 25px -5px rgba(180, 26, 26, 0.12), 0 8px 10px -6px rgba(180, 26, 26, 0.08)",
        cta: "0 8px 24px -8px rgba(180, 26, 26, 0.45)",
      },
      backgroundImage: {
        "gradient-signature":
          "linear-gradient(135deg, oklch(0.473 0.184 27.5) 0%, oklch(0.731 0.165 28.4) 100%)",
      },
      transitionDuration: {
        fast: "150ms",
        normal: "250ms",
        slow: "400ms",
      },
    },
  },
} satisfies Config;
```

## 14. CSS Variables (globals.css)

```css
@import "tailwindcss";

:root {
  /* Brand */
  --color-brand-primary: oklch(0.473 0.184 27.5);
  --color-brand-accent: oklch(0.731 0.165 28.4);
  --color-brand-surface: oklch(0.971 0.024 88);
  --color-brand-secondary: oklch(0.443 0.105 53.4);

  /* Typography */
  --font-display: "DVN Luckiest Guy", "Luckiest Guy", cursive;
  --font-body: "Plus Jakarta Sans", system-ui, sans-serif;

  /* Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-pill: 9999px;

  /* Motion */
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

body {
  background: var(--color-brand-surface);
  color: oklch(0.213 0.014 50); /* neutral-800 */
  font-family: var(--font-body);
}

h1,
h2,
h3,
.display {
  font-family: var(--font-display);
  text-transform: uppercase;
}
```

## 15. Figma / Design Tokens JSON

Format chuẩn W3C Design Tokens, dùng cho Figma Tokens plugin hoặc Style Dictionary:

```json
{
  "color": {
    "brand": {
      "primary": { "value": "#B41A1A", "$oklch": "oklch(0.473 0.184 27.5)" },
      "accent": { "value": "#FF766A", "$oklch": "oklch(0.731 0.165 28.4)" },
      "surface": { "value": "#FEF6E7", "$oklch": "oklch(0.971 0.024 88)" },
      "secondary": { "value": "#8A4C00", "$oklch": "oklch(0.443 0.105 53.4)" }
    },
    "primary": {
      "600": { "value": "#B41A1A", "$oklch": "oklch(0.473 0.184 27.5)" }
    }
  },
  "font": {
    "display": { "value": "DVN Luckiest Guy, Luckiest Guy, cursive" },
    "body": { "value": "Plus Jakarta Sans, system-ui, sans-serif" }
  },
  "radius": {
    "md": { "value": "8px" },
    "lg": { "value": "12px" },
    "pill": { "value": "9999px" }
  }
}
```

## 16. AI Prompting Guide

> **Mục đích:** Hướng dẫn dùng Brand Guideline này với Claude Code, Cursor, hoặc v0.dev.

### 16.1 System prompt template (copy vào CLAUDE.md hoặc Cursor rules)

```markdown
# THÍCH CAY Design System Rules

Khi build UI cho THÍCH CAY, LUÔN tuân thủ:

## Colors (OKLCH first)

- Primary brand: oklch(0.473 0.184 27.5) — Chilli Red #B41A1A
- Surface bg: oklch(0.971 0.024 88) — Cream #FEF6E7
- Accent: oklch(0.731 0.165 28.4) — Coral #FF766A
- Không dùng pure white hay pure black, luôn dùng neutral scale.
- Tỷ lệ Primary trong layout ≥ 30%.

## Typography

- Heading: font-display (DVN Luckiest Guy), UPPERCASE only, leading-none + tracking-tight
- Body: font-sans (Plus Jakarta Sans), default Regular, Bold cho emphasis
- KHÔNG dùng Display font cho body, button, price, label

## Buttons

- Default: radius pill (9999px), uppercase label, font-bold
- Primary CTA: gradient linear-gradient(135deg, primary, accent)
- Mọi button phải có hover + focus + active + disabled states

## Spacing

- Base 4px scale: 4, 8, 12, 16, 24, 32, 48, 64

## Tone (cho copy & label)

- Vietnamese, trẻ trung gần gũi
- CẤM dùng: "tận dụng sức mạnh", "đột phá", "nâng tầm trải nghiệm"
- Dùng số liệu cụ thể thay vì tính từ rỗng
```

### 16.2 Prompt examples

**Tốt:**

> "Tạo product card cho THÍCH CAY theo Brand Guideline. Dùng OKLCH primary `oklch(0.473 0.184 27.5)`, font display cho tên sản phẩm (uppercase), action row có MUA NGAY (gradient) + THÊM VÀO GIỎ (coral)."

**Tốt hơn:**

> "Tạo product card theo BRAND_GUIDELINE.md section 12. Variant: muối tiêu lốt, giá gốc 102k, sale 65k, đã bán 5K, variant 120ml/250ml."

### 16.3 Generating new color shades

Khi cần shade trung gian (vd: giữa primary-500 và primary-600):

> "Tạo cho tôi 1 shade giữa oklch(0.570 0.198 27) và oklch(0.473 0.184 27.5), giữ nguyên hue và chroma scale."

→ AI sẽ ra: `oklch(0.521 0.191 27.2)` (chính xác hơn nhiều so với prompt bằng HEX).

### 16.4 Dark mode generation

Khi cần dark variant:

> "Convert palette primary 50-950 sang dark mode bằng cách đảo L axis (95% → 15%, 90% → 20%...) và giữ nguyên hue 27.5."

---

## Changelog

- **v3.1 (2026-05)** — Bản markdown đầu tiên. Bổ sung: color scales 50-950, neutral scale, semantic colors, spacing/radius/shadow/motion tokens, full button states, input states, type scale, Tailwind config, OKLCH conversion. Fix: line-height/letter-spacing đơn vị, typo "Việt Phong" → "Thích Cay".
- **v3.0 (2026-04)** — PDF gốc (Brand Guideline v3).

---

## Liên hệ

- Website: [thichcay.vn](https://thichcay.vn)
- Fanpage: Thích Cay
- Email: cskh@thichcay.com

---

> **Hết file.** Mọi thay đổi/bổ sung tokens phải được commit kèm bump version trong Changelog.
