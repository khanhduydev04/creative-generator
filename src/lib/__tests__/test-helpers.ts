import { createAdminClient } from "@/lib/supabase/admin";

export async function setupTestUser(opts: { email?: string } = {}): Promise<{ userId: string; email: string }> {
  const admin = createAdminClient();
  const email =
    opts.email ??
    `test-${Date.now()}-${Math.random().toString(36).slice(2)}@ladospice-test.com`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: "Test1234!",
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(`setupTestUser failed: ${error?.message}`);
  return { userId: data.user.id, email };
}

export async function teardownTestUser(userId: string): Promise<void> {
  const admin = createAdminClient();
  await admin.auth.admin.deleteUser(userId);
}

export async function setupTwoIsolatedUsers(): Promise<
  readonly [{ userId: string; email: string }, { userId: string; email: string }]
> {
  const a = await setupTestUser();
  const b = await setupTestUser();
  return [a, b] as const;
}
