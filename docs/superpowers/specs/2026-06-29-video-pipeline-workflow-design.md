# Video Pipeline Workflow — Design Spec

Date: 2026-06-29
Status: Approved (pending implementation plan)

## Mục tiêu

Nối liền 5 stage của pipeline sản xuất creative từ video đối thủ thành một
workflow mượt mà cho nhân sự nội bộ, dựa trên `video-creative-pipeline.md`:

1. Data Acquisition (đã có — cron Apify)
2. Human-in-the-loop: chọn Winner (đã có)
3. Transcription — bóc băng (đã có cơ chế, cần gộp bước + nối UI)
4. Script Adaptation — biến thể kịch bản + cấu hình tham số sản phẩm (cần bổ sung)
5. Voice Generation (đã có)

Phạm vi spec này: **nối stage 2 → 3 → 4 → 5** trên UI và bổ sung **cấu hình tham
số sản phẩm** cho Stage 4.

## Quyết định thiết kế đã chốt

- **Winner = chỉ đổi nhãn.** Không auto-trigger, không auto-navigate. Tách bạch
  khâu duyệt và khâu sản xuất.
- **Layout pipeline:** 1 trang cuộn + thanh trạng thái stage ở đầu + mở khóa dần.
- **Cấu hình sản phẩm:** hybrid — lưu default theo sản phẩm, Stage 4 cho override
  tạm theo từng video (không ghi đè default).

## A. Lối vào: danh sách → pipeline

- File: `src/features/video/components/CompetitorVideoCard.tsx`,
  `src/app/app/video/page.tsx`.
- Thêm nút icon **"Mở pipeline"** (mũi tên →) ở cột Actions mỗi hàng, điều hướng
  `next/link` tới `/app/video/{id}`.
- Style: nhấn mạnh (primary) khi `status === "winner"`, mờ hơn với hàng khác.
- Không thay đổi hành vi nút Winner/Reject hiện có.

## B. Trang pipeline `/app/video/[id]`

- File: `src/app/app/video/[id]/page.tsx` + component mới
  `src/features/video/components/PipelineStageBar.tsx`.
- **Thanh trạng thái** ghim đầu trang, 4 node:
  `① Bóc băng → ② Kịch bản → ③ Giọng đọc → ④ Hoàn tất`.
  - Trạng thái mỗi node: `idle` (xám) / `running` (spinner) / `done` (✓ xanh).
  - Click node = scroll tới section tương ứng (`scrollIntoView`).
  - Trạng thái suy ra từ dữ liệu sẵn có:
    - ① từ `transcript.whisper_status`
    - ② từ `latestScript` tồn tại / đã lưu
    - ③ từ có `generated_audios` cho script
    - ④ done khi ③ done
- **Mở khóa dần:** section chưa đủ điều kiện → làm mờ (`opacity` + `pointer-events-none`)
  kèm dòng hint. Logic gating giữ như hiện tại (script chờ transcript `done`,
  voice chờ script đã lưu), chỉ thêm lớp phủ trực quan.

## C. Stage 3 — Bóc băng (gộp create + run)

- File: `src/features/video/components/TranscriptEditor.tsx`,
  `src/app/app/video/[id]/page.tsx`.
- Nút **"Bắt đầu bóc băng"** thực hiện **tạo transcript + chạy Whisper trong 1
  thao tác** (hiện tại phải bấm 2 lần: create rồi run).
  - Luồng: `POST /api/video/transcripts` (create) → ngay sau đó
    `POST /api/video/transcripts/{id}/run`.
  - Trong lúc chạy: node ① = `running`, textarea disabled.
- Whisper xong → textarea editable (`edited_text`), nút **Lưu**, nút **Bóc lại**
  (đã có). Audio extraction đã xử lý server-side qua `tikwm` `data.music` →
  Whisper (không cần ffmpeg).

## D. Stage 4 — Kịch bản + cấu hình sản phẩm

### D1. Schema — `brand_products` (migration 11)

Thêm 3 cột text nullable:

- `attributes` — Đặc tính sản phẩm (vd: độ cay xé lưỡi, nguyên liệu chân ái)
- `target_audience` — Đối tượng khách hàng
- `selling_points` — Điểm bán / USP (vd: freeship, giá tốt)

Không đụng bảng khác. `brand_scripts.prompt_config` (jsonb) đã đủ chứa giá trị
override per-video.

### D2. Cấu hình "trước" trong tab Sản phẩm

- File: form thêm/sửa sản phẩm trong `src/features/brand/components/` (ProductsTab
  + modal liên quan), `src/features/brand/types.ts`, API `brand-products`.
- Bổ sung 3 field trên vào form + type `BrandProduct` + payload create/update.

### D3. Form Stage 4 (`ScriptEditor.tsx`)

- Khi chọn sản phẩm → tự nạp 3 field vào panel **"Cấu hình sản phẩm"** (có thể
  thu gọn), **prefill từ default, cho sửa/override** cho riêng video này.
- Override **không** ghi lại vào `brand_products` (chỉ tạm cho lần generate).
- Giữ `tone` (humor / authentic / dramatic) + `notes`.
- Gửi toàn bộ config (gồm override) trong `promptConfig`; lưu vào
  `brand_scripts.prompt_config`.

### D4. API `scripts/route.ts`

- Mở rộng `CreateScriptRequest.promptConfig` để chứa `attributes`,
  `targetAudience`, `sellingPoints` (giá trị override đã prefill từ product).
- System prompt bơm thêm các trường này vào (sau dòng Product).

## E. Stage 5 — Giọng đọc

- Giữ nguyên `VoiceGenerationPanel.tsx`. Chỉ nối vào thanh trạng thái: khi có
  audio → node ④ "Hoàn tất" sáng. Nút Download đã có trong `AudioPlayer`.

## F. Tổng hợp thay đổi file

| File | Thay đổi |
|------|----------|
| `supabase/migrations/11_brand_product_marketing_fields.sql` | + 3 cột text |
| `src/features/brand/types.ts` | + 3 field vào `BrandProduct` |
| `src/features/brand/components/*` (product form) | + 3 input |
| `src/app/api/brand-products/route.ts` + `[id]/route.ts` | đọc/ghi 3 field |
| `src/features/video/types.ts` | mở rộng `CreateScriptRequest.promptConfig` |
| `src/app/api/video/scripts/route.ts` | bơm field mới vào system prompt |
| `src/features/video/components/ScriptEditor.tsx` | panel cấu hình + override |
| `src/features/video/components/PipelineStageBar.tsx` (mới) | thanh trạng thái |
| `src/app/app/video/[id]/page.tsx` | stage bar + gating trực quan + gộp create/run |
| `src/features/video/components/TranscriptEditor.tsx` | gộp create + run |
| `src/features/video/components/CompetitorVideoCard.tsx` | nút "Mở pipeline" |
| `src/lib/i18n/{vi,en}.ts` | label mới |

## Out of scope

- Không lưu file video/audio thô vào Storage Bucket trước khi Winner (giữ nguyên
  nguyên tắc pipeline).
- Không đổi cơ chế cron/Apify.
- Không cấu hình voice preset (đã có trang riêng).

## Câu hỏi đã chốt

1. 3 field sản phẩm là đủ; có thể mở rộng sau nếu cần tách "nguyên liệu" riêng.
2. Override ở Stage 4 chỉ tạm cho video hiện tại, không ghi đè default sản phẩm.
