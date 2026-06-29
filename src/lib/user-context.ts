import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export class ApiError extends Error {
  constructor(public status: number, public code: string, public details?: unknown) {
    super(code);
  }
}


export async function requireUser(_req: NextRequest): Promise<{ userId: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new ApiError(401, "unauthorized");
  return { userId: user.id };
}

export async function requireAdmin(req: NextRequest): Promise<{ userId: string }> {
  const { userId } = await requireUser(req);
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_platform_admin")
    .eq("id", userId)
    .single();
  if (!profile?.is_platform_admin) throw new ApiError(403, "admin_required");
  return { userId };
}

export function handleApiError(e: unknown): NextResponse {
  if (e instanceof ApiError) {
    return NextResponse.json(
      { error: e.code, ...(e.details ? { details: e.details } : {}) },
      { status: e.status },
    );
  }
  console.error("[api]", e);
  return NextResponse.json({ error: "internal" }, { status: 500 });
}
