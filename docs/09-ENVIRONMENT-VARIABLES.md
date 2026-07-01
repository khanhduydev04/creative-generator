# Environment Variables

## Danh sách đầy đủ

| Variable | Required | Server/Client | Mô tả | Nơi sử dụng |
|----------|----------|---------------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | **YES** | Both | URL dự án Supabase | supabase/client.ts, server.ts, image-utils.ts, kieClient.ts |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **YES** | Both | Supabase anon key (public, RLS bảo vệ) | supabase/client.ts, server.ts, image-utils.ts, kieClient.ts |
| `ANTHROPIC_API_KEY` | **YES** | Server only | Anthropic API key (Claude) | key-provider.ts (provider `anthropic`) |
| `GOOGLE_API_KEY` | **YES** | Server only | Google AI Studio key (Gemini) | geminiClient.ts, key-provider.ts (provider `google`) |
| `KIE_API_KEY` | **YES** | Server only | KIE AI image generation key | kieClient.ts, key-provider.ts (provider `kie`) |
| `OPENAI_API_KEY` | Optional | Server only | OpenAI API key | key-provider.ts (provider `openai`) |
| `VBEE_API_KEY` | Optional | Server only | Vbee TTS key — tạo giọng đọc voice-over cho video | key-provider.ts (provider `vbee`), video audio pipeline |
| `ELEVENLABS_API_KEY` | Optional | Server only | ElevenLabs TTS key — provider giọng đọc thay thế cho video | `src/app/api/video/audio/route.ts`, `src/app/api/video/elevenlabs/voices/route.ts` |
| `APIFY_TOKEN` | Optional | Server only | Apify API token — đồng bộ video đối thủ qua cron | env.ts, `src/app/api/cron/sync-apify` |
| `CRON_SECRET` | Optional | Server only | Secret Vercel Cron gửi qua header `Authorization` để xác thực request tới `/api/cron/*` | env.ts, `src/app/api/cron/sync-apify` |
| `GOOGLE_CONSOLE_API_KEY` | Optional | Server only | Google Cloud Console key (Sheets + Fonts API) | sheets-reader.ts, google-fonts/route.ts |
| `SPREADSHEET_ID` | Optional | Server only | Legacy competitor spreadsheet ID | sheets-reader.ts (legacy path only) |

## Phân loại

### Bắt buộc (app không chạy nếu thiếu)
- `NEXT_PUBLIC_SUPABASE_URL` — Database + Storage + Auth
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Database access
- `ANTHROPIC_API_KEY` — Claude AI (một số tác vụ dùng Claude thay Gemini)
- `GOOGLE_API_KEY` — Gemini AI (đọc product page, phân tích đối thủ, tạo content)
- `KIE_API_KEY` — Tạo ảnh quảng cáo

### Tùy chọn (một số tính năng bị tắt nếu thiếu)
- `OPENAI_API_KEY` — Không có: các tác vụ dùng provider `openai` trong key-provider sẽ lỗi khi gọi
- `VBEE_API_KEY` — Không có: tạo voice-over bằng Vbee cho video không hoạt động
- `ELEVENLABS_API_KEY` — Không có: tạo/list giọng đọc ElevenLabs cho video không hoạt động
- `APIFY_TOKEN` — Không có: cron đồng bộ video đối thủ (`/api/cron/sync-apify`) sẽ lỗi
- `CRON_SECRET` — Không có: endpoint cron không bị chặn bởi secret (khuyến nghị luôn set ở production)
- `GOOGLE_CONSOLE_API_KEY` — Không có: không fetch được hyperlinks từ Google Sheets, font picker không hoạt động
- `SPREADSHEET_ID` — Chỉ dùng cho legacy code path (hệ thống market mới lưu spreadsheet ID trong DB)

## Validation

File `src/lib/env.ts` validate env vars khi khởi động (danh sách bắt buộc/tùy chọn định nghĩa trong `ENV_SCHEMA`):
- Throw error nếu thiếu biến bắt buộc
- Log warning nếu thiếu biến tùy chọn
- Gợi ý copy `.env.local.template`

## Không còn BYOK (Bring-Your-Own-Key)

Toàn bộ API key ở trên là **biến môi trường server-only, dùng chung cho cả app** — không còn hệ thống per-user API key (BYOK) lưu trong DB như trước đây.

- `src/lib/key-provider.ts` định nghĩa `PROVIDER_ENV_MAP` ánh xạ tên provider (`anthropic`, `google`, `kie`, `openai`, `vbee`) sang tên biến env tương ứng.
- Hàm `getUserApiKey(userId, provider)` **bỏ qua tham số `userId`** (chỉ giữ lại để tương thích chữ ký gọi hàm cũ) và đọc trực tiếp từ `process.env`.
- Không có bảng DB nào lưu API key theo user, không có mã hoá/giải mã key theo user (`crypto.ts` cũ đã bị xoá).
- Hệ quả: mọi user trong app dùng chung 1 bộ key do admin cấu hình ở cấp môi trường (Vercel dashboard hoặc `.env.local`), không tự nhập key riêng trong UI.

## Bảo mật

### KHÔNG BAO GIỜ commit
- `.env.local` (gitignored)
- `.claude/settings.local.json` (gitignored — chứa API keys trong lệnh curl)

### Biến `NEXT_PUBLIC_*`
- Được expose ra browser — CHỈ chứa giá trị không nhạy cảm
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` là public key, được bảo vệ bởi RLS policies

### Biến server-only (không có `NEXT_PUBLIC_`)
- CHỈ có thể truy cập trong server components và API routes
- `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`, `KIE_API_KEY`, `OPENAI_API_KEY`, `VBEE_API_KEY`, `ELEVENLABS_API_KEY`, `APIFY_TOKEN`, `CRON_SECRET`, `GOOGLE_CONSOLE_API_KEY` — secrets, cần rotate nếu bị lộ

## Cách lấy keys

| Key | Nguồn |
|-----|-------|
| Supabase URL + Anon Key | [supabase.com/dashboard](https://supabase.com/dashboard) → Project Settings → API |
| Anthropic API Key (Claude) | [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys) |
| Google API Key (Gemini) | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| Google Console API Key | [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials) → Bật Google Sheets API v4 + Google Fonts API |
| KIE API Key | KIE AI dashboard |
| OpenAI API Key | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| Vbee API Key | Vbee dashboard (TTS tiếng Việt cho video) |
| ElevenLabs API Key | [elevenlabs.io](https://elevenlabs.io) → Profile → API Keys |
| Apify Token | [console.apify.com/settings/integrations](https://console.apify.com/settings/integrations) |
| Cron Secret | Tự sinh 1 chuỗi ngẫu nhiên bất kỳ, set giống nhau ở Vercel env và không cần nguồn ngoài |
