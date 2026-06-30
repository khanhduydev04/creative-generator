import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser, handleApiError } from "@/lib/user-context";
import { ScriptService } from "@/services/scriptService";
import { TranscriptService } from "@/services/transcriptService";
import { claudeStreamGenerate, CLAUDE_SONNET_MODEL } from "@/services/claudeClient";
import { buildScriptSystemPrompt } from "@/services/scriptPrompt";
import type { CreateScriptRequest } from "@/features/video/types";

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
        let productName: string | null = null;
        let productDescription: string | null = null;
        let productAttributes: string | null = null;
        let productTargetAudience: string | null = null;
        let productSellingPoints: string | null = null;
        let productPrice: string | null = null;
        if (body.productId) {
          const { data: product } = await supabase
            .from("brand_products")
            .select("name, description, attributes, target_audience, selling_points, price")
            .eq("id", body.productId)
            .single();

          if (product) {
            productName = product.name;
            productDescription = product.description;
            productAttributes = product.attributes;
            productTargetAudience = product.target_audience;
            productSellingPoints = product.selling_points;
            productPrice = (product.price as string | null) ?? null;
          }
        }

        // Build system prompt
        const { tone, notes, attributes, targetAudience, sellingPoints, ttsProvider, elevenLabsModel } = body.promptConfig;
        const systemPrompt = buildScriptSystemPrompt({
          brandName: brand.name,
          brandDescription: brand.description,
          productName,
          productDescription,
          attributes: attributes ?? productAttributes ?? null,
          targetAudience: targetAudience ?? productTargetAudience ?? null,
          sellingPoints: sellingPoints ?? productSellingPoints ?? null,
          price: productPrice,
          tone,
          notes,
          ttsProvider: ttsProvider ?? "vbee",
          elevenLabsModel: elevenLabsModel ?? null,
        });

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
          attributes: attributes ?? null,
          targetAudience: targetAudience ?? null,
          sellingPoints: sellingPoints ?? null,
        };
        const script = await scriptService.create(
          body.transcriptId,
          body.brandId,
          rawText,
          promptConfig,
          CLAUDE_SONNET_MODEL,
          ttsProvider ?? "vbee",
          elevenLabsModel ?? null,
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
