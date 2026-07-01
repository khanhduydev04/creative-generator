import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin, isVerifyError } from "@/lib/auth/verify-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidEmail, USER_ROLES, type UserRole } from "@/features/auth/types";

const MIN_PASSWORD_LENGTH = 8;
const PROFILE_COLUMNS = "id, email, full_name, role, department, is_active, created_at, updated_at, created_by, last_login_at";

export async function GET() {
  const admin = await verifyAdmin();
  if (isVerifyError(admin)) return admin;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }

  return NextResponse.json({ users: data });
}

interface CreateUserBody {
  email?: string;
  full_name?: string;
  password?: string;
  role?: string;
  department?: string | null;
}

export async function POST(req: NextRequest) {
  const admin = await verifyAdmin();
  if (isVerifyError(admin)) return admin;

  const body = (await req.json().catch(() => null)) as CreateUserBody | null;
  if (!body) {
    return NextResponse.json({ error: "validation" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  const fullName = body.full_name?.trim() ?? "";
  const password = body.password ?? "";
  const role = body.role as UserRole;
  const department = body.department?.trim() || null;

  const issues: string[] = [];
  if (!isValidEmail(email)) issues.push("invalid_email");
  if (!fullName) issues.push("full_name_required");
  if (password.length < MIN_PASSWORD_LENGTH) issues.push("password_too_short");
  if (!USER_ROLES.includes(role)) issues.push("invalid_role");
  if (issues.length) {
    return NextResponse.json({ error: "validation", issues }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (createError || !created.user) {
    const message = createError?.message ?? "";
    const isDuplicate = /already.*(registered|exists)/i.test(message);
    return NextResponse.json(
      { error: isDuplicate ? "email_taken" : "create_failed", message },
      { status: isDuplicate ? 409 : 500 },
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .update({ role, department, created_by: admin.userId, full_name: fullName })
    .eq("id", created.user.id)
    .select(PROFILE_COLUMNS)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "profile_update_failed" }, { status: 500 });
  }

  await supabase.from("activity_log").insert({
    actor_id: admin.userId,
    action: "create_user",
    target_user_id: created.user.id,
    metadata: { email, role, department },
  });

  return NextResponse.json({ user: profile });
}
