# Phase 3: Transcription + Script Adaptation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Stage 3 (Whisper transcription) + Stage 4 (Claude SSE script adaptation) on `/app/video/[id]`, replacing the current placeholder with a full 4-section pipeline detail page.

**Architecture:** `TranscriptService` and `ScriptService` handle Supabase CRUD. Whisper runs server-side via OpenAI API (requires adding `openai` to the key-provider system). Script generation streams Claude Sonnet 4.6 tokens via SSE using a new `claudeStreamGenerate` helper. Client polls transcript status every 3 s. Stage 5 slot is rendered but empty — it will be filled in Phase 5.

**Tech Stack:** Next.js App Router, Supabase, TanStack Query, Tailwind CSS, TypeScript, Anthropic SDK (streaming), OpenAI fetch API, lucide-react

---

## File Map

**Create:**
- `src/services/transcriptService.ts` — Supabase CRUD for `transcripts`
- `src/services/scriptService.ts` — Supabase CRUD for `brand_scripts`
- `src/app/api/video/transcripts/route.ts` — `POST` create transcript
- `src/app/api/video/transcripts/[id]/route.ts` — `GET` status + `PATCH` edit text
- `src/app/api/video/transcripts/[id]/run/route.ts` — `POST` trigger Whisper
- `src/app/api/video/scripts/route.ts` — `POST` generate script via SSE
- `src/app/api/video/scripts/[id]/route.ts` — `PATCH` save `final_text`
- `src/hooks/api/useTranscripts.ts` — TanStack Query hooks
- `src/hooks/api/useScripts.ts` — TanStack Query hooks
- `src/features/video/components/TranscriptEditor.tsx`
- `src/features/video/components/ScriptEditor.tsx`

**Modify:**
- `src/lib/key-provider.ts` — add `openai` to `ApiKeyProvider`
- `src/lib/validators/api-key.ts` — add OpenAI key pattern + update `isValidProvider`
- `src/components/settings/UserApiKeysCard.tsx` — add OpenAI to PROVIDERS list
- `src/services/claudeClient.ts` — add `claudeStreamGenerate` + `CLAUDE_SONNET_MODEL` constant
- `src/features/video/types.ts` — add `Transcript`, `BrandScript`, `WhisperStatus` types
- `src/lib/query/keys.ts` — add `transcripts` + `scripts` keys
- `src/lib/i18n/vi.ts` — add Stage 3+4 strings to `video.*`
- `src/lib/i18n/en.ts` — same keys in English
- `src/app/app/video/[id]/page.tsx` — replace placeholder with full pipeline

---

## Task 1: Add OpenAI Key Provider

**Files:**
- Modify: `src/lib/key-provider.ts`
- Modify: `src/lib/validators/api-key.ts`
- Modify: `src/components/settings/UserApiKeysCard.tsx`

- [ ] **Step 1: Add `openai` to `ApiKeyProvider` in key-provider.ts**

In `src/lib/key-provider.ts`, change line 10:
```typescript
// Before:
export type ApiKeyProvider = "anthropic" | "google" | "kie";

// After:
export type ApiKeyProvider = "anthropic" | "google" | "kie" | "openai";
```

- [ ] **Step 2: Add OpenAI key validation in validators/api-key.ts**

Replace the entire file content:
```typescript
import type { ApiKeyProvider } from "@/lib/key-provider";

const PROVIDER_PREFIXES: Record<ApiKeyProvider, RegExp> = {
  anthropic: /^sk-ant-[A-Za-z0-9_-]{8,}$/,
  google: /^AIza[A-Za-z0-9_-]{8,}$/,
  kie: /^[A-Za-z0-9_-]{8,}$/,
  openai: /^sk-[A-Za-z0-9_-]{8,}$/,
};

export function isValidProvider(p: string): p is ApiKeyProvider {
  return ["anthropic", "google", "kie", "openai"].includes(p);
}

export function isValidKeyFormat(provider: ApiKeyProvider, key: string): boolean {
  if (!key || key.length < 8) return false;
  return PROVIDER_PREFIXES[provider].test(key);
}

export function maskKey(): string {
  return "•••••••• (set)";
}
```

- [ ] **Step 3: Add OpenAI to `PROVIDERS` list in `UserApiKeysCard.tsx`**

Find:
```typescript
type Provider = "anthropic" | "google" | "kie";

const PROVIDERS: { id: Provider; label: string; helpUrl: string }[] = [
  { id: "anthropic", label: "Anthropic", helpUrl: "https://console.anthropic.com/settings/keys" },
  { id: "google", label: "Google AI Studio", helpUrl: "https://aistudio.google.com/apikey" },
  { id: "kie", label: "KIE", helpUrl: "https://kie.ai/api-keys" },
];
```

Replace with:
```typescript
type Provider = "anthropic" | "google" | "kie" | "openai";

const PROVIDERS: { id: Provider; label: string; helpUrl: string }[] = [
  { id: "anthropic", label: "Anthropic", helpUrl: "https://console.anthropic.com/settings/keys" },
  { id: "google", label: "Google AI Studio", helpUrl: "https://aistudio.google.com/apikey" },
  { id: "kie", label: "KIE", helpUrl: "https://kie.ai/api-keys" },
  { id: "openai", label: "OpenAI", helpUrl: "https://platform.openai.com/api-keys" },
];
```

Also update the `useState` initial drafts to include `openai`:
```typescript
const [drafts, setDrafts] = useState<Record<Provider, string>>({ anthropic: "", google: "", kie: "", openai: "" });
```

- [ ] **Step 4: TypeScript check**

```
npx tsc --noEmit
```

Expected: 0 errors.

---

## Task 2: Extend Types + Query Keys + i18n

**Files:**
- Modify: `src/features/video/types.ts`
- Modify: `src/lib/query/keys.ts`
- Modify: `src/lib/i18n/vi.ts`
- Modify: `src/lib/i18n/en.ts`

- [ ] **Step 1: Add Transcript and BrandScript types to `types.ts`**

Append to end of `src/features/video/types.ts`:
```typescript
export type WhisperStatus = "pending" | "processing" | "done" | "failed";

export interface Transcript {
  id: string;
  video_id: string;
  whisper_status: WhisperStatus;
  raw_text: string | null;
  edited_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface BrandScript {
  id: string;
  transcript_id: string;
  brand_id: string;
  prompt_config: {
    tone?: string;
    notes?: string;
    productId?: string | null;
  };
  raw_text: string | null;
  final_text: string | null;
  llm_model: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTranscriptResponse {
  transcript: Transcript;
}

export interface TranscriptResponse {
  transcript: Transcript;
}

export interface CreateScriptRequest {
  transcriptId: string;
  brandId: string;
  productId: string | null;
  promptConfig: { tone: string; notes: string };
}

export interface PatchScriptRequest {
  finalText: string;
}

export interface PatchScriptResponse {
  script: BrandScript;
}
```

- [ ] **Step 2: Add transcript and script query keys**

In `src/lib/query/keys.ts`, add after `competitorVideos`:
```typescript
  transcripts: {
    detail: (videoId: string) => ["transcript", videoId] as const,
  },
  scripts: {
    list: (transcriptId: string) => ["scripts", transcriptId] as const,
  },
```

- [ ] **Step 3: Add Stage 3+4 i18n keys to `vi.ts`**

In `src/lib/i18n/vi.ts`, inside the `video: { ... }` block (after `embedBlocked`), add:
```typescript
    // Stage 3 - Transcript
    stage3Title: "Phiên Âm",
    transcriptPending: "Chờ xử lý",
    transcriptProcessing: "Đang phiên âm...",
    transcriptDone: "Hoàn thành",
    transcriptFailed: "Thất bại",
    startTranscription: "Bắt đầu phiên âm",
    retranscribe: "Phiên âm lại",
    saveTranscript: "Lưu",
    savedTranscript: "Đã lưu",
    transcriptPlaceholder: "Transcript sẽ xuất hiện ở đây sau khi xử lý...",
    transcriptPollError: "Lỗi kiểm tra trạng thái transcript",
    // Stage 4 - Script
    stage4Title: "Kịch Bản Thương Hiệu",
    noProduct: "Không chọn sản phẩm",
    selectProduct: "Chọn sản phẩm...",
    tone: "Giọng điệu",
    toneHumor: "Hài hước",
    toneAuthentic: "Chân thực",
    toneDramatic: "Kịch tính",
    scriptNotes: "Ghi chú (USP, hashtags, khuyến mãi...)",
    generateScript: "Tạo kịch bản ✦",
    generatingScript: "Đang tạo...",
    saveScript: "Lưu kịch bản",
    savedScript: "Đã lưu",
    scriptPlaceholder: "Kịch bản sẽ được tạo tại đây...",
    noTranscriptForScript: "Hoàn thành Stage 3 trước khi tạo kịch bản.",
    scriptStreamError: "Lỗi tạo kịch bản. Thử lại.",
    // Stage 5 placeholder
    stage5Title: "Tạo Giọng Đọc",
    stage5Placeholder: "Lưu kịch bản trước để tạo giọng đọc.",
    // Video detail header
    videoDetailNotFound: "Không tìm thấy video.",
    loadingVideo: "Đang tải...",
```

- [ ] **Step 4: Add same keys to `en.ts`**

In `src/lib/i18n/en.ts`, inside the `video: { ... }` block (after `embedBlocked`), add:
```typescript
    // Stage 3 - Transcript
    stage3Title: "Transcription",
    transcriptPending: "Pending",
    transcriptProcessing: "Transcribing...",
    transcriptDone: "Done",
    transcriptFailed: "Failed",
    startTranscription: "Start Transcription",
    retranscribe: "Re-transcribe",
    saveTranscript: "Save",
    savedTranscript: "Saved",
    transcriptPlaceholder: "Transcript will appear here after processing...",
    transcriptPollError: "Error checking transcript status",
    // Stage 4 - Script
    stage4Title: "Brand Script",
    noProduct: "No product",
    selectProduct: "Select product...",
    tone: "Tone",
    toneHumor: "Humorous",
    toneAuthentic: "Authentic",
    toneDramatic: "Dramatic",
    scriptNotes: "Notes (USP, hashtags, promotions...)",
    generateScript: "Generate Script ✦",
    generatingScript: "Generating...",
    saveScript: "Save script",
    savedScript: "Saved",
    scriptPlaceholder: "Script will be generated here...",
    noTranscriptForScript: "Complete Stage 3 before generating a script.",
    scriptStreamError: "Script generation error. Try again.",
    // Stage 5 placeholder
    stage5Title: "Voice Generation",
    stage5Placeholder: "Save a script first to generate voice.",
    // Video detail header
    videoDetailNotFound: "Video not found.",
    loadingVideo: "Loading...",
```

- [ ] **Step 5: TypeScript check**

```
npx tsc --noEmit
```

Expected: 0 errors.

---

## Task 3: Add `claudeStreamGenerate` to claudeClient.ts

**Files:**
- Modify: `src/services/claudeClient.ts`

- [ ] **Step 1: Add `CLAUDE_SONNET_MODEL` constant and `claudeStreamGenerate` function**

After the existing `CLAUDE_HAIKU_MODEL` constant, add:
```typescript
export const CLAUDE_SONNET_MODEL = "claude-sonnet-4-6";
```

After the closing `}` of `claudeTextGenerate`, append:
```typescript
/**
 * Stream text generation from Claude Sonnet.
 * Calls `onToken` for each text delta. Returns the full accumulated text.
 */
export async function claudeStreamGenerate(
  userId: string,
  systemPrompt: string,
  userMessage: string,
  onToken: (text: string) => void,
  maxTokens = 2048,
): Promise<string> {
  const client = await getClient(userId);

  const stream = client.messages.stream({
    model: CLAUDE_SONNET_MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  stream.on("text", (text: string) => {
    onToken(text);
  });

  const final = await stream.finalMessage();
  const textBlock = final.content.find((b) => b.type === "text");
  return textBlock && "text" in textBlock ? textBlock.text : "";
}
```

- [ ] **Step 2: TypeScript check**

```
npx tsc --noEmit
```

Expected: 0 errors.

---

## Task 4: TranscriptService

**Files:**
- Create: `src/services/transcriptService.ts`

- [ ] **Step 1: Create the service**

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Transcript, WhisperStatus } from "@/features/video/types";

export class TranscriptService {
  constructor(private readonly supabase: SupabaseClient) {}

  async getByVideoId(videoId: string): Promise<Transcript | null> {
    const { data, error } = await this.supabase
      .from("transcripts")
      .select("*")
      .eq("video_id", videoId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data as Transcript | null;
  }

  async getById(id: string): Promise<Transcript | null> {
    const { data, error } = await this.supabase
      .from("transcripts")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data as Transcript | null;
  }

  async create(videoId: string): Promise<Transcript> {
    const { data, error } = await this.supabase
      .from("transcripts")
      .insert({ video_id: videoId, whisper_status: "pending" })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") throw new Error("TRANSCRIPT_EXISTS");
      throw new Error(error.message);
    }
    return data as Transcript;
  }

  async updateStatus(id: string, status: WhisperStatus): Promise<void> {
    const { error } = await this.supabase
      .from("transcripts")
      .update({ whisper_status: status })
      .eq("id", id);

    if (error) throw new Error(error.message);
  }

  async saveRawText(id: string, rawText: string): Promise<Transcript> {
    const { data, error } = await this.supabase
      .from("transcripts")
      .update({ raw_text: rawText, whisper_status: "done" })
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as Transcript;
  }

  async saveEditedText(id: string, editedText: string): Promise<Transcript> {
    const { data, error } = await this.supabase
      .from("transcripts")
      .update({ edited_text: editedText })
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as Transcript;
  }
}
```

- [ ] **Step 2: TypeScript check**

```
npx tsc --noEmit
```

Expected: 0 errors.

---

## Task 5: Transcript API Routes

**Files:**
- Create: `src/app/api/video/transcripts/route.ts`
- Create: `src/app/api/video/transcripts/[id]/route.ts`
- Create: `src/app/api/video/transcripts/[id]/run/route.ts`

- [ ] **Step 1: Create `POST /api/video/transcripts`**

`src/app/api/video/transcripts/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser, handleApiError } from "@/lib/user-context";
import { TranscriptService } from "@/services/transcriptService";

export async function POST(request: NextRequest) {
  try {
    await requireUser(request);
    const body = await request.json() as { videoId?: string };

    if (!body.videoId) {
      return NextResponse.json({ error: "videoId is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const service = new TranscriptService(supabase);

    try {
      const transcript = await service.create(body.videoId);
      return NextResponse.json({ transcript }, { status: 201 });
    } catch (err) {
      if (err instanceof Error && err.message === "TRANSCRIPT_EXISTS") {
        const existing = await service.getByVideoId(body.videoId);
        return NextResponse.json({ transcript: existing });
      }
      throw err;
    }
  } catch (e) {
    return handleApiError(e);
  }
}
```

- [ ] **Step 2: Create `GET + PATCH /api/video/transcripts/[id]`**

`src/app/api/video/transcripts/[id]/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser, handleApiError } from "@/lib/user-context";
import { TranscriptService } from "@/services/transcriptService";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireUser(request);
    const { id } = await params;

    const supabase = await createClient();
    const service = new TranscriptService(supabase);
    const transcript = await service.getById(id);

    if (!transcript) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ transcript });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireUser(request);
    const { id } = await params;
    const body = await request.json() as { editedText?: string };

    if (typeof body.editedText !== "string") {
      return NextResponse.json({ error: "editedText is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const service = new TranscriptService(supabase);
    const transcript = await service.saveEditedText(id, body.editedText);
    return NextResponse.json({ transcript });
  } catch (e) {
    return handleApiError(e);
  }
}
```

- [ ] **Step 3: Create `POST /api/video/transcripts/[id]/run`**

`src/app/api/video/transcripts/[id]/run/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser, handleApiError } from "@/lib/user-context";
import { getUserApiKey } from "@/lib/key-provider";
import { TranscriptService } from "@/services/transcriptService";

const TIKWM_API = "https://www.tikwm.com/api/";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await requireUser(request);
    const { id } = await params;

    const supabase = await createClient();
    const service = new TranscriptService(supabase);

    const transcript = await service.getById(id);
    if (!transcript) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    // Fetch tiktok_url from competitor_videos via video_id FK
    const { data: videoRow, error: videoErr } = await supabase
      .from("competitor_videos")
      .select("tiktok_url")
      .eq("id", transcript.video_id)
      .single();

    if (videoErr || !videoRow) {
      return NextResponse.json({ error: "video_not_found" }, { status: 404 });
    }

    // Mark as processing
    await service.updateStatus(id, "processing");

    // Fetch audio-only music URL from tikwm
    const tikwmUrl = `${TIKWM_API}?url=${encodeURIComponent(videoRow.tiktok_url)}&hd=0`;
    const tikwmRes = await fetch(tikwmUrl, { signal: AbortSignal.timeout(10000) });

    if (!tikwmRes.ok) {
      await service.updateStatus(id, "failed");
      return NextResponse.json({ error: "tikwm_fetch_failed" }, { status: 502 });
    }

    const tikwmData = await tikwmRes.json() as { code?: number; data?: { music?: string } };

    if (tikwmData.code !== 0 || !tikwmData.data?.music) {
      await service.updateStatus(id, "failed");
      return NextResponse.json({ error: "music_url_unavailable" }, { status: 502 });
    }

    // Fetch audio bytes
    const audioRes = await fetch(tikwmData.data.music, { signal: AbortSignal.timeout(30000) });
    if (!audioRes.ok) {
      await service.updateStatus(id, "failed");
      return NextResponse.json({ error: "audio_fetch_failed" }, { status: 502 });
    }

    const audioBuffer = await audioRes.arrayBuffer();

    // Check size limit (25 MB Whisper limit)
    if (audioBuffer.byteLength > 25 * 1024 * 1024) {
      await service.updateStatus(id, "failed");
      return NextResponse.json({ error: "audio_too_large" }, { status: 413 });
    }

    // Get OpenAI key
    const openaiKey = await getUserApiKey(userId, "openai");

    // Send to Whisper
    const formData = new FormData();
    formData.append(
      "file",
      new Blob([audioBuffer], { type: "audio/mpeg" }),
      "audio.mp3",
    );
    formData.append("model", "whisper-1");
    formData.append("language", "vi");

    const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}` },
      body: formData,
      signal: AbortSignal.timeout(60000),
    });

    if (!whisperRes.ok) {
      await service.updateStatus(id, "failed");
      const errBody = await whisperRes.json().catch(() => ({})) as { error?: { message?: string } };
      console.error("[transcripts/run] Whisper error:", errBody);
      return NextResponse.json({ error: "whisper_failed" }, { status: 502 });
    }

    const whisperData = await whisperRes.json() as { text?: string };
    const rawText = whisperData.text ?? "";

    const updated = await service.saveRawText(id, rawText);
    return NextResponse.json({ transcript: updated });
  } catch (e) {
    return handleApiError(e);
  }
}
```

- [ ] **Step 4: TypeScript check**

```
npx tsc --noEmit
```

Expected: 0 errors.

---

## Task 6: ScriptService

**Files:**
- Create: `src/services/scriptService.ts`

- [ ] **Step 1: Create the service**

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import type { BrandScript } from "@/features/video/types";

export class ScriptService {
  constructor(private readonly supabase: SupabaseClient) {}

  async listByTranscript(transcriptId: string): Promise<BrandScript[]> {
    const { data, error } = await this.supabase
      .from("brand_scripts")
      .select("*")
      .eq("transcript_id", transcriptId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []) as BrandScript[];
  }

  async create(
    transcriptId: string,
    brandId: string,
    rawText: string,
    promptConfig: BrandScript["prompt_config"],
    llmModel: string,
  ): Promise<BrandScript> {
    const { data, error } = await this.supabase
      .from("brand_scripts")
      .insert({
        transcript_id: transcriptId,
        brand_id: brandId,
        raw_text: rawText,
        prompt_config: promptConfig,
        llm_model: llmModel,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as BrandScript;
  }

  async saveFinalText(id: string, finalText: string): Promise<BrandScript> {
    const { data, error } = await this.supabase
      .from("brand_scripts")
      .update({ final_text: finalText })
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as BrandScript;
  }
}
```

- [ ] **Step 2: TypeScript check**

```
npx tsc --noEmit
```

Expected: 0 errors.

---

## Task 7: Script API Routes (SSE)

**Files:**
- Create: `src/app/api/video/scripts/route.ts`
- Create: `src/app/api/video/scripts/[id]/route.ts`

- [ ] **Step 1: Create `POST /api/video/scripts` (SSE)**

`src/app/api/video/scripts/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser, handleApiError } from "@/lib/user-context";
import { TranscriptService } from "@/services/transcriptService";
import { ScriptService } from "@/services/scriptService";
import { claudeStreamGenerate, CLAUDE_SONNET_MODEL } from "@/services/claudeClient";
import type { CreateScriptRequest } from "@/features/video/types";

function createSSEWriter(controller: ReadableStreamDefaultController<Uint8Array>) {
  const enc = new TextEncoder();
  return function send(event: string, data: unknown) {
    try {
      controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
    } catch {
      // client disconnected
    }
  };
}

async function buildSystemPrompt(
  supabase: Awaited<ReturnType<typeof createClient>>,
  brandId: string,
  productId: string | null,
  tone: string,
  notes: string,
): Promise<string> {
  const { data: brand } = await supabase
    .from("brands")
    .select("name, description")
    .eq("id", brandId)
    .single();

  let productContext = "";
  if (productId) {
    const { data: product } = await supabase
      .from("brand_products")
      .select("name, description")
      .eq("id", productId)
      .single();
    if (product) {
      productContext = `\nSản phẩm: ${product.name}\nMô tả sản phẩm: ${product.description ?? ""}`;
    }
  }

  const toneMap: Record<string, string> = {
    humor: "Hài hước, gần gũi, vui vẻ",
    authentic: "Chân thực, tự nhiên, tin cậy",
    dramatic: "Kịch tính, mạnh mẽ, ấn tượng",
  };

  return `Bạn là copywriter TikTok chuyên nghiệp cho thương hiệu ${brand?.name ?? "thương hiệu"}.
Mô tả thương hiệu: ${brand?.description ?? ""}${productContext}
Giọng điệu: ${toneMap[tone] ?? tone}
${notes ? `Ghi chú: ${notes}` : ""}

Nhiệm vụ: Chuyển đổi transcript TikTok sau thành kịch bản thương hiệu hấp dẫn.
- Giữ năng lượng và cấu trúc của bản gốc
- Thay thế bằng thông điệp thương hiệu ${brand?.name ?? ""}
- Ngôn ngữ tự nhiên, phù hợp TikTok tiếng Việt
- Không quá 300 chữ
- Chỉ trả về kịch bản, không giải thích thêm`;
}

export async function POST(request: NextRequest): Promise<Response> {
  let userId: string;
  try {
    ({ userId } = await requireUser(request));
  } catch (e) {
    return handleApiError(e);
  }

  let body: CreateScriptRequest;
  try {
    body = (await request.json()) as CreateScriptRequest;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (!body.transcriptId || !body.brandId) {
    return NextResponse.json({ error: "transcriptId and brandId required" }, { status: 400 });
  }

  const supabase = await createClient();
  const transcriptService = new TranscriptService(supabase);
  const scriptService = new ScriptService(supabase);

  const transcript = await transcriptService.getById(body.transcriptId);
  if (!transcript) {
    return NextResponse.json({ error: "transcript_not_found" }, { status: 404 });
  }

  const activeText = transcript.edited_text ?? transcript.raw_text ?? "";
  if (!activeText.trim()) {
    return NextResponse.json({ error: "transcript_empty" }, { status: 400 });
  }

  const systemPrompt = await buildSystemPrompt(
    supabase,
    body.brandId,
    body.productId,
    body.promptConfig.tone,
    body.promptConfig.notes,
  );
  const userMessage = `Transcript gốc:\n${activeText}`;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = createSSEWriter(controller);

      try {
        let fullText = "";
        await claudeStreamGenerate(
          userId,
          systemPrompt,
          userMessage,
          (text) => {
            fullText += text;
            send("token", { text });
          },
        );

        const script = await scriptService.create(
          body.transcriptId,
          body.brandId,
          fullText,
          { tone: body.promptConfig.tone, notes: body.promptConfig.notes, productId: body.productId },
          CLAUDE_SONNET_MODEL,
        );

        send("done", { scriptId: script.id, rawText: fullText });
      } catch (err) {
        const message = err instanceof Error ? err.message : "generation_failed";
        console.error("[scripts] SSE error:", message);
        send("error", { message });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
```

- [ ] **Step 2: Create `PATCH /api/video/scripts/[id]`**

`src/app/api/video/scripts/[id]/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser, handleApiError } from "@/lib/user-context";
import { ScriptService } from "@/services/scriptService";
import type { PatchScriptRequest } from "@/features/video/types";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireUser(request);
    const { id } = await params;
    const body = (await request.json()) as PatchScriptRequest;

    if (typeof body.finalText !== "string") {
      return NextResponse.json({ error: "finalText is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const service = new ScriptService(supabase);
    const script = await service.saveFinalText(id, body.finalText);
    return NextResponse.json({ script });
  } catch (e) {
    return handleApiError(e);
  }
}
```

- [ ] **Step 3: TypeScript check**

```
npx tsc --noEmit
```

Expected: 0 errors.

---

## Task 8: TanStack Query Hooks

**Files:**
- Create: `src/hooks/api/useTranscripts.ts`
- Create: `src/hooks/api/useScripts.ts`

- [ ] **Step 1: Create `useTranscripts.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query/keys";
import type { Transcript, TranscriptResponse, CreateTranscriptResponse } from "@/features/video/types";

export function useTranscript(videoId: string | null) {
  return useQuery({
    queryKey: queryKeys.transcripts.detail(videoId!),
    queryFn: () =>
      apiFetch<{ transcript: Transcript | null }>(`/api/video/transcripts?videoId=${videoId}`),
    enabled: !!videoId,
    select: (d) => d.transcript,
    refetchInterval: (query) => {
      const status = query.state.data?.transcript?.whisper_status;
      if (status === "processing" || status === "pending") return 3000;
      return false;
    },
  });
}
```

Wait — the transcript GET endpoint is `GET /api/video/transcripts/[id]` (by transcript ID), not by videoId. For the pipeline detail page, we first need to call `POST /api/video/transcripts` to create/get the transcript for a video, then poll by transcript ID.

Let me revise:

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query/keys";
import type { Transcript, TranscriptResponse, CreateTranscriptResponse } from "@/features/video/types";

// Poll transcript status by transcript ID
export function useTranscriptStatus(transcriptId: string | null) {
  return useQuery({
    queryKey: queryKeys.transcripts.detail(transcriptId!),
    queryFn: () =>
      apiFetch<TranscriptResponse>(`/api/video/transcripts/${transcriptId}`),
    enabled: !!transcriptId,
    select: (d) => d.transcript,
    refetchInterval: (query) => {
      const status = query.state.data?.transcript?.whisper_status;
      if (status === "processing" || status === "pending") return 3000;
      return false;
    },
  });
}

export function useCreateTranscript() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (videoId: string) =>
      apiFetch<CreateTranscriptResponse>("/api/video/transcripts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ videoId }),
      }),
    onSuccess: (data) => {
      qc.setQueryData(
        queryKeys.transcripts.detail(data.transcript.id),
        { transcript: data.transcript },
      );
    },
  });
}

export function useRunTranscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (transcriptId: string) =>
      apiFetch<TranscriptResponse>(`/api/video/transcripts/${transcriptId}/run`, {
        method: "POST",
      }),
    onSuccess: (data) => {
      qc.setQueryData(
        queryKeys.transcripts.detail(data.transcript.id),
        { transcript: data.transcript },
      );
    },
  });
}

export function usePatchTranscript() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ transcriptId, editedText }: { transcriptId: string; editedText: string }) =>
      apiFetch<TranscriptResponse>(`/api/video/transcripts/${transcriptId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ editedText }),
      }),
    onSuccess: (data) => {
      qc.setQueryData(
        queryKeys.transcripts.detail(data.transcript.id),
        { transcript: data.transcript },
      );
    },
  });
}
```

Write the above as `src/hooks/api/useTranscripts.ts`.

- [ ] **Step 2: Create `useScripts.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query/keys";
import type { BrandScript, PatchScriptResponse } from "@/features/video/types";

export function useScripts(transcriptId: string | null) {
  return useQuery({
    queryKey: queryKeys.scripts.list(transcriptId!),
    queryFn: () =>
      apiFetch<{ scripts: BrandScript[] }>(
        `/api/video/scripts?transcriptId=${transcriptId}`,
      ),
    enabled: !!transcriptId,
    select: (d) => d.scripts,
  });
}

export function usePatchScript() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      scriptId,
      finalText,
    }: {
      scriptId: string;
      finalText: string;
      transcriptId: string;
    }) =>
      apiFetch<PatchScriptResponse>(`/api/video/scripts/${scriptId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ finalText }),
      }),
    onSuccess: (_data, { transcriptId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.scripts.list(transcriptId) });
    },
  });
}
```

Write the above as `src/hooks/api/useScripts.ts`.

Also add `GET /api/video/scripts?transcriptId=` route — update `src/app/api/video/scripts/route.ts` to add a GET handler before the POST:

```typescript
export async function GET(request: NextRequest) {
  try {
    await requireUser(request);
    const { searchParams } = new URL(request.url);
    const transcriptId = searchParams.get("transcriptId");

    if (!transcriptId) {
      return NextResponse.json({ error: "transcriptId is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const service = new ScriptService(supabase);
    const scripts = await service.listByTranscript(transcriptId);
    return NextResponse.json({ scripts });
  } catch (e) {
    return handleApiError(e);
  }
}
```

- [ ] **Step 3: TypeScript check**

```
npx tsc --noEmit
```

Expected: 0 errors.

---

## Task 9: TranscriptEditor Component

**Files:**
- Create: `src/features/video/components/TranscriptEditor.tsx`

- [ ] **Step 1: Create the component**

```typescript
// Client Component: editable transcript with status badge, save, and re-transcribe actions
"use client";

import { useState, useEffect } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { useT } from "@/lib/i18n/useTranslation";
import { useRunTranscription, usePatchTranscript } from "@/hooks/api/useTranscripts";
import type { Transcript } from "@/features/video/types";

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-400",
  processing: "bg-blue-500/15 text-blue-400",
  done: "bg-green-500/15 text-green-400",
  failed: "bg-red-500/15 text-red-400",
};

interface TranscriptEditorProps {
  transcript: Transcript | null;
  onCreateTranscript: () => Promise<void>;
  isCreating: boolean;
}

export function TranscriptEditor({
  transcript,
  onCreateTranscript,
  isCreating,
}: TranscriptEditorProps) {
  const { t } = useT();
  const runTranscription = useRunTranscription();
  const patchTranscript = usePatchTranscript();

  const displayText = transcript?.edited_text ?? transcript?.raw_text ?? "";
  const [editedText, setEditedText] = useState(displayText);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setEditedText(transcript?.edited_text ?? transcript?.raw_text ?? "");
    setSaved(false);
  }, [transcript?.edited_text, transcript?.raw_text]);

  const statusLabel: Record<string, string> = {
    pending: t.video.transcriptPending,
    processing: t.video.transcriptProcessing,
    done: t.video.transcriptDone,
    failed: t.video.transcriptFailed,
  };

  async function handleRun() {
    if (!transcript) {
      await onCreateTranscript();
      return;
    }
    await runTranscription.mutateAsync(transcript.id);
  }

  async function handleSave() {
    if (!transcript) return;
    await patchTranscript.mutateAsync({ transcriptId: transcript.id, editedText });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const isRunning = isCreating || runTranscription.isPending;
  const isProcessing = transcript?.whisper_status === "processing";
  const isSaving = patchTranscript.isPending;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {transcript && (
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_BADGE[transcript.whisper_status]}`}>
              {statusLabel[transcript.whisper_status]}
            </span>
          )}
          {isProcessing && <Loader2 className="h-4 w-4 animate-spin text-blue-400" />}
        </div>
        <div className="flex gap-2">
          {transcript?.whisper_status === "done" && (
            <button
              type="button"
              onClick={() => void handleRun()}
              disabled={isRunning}
              className="flex items-center gap-1.5 rounded-lg border border-border/40 px-3 py-1.5 text-xs text-foreground-muted hover:bg-white/[0.04] disabled:opacity-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {t.video.retranscribe}
            </button>
          )}
          {(!transcript || transcript.whisper_status === "failed") && (
            <button
              type="button"
              onClick={() => void handleRun()}
              disabled={isRunning || isProcessing}
              className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 disabled:opacity-50"
            >
              {isRunning && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {t.video.startTranscription}
            </button>
          )}
        </div>
      </div>

      <textarea
        value={editedText}
        onChange={(e) => { setEditedText(e.target.value); setSaved(false); }}
        disabled={!transcript || transcript.whisper_status !== "done"}
        placeholder={t.video.transcriptPlaceholder}
        className="h-36 w-full resize-none rounded-xl border border-border/40 bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
      />

      {transcript?.whisper_status === "done" && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSaving || editedText === displayText}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-violet-500 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? t.video.savedTranscript : t.video.saveTranscript}
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: TypeScript check**

```
npx tsc --noEmit
```

Expected: 0 errors.

---

## Task 10: ScriptEditor Component

**Files:**
- Create: `src/features/video/components/ScriptEditor.tsx`

- [ ] **Step 1: Create the component**

```typescript
// Client Component: SSE script generation with streaming textarea + save action
"use client";

import { useState, useRef } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { useT } from "@/lib/i18n/useTranslation";
import { usePatchScript } from "@/hooks/api/useScripts";
import type { BrandScript, CreateScriptRequest } from "@/features/video/types";

interface ProductOption {
  id: string;
  name: string;
}

interface ScriptEditorProps {
  transcriptId: string | null;
  brandId: string;
  products: ProductOption[];
  latestScript: BrandScript | null;
  onScriptCreated: (scriptId: string) => void;
}

const TONE_OPTIONS = ["humor", "authentic", "dramatic"] as const;
type Tone = (typeof TONE_OPTIONS)[number];

export function ScriptEditor({
  transcriptId,
  brandId,
  products,
  latestScript,
  onScriptCreated,
}: ScriptEditorProps) {
  const { t } = useT();
  const patchScript = usePatchScript();
  const abortRef = useRef<AbortController | null>(null);

  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [tone, setTone] = useState<Tone>("authentic");
  const [notes, setNotes] = useState("");
  const [streamedText, setStreamedText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [savedScriptId, setSavedScriptId] = useState<string | null>(latestScript?.id ?? null);
  const [editedFinalText, setEditedFinalText] = useState(latestScript?.final_text ?? "");
  const [saved, setSaved] = useState(false);

  const toneLabels: Record<Tone, string> = {
    humor: t.video.toneHumor,
    authentic: t.video.toneAuthentic,
    dramatic: t.video.toneDramatic,
  };

  async function handleGenerate() {
    if (!transcriptId) return;
    setStreamError(null);
    setStreamedText("");
    setIsGenerating(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const payload: CreateScriptRequest = {
      transcriptId,
      brandId,
      productId: selectedProductId,
      promptConfig: { tone, notes },
    };

    try {
      const res = await fetch("/api/video/scripts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) {
        setStreamError(t.video.scriptStreamError);
        return;
      }

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += dec.decode(value, { stream: true });

        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const lines = part.split("\n");
          const eventLine = lines.find((l) => l.startsWith("event:"));
          const dataLine = lines.find((l) => l.startsWith("data:"));
          if (!eventLine || !dataLine) continue;

          const event = eventLine.slice("event:".length).trim();
          const data = JSON.parse(dataLine.slice("data:".length).trim()) as Record<string, unknown>;

          if (event === "token" && typeof data.text === "string") {
            setStreamedText((prev) => prev + data.text);
          } else if (event === "done" && typeof data.scriptId === "string") {
            setSavedScriptId(data.scriptId);
            onScriptCreated(data.scriptId);
            setEditedFinalText(typeof data.rawText === "string" ? data.rawText : "");
          } else if (event === "error") {
            setStreamError(t.video.scriptStreamError);
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setStreamError(t.video.scriptStreamError);
      }
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSave() {
    if (!savedScriptId) return;
    await patchScript.mutateAsync({
      scriptId: savedScriptId,
      finalText: editedFinalText,
      transcriptId: transcriptId ?? "",
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const displayText = isGenerating ? streamedText : editedFinalText;
  const isSaving = patchScript.isPending;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground-muted">
            {t.video.selectProduct}
          </label>
          <select
            value={selectedProductId ?? ""}
            onChange={(e) => setSelectedProductId(e.target.value || null)}
            className="w-full rounded-lg border border-border/40 bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          >
            <option value="">{t.video.noProduct}</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-foreground-muted">
            {t.video.tone}
          </label>
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value as Tone)}
            className="w-full rounded-lg border border-border/40 bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          >
            {TONE_OPTIONS.map((t_) => (
              <option key={t_} value={t_}>{toneLabels[t_]}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-foreground-muted">
            {t.video.scriptNotes}
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-lg border border-border/40 bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground-subtle focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => void handleGenerate()}
        disabled={!transcriptId || isGenerating}
        className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 hover:bg-violet-500 disabled:opacity-50"
      >
        {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {isGenerating ? t.video.generatingScript : t.video.generateScript}
      </button>

      {!transcriptId && (
        <p className="text-xs text-foreground-muted">{t.video.noTranscriptForScript}</p>
      )}

      {streamError && <p className="text-xs text-danger">{streamError}</p>}

      <textarea
        value={displayText}
        onChange={(e) => { if (!isGenerating) setEditedFinalText(e.target.value); setSaved(false); }}
        disabled={isGenerating}
        placeholder={t.video.scriptPlaceholder}
        className="h-48 w-full resize-none rounded-xl border border-border/40 bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-40"
      />

      {savedScriptId && !isGenerating && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSaving}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-violet-500 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? t.video.savedScript : t.video.saveScript}
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: TypeScript check**

```
npx tsc --noEmit
```

Expected: 0 errors.

---

## Task 11: Pipeline Detail Page `/app/video/[id]`

**Files:**
- Modify: `src/app/app/video/[id]/page.tsx`

- [ ] **Step 1: Replace placeholder with full pipeline**

```typescript
// Client Component: pipeline detail uses state for transcript init, SSE script generation
"use client";

import { use, useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useT } from "@/lib/i18n/useTranslation";
import { useApp } from "@/features/app/context";
import { VideoPlayer } from "@/features/video/components/VideoPlayer";
import { TranscriptEditor } from "@/features/video/components/TranscriptEditor";
import { ScriptEditor } from "@/features/video/components/ScriptEditor";
import {
  useCreateTranscript,
  useTranscriptStatus,
} from "@/hooks/api/useTranscripts";
import { useScripts } from "@/hooks/api/useScripts";
import { apiFetch } from "@/lib/api";
import type { CompetitorVideo } from "@/features/video/types";

interface VideoDetailPageProps {
  params: Promise<{ id: string }>;
}

interface ProductOption {
  id: string;
  name: string;
}

export default function VideoDetailPage({ params }: VideoDetailPageProps) {
  const { id } = use(params);
  const { t } = useT();
  const { selectedBrandId } = useApp();

  const [video, setVideo] = useState<CompetitorVideo | null>(null);
  const [loadingVideo, setLoadingVideo] = useState(true);
  const [transcriptId, setTranscriptId] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [savedScriptId, setSavedScriptId] = useState<string | null>(null);

  const createTranscript = useCreateTranscript();
  const { data: transcript } = useTranscriptStatus(transcriptId);
  const { data: scripts = [] } = useScripts(transcriptId);
  const latestScript = scripts[0] ?? null;

  // Load video details
  useEffect(() => {
    setLoadingVideo(true);
    apiFetch<{ videos: CompetitorVideo[] }>(
      `/api/video/competitors?brandId=${selectedBrandId ?? ""}`,
    )
      .then((data) => {
        const found = data.videos.find((v) => v.id === id) ?? null;
        setVideo(found);
      })
      .catch(() => setVideo(null))
      .finally(() => setLoadingVideo(false));
  }, [id, selectedBrandId]);

  // Load products for script editor
  useEffect(() => {
    if (!selectedBrandId) return;
    apiFetch<{ products: ProductOption[] }>(
      `/api/brand-products?brandId=${selectedBrandId}`,
    )
      .then((data) => setProducts(data.products))
      .catch(() => setProducts([]));
  }, [selectedBrandId]);

  // Check for existing transcript on load
  useEffect(() => {
    if (!id) return;
    apiFetch<{ transcript: { id: string } | null }>(
      `/api/video/transcripts?videoId=${id}`,
    )
      .then((d) => {
        if (d.transcript) setTranscriptId(d.transcript.id);
      })
      .catch(() => null);
  }, [id]);

  async function handleCreateTranscript() {
    const data = await createTranscript.mutateAsync(id);
    setTranscriptId(data.transcript.id);
  }

  if (loadingVideo) {
    return (
      <DashboardLayout activePath="/app/video">
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-sm text-foreground-muted">{t.video.loadingVideo}</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!video) {
    return (
      <DashboardLayout activePath="/app/video">
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-sm text-foreground-muted">{t.video.videoDetailNotFound}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activePath="/app/video">
      <div className="mx-auto max-w-3xl px-6 py-8">
        {/* Video player */}
        <div className="mb-6 max-w-xs">
          <VideoPlayer
            videoId={video.video_id}
            tiktokUrl={video.tiktok_url}
            fetchCdnPath={`/api/video/competitors/${video.id}/fetch-cdn`}
          />
        </div>
        <p className="mb-8 text-sm text-foreground-muted">
          {video.author_handle && `@${video.author_handle} · `}
          {video.views != null && `${video.views.toLocaleString()} ${t.video.views} · `}
          {video.scraped_at && new Date(video.scraped_at).toLocaleDateString("vi-VN")}
        </p>

        {/* Stage 3: Transcript */}
        <section className="mb-8 rounded-2xl border border-border-strong/20 bg-background-subtle p-6">
          <h2 className="mb-4 text-base font-semibold text-foreground">
            {t.video.stage3Title}
          </h2>
          <TranscriptEditor
            transcript={transcript ?? null}
            onCreateTranscript={handleCreateTranscript}
            isCreating={createTranscript.isPending}
          />
        </section>

        {/* Stage 4: Script Adaptation */}
        <section className="mb-8 rounded-2xl border border-border-strong/20 bg-background-subtle p-6">
          <h2 className="mb-4 text-base font-semibold text-foreground">
            {t.video.stage4Title}
          </h2>
          <ScriptEditor
            transcriptId={
              transcript?.whisper_status === "done" ? transcriptId : null
            }
            brandId={selectedBrandId ?? ""}
            products={products}
            latestScript={latestScript}
            onScriptCreated={setSavedScriptId}
          />
        </section>

        {/* Stage 5: Voice Generation — placeholder, implemented in Phase 5 */}
        <section className="rounded-2xl border border-border-strong/20 bg-background-subtle p-6 opacity-50">
          <h2 className="mb-2 text-base font-semibold text-foreground">
            {t.video.stage5Title}
          </h2>
          <p className="text-sm text-foreground-muted">
            {savedScriptId ? "" : t.video.stage5Placeholder}
          </p>
        </section>
      </div>
    </DashboardLayout>
  );
}
```

- [ ] **Step 2: Add `GET /api/video/transcripts?videoId=` to transcript route**

In `src/app/api/video/transcripts/route.ts`, add a GET handler before POST:

```typescript
export async function GET(request: NextRequest) {
  try {
    await requireUser(request);
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get("videoId");

    if (!videoId) {
      return NextResponse.json({ error: "videoId is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const service = new TranscriptService(supabase);
    const transcript = await service.getByVideoId(videoId);
    return NextResponse.json({ transcript });
  } catch (e) {
    return handleApiError(e);
  }
}
```

- [ ] **Step 3: TypeScript check + build**

```
npx tsc --noEmit
npm run build
```

Expected: 0 TypeScript errors, build succeeds.

---

## Implementation Order

Tasks 1–3 can be done in parallel (setup + types + claude helper).
Task 4 (TranscriptService) depends on Task 2 types.
Task 5 (Transcript API routes) depends on Tasks 3+4.
Task 6 (ScriptService) depends on Task 2 types.
Task 7 (Script API routes) depends on Tasks 3+6.
Tasks 8–10 (hooks + components) can be done in parallel after Tasks 4–7.
Task 11 (page) depends on all previous tasks.
