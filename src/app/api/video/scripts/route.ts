import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser, handleApiError } from "@/lib/user-context";
import { ScriptService } from "@/services/scriptService";
import { TranscriptService } from "@/services/transcriptService";
import { claudeStreamGenerate, CLAUDE_SONNET_MODEL } from "@/services/claudeClient";
import type { CreateScriptRequest } from "@/features/video/types";

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_SCRIPT_WORDS = 300;

const TONE_MAP: Record<string, string> = {
  humor: "Hài hước, gần gũi, vui vẻ",
  authentic: "Chân thực, tự nhiên, tin cậy",
  dramatic: "Kịch tính, mạnh mẽ, ấn tượng",
};

// ─── SSE Helper ──────────────────────────────────────────────────────────────

function createSSEWriter(controller: ReadableStreamDefaultController<Uint8Array>) {
  const encoder = new TextEncoder();
  return function send(event: string, data: unknown) {
    try {
      controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
    } catch {
      // client disconnected
    }
  };
}

// ─── GET — list scripts by transcriptId ──────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
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
  } catch (error) {
    return handleApiError(error);
  }
}

// ─── POST — SSE streaming script generation ───────────────────────────────────

export async function POST(request: NextRequest): Promise<Response> {
  let body: CreateScriptRequest;
  try {
    // Safe: required fields (transcriptId, brandId, promptConfig.tone) are validated in the guard below.
    body = (await request.json()) as CreateScriptRequest;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.transcriptId || !body.brandId) {
    return NextResponse.json({ error: "transcriptId and brandId are required" }, { status: 400 });
  }

  if (!body.promptConfig?.tone) {
    return NextResponse.json({ error: "promptConfig.tone is required" }, { status: 400 });
  }

  let userId: string;
  try {
    ({ userId } = await requireUser(request));
  } catch (error) {
    return handleApiError(error);
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = createSSEWriter(controller);

      try {
        const supabase = await createClient();

        // Fetch transcript text
        const transcriptService = new TranscriptService(supabase);
        const transcript = await transcriptService.getById(body.transcriptId);
        if (!transcript) {
          send("error", { message: "Transcript not found" });
          controller.close();
          return;
        }

        const transcriptText = transcript.edited_text ?? transcript.raw_text;
        if (!transcriptText) {
          send("error", { message: "Transcript has no text" });
          controller.close();
          return;
        }

        // Fetch brand context
        const { data: brand, error: brandError } = await supabase
          .from("brands")
          .select("name, description")
          .eq("id", body.brandId)
          .single();

        if (brandError || !brand) {
          send("error", { message: "Brand not found" });
          controller.close();
          return;
        }

        // Fetch optional product context
        let productLine = "";
        if (body.productId) {
          const { data: product } = await supabase
            .from("brand_products")
            .select("name, description")
            .eq("id", body.productId)
            .single();

          if (product) {
            productLine = `\nProduct: ${product.name} — ${product.description}`;
          }
        }

        // Build system prompt
        const { tone, notes } = body.promptConfig;
        const toneLabel = TONE_MAP[tone] ?? tone;
        const notesLine = notes ? `\nNotes: ${notes}` : "";

        const systemPrompt =
          `You are a TikTok copywriter for brand ${brand.name}.\n` +
          `Brand description: ${brand.description}` +
          productLine +
          `\nTone: ${toneLabel}` +
          notesLine +
          `\n\nTask: Convert the following TikTok transcript into a brand-adapted script.\n` +
          `- Keep the energy and structure of the original\n` +
          `- Replace with brand messaging for ${brand.name}\n` +
          `- Natural Vietnamese language, appropriate for TikTok\n` +
          `- Max ${MAX_SCRIPT_WORDS} words\n` +
          `- Return only the script, no explanation`;

        // Stream generation
        const rawText = await claudeStreamGenerate(
          userId,
          systemPrompt,
          transcriptText,
          (text) => send("token", { text }),
        );

        // Persist to DB
        const scriptService = new ScriptService(supabase);
        const promptConfig = {
          tone,
          notes,
          productId: body.productId,
        };
        const script = await scriptService.create(
          body.transcriptId,
          body.brandId,
          rawText,
          promptConfig,
          CLAUDE_SONNET_MODEL,
        );

        send("done", { scriptId: script.id, rawText });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("[api/video/scripts POST]", error);
        send("error", { message });
      } finally {
        controller.close();
      }
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
