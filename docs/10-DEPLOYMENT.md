# Deployment Guide

## Khuyến nghị: Vercel

Dự án dùng Next.js App Router → deploy tốt nhất trên Vercel.

### Bước 1: Kết nối repo

1. Đăng nhập [vercel.com](https://vercel.com)
2. Import Git repository
3. Framework: Next.js (auto-detect)

### Bước 2: Cấu hình Environment Variables

Trong Vercel Dashboard → Project Settings → Environment Variables, thêm:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` |
| `ANTHROPIC_API_KEY` | `sk-ant-...` |
| `GOOGLE_API_KEY` | `AIza...` |
| `KIE_API_KEY` | `your-kie-key` |
| `OPENAI_API_KEY` | `sk-...` (optional) |
| `VBEE_API_KEY` | `your-vbee-key` (optional — TTS video) |
| `ELEVENLABS_API_KEY` | `your-elevenlabs-key` (optional — TTS video) |
| `APIFY_TOKEN` | `apify_api_...` (bắt buộc nếu dùng cron sync video đối thủ) |
| `CRON_SECRET` | chuỗi ngẫu nhiên tự sinh (bắt buộc nếu dùng cron) |
| `GOOGLE_CONSOLE_API_KEY` | `AIza...` (optional) |

Xem chi tiết từng biến (mục đích, file dùng, bắt buộc/tùy chọn) tại `docs/09-ENVIRONMENT-VARIABLES.md`. Toàn bộ key là server-only, dùng chung cho cả app — không có cơ chế mỗi user tự nhập key riêng (BYOK đã bị gỡ bỏ).

### Bước 3: Deploy

Push to `main` branch → Vercel auto-deploy.

### Bước 3b: Cron Job (đồng bộ video đối thủ qua Apify)

`vercel.json` ở root repo khai báo cron job gọi `/api/cron/sync-apify`:

```json
{
  "crons": [
    { "path": "/api/cron/sync-apify", "schedule": "0 3 * * 1" },
    { "path": "/api/cron/sync-apify", "schedule": "0 3 * * 4" }
  ]
}
```

- Lịch chạy: `0 3 * * 1` và `0 3 * * 4` (UTC) = **Thứ 2 và Thứ 5, 10:00 sáng giờ Việt Nam (UTC+7)**.
- Route `src/app/api/cron/sync-apify/route.ts` xác thực request bằng header `Authorization: Bearer ${CRON_SECRET}` — Vercel Cron tự động gửi header này khi `CRON_SECRET` được set trong Environment Variables. Nếu thiếu `CRON_SECRET`, endpoint trả về 401 cho mọi request.
- Route cũng cần `APIFY_TOKEN` để gọi Apify API — thiếu biến này route trả về lỗi 500 (`apify_token_missing`).
- Cron chỉ đồng bộ cho các brand đã bật cấu hình Apify (`BrandApifyConfigService.listEnabled()`), không chạy cho tất cả brand.

### Bước 4: Cấu hình Supabase cho production

1. **URL whitelist**: Trong Supabase → Authentication → URL Configuration, thêm production URL
2. **RLS policies**: Đảm bảo Row Level Security đã enable cho tất cả bảng
3. **Storage**: Đảm bảo buckets (`brand-assets`, `generated-ads`, `images`) đã tạo và có policy phù hợp

## Self-hosted (Docker)

### Dockerfile

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "server.js"]
```

> **Lưu ý:** Cần thêm `output: "standalone"` trong `next.config.ts` để hỗ trợ Docker.

### docker-compose.yml

```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - GOOGLE_API_KEY=${GOOGLE_API_KEY}
      - KIE_API_KEY=${KIE_API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - VBEE_API_KEY=${VBEE_API_KEY}
      - ELEVENLABS_API_KEY=${ELEVENLABS_API_KEY}
      - APIFY_TOKEN=${APIFY_TOKEN}
      - CRON_SECRET=${CRON_SECRET}
      - GOOGLE_CONSOLE_API_KEY=${GOOGLE_CONSOLE_API_KEY}
    env_file:
      - .env.local
```

> **Lưu ý về cron khi self-host:** `vercel.json` chỉ có hiệu lực trên Vercel. Khi self-host bằng Docker, cron job đồng bộ Apify (`/api/cron/sync-apify`) sẽ **không tự chạy** — cần tự thiết lập scheduler ngoài (cron của OS, GitHub Actions, hoặc dịch vụ cron ngoài) gọi `GET /api/cron/sync-apify` với header `Authorization: Bearer <CRON_SECRET>` theo đúng lịch mong muốn (khuyến nghị giữ nguyên Thứ 2 + Thứ 5, 10:00 sáng giờ Việt Nam).

## Supabase Edge Functions

Dự án sử dụng 1 Edge Function:

### `kie-callback`
- **Mục đích:** Nhận callback từ KIE AI khi image generation hoàn thành
- **Trigger:** KIE API POST tới `{SUPABASE_URL}/functions/v1/kie-callback`
- **Deploy:** `supabase functions deploy kie-callback`

## Performance Notes

- **Image resize** (sharp) chạy server-side — cần Node.js runtime (không hoạt động trên Edge runtime)
- **SSE stream** cho generate-ads — cần server hỗ trợ long-running connections
- **Gemini + KIE API calls** có thể mất 30-60s per ad generation

## Monitoring

### Logs quan trọng cần theo dõi

```
[gemini-reader]           — Product page reading failures
[sheets-reader]           — Google Sheets API errors
[concept-skills]          — Gemini variant generation issues
[competitor-analyzer]     — Deep analysis errors
[generate-ads]            — Pipeline errors, image resize failures
[prompt-scorer]           — Score/improve rounds
[save-ad]                 — Storage upload failures
[api/video/scripts POST]  — Lỗi tạo kịch bản video
[transcripts/run]         — Lỗi transcription (Gemini)
[audio/delete]            — Lỗi dọn dẹp file audio trên Storage
[cron/sync-apify]         — Lỗi đồng bộ video đối thủ theo brand (chạy Thứ 2 + Thứ 5, 10h sáng VN)
```

### Metrics gợi ý

- Tỷ lệ thành công/thất bại image generation
- Thời gian trung bình per ad generation
- KIE API error rate
- Gemini API token usage
- Tỷ lệ thành công cron `sync-apify` theo brand (số brand `synced`/`skipped`/`error` mỗi lần chạy)
- Thời gian transcription + TTS (Vbee/ElevenLabs) cho video pipeline
