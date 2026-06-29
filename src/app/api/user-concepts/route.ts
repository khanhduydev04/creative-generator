import { NextRequest, NextResponse } from "next/server";
import { requireUser, handleApiError, ApiError } from "@/lib/user-context";
import { createClient } from "@/lib/supabase/server";
import { UserConceptService } from "@/services/userConceptService";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await requireUser(req);
    const supabase = await createClient();
    const service = new UserConceptService(supabase, userId);
    const concepts = await service.list();
    return NextResponse.json({ concepts });
  } catch (e) {
    return handleApiError(e);
  }
}

interface PostBody {
  label?: string;
  prompt?: string;
  description?: string;
  reference_images?: string[];
  requires_competitor?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireUser(req);
    const body = await req.json().catch(() => null) as PostBody | null;
    if (!body || !body.label?.trim() || !body.prompt?.trim()) {
      throw new ApiError(400, "validation", { issues: ["label and prompt required"] });
    }

    const supabase = await createClient();
    const service = new UserConceptService(supabase, userId);
    const created = await service.create({
      label: body.label.trim(),
      prompt: body.prompt.trim(),
      description: body.description,
      reference_images: body.reference_images,
      requires_competitor: body.requires_competitor,
    });
    return NextResponse.json(created);
  } catch (e) {
    return handleApiError(e);
  }
}
