# Video Review — Bulk Status Change & Bulk Permanent Delete — Design Spec

Date: 2026-07-01
Status: Approved (pending implementation plan)

## Mục tiêu

Trang `src/app/app/video/page.tsx` hiện chỉ đổi status từng video một (nút
Winner/Từ chối trên mỗi hàng). Với brand crawl nhiều video mỗi ngày, duyệt
từng cái một chậm, và video rejected tồn đọng lâu ngày chỉ chiếm chỗ trong DB
mà không ai xóa. Spec này bổ sung:

1. **Chọn nhiều video** ở tab **Pending** để đổi hàng loạt sang `winner` hoặc
   `rejected`.
2. **Chọn nhiều video** ở tab **Rejected** để **xóa vĩnh viễn khỏi DB**
   (không phải đổi status), giúp dọn rác định kỳ.

## Quyết định thiết kế đã chốt

- **Bulk chỉ áp dụng ở tab Pending (đổi status) và tab Rejected (xóa).**
  Tab Winner không có bulk action — video đã là kết quả cuối, không cần đổi
  hàng loạt hay xóa hàng loạt.
- **"Chọn tất cả" chỉ chọn trang hiện tại (tối đa 20 video/trang), không phải
  toàn bộ rejected của brand.** Muốn xóa hết nhiều trang thì lặp lại thao
  tác qua từng trang. Đơn giản, khớp pattern `selectAll` đã có trong
  `LibraryView.tsx`, tránh rủi ro xóa nhầm số lượng lớn không kiểm soát bằng
  1 click.
- **Xóa vĩnh viễn là hành động không thể hoàn tác** → bắt buộc `window.confirm`
  trước khi gọi API, theo đúng pattern đã dùng ở `ConceptsTab.tsx:56` và
  `ProductsTab.tsx:58` (không cần dựng modal riêng).
- **Không đổi API/behavior của nút Winner/Từ chối từng hàng hiện có** — bulk
  action là bổ sung, coexist với action đơn lẻ.
- **Dọn storage khi xóa:** video tự thân không lưu file trong Storage (chỉ có
  `tiktok_url`/`cover_url`, phát qua CDN). Nhưng nếu video đã có
  `generated_audios` (qua transcript → brand_script), file audio trong bucket
  `generated-audio` phải được xóa best-effort trước khi xóa DB rows, theo
  đúng pattern `audio/[id]/route.ts:19-24`.

## A. Data layer — bulk update & bulk delete trong `CompetitorVideoService`

File: `src/services/competitorVideoService.ts`.

```ts
async bulkUpdateStatus(videoIds: string[], status: VideoStatus): Promise<number> {
  const { data, error } = await this.supabase
    .from("competitor_videos")
    .update({ status })
    .in("id", videoIds)
    .select("id");
  if (error) throw new Error(error.message);
  return data?.length ?? 0;
}

async bulkDelete(videoIds: string[]): Promise<string[]> {
  // Thu thập storage_path của mọi generated_audios cascade từ các video này,
  // trước khi xóa (sau khi xóa thì cascade đã dọn DB rows, không truy vấn được nữa).
  const { data: audioRows, error: audioError } = await this.supabase
    .from("transcripts")
    .select("brand_scripts(generated_audios(storage_path))")
    .in("video_id", videoIds);
  if (audioError) throw new Error(audioError.message);

  const storagePaths = (audioRows ?? [])
    .flatMap((row) => row.brand_scripts ?? [])
    .flatMap((script) => script.generated_audios ?? [])
    .map((audio) => audio.storage_path)
    .filter((path): path is string => Boolean(path));

  const { error } = await this.supabase
    .from("competitor_videos")
    .delete()
    .in("id", videoIds);
  if (error) throw new Error(error.message);

  return storagePaths;
}
```

- RLS hiện có (`competitor_videos_all`, scoped theo `brands.owner_user_id`)
  tự động giới hạn `.in("id", videoIds)` chỉ áp dụng cho video thuộc brand
  user sở hữu — không cần check `brandId` thủ công trong service.
- FK `ON DELETE CASCADE` (migration 08) tự dọn `transcripts` →
  `brand_scripts` → `generated_audios` rows khi xóa `competitor_videos`.

## B. API routes

File: `src/app/api/video/competitors/route.ts` — thêm 2 handler mới cạnh
`GET`/`POST` hiện có:

```ts
// PATCH /api/video/competitors  { ids: string[], status: "winner" | "rejected" }
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await requireUser(request);
    const body = await request.json();
    const { ids, status } = body as { ids?: unknown; status?: unknown };

    if (!Array.isArray(ids) || ids.length === 0 || !ids.every((id) => typeof id === "string")) {
      return NextResponse.json({ error: "ids is required" }, { status: 400 });
    }
    if (status !== "winner" && status !== "rejected") {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const supabase = await createClient();
    const service = new CompetitorVideoService(supabase, userId);
    const updated = await service.bulkUpdateStatus(ids, status);
    return NextResponse.json({ updated });
  } catch (e) {
    return handleApiError(e);
  }
}

// DELETE /api/video/competitors  { ids: string[] }
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await requireUser(request);
    const body = await request.json();
    const { ids } = body as { ids?: unknown };

    if (!Array.isArray(ids) || ids.length === 0 || !ids.every((id) => typeof id === "string")) {
      return NextResponse.json({ error: "ids is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const service = new CompetitorVideoService(supabase, userId);
    const storagePaths = await service.bulkDelete(ids);

    if (storagePaths.length > 0) {
      const storage = new StorageService(supabase);
      await storage.remove("generated-audio", storagePaths).catch((err: unknown) => {
        console.warn("[video/bulk-delete] Storage cleanup failed:", err);
      });
    }

    return NextResponse.json({ deleted: ids.length });
  } catch (e) {
    return handleApiError(e);
  }
}
```

- Giữ nguyên `status` chỉ nhận `"winner" | "rejected"` cho bulk PATCH (không
  cho bulk chuyển về `"pending"` — theo quyết định chỉ áp dụng ở tab Pending
  nên chiều đích luôn là 1 trong 2 giá trị này).
- Không tạo route `[id]` riêng cho bulk — dùng chung collection route
  `/api/video/competitors`, đúng pattern đã có ở `saved-ads/route.ts`
  (`DELETE` nhận `{ ids }` trên collection route thay vì `[id]`).

## C. Hooks

File: `src/hooks/api/useCompetitorVideos.ts` — thêm 2 mutation mới, theo
đúng khuôn `useUpdateVideoStatus` hiện có (dòng 46-66):

```ts
export function useBulkUpdateVideoStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: "winner" | "rejected"; brandId: string }) =>
      apiFetch<{ updated: number }>("/api/video/competitors", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids, status }),
      }),
    onSuccess: (_data, { brandId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.competitorVideos.all(brandId) });
    },
  });
}

export function useBulkDeleteVideos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ids }: { ids: string[]; brandId: string }) =>
      apiFetch<{ deleted: number }>("/api/video/competitors", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids }),
      }),
    onSuccess: (_data, { brandId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.competitorVideos.all(brandId) });
    },
  });
}
```

## D. UI — `src/app/app/video/page.tsx` + `CompetitorVideoCard.tsx`

- Thêm state chọn nhiều trong `page.tsx`, chỉ kích hoạt khi
  `activeStatus !== "winner"`:

  ```ts
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  ```

  Reset `selectedIds` về rỗng mỗi khi `activeStatus` hoặc `page` đổi (giống
  cách `LibraryView.tsx` xóa selection khi filter đổi).

- **Cột checkbox**: thêm vào `<th>` đầu bảng (hiện đang là spacer trống ở
  `page.tsx:162`) và `<td>` đầu mỗi hàng trong `CompetitorVideoCard.tsx`
  (trước ô thumbnail, dòng 49). Cột này chỉ render khi
  `activeStatus !== "winner"`. `CompetitorVideoCard` nhận thêm props:
  `selectable: boolean`, `selected: boolean`, `onToggleSelect: (id: string) => void`.
- Header checkbox = "chọn tất cả trang hiện tại" (toggle), theo đúng logic
  `selectAll()` trong `LibraryView.tsx:272-278` — so sánh
  `selectedIds.size === filteredVideos.length`.
- **Selection bar**: hiện khi `selectedIds.size > 0`, đặt ngay dưới
  `VideoStatusFilter`, tái dùng style của `LibraryView.tsx:609-657`
  (nền `bg-primary/5 border-primary/20`, nút bên phải màu theo action):
  - Tab Pending: nút "Winner" (xanh, icon `Trophy`) + nút "Từ chối" (đỏ,
    icon `XCircle`) → gọi `useBulkUpdateVideoStatus()`.
  - Tab Rejected: nút "Xóa vĩnh viễn" (đỏ đậm, icon `Trash2`) → `window.confirm`
    với message có đếm số lượng → gọi `useBulkDeleteVideos()`.
  - Nút "Bỏ chọn" (icon `X`) dùng chung cho cả 2 tab.
- Không đổi action đơn lẻ hiện có trong `CompetitorVideoCard.tsx:134-177`.

## E. i18n

Thêm keys mới vào section `video` của `src/lib/i18n/{vi,en}.ts` (cạnh
`markWinner`/`reject` dòng 766-767 vi.ts / 769-770 en.ts):

| Key | vi | en |
|---|---|---|
| `bulkMarkWinner` | "Winner ({0})" | "Winner ({0})" |
| `bulkReject` | "Từ chối ({0})" | "Reject ({0})" |
| `bulkDeletePermanently` | "Xóa vĩnh viễn ({0})" | "Delete permanently ({0})" |
| `bulkDeleteConfirm` | "Xóa vĩnh viễn {0} video đã chọn? Không thể hoàn tác." | "Permanently delete {0} selected videos? This cannot be undone." |
| `selectAllOnPage` | "Chọn tất cả trang này" | "Select all on this page" |

(`{0}` thay bằng số lượng đã chọn, dùng `.replace("{0}", String(n))` như
pattern có sẵn ở `t.video.syncSuccess`.)

## F. Tổng hợp thay đổi file

| File | Thay đổi |
|------|----------|
| `src/services/competitorVideoService.ts` | + `bulkUpdateStatus()`, `bulkDelete()` |
| `src/app/api/video/competitors/route.ts` | + `PATCH` (bulk status), + `DELETE` (bulk xóa + dọn storage `generated-audio`) |
| `src/hooks/api/useCompetitorVideos.ts` | + `useBulkUpdateVideoStatus()`, `useBulkDeleteVideos()` |
| `src/app/app/video/page.tsx` | state `selectedIds`, cột checkbox header, selection bar theo tab, reset selection khi đổi tab/trang |
| `src/features/video/components/CompetitorVideoCard.tsx` | + props `selectable`/`selected`/`onToggleSelect`, checkbox cell |
| `src/lib/i18n/vi.ts`, `src/lib/i18n/en.ts` | + 5 keys bulk action |

## Out of scope

- Không xóa/đổi status hàng loạt ở tab Winner.
- Không có "chọn tất cả toàn bộ brand" xuyên trang — chỉ trang hiện tại.
- Không thêm bulk action mới nào khác ngoài Winner/Từ chối/Xóa vĩnh viễn.
- Không đổi hành vi cascade DB hiện có (transcripts/brand_scripts/generated_audios
  vẫn tự xóa qua FK, không cần code thêm).

## Câu hỏi đã chốt

1. Phạm vi tab: bulk đổi status chỉ ở tab Pending; bulk xóa chỉ ở tab Rejected.
2. "Chọn tất cả": chỉ trang hiện tại (20 video), không phải toàn bộ rejected của brand.
