# Hướng dẫn cài đặt & chạy dự án

## Yêu cầu hệ thống

- **Node.js** >= 18 (khuyến nghị v22)
- **npm** >= 9
- **Git**
- Tài khoản **Supabase** (database + storage)
- API key **Google AI Studio** (Gemini)
- API key **KIE AI** (image generation)

## Bước 1: Clone & cài đặt

```bash
git clone <repo-url>
cd static-ads-genertor
npm install
```

## Bước 2: Cấu hình environment variables

```bash
# Copy template và điền giá trị thực
cp .env.local.template .env.local
```

Mở `.env.local` và điền:

```env
# BẮT BUỘC — Supabase
# Lấy từ: https://supabase.com/dashboard → Project Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key

# BẮT BUỘC — Google Gemini
# Lấy từ: https://aistudio.google.com/apikey
GOOGLE_API_KEY=AIza...your-key

# BẮT BUỘC — KIE AI
# Lấy từ: KIE AI dashboard
KIE_API_KEY=your-kie-api-key

# TÙY CHỌN — Google Sheets & Fonts
# Lấy từ: https://console.cloud.google.com/apis/credentials
# Bật: Google Sheets API v4, Google Fonts API
GOOGLE_CONSOLE_API_KEY=AIza...your-key

# TÙY CHỌN — Legacy spreadsheet (không cần cho hệ thống market mới)
SPREADSHEET_ID=your-spreadsheet-id
```

## Bước 3: Thiết lập Supabase Database

Chạy các migration SQL theo thứ tự trong Supabase SQL Editor:

```
1. supabase/migration.sql                          # Schema gốc
2. supabase/migration_brand_products.sql            # Bảng brand_products
3. supabase/migration_colors_and_product_description.sql
4. supabase/migration_concept_prompts.sql           # Bảng concept_prompts
5. supabase/migration_concept_prompt_simplify.sql   # Đơn giản hóa concept_prompts
6. supabase/migration_product_markets.sql           # Bảng product_markets
```

### Tạo Storage Buckets

Trong Supabase Dashboard → Storage, tạo các bucket:

| Bucket | Mục đích | Public |
|--------|----------|--------|
| `brand-assets` | Logo, font, product images, concept refs | Yes |
| `generated-ads` | Ảnh quảng cáo đã lưu | Yes |
| `images` | Ảnh tạm (resized cho KIE) | Yes |
| `campaign-inputs` | Reference images (legacy) | Yes |

## Bước 4: Chạy development server

```bash
npm run dev
```

Mở http://localhost:3000

## Bước 5: Kiểm tra

```bash
# Chạy tests
npm test

# Chạy tests với coverage
npm run test:coverage

# Type-check
npx tsc --noEmit

# Build production
npm run build
```

## Scripts có sẵn

| Script | Lệnh | Mô tả |
|--------|-------|-------|
| `dev` | `npm run dev` | Chạy dev server (hot reload) |
| `build` | `npm run build` | Build production |
| `start` | `npm start` | Chạy production server |
| `test` | `npm test` | Chạy toàn bộ test suite |
| `test:watch` | `npm run test:watch` | Chạy tests ở chế độ watch |
| `test:coverage` | `npm run test:coverage` | Tests + báo cáo coverage |

## Troubleshooting

### "Missing required environment variables"
→ Kiểm tra `.env.local` đã có đủ 4 biến bắt buộc chưa

### "Failed to fetch image for resize"
→ Kiểm tra Supabase Storage bucket `images` đã tạo và public chưa

### "Sheets API returned 403"
→ `GOOGLE_CONSOLE_API_KEY` cần bật Google Sheets API v4 trong Google Cloud Console

### Build fails with sharp error
→ `npm rebuild sharp` hoặc xóa `node_modules` và `npm install` lại
