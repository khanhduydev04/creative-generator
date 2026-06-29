import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser, handleApiError } from "@/lib/user-context";
import { GeneratedAudioService } from "@/services/generatedAudioService";
import { StorageService } from "@/services/storageService";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireUser(request);
    const { id } = await params;

    const supabase = await createClient();
    const service = new GeneratedAudioService(supabase);
    const { storagePath } = await service.delete(id);

    if (storagePath) {
      const storage = new StorageService(supabase);
      await storage.remove("generated-audio", [storagePath]).catch((storageError: unknown) => {
        console.warn("[audio/delete] Storage cleanup failed:", storageError);
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
