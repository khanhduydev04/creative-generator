# Video Pipeline — Status Marker & Script/Voice History — Design Spec

Date: 2026-07-01
Status: Approved (pending implementation plan)

## Mục tiêu

Sau khi merge `2026-06-29-video-pipeline-workflow-design.md`, luồng duyệt → pipeline
→ voice đã liền mạch nhưng còn 2 khoảng trống UX:

1. Trong danh sách video Winner, không có cách nào biết video nào **đã generate
   voice xong** mà không mở từng pipeline để kiểm tra.
2. Mỗi lần bấm "Tạo kịch bản" đã tạo 1 bản `brand_scripts` mới (dữ liệu lưu đủ),
   nhưng trang pipeline chỉ hiển thị bản mới nhất — không có cách xem/khôi phục
   bản kịch bản (và voice tương ứng) đã tạo trước đó.

Spec này bổ sung: badge trạng thái trong danh sách, version picker cho kịch bản
trong trang pipeline, và auto-scroll đến bước dang dở khi mở lại pipeline.

## Quyết định thiết kế đã chốt

- **Badge đơn giản, không progress dots.** Chỉ 1 chip "Đã tạo" (có audio) hoặc
  "Lỗi bóc băng" (whisper failed) cạnh badge Status hiện có — không thêm cột bảng.
- **Lịch sử nằm trong trang pipeline, không phải trong danh sách.** Version picker
  ở bước Kịch bản; không thêm cột "Lịch sử" ở bảng danh sách.
- **Không track lỗi cho script/voice generation trong DB.** Hai bước này chạy
  đồng bộ (synchronous request/response) — lỗi hiển thị ngay trên trang pipeline,
  không cần đánh dấu trong danh sách. Chỉ `transcripts.whisper_status = 'failed'`
  là trạng thái lỗi có lưu bền, nên chỉ trạng thái này được đánh dấu trong danh sách.

## A. Data layer — 2 field suy ra trong response danh sách

- File: `src/services/competitorVideoService.ts` (`listVideos`).
- Mở rộng select bằng embedded resource query (PostgREST) qua các quan hệ đã có:
  `competitor_videos.id ← transcripts.video_id ← brand_scripts.transcript_id ← generated_audios.script_id`.

```ts
let query = this.supabase
  .from("competitor_videos")
  .select(
    `*, transcripts:transcripts!video_id(
      whisper_status,
      brand_scripts(generated_audios(id))
    )`,
    { count: "exact" },
  )
  // ...existing filters/order/range
```

- Sau khi fetch, map mỗi row thành `CompetitorVideo` + 2 field suy ra, rồi bỏ
  field `transcripts` thô (không rò rỉ shape nội bộ ra response):

```ts
function deriveVideoFlags(row): { hasGeneratedAudio: boolean; transcriptionFailed: boolean } {
  const transcript = Array.isArray(row.transcripts) ? row.transcripts[0] : row.transcripts;
  const hasGeneratedAudio = Boolean(
    transcript?.brand_scripts?.some((s) => (s.generated_audios?.length ?? 0) > 0),
  );
  const transcriptionFailed = transcript?.whisper_status === "failed";
  return { hasGeneratedAudio, transcriptionFailed };
}
```

- Không có migration mới — chỉ đọc dữ liệu đã tồn tại. Index sẵn có trên
  `brand_scripts(transcript_id)` và `generated_audios(script_id)` giữ query rẻ
  cho page size 20.
- Áp dụng cho mọi status (pending/winner/rejected) — không cần nhánh điều kiện
  theo tab, vì pipeline có thể được mở từ bất kỳ trạng thái nào (link "Mở
  pipeline" luôn hiển thị, chỉ khác màu nhấn mạnh).

## B. Type

- File: `src/features/video/types.ts`.
- Mở rộng `CompetitorVideo`:

```ts
interface CompetitorVideo {
  // ...existing fields
  hasGeneratedAudio: boolean;
  transcriptionFailed: boolean;
}
```

## C. Danh sách — badge trạng thái pipeline

- File: `src/features/video/components/CompetitorVideoCard.tsx`.
- Trong ô Status, dưới badge `statusLabel[video.status]` hiện có, thêm 1 chip nhỏ
  có điều kiện (mutually exclusive theo dữ liệu — mỗi video chỉ có 1 transcript):
  - `video.hasGeneratedAudio` → chip xanh, icon check nhỏ, label `t.video.hasAudioBadge` ("Đã tạo")
  - `video.transcriptionFailed` → chip đỏ, icon alert nhỏ, label `t.video.transcriptFailedBadge` ("Lỗi bóc băng")
- Không đổi hành vi nút Winner/Reject/Mở pipeline hiện có.

## D. Trang pipeline — version picker cho Kịch bản

- File: `src/app/app/video/[id]/page.tsx`, `src/features/video/components/ScriptEditor.tsx`.
- `page.tsx` hiện đã gọi `useScripts(transcriptId)` và lấy `scripts[0]` làm
  `latestScript`. Đổi: truyền toàn bộ `scripts` xuống `ScriptEditor` thay vì chỉ
  `latestScript`.
- `ScriptEditor` — thay prop `latestScript: BrandScript | null` bằng
  `scripts: BrandScript[]`:
  - State nội bộ `selectedScriptId` khởi tạo = `scripts[0]?.id ?? null` (mới nhất).
  - Khi `scripts` thay đổi do vừa generate xong (SSE `done` event), tự chọn bản
    mới nhất — giữ hành vi hiện tại.
  - Thêm dropdown nhỏ phía trên khung textarea, chỉ hiện khi `scripts.length > 1`:
    `Phiên bản: {HH:mm dd/MM} · {N} phiên bản đã tạo` — mỗi option hiển thị
    timestamp `created_at` của bản đó.
  - Chọn 1 option → set `selectedScriptId`, nạp `final_text ?? raw_text` vào
    `editedFinalText`, gọi `onScriptCreated(scriptId)` (callback đã có sẵn) để
    parent cập nhật `savedScriptId`.
- **Không cần sửa `VoiceGenerationPanel`**: nó đã nhận `scriptId` từ parent và
  lọc `generated_audios` theo đúng `script_id` — đổi phiên bản kịch bản tự động
  kéo theo đúng lịch sử voice của phiên bản đó.

## E. Auto-scroll đến bước dang dở

- File: `src/app/app/video/[id]/page.tsx`.
- Sau khi 3 nguồn dữ liệu trạng thái (`transcript`, `scripts`, `audios`) đã load
  lần đầu, dùng `derivePipelineStages()` (đã có, không đổi) để tìm stage đầu
  tiên có `state !== "done"` trong `[transcribe, script, voice]`, rồi
  `scrollIntoView` tới ref tương ứng (`transcribeRef`/`scriptRef`/`voiceRef`) —
  tái sử dụng logic đang dùng ở `handleStageClick`.
- Guard bằng 1 ref cờ (`hasAutoScrolledRef`) để chỉ chạy đúng 1 lần lúc mount,
  tránh giật khi các query refetch sau đó (vd sau khi generate xong 1 bước).
- Nếu tất cả stage đã done, không scroll (giữ nguyên vị trí đầu trang).

## F. Tổng hợp thay đổi file

| File | Thay đổi |
|------|----------|
| `src/services/competitorVideoService.ts` | join embedded + tính `hasGeneratedAudio`, `transcriptionFailed` trong `listVideos` |
| `src/features/video/types.ts` | + 2 field vào `CompetitorVideo` |
| `src/features/video/components/CompetitorVideoCard.tsx` | + chip badge phụ dưới Status |
| `src/app/app/video/[id]/page.tsx` | truyền `scripts` thay vì `latestScript`; auto-scroll lúc mount |
| `src/features/video/components/ScriptEditor.tsx` | version picker, đổi prop `latestScript` → `scripts` |
| `src/lib/i18n/{vi,en}.ts` | + `hasAudioBadge`, `transcriptFailedBadge`, `scriptVersionLabel` |

## Out of scope

- Không track lỗi cho script/voice generation (đồng bộ, hiển thị lỗi ngay tại chỗ).
- Không thêm cột "Lịch sử" trong bảng danh sách.
- Không thêm progress dots chi tiết theo từng bước trong danh sách (chỉ 1 badge nhị phân).
- Không cho xóa/rename từng phiên bản kịch bản (giữ nguyên cơ chế xóa hiện có ở audio).

## Câu hỏi đã chốt

1. Marker trong danh sách: badge "Đã tạo" đơn giản, không cần progress dots.
2. Lịch sử: version picker trong trang pipeline, không phải cột riêng trong danh sách.
3. Tối ưu thêm: bổ sung trạng thái lỗi bóc băng trong danh sách + auto-scroll đến bước dang dở khi mở lại pipeline.
