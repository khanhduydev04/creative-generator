import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser, handleApiError } from "@/lib/user-context";
import { VoicePresetService } from "@/services/voicePresetService";

export async function GET(request: NextRequest) {
  try {
    await requireUser(request);
    const brandId = new URL(request.url).searchParams.get("brandId");

    if (!brandId) {
      return NextResponse.json({ error: "brandId is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const service = new VoicePresetService(supabase);
    const presets = await service.list(brandId);
    return NextResponse.json({ presets });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireUser(request);
    // Safe: request.json() returns the parsed POST body
    const body = await request.json() as {
      brandId?: string;
      displayName?: string;
      voiceCode?: string;
      speed?: number;
      pitch?: number;
      pauseConfig?: Record<string, unknown> | null;
      isDefault?: boolean;
    };

    if (!body.brandId || !body.displayName || !body.voiceCode) {
      return NextResponse.json(
        { error: "brandId, displayName, voiceCode are required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const service = new VoicePresetService(supabase);
    const preset = await service.create({
      brandId: body.brandId,
      displayName: body.displayName,
      voiceCode: body.voiceCode,
      speed: body.speed ?? 1.0,
      pitch: body.pitch ?? 1.0,
      pauseConfig: body.pauseConfig ?? null,
      isDefault: body.isDefault ?? false,
    });

    return NextResponse.json({ preset }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
