# Brand Setup — Màu theo đúng số lượng đã cấu hình — Design Spec

Date: 2026-07-01
Status: Approved (pending implementation plan)

## Mục tiêu

Màn Brand Setup hiện có 6 ô màu cố định (Chính x2, Phụ x2, Nhấn x2), map 1-1 vào
6 cột nullable trong `brand_kits`. Khi brand chỉ cấu hình ít hơn 6 màu (hoặc chưa
cấu hình màu nào — brand mới), form hiện tại tự điền các ô còn thiếu bằng
`DEFAULT_COLORS` hardcode ([BrandSetupForm.tsx:37-44](../../../src/features/brand/components/BrandSetupForm.tsx#L37-L44)),
khiến người dùng không phân biệt được đâu là màu đã lưu thật, đâu là màu giả lập
do thiếu dữ liệu.

Spec này chốt lại: **brand có bao nhiêu màu thì hệ thống dùng đúng bấy nhiêu, không
tự thêm hay tự lấy màu mặc định.** Áp dụng cho form nhập liệu + preview trên màn
Brand Setup. Không đổi hành vi ở nơi dùng màu để generate ảnh/video
(`WorkspaceView.tsx`, `LibraryView.tsx`, `StealthView.tsx`) — các nơi đó vẫn giữ
fallback màu mặc định như hiện tại (out of scope, xem phần cuối).

## Quyết định thiết kế đã chốt

- **Không còn `DEFAULT_COLORS`.** State màu trong form là `Record<ColorKey, string | null>`,
  khởi tạo toàn `null`. Brand mới = 0 màu, không phải 6 màu xanh/vàng giả.
- **Ô chưa set hiển thị placeholder rõ ràng**, khác hẳn ô đã set (không chỉ là nhãn
  phụ cạnh 1 swatch giả).
- **Preview chỉ vẽ đúng những màu đã set**, ẩn hẳn field/tier chưa có màu — không
  vẽ ô rỗng giữ chỗ.
- **Xoá màu (đưa về `null`) phải lưu thật xuống DB.** Phát hiện: route hiện tại
  coi `null` và `undefined` giống nhau nên field không bao giờ được set về NULL
  sau khi đã có giá trị — cần sửa.

## A. State & khởi tạo — `BrandSetupForm.tsx`

- Thay `DEFAULT_COLORS` bằng:
  ```ts
  type ColorKey = "primary1" | "primary2" | "secondary1" | "secondary2" | "accent1" | "accent2";
  const COLOR_TIERS = ["primary", "secondary", "accent"] as const;
  const COLOR_PICKER_SEED = "#000000"; // chỉ để native <input type=color> có value ban đầu, không hiển thị và không được lưu cho tới khi user chọn
  const EMPTY_COLORS: Record<ColorKey, string | null> = {
    primary1: null, primary2: null,
    secondary1: null, secondary2: null,
    accent1: null, accent2: null,
  };
  ```
- `const [colors, setColors] = useState<Record<ColorKey, string | null>>(EMPTY_COLORS);`
- Load từ `brandKit.data` ([BrandSetupForm.tsx:104-118](../../../src/features/brand/components/BrandSetupForm.tsx#L104-L118)):
  gán thẳng `kit.primary_color_1 ?? null` (v.v.) — bỏ hết phần `?? DEFAULT_COLORS.xxx`.
- `handleResetBrand` ([BrandSetupForm.tsx:251-261](../../../src/features/brand/components/BrandSetupForm.tsx#L251-L261)):
  `setColors(EMPTY_COLORS)` thay vì `setColors(DEFAULT_COLORS)`.
- `updateColor(key, value)`: giữ nguyên hành vi (set string), chỉ đổi type.
- Thêm `clearColor(key: ColorKey)`: `setColors(prev => ({ ...prev, [key]: null }))`.

## B. Form nhập liệu — component `ColorSlot` (local, cùng file, theo pattern `LogoUpload` đã có)

Props: `{ value: string | null; canEdit: boolean; onChange: (v: string) => void; onClear: () => void }`.

- **`value` là string** → render như hiện tại: swatch màu + mã hex mono, cộng thêm
  nút "x" nhỏ ở góc (chỉ hiện khi `canEdit`) gọi `onClear`.
- **`value === null`**:
  - `canEdit`: khung viền nét đứt (`border-dashed`), icon `Plus` (lucide-react,
    đã import sẵn `Palette`/`Pencil`/... trong file — thêm `Plus`), label
    `t.brandSetup.colorNotSet` ("Chưa đặt"). Bọc 1 `<input type="color">`
    `sr-only` với `value={COLOR_PICKER_SEED}`, `onChange` gọi `onChange(e.target.value)`.
  - `!canEdit`: khung mờ tĩnh, cùng label, không có input.
- Thay khối JSX lặp 2 lần cho `key1`/`key2` trong mỗi tier ([BrandSetupForm.tsx:396-447](../../../src/features/brand/components/BrandSetupForm.tsx#L396-L447))
  bằng `<ColorSlot value={colors[key1]} .../>` + `<ColorSlot value={colors[key2]} .../>`.

## C. Live Brand Preview — lọc theo giá trị thật

- Trong khối "Color Swatches" ([BrandSetupForm.tsx:508-534](../../../src/features/brand/components/BrandSetupForm.tsx#L508-L534)):
  với mỗi tier, tính `presentKeys = [key1, key2].filter(k => colors[k] !== null)`.
  - `presentKeys.length === 0` → không render tier đó (không cả label lẫn swatch).
  - Ngược lại render đúng `presentKeys` (1 hoặc 2 ô), dùng `flex` để ô còn lại
    không để trống (không `grid-cols-2` cứng nữa, tránh khoảng trắng lộ liễu khi
    chỉ có 1/2 màu).
- Nếu cả 3 tier đều rỗng → thay khối "Color Swatches" bằng 1 dòng chú thích mờ
  `t.brandSetup.noColorsConfigured` ("Chưa cấu hình màu nào").

## D. Backend — phân biệt "không đụng tới" vs "xoá về null"

- File: `src/app/api/brand-kit/[brandId]/route.ts`, hàm `PUT` ([route.ts:35-58](../../../src/app/api/brand-kit/[brandId]/route.ts#L35-L58)).
- Thêm helper cục bộ:
  ```ts
  function toNullableString(v: unknown): string | null | undefined {
    if (typeof v === "string") return v;
    if (v === null) return null;
    return undefined; // field vắng mặt trong payload -> giữ nguyên giá trị cũ
  }
  ```
- Áp dụng cho cả 6 field màu: `primary_color_1: toNullableString(primary_color_1)`, v.v.
  (giữ nguyên cách xử lý `typography`/`font_source` — không liên quan tới màu).
- `BrandKitService.saveBrandKit` không đổi — type `BrandKitUpdate` đã chấp nhận
  `string | null | undefined` cho các cột này.
- Frontend (`handleSaveBrandKit`, [BrandSetupForm.tsx:148-176](../../../src/features/brand/components/BrandSetupForm.tsx#L148-L176))
  không đổi cấu trúc gọi — vẫn gửi cả 6 field từ `colors` mỗi lần save, chỉ khác
  là giá trị có thể là `null` và giờ server xử lý đúng.

## E. i18n

File `src/lib/i18n/vi.ts` và `en.ts`, namespace `brandSetup`:
- `colorNotSet`: "Chưa đặt" / "Not set"
- `addColorAria`: "Thêm màu" / "Add color" (aria-label nút "+")
- `removeColorAria`: "Xóa màu" / "Remove color" (aria-label nút "x")
- `noColorsConfigured`: "Chưa cấu hình màu nào" / "No colors configured yet"

(Không tái dùng `t.brand.clearColors` của `ProductsTab` — namespace khác, để tránh
2 tính năng vô tình phụ thuộc chéo vào cùng 1 chuỗi.)

## F. Tổng hợp thay đổi file

| File | Thay đổi |
|------|----------|
| `src/features/brand/components/BrandSetupForm.tsx` | Bỏ `DEFAULT_COLORS`; state màu `string \| null`; component `ColorSlot` mới; preview lọc theo giá trị thật; `clearColor`; reset về `EMPTY_COLORS` |
| `src/app/api/brand-kit/[brandId]/route.ts` | Helper `toNullableString`; phân biệt `null` (xoá) vs `undefined` (giữ nguyên) cho 6 field màu |
| `src/lib/i18n/vi.ts`, `en.ts` | + `colorNotSet`, `addColorAria`, `removeColorAria`, `noColorsConfigured` trong `brandSetup` |
| `src/app/api/__tests__/brand-kit.test.ts` | + test case: gửi `primary_color_1: null` → kit trả về `null`, không bị điền lại |

## Out of scope

- `WorkspaceView.tsx`, `LibraryView.tsx`, `StealthView.tsx` — vẫn giữ fallback màu
  mặc định khi generate ảnh/video (đã xác nhận với người dùng). Đây là điểm
  không nhất quán còn tồn tại giữa "màu hiển thị" và "màu dùng để generate",
  để lại cho lần sau nếu cần.
- Không đổi schema DB (các cột đã nullable sẵn từ trước).
- Không đổi hành vi màu theo sản phẩm (`ProductsTab.tsx`) — đã đúng pattern này rồi.

## Câu hỏi đã chốt

1. Phạm vi: chỉ màn Brand Setup (form + preview), không đụng tới nơi generate ảnh/video.
2. Ô chưa set: placeholder rỗng viền nét đứt + nút "+", có nút "x" để xoá màu đã set.
3. Preview: ẩn hẳn ô/tier chưa set, không vẽ ô rỗng giữ chỗ.
