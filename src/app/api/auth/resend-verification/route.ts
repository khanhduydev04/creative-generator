import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleApiError, ApiError } from "@/lib/user-context";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ResendBody = {
  email?: string;
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json().catch(() => null) as ResendBody | null;
    if (!body?.email || !EMAIL_RE.test(body.email)) {
      throw new ApiError(400, "validation", { issues: ["invalid email"] });
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.resend({ type: "signup", email: body.email });
    if (error) throw new ApiError(400, "resend_failed", { message: error.message });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
