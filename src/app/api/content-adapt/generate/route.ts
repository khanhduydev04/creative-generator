import { adaptContent } from "@/lib/content-adapter";
import type { ContentAdaptInput, ProductDataForAdapt } from "@/lib/content-adapter";
import { requireUser, handleApiError } from "@/lib/user-context";
import { NextRequest, NextResponse } from "next/server";

// ─── SSE Helper (same pattern as stealth/generate) ───────────────────────────

function createSSEWriter(
  controller: ReadableStreamDefaultController<Uint8Array>,
) {
  const encoder = new TextEncoder();
  return function send(event: string, data: unknown) {
    try {
      controller.enqueue(
        encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
      );
    } catch {
      // Client disconnected — ignore
    }
  };
}

// ─── Request types ───────────────────────────────────────────────────────────

interface AdaptItem {
  adImageUrl: string;
  sampleContent: string;
  identifier: string;
  label: string;
}

interface AdaptRequest {
  items: AdaptItem[];
  productData: ProductDataForAdapt;
  language: string;
  mode: "text-only" | "vision";
}

// ─── Route ───────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<Response> {
  let body: AdaptRequest;
  try {
    body = (await request.json()) as AdaptRequest;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 },
    );
  }

  if (!body.items?.length) {
    return NextResponse.json(
      { success: false, error: "No items provided" },
      { status: 400 },
    );
  }

  if (!body.productData?.brandName || !body.productData?.productName) {
    return NextResponse.json(
      { success: false, error: "Product data (brandName, productName) is required" },
      { status: 400 },
    );
  }

  // Authenticate before starting the stream
  let userId: string;
  try {
    ({ userId } = await requireUser(request));
  } catch (e) {
    return handleApiError(e);
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = createSSEWriter(controller);
      const total = body.items.length;
      let completed = 0;
      let failed = 0;

      send("meta", { total });

      // Process sequentially to respect Claude rate limits
      for (let i = 0; i < total; i++) {
        const item = body.items[i];
        send("step", {
          index: i,
          status: "running",
          message: `Adapting content ${i + 1}/${total}: "${item.label}"...`,
        });

        try {
          const input: ContentAdaptInput = {
            adImageUrl: body.mode === "vision" ? item.adImageUrl : undefined,
            sampleContent: item.sampleContent,
            productData: body.productData,
            language: body.language || "English",
            mode: body.mode,
          };

          const result = await adaptContent(userId, input);
          completed++;

          send("result", {
            index: i,
            identifier: item.identifier,
            label: item.label,
            adaptedContent: result,
          });

          send("step", {
            index: i,
            status: "completed",
            message: `Adapted "${item.label}"`,
          });
        } catch (err) {
          failed++;
          const message =
            err instanceof Error ? err.message : "Unknown error";
          console.error(
            `[content-adapt/generate] Failed for "${item.label}":`,
            message,
          );

          send("error", {
            index: i,
            identifier: item.identifier,
            error: message,
          });

          send("step", {
            index: i,
            status: "failed",
            message: `Failed: ${message}`,
          });
        }
      }

      send("done", { total: completed, failed });
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
