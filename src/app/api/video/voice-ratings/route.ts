import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser, handleApiError } from "@/lib/user-context";

export async function GET(request: NextRequest) {
  try {
    await requireUser(request);
    const brandId = new URL(request.url).searchParams.get("brandId");

    if (!brandId) {
      return NextResponse.json({ error: "brandId is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("voice_ratings")
      .select("vbee_voice_code, score")
      .eq("brand_id", brandId);

    if (error) throw new Error(error.message);

    const map = new Map<string, { sum: number; count: number }>();
    for (const row of data ?? []) {
      const existing = map.get(row.vbee_voice_code) ?? { sum: 0, count: 0 };
      map.set(row.vbee_voice_code, { sum: existing.sum + row.score, count: existing.count + 1 });
    }

    const ratings = [...map.entries()].map(([code, { sum, count }]) => ({
      vbee_voice_code: code,
      avg_score: sum / count,
      count,
    }));

    return NextResponse.json({ ratings });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireUser(request);
    // Safe: request.json() returns the parsed POST body
    const body = (await request.json()) as {
      brandId?: string;
      voiceCode?: string;
      score?: number;
      note?: string;
    };

    if (!body.brandId || !body.voiceCode || typeof body.score !== "number") {
      return NextResponse.json({ error: "brandId, voiceCode, score are required" }, { status: 400 });
    }

    if (body.score < 1 || body.score > 5) {
      return NextResponse.json({ error: "score must be 1-5" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("voice_ratings")
      .insert({
        brand_id: body.brandId,
        vbee_voice_code: body.voiceCode,
        score: body.score,
        note: body.note ?? null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ rating: data }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
