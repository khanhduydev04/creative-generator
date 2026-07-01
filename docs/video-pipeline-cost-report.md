# Báo cáo chi phí vận hành — Luồng Video

> Cập nhật: 2026-07-01

## 1. Model transcript đang dùng

Tính năng transcript dùng **Gemini 2.5 Flash** (`gemini-2.5-flash`), gọi trực tiếp file audio (không qua bước tách text riêng) tại [`src/app/api/video/transcripts/[id]/run/route.ts:13`](../src/app/api/video/transcripts/[id]/run/route.ts#L13). Input là audio inline (`audio/mpeg`) + prompt yêu cầu transcribe tiếng Việt.

App dùng chung **1 `GOOGLE_API_KEY`** từ biến môi trường cho toàn team ([`src/lib/key-provider.ts`](../src/lib/key-provider.ts)) — không phải mô hình BYOK theo từng user.

### Giá Gemini 2.5 Flash (giá công bố)

| Loại | Đơn giá |
|---|---|
| Input audio | $1.00 / 1M token (quy đổi **25 token/giây audio**) |
| Output text | $2.50 / 1M token |

Với video TikTok dài 30–60 giây:
- Input: 750–1.500 token audio
- Output: ~150–300 token transcript

→ **Chi phí ≈ $0.0011 – $0.0023 / video** (dưới 1 cent/video).

> Lưu ý: nếu key `GOOGLE_API_KEY` chưa bật billing, request vẫn chạy trong hạn free-tier (1.500 request/ngày) — với khối lượng hiện tại (200 video/tuần) có thể **không tốn phí thực tế**. Bảng chi phí dưới đây là kịch bản đã bật billing (trả theo usage).

## 2. Giả định đầu vào (theo xác nhận)

- Crawl Apify: **2 ngày/tuần × 100 kết quả/ngày = 200 video/tuần**
- Transcript (Gemini): chạy cho **toàn bộ 200 video/tuần**
- Script (Claude) + Voice (ElevenLabs): chỉ chạy cho **~20 video/tuần** được chọn để sản xuất (không phải toàn bộ video crawl về)
- Thời lượng video trung bình: 30–60 giây
- Apify: chưa xác nhận actor/task cụ thể → dùng ước tính giá phổ biến (~$3/1.000 kết quả, kiểu clockworks/tiktok-scraper)
- ElevenLabs: gói subscription $11/tháng, 121.000 ký tự/tháng, mỗi video ~1.000 ký tự script

## 3. Bảng chi phí vận hành 1 tuần

| Bước | Model/dịch vụ | Khối lượng/tuần | Đơn giá | Chi phí/tuần |
|---|---|---|---|---|
| Crawl Apify | TikTok scraper (ước tính) | 200 kết quả | $3/1.000 | **≈ $0.60** |
| Transcript | Gemini 2.5 Flash (audio 30–60s) | 200 video | $1/1M token audio + $2.5/1M token text | **≈ $0.23 – $0.45** |
| Script rewrite | Claude Sonnet 4.6 ([`src/services/claudeClient.ts:8`](../src/services/claudeClient.ts#L8)) — $3/1M in, $15/1M out | 20 video | ~1.000 token in + ~300 token out/lần | **≈ $0.15** |
| Voice | ElevenLabs — gói sub $11/tháng, 121k ký tự | 20 video × ~1.000 ký tự = 20k ký tự/tuần (≈86.6k/tháng, trong hạn mức) | Gói cố định | **≈ $2.54** ($11 ÷ 4.33 tuần) |

### Tổng ước tính

- **≈ $3.5 – $3.7 / tuần**
- **≈ $15 / tháng**
- Quy đổi tham khảo (~26.000đ/$): **≈ 90.000 – 96.000đ/tuần**

## 4. Nhận xét

1. Chi phí bị **chi phối bởi gói subscription ElevenLabs cố định** ($11/tháng) — Gemini transcript + Claude script cộng lại chưa tới $0.6/tuần, gần như không đáng kể.
2. **Apify là số ước tính**, chưa xác nhận actor/task ID thực tế đang dùng trong Apify Console — cần cập nhật lại khi có số liệu chính xác (task ID cấu hình qua `APIFY_TOKEN`, xem [`src/services/apifySyncService.ts`](../src/services/apifySyncService.ts)).
3. Nếu số video đi full pipeline (script + voice) vượt quá **~28 video/tuần** (121k ký tự/tháng ÷ 4.33 tuần ÷ 1.000 ký tự/video), sẽ phát sinh phí vượt hạn mức ElevenLabs — hiện tại 20 video/tuần vẫn an toàn trong hạn mức.
4. Gemini transcript gần như miễn phí ở khối lượng hiện tại — điểm cần theo dõi khi scale lên (ví dụ tăng tần suất crawl hoặc crawl nhiều nguồn hơn).
