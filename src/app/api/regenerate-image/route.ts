import { requireUser, handleApiError } from "@/lib/user-context";
import type { KieAspectRatio } from "@/services/kieClient";
import { generateImage } from "@/services/kieClient";
import { NextRequest, NextResponse } from "next/server";

// ─── Request / Response Types ─────────────────────────────────────────────────

// Re-run a SINGLE image generation with the exact prompt + image inputs that the
// original streaming generation already prepared. Used by the per-image "Retry"
// button when one image in a batch fails (e.g. content-filtered by KIE).
interface RegenerateImageRequest {
  prompt: string;
  imageInput?: string[];
  aspectRatio?: string;
  resolution?: string;
}

interface RegenerateImageResponse {
  success: boolean;
  imageUrl?: string;
  taskId?: string;
  error?: string;
}

// ─── Main Handler ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { userId } = await requireUser(request);
    const body = (await request.json()) as RegenerateImageRequest;

    if (!body.prompt?.trim()) {
      return NextResponse.json<RegenerateImageResponse>(
        { success: false, error: "Prompt is required" },
        { status: 400 },
      );
    }

    const result = await generateImage(userId, body.prompt, {
      aspectRatio: (body.aspectRatio ?? "1:1") as KieAspectRatio,
      resolution: (body.resolution ?? "1K") as "1K" | "2K" | "4K",
      imageInput:
        body.imageInput && body.imageInput.length > 0
          ? body.imageInput
          : undefined,
    });

    return NextResponse.json<RegenerateImageResponse>({
      success: true,
      imageUrl: result.imageUrl,
      taskId: result.taskId,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[regenerate-image] Error:", message);
    return handleApiError(e);
  }
}
