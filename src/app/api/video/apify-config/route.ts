import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser, handleApiError } from "@/lib/user-context";
import { BrandApifyConfigService } from "@/services/brandApifyConfigService";

interface PutApifyConfigBody {
  brandId?: string;
  apifyTaskId?: string;
  isEnabled?: boolean;
}

export async function GET(request: NextRequest) {
  try {
    await requireUser(request);
    const brandId = new URL(request.url).searchParams.get("brandId");
    if (!brandId) {
      return NextResponse.json({ error: "brandId is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const config = await new BrandApifyConfigService(supabase).getByBrand(brandId);
    return NextResponse.json({ config });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireUser(request);
    const body = (await request.json()) as PutApifyConfigBody;

    if (!body.brandId || !body.apifyTaskId) {
      return NextResponse.json(
        { error: "brandId and apifyTaskId are required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const config = await new BrandApifyConfigService(supabase).upsertConfig(
      body.brandId,
      body.apifyTaskId.trim(),
      body.isEnabled ?? true,
    );
    return NextResponse.json({ config });
  } catch (e) {
    return handleApiError(e);
  }
}
