# Video Pipeline — Status Column & Audio List Visual Polish — Design Spec

Date: 2026-07-01
Status: Approved (pending implementation plan)

## Mục tiêu

Sau khi merge `2026-07-01-video-pipeline-status-history-design.md`, người dùng đã
thử nghiệm thực tế và phản hồi 2 điểm UI xấu/khó nhận biết:

1. Badge "Đã tạo"/"Lỗi bóc băng" nhét dưới badge Status trong danh sách quá nhỏ
   (`text-[10px]`, nền tint nhạt `bg-green-500/15`) — khó nhận ra ngay.
2. List audio đã generate trong trang pipeline (`AudioPlayer.tsx`) chỉ là 1 dòng
   phẳng (play, tên voice, duration, download, delete) — thiếu ngữ cảnh so với
   ElevenLabs History (grouped, có preview text, có thời gian tương đối).

Spec này làm đẹp lại 2 điểm trên, lấy cảm hứng bố cục từ ElevenLabs nhưng giữ
nguyên light theme của app (đã chốt ở `project-ladospice-refactor` — không có
dark mode).

## Quyết định thiết kế đã chốt

- **Badge → cột riêng, không thêm cột DB.** Vẫn dùng `hasGeneratedAudio` /
  `transcriptionFailed` đã tính sẵn ở tầng service (spec trước) — chỉ đổi chỗ
  hiển thị trong bảng, không đụng schema.
- **Badge dùng nền solid, không dùng tint nhạt** — tương phản cao hơn để dễ
  nhận biết theo đúng phản hồi.
- **Audio list thêm preview kịch bản + provider badge + thời gian tương đối**,
  dữ liệu đã có sẵn từ API hiện tại (không sửa backend).
- **Không đụng trang "Thư Viện Audio"** (`src/app/app/video/audio/page.tsx`) —
  dùng bảng khác, không phải `AudioPlayer`, ngoài phạm vi phản hồi.
- **Không dùng `Intl.RelativeTimeFormat`** cho thời gian tương đối tiếng Việt —
  dữ liệu CLDR cho locale "vi" không đảm bảo tự nhiên; viết hàm thuần riêng.

## A. Cột "Pipeline" trong danh sách video

### A1. Header bảng

- File: `src/app/app/video/page.tsx`.
- Thêm `<th>` mới giữa cột Status và cột Actions (cột action cuối cùng không
  có tiêu đề, giữ nguyên):

```tsx
<th className="py-2.5 pr-4 text-xs font-medium text-foreground-subtle">Status</th>
<th className="py-2.5 pr-4 text-xs font-medium text-foreground-subtle">Pipeline</th>
<th className="py-2.5 pr-4 text-xs font-medium text-foreground-subtle" />
```

- Thêm i18n key `t.video.pipelineColumnHeader` = "Pipeline" (vi) / "Pipeline" (en)
  thay vì hardcode string, theo quy ước các header khác đều qua `t.video.*`
  (`views`, `likes`, `shares`, `comments`).

### A2. Cell trong `CompetitorVideoCard`

- File: `src/features/video/components/CompetitorVideoCard.tsx`.
- Status `<td>` quay lại đúng như trước Task 4 của spec trước (chỉ còn pill
  Status, bỏ 2 badge phụ đã nhét vào đó):

```tsx
{/* Status */}
<td className="py-2 pr-4">
  <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_BADGE[video.status]}`}>
    {statusLabel[video.status]}
  </span>
</td>

{/* Pipeline */}
<td className="py-2 pr-4">
  {video.hasGeneratedAudio ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-600 px-2.5 py-1 text-xs font-medium text-white">
      <Check className="h-3 w-3" />
      {t.video.hasAudioBadge}
    </span>
  ) : video.transcriptionFailed ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-1 text-xs font-medium text-white">
      <AlertTriangle className="h-3 w-3" />
      {t.video.transcriptFailedBadge}
    </span>
  ) : (
    <span className="text-sm text-foreground-subtle">—</span>
  )}
</td>
```

(`Check`/`AlertTriangle` đã import sẵn từ lần trước, không cần thêm import mới.)

## B. Audio list — `AudioPlayer.tsx`

### B1. Dữ liệu đã có sẵn, không sửa backend

- `generatedAudioService.ts:11` (`listByScript`) đã join
  `brand_script:brand_scripts(final_text, raw_text)` — field
  `audio.brand_script?.final_text ?? audio.brand_script?.raw_text` dùng được
  ngay trong component, type `GeneratedAudio.brand_script` đã khai báo sẵn ở
  `types.ts:155`.
- `audio.provider` ("vbee" | "elevenlabs") và `audio.created_at` cũng đã có sẵn
  trên mọi row.

### B2. Layout 2 dòng

```tsx
<div className="flex items-start gap-3 rounded-xl border border-border/30 bg-background-elevated/30 px-4 py-3">
  <audio ref={audioRef} src={publicUrl} onEnded={...} className="hidden" />

  <button ... className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20">
    {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
  </button>

  <div className="min-w-0 flex-1">
    <div className="flex items-center gap-2">
      <p className="truncate text-sm font-medium text-foreground">{label}</p>
      <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${PROVIDER_BADGE[audio.provider]}`}>
        {PROVIDER_LABEL[audio.provider]}
      </span>
      <span className="ml-auto shrink-0 text-xs text-foreground-subtle">
        {formatRelativeTime(audio.created_at)}
      </span>
    </div>
    {scriptPreview && (
      <p className="truncate text-xs text-foreground-subtle">{scriptPreview}</p>
    )}
    {duration && (
      <p className="text-xs text-foreground-subtle">{duration}</p>
    )}
  </div>

  <a ... download><Download className="h-4 w-4" /></a>
  {onDelete && <button ...><Trash2 className="h-4 w-4" /></button>}
</div>
```

- `scriptPreview = audio.brand_script?.final_text ?? audio.brand_script?.raw_text ?? null`
- `PROVIDER_BADGE`/`PROVIDER_LABEL`: 2 hằng số kiểu `Record<TtsProvider, string>`
  ở đầu file, giống cách `STATUS_BADGE` được định nghĩa trong
  `CompetitorVideoCard.tsx` — ví dụ `vbee: "bg-purple-500/15 text-purple-600"`,
  `elevenlabs: "bg-blue-500/15 text-blue-600"`.
- Nút play to hơn (`h-10 w-10`/`h-5 w-5` icon thay vì `h-8 w-8`/`h-4 w-4`).

### B3. `formatRelativeTime` — hàm thuần mới

- File: `src/features/video/utils/formatRelativeTime.ts` (+ test cùng thư mục
  `__tests__/`, theo đúng pattern `deriveVideoFlags.ts`/`pipelineStages.ts`).

```ts
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const diffMs = now.getTime() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return "Vừa xong";
  if (diffMin < 60) return `${diffMin} phút trước`;
  if (diffHour < 24) return `${diffHour} giờ trước`;
  if (diffDay < 30) return `${diffDay} ngày trước`;
  return new Date(iso).toLocaleDateString("vi-VN");
}
```

- Tham số `now` mặc định `new Date()` nhưng cho phép truyền vào khi test —
  giữ hàm thuần và test được xác định (deterministic), không mock global `Date`.

## C. Tổng hợp thay đổi file

| File | Thay đổi |
|------|----------|
| `src/app/app/video/page.tsx` | + `<th>` cột Pipeline |
| `src/features/video/components/CompetitorVideoCard.tsx` | Status `<td>` trả về nguyên bản; + `<td>` Pipeline solid badge |
| `src/features/video/components/AudioPlayer.tsx` | Layout 2 dòng: provider badge, thời gian tương đối, script preview, nút play to hơn |
| `src/features/video/utils/formatRelativeTime.ts` (mới) | Hàm thuần format thời gian tương đối tiếng Việt |
| `src/features/video/utils/__tests__/formatRelativeTime.test.ts` (mới) | Test các mốc thời gian (vừa xong/phút/giờ/ngày/quá 30 ngày) |
| `src/lib/i18n/{vi,en}.ts` | + `pipelineColumnHeader` |

## Out of scope

- Trang "Thư Viện Audio" (`src/app/app/video/audio/page.tsx`) không đổi.
- Không đổi theme (vẫn light-only).
- Không thêm search/filter/group-by-date cho audio list trong pipeline (list
  này scope theo 1 script version, thường chỉ vài audio — không cần đầy đủ
  như trang History của ElevenLabs).
- Không dùng `Intl.RelativeTimeFormat`.

## Câu hỏi đã chốt

1. Badge chuyển sang cột riêng trong bảng, không thêm cột DB.
2. Badge dùng nền solid (tương phản cao) thay vì tint nhạt.
3. Audio list nâng cấp theo hướng "giống ElevenLabs hơn": thêm preview kịch
   bản, provider badge, thời gian tương đối — dữ liệu đã có sẵn, không sửa
   backend.
