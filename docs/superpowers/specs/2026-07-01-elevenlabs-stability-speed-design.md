# ElevenLabs Stability + Speed Controls — Design Spec

Date: 2026-07-01
Status: Approved (pending implementation plan)

## Mục tiêu

Tab ElevenLabs trong trang Voice Lab (`src/app/app/video/voice-config/page.tsx`) hiện
chỉ cho chọn giọng + model, không có cách chỉnh **Stability** hay **Speed** — dù
`ElevenLabsService.synthesize()` đã hỗ trợ sẵn 2 tham số này khi gọi API thật.
Kế hoạch gốc lúc build tính năng ElevenLabs (`docs/superpowers/plans/2026-06-30-elevenlabs-tts.md`)
có định nghĩa 1 slider `elSpeed` riêng nhưng lúc code đã bỏ sót, không đưa vào UI
(chỉ dùng chung state `speed`/`pitch` với tab Vbee — không có cách chỉnh cho
ElevenLabs). Stability thì chưa từng được lên kế hoạch.

Spec này bổ sung: 2 control (Stability, Speed) cho tab ElevenLabs, lưu vào preset,
dùng khi generate audio thật, và 1 nút "Tạo preview" để nghe thử trước khi lưu.

## Quyết định thiết kế đã chốt

- **Phân biệt UI theo model** (đúng giới hạn thật của ElevenLabs API — không phải
  giả định, mà do chính API không nhận các tham số này cho v3):
  - Model **v3 (eleven_v3)**: Stability chỉ nhận 3 giá trị rời rạc `0` / `0.5` / `1.0`
    (label "Creative" / "Natural" / "Robust") — hiển thị bằng 3 nút bấm, không phải
    slider liên tục. Speed **không hiển thị** (v3 không hỗ trợ chỉnh speed).
  - Model **v2.5 Flash (eleven_flash_v2_5)**: Stability là slider liên tục 0.0–1.0
    (step 0.05). Speed là slider liên tục 0.7–1.2 (step 0.05 — đúng range API thật,
    khác với range 0.5–2.0 của Vbee).
- **State tách biệt hoàn toàn khỏi tab Vbee.** State mới `elStability` (default 0.5)
  và `elSpeed` (default 1.0), không dùng chung `speed`/`pitch` như hiện tại — đây là
  nguyên nhân khiến speed của ElevenLabs preset trước giờ luôn kẹt ở giá trị mặc định
  vì không có UI nào chỉnh state chung đó trong tab ElevenLabs.
- **Lưu vào preset (DB), không chỉ preview.** Thêm cột `stability` vào
  `voice_presets` để khi generate audio thật cho video, dùng đúng giá trị đã chọn
  chứ không phải hardcode `0.5` như hiện tại trong `ElevenLabsService.synthesize()`.
- **`pitch` không còn được gửi khi lưu preset ElevenLabs** — dọn dẹp phụ, vì
  ElevenLabs API không có khái niệm pitch; hiện tại code đang gửi thừa giá trị từ
  state chung với Vbee một cách vô nghĩa (`handleSaveElPreset` tại `voice-config/page.tsx:142-162`).
- **Thêm nút "Tạo preview" cho tab ElevenLabs**, dùng chung ô "text thử" đã có,
  gọi API thật với Stability/Speed đang chỉnh để nghe trước khi lưu preset — theo
  đúng pattern nút preview đã có ở tab Vbee. Trả về audio dạng base64 data URL
  (không upload lên Storage — chỉ là nghe thử tạm, tránh tốn dung lượng).
  Có dòng chú thích nhỏ cảnh báo tốn credit ElevenLabs mỗi lần bấm (tài khoản
  đang dùng là gói free).

## A. Migration — thêm cột `stability`

File mới: `supabase/migrations/16_voice_stability.sql`

```sql
BEGIN;

ALTER TABLE public.voice_presets
  ADD COLUMN stability NUMERIC NOT NULL DEFAULT 0.5
    CHECK (stability BETWEEN 0 AND 1);

COMMIT;
```

- Áp dụng cho cả preset Vbee lẫn ElevenLabs (cột chung, giống `speed`/`pitch`) —
  preset Vbee đơn giản không dùng tới giá trị này (giữ mặc định 0.5, không đọc ở
  nhánh Vbee của `audio/route.ts`).

## B. Type — `VoicePreset`

- File: `src/features/video/types.ts`.
- Thêm field vào interface `VoicePreset` (dòng 122-135): `stability: number;`
  (ngay sau `pitch`).

## C. Service layer — lưu và đọc `stability`

- File: `src/services/voicePresetService.ts`, method `create()` — thêm
  `stability: input.stability ?? 0.5` vào object insert (theo đúng cách
  `speed`/`pitch` đang được xử lý hiện tại).
- File: `src/hooks/api/useVoicePresets.ts`, `useCreateVoicePreset()` — thêm
  `stability?: number` vào type của `input`, truyền vào body request.
- File: `src/app/api/video/voice-presets/route.ts` — không cần validate thêm
  (giống cách `speed`/`pitch` hiện tại được truyền thẳng, dựa vào CHECK constraint
  của DB để chặn giá trị ngoài [0,1]).

## D. Backend generate audio — dùng `stability`, bỏ `speed` cho v3

- File: `src/app/api/video/audio/route.ts`, nhánh `typedPreset.provider === "elevenlabs"`
  (dòng 83-99). Sửa lời gọi `elService.synthesize()`:

```ts
audioBuffer = await elService.synthesize({
  text: textToSpeak,
  voice_id: typedPreset.provider_voice_id,
  model_id: typedPreset.elevenlabs_model ?? undefined,
  stability: typedPreset.stability,
  // v3 không hỗ trợ chỉnh speed — chỉ gửi cho v2.5 Flash
  speed: typedPreset.elevenlabs_model === "eleven_v3" ? undefined : typedPreset.speed,
});
```

- Không cần sửa `ElevenLabsService.synthesize()` — đã nhận `stability`/`speed` là
  optional với default hợp lý (`stability ?? 0.5`, `speed ?? 1.0`) từ trước.

## E. API preview mới cho ElevenLabs

- File mới: `src/app/api/video/elevenlabs/preview/route.ts`, theo đúng pattern
  `src/app/api/video/vbee/preview/route.ts` (giới hạn text tối đa 500 ký tự):

```ts
import { NextRequest, NextResponse } from "next/server";
import { requireUser, handleApiError } from "@/lib/user-context";

const PREVIEW_TEXT_MAX_LENGTH = 500;

interface PreviewRequest {
  voice_id: string;
  text: string;
  model_id?: "eleven_v3" | "eleven_flash_v2_5";
  stability?: number;
  speed?: number;
}

export async function POST(request: NextRequest) {
  try {
    await requireUser(request);
    const body = (await request.json()) as PreviewRequest;

    if (!body.voice_id || !body.text?.trim()) {
      return NextResponse.json({ error: "voice_id and text are required" }, { status: 400 });
    }
    if (body.text.length > PREVIEW_TEXT_MAX_LENGTH) {
      return NextResponse.json({ error: "text too long (max 500 chars)" }, { status: 400 });
    }

    const elKey = process.env.ELEVENLABS_API_KEY;
    if (!elKey) {
      return NextResponse.json({ error: "elevenlabs_key_missing" }, { status: 500 });
    }

    const { ElevenLabsService } = await import("@/services/elevenlabsService");
    const service = new ElevenLabsService(elKey);
    const audioBuffer = await service.synthesize({
      text: body.text,
      voice_id: body.voice_id,
      model_id: body.model_id,
      stability: body.stability,
      speed: body.model_id === "eleven_v3" ? undefined : body.speed,
    });

    const base64 = Buffer.from(audioBuffer).toString("base64");
    return NextResponse.json({ audioUrl: `data:audio/mpeg;base64,${base64}` });
  } catch (error) {
    return handleApiError(error);
  }
}
```

- Dùng chung `process.env.ELEVENLABS_API_KEY` như `audio/route.ts` hiện tại
  (không có BYOK riêng cho ElevenLabs — khác Vbee vốn có `getUserApiKey`).

## F. Hook cho preview

- File: `src/hooks/api/useVoicePresets.ts` — thêm hook mới:

```ts
export function useElevenLabsPreview() {
  return useMutation({
    mutationFn: (input: {
      voiceId: string;
      text: string;
      modelId?: ElevenLabsModel;
      stability?: number;
      speed?: number;
    }) =>
      apiFetch<{ audioUrl: string }>("/api/video/elevenlabs/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          voice_id: input.voiceId,
          text: input.text,
          model_id: input.modelId,
          stability: input.stability,
          speed: input.speed,
        }),
      }),
  });
}
```

## G. UI — `src/app/app/video/voice-config/page.tsx`

- State mới (cạnh state ElevenLabs hiện có, dòng 55-59):
  `elStability` (number, default `0.5`), `elSpeed` (number, default `1.0`),
  `elGeneratedPreviewUrl` (string | null), `generatingElPreview` (boolean),
  `elPreviewError` (string | null) — **tách hoàn toàn khỏi state `previewUrl`/
  `generatingPreview`/`previewError`/`speed`/`pitch` đang dùng chung với tab Vbee.**
- Trong panel "Cấu hình ElevenLabs" (dòng 468-539), thêm sau khối Model selector
  (dòng 489-513), trước khối lưu preset (dòng 516-535):
  - Nếu `elModel === "eleven_v3"`: 3 nút "Creative" (0) / "Natural" (0.5) /
    "Robust" (1.0) set `elStability`, nút đang chọn highlight — không render
    control Speed.
  - Nếu `elModel === "eleven_flash_v2_5"`: slider Stability liên tục (0–1, step
    0.05) + slider Speed liên tục (0.7–1.2, step 0.05).
  - Ô "text thử" dùng chung `testText` (state đã có), nút "Tạo preview" gọi
    `useElevenLabsPreview().mutateAsync({voiceId: elVoiceId, text: testText,
    modelId: elModel, stability: elStability, speed: elSpeed})`, hiển thị
    `<audio>` với `elGeneratedPreviewUrl` khi xong. Dòng chú thích nhỏ màu
    xám: "Mỗi lần tạo preview sẽ trừ credit ElevenLabs."
- `handleSaveElPreset` (dòng 142-162) — sửa để gửi `stability: elStability`,
  `speed: elModel === "eleven_v3" ? undefined : elSpeed`, **bỏ `pitch`** khỏi
  payload gửi lên (để DB dùng default `1.0`, không còn ý nghĩa gì với ElevenLabs).

## Out of scope

- Không thêm `similarity_boost`/`style`/`use_speaker_boost` ra UI — 2 tham số đầu
  giữ hardcode như hiện tại trong `ElevenLabsService`, không phải yêu cầu của spec
  này.
- Không đổi UI/hành vi tab Vbee.
- Không thêm cơ chế BYOK riêng cho ElevenLabs (vẫn dùng `ELEVENLABS_API_KEY` chung
  từ env, theo đúng cách `audio/route.ts` đang làm).
- Không giới hạn số lần preview hay cảnh báo hết credit dựa trên số dư thật — chỉ
  hiển thị dòng chú thích tĩnh, không gọi API kiểm tra credit.

## Câu hỏi đã chốt

1. Phân biệt Stability/Speed theo model (v3: 3 mức rời rạc + ẩn Speed; v2.5: slider
   liên tục cho cả 2) — đúng giới hạn thật của ElevenLabs API.
2. Lưu `stability` vào preset (DB), dùng thật khi generate audio, không chỉ để
   preview.
3. Thêm nút "Tạo preview" riêng cho tab ElevenLabs, gọi API thật, trả audio dạng
   data URL (không lưu Storage).
