─────────── SETUP (admin, 1 lần / brand) ───────────
[1] /app/brands
└─ Tạo brand → mở BrandSetupForm
├─ Brand Intelligence (mô tả, ngành...)
├─ ApifySyncSection (admin): nhập Apify Task ID + bật toggle + Save
└─ ProductsTab: thêm sản phẩm (tên, mô tả, GIÁ, selling points, target audience)
[2] /app/video/voice-config
└─ Tạo voice preset:
├─ Tab Vbee: chọn voice_code
└─ Tab ElevenLabs: chọn voice + model (v3 / v2.5 flash)

─────────── INGESTION (tự động hoặc thủ công) ───────────
[3a] Tự động: Cron T2/T5 10h sáng → fetch run mới nhất của MỌI task → upsert competitor videos
[3b] Thủ công: BrandSetupForm → nút "Sync ngay" (hoặc /app/video → Sync theo datasetId)

─────────── PIPELINE (per video) ───────────
[4] /app/video (chọn brand ở thanh trên)
└─ Bảng competitor videos (lọc isAd, sort viral)
└─ Chọn 1 video
[5] Transcribe (1-click) → ra transcript gốc
[6] Generate Script:
├─ chọn product (kéo giá + marketing fields vào prompt)
├─ chọn tone + TTS provider (Vbee / ElevenLabs + model)
└─ Prompt 2 bước → script có [HOOK] / [THÂN BÀI] / [CTA]
[7] Generate Audio:
└─ provider branch: Vbee (voice_code) HOẶC ElevenLabs (voice_id + model) → file mp3 lưu Storage
[8] /app/library → xem/quản lý kết quả
