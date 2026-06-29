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
| `GOOGLE_API_KEY` | `AIza...` |
| `KIE_API_KEY` | `your-kie-key` |
| `GOOGLE_CONSOLE_API_KEY` | `AIza...` (optional) |

### Bước 3: Deploy

Push to `main` branch → Vercel auto-deploy.

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
      - GOOGLE_API_KEY=${GOOGLE_API_KEY}
      - KIE_API_KEY=${KIE_API_KEY}
      - GOOGLE_CONSOLE_API_KEY=${GOOGLE_CONSOLE_API_KEY}
    env_file:
      - .env.local
```

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
[gemini-reader]       — Product page reading failures
[sheets-reader]       — Google Sheets API errors
[concept-skills]      — Gemini variant generation issues
[competitor-analyzer]  — Deep analysis errors
[generate-ads]        — Pipeline errors, image resize failures
[prompt-scorer]       — Score/improve rounds
[save-ad]             — Storage upload failures
```

### Metrics gợi ý

- Tỷ lệ thành công/thất bại image generation
- Thời gian trung bình per ad generation
- KIE API error rate
- Gemini API token usage
