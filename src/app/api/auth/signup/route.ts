import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleApiError, ApiError } from "@/lib/user-context";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

type SignupBody = {
  email?: string;
  password?: string;
  full_name?: string;
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json().catch(() => null) as SignupBody | null;
    if (!body) throw new ApiError(400, "validation");

    const issues: string[] = [];
    if (!body.email || !EMAIL_RE.test(body.email)) issues.push("invalid email");
    if (!body.password || body.password.length < MIN_PASSWORD_LENGTH) {
      issues.push("password must be >=8 chars");
    }
    if (issues.length) throw new ApiError(400, "validation", { issues });

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email: body.email!,
      password: body.password!,
      options: { data: { full_name: body.full_name ?? "" } },
    });

    if (error) {
      throw new ApiError(400, "signup_failed", { message: error.message });
    }

    return NextResponse.json({
      ok: true,
      userId: data.user?.id,
      email: data.user?.email,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
