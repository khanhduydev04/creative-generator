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
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireUser(request);
    const { id } = await params;
    // Safe: request.json() always returns the parsed JSON body from PATCH requests
    const body = await request.json() as { editedText?: string };

    if (typeof body.editedText !== "string") {
      return NextResponse.json({ error: "editedText is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const service = new TranscriptService(supabase);
    const transcript = await service.saveEditedText(id, body.editedText);
    return NextResponse.json({ transcript });
  } catch (error) {
    return handleApiError(error);
  }
}
