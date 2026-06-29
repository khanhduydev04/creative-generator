# Environment Variables

## Danh sách đầy đủ

| Variable | Required | Server/Client | Mô tả | Nơi sử dụng |
|----------|----------|---------------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | **YES** | Both | URL dự án Supabase | supabase/client.ts, server.ts, image-utils.ts, kieClient.ts |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **YES** | Both | Supabase anon key (public, RLS bảo vệ) | supabase/client.ts, server.ts, image-utils.ts, kieClient.ts |
| `GOOGLE_API_KEY` | **YES** | Server only | Google AI Studio key (Gemini 2.5 Flash) | geminiClient.ts |
| `KIE_API_KEY` | **YES** | Server only | KIE AI image generation key | kieClient.ts |
| `GOOGLE_CONSOLE_API_KEY` | Optional | Server only | Google Cloud Console key (Sheets + Fonts API) | sheets-reader.ts, google-fonts/route.ts |
| `SPREADSHEET_ID` | Optional | Server only | Legacy competitor spreadsheet ID | sheets-reader.ts (legacy path only) |

## Phân loại

### Bắt buộc (app không chạy nếu thiếu)
- `NEXT_PUBLIC_SUPABASE_URL` — Database + Storage + Auth
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Database access
- `GOOGLE_API_KEY` — Gemini AI (đọc product page, phân tích đối thủ, tạo content)
- `KIE_API_KEY` — Tạo ảnh quảng cáo

### Tùy chọn (một số tính năng bị tắt nếu thiếu)
- `GOOGLE_CONSOLE_API_KEY` — Không có: không fetch được hyperlinks từ Google Sheets, font picker không hoạt động
- `SPREADSHEET_ID` — Chỉ dùng cho legacy code path (hệ thống market mới lưu spreadsheet ID trong DB)

## Validation

File `src/lib/env.ts` validate env vars khi khởi động:
- Throw error nếu thiếu biến bắt buộc
- Log warning nếu thiếu biến tùy chọn
- Gợi ý copy `.env.local.template`

## Bảo mật

### KHÔNG BAO GIỜ commit
- `.env.local` (gitignored)
- `.claude/settings.local.json` (gitignored — chứa API keys trong lệnh curl)

### Biến `NEXT_PUBLIC_*`
- Được expose ra browser — CHỈ chứa giá trị không nhạy cảm
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` là public key, được bảo vệ bởi RLS policies

### Biến server-only (không có `NEXT_PUBLIC_`)
- CHỈ có thể truy cập trong server components và API routes
- `GOOGLE_API_KEY`, `KIE_API_KEY`, `GOOGLE_CONSOLE_API_KEY` — secrets, cần rotate nếu bị lộ

## Cách lấy keys

| Key | Nguồn |
|-----|-------|
| Supabase URL + Anon Key | [supabase.com/dashboard](https://supabase.com/dashboard) → Project Settings → API |
| Google API Key (Gemini) | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| Google Console API Key | [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials) → Bật Google Sheets API v4 + Google Fonts API |
| KIE API Key | KIE AI dashboard |
