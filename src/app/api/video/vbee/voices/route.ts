import { NextRequest, NextResponse } from "next/server";
import { requireUser, handleApiError } from "@/lib/user-context";
import { getUserApiKey } from "@/lib/key-provider";
import { VbeeService } from "@/services/vbeeService";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireUser(request);
    const apiKey = await getUserApiKey(userId, "vbee");
    const service = new VbeeService(apiKey);
    const voices = await service.listVoices();
    return NextResponse.json({ voices });
  } catch (error) {
    return handleApiError(error);
  }
}
