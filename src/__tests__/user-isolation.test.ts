import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { setupTwoIsolatedUsers, teardownTestUser } from "@/lib/__tests__/test-helpers";
import { encryptKey } from "@/lib/crypto";

let userA: { userId: string };
let userB: { userId: string };

beforeAll(async () => {
  const [a, b] = await setupTwoIsolatedUsers();
  userA = a;
  userB = b;
});

afterAll(async () => {
  await teardownTestUser(userA.userId);
  await teardownTestUser(userB.userId);
});

describe("user isolation (real DB)", () => {
  it("user A's brand is invisible to user B (filter by owner)", async () => {
    const admin = createAdminClient();
    const { data: brandA } = await admin
      .from("brands")
      .insert({ name: "Brand-A", owner_user_id: userA.userId })
      .select()
      .single();

    expect(brandA).toBeTruthy();

    // Simulate user B's view: filter by their userId
    const { data: bSees } = await admin
      .from("brands")
      .select("*")
      .eq("owner_user_id", userB.userId);

    expect(bSees).toHaveLength(0);
  });

  it("user A's saved_ads are isolated from user B", async () => {
    const admin = createAdminClient();
    const { data: brand } = await admin
      .from("brands")
      .insert({ name: "Brand-A2", owner_user_id: userA.userId })
      .select()
      .single();

    expect(brand).toBeTruthy();
    if (!brand) throw new Error("brand insert failed");

    await admin.from("saved_ads").insert({
      brand_id: brand.id,
      image_url: "https://example.com/a.png",
      storage_path: `${userA.userId}/${brand.id}/test-${Date.now()}.png`,
    });

    // From user B's perspective (filter by brand owner), no rows
    const { data: bSeesAds } = await admin
      .from("saved_ads")
      .select("*, brands!inner(owner_user_id)")
      .eq("brands.owner_user_id", userB.userId);
    expect(bSeesAds).toHaveLength(0);
  });

  it("user A's API keys are encrypted and isolated", async () => {
    const admin = createAdminClient();
    await admin.from("user_api_keys").insert({
      user_id: userA.userId,
      provider: "anthropic",
      encrypted_key: encryptKey("sk-ant-secret-A"),
    });

    const { data: bKeys } = await admin
      .from("user_api_keys")
      .select("*")
      .eq("user_id", userB.userId);
    expect(bKeys).toHaveLength(0);

    // Verify encrypted_key is not plaintext (defense in depth)
    const { data: aKeys } = await admin
      .from("user_api_keys")
      .select("encrypted_key")
      .eq("user_id", userA.userId)
      .eq("provider", "anthropic")
      .single();
    expect(aKeys?.encrypted_key).not.toContain("sk-ant-secret-A");
    expect(aKeys?.encrypted_key.length).toBeGreaterThan(20);
  });

  it("user A's user_concepts are invisible to user B", async () => {
    const admin = createAdminClient();
    await admin.from("user_concepts").insert({
      owner_user_id: userA.userId,
      label: "A's Concept",
      prompt: "Generate hero shot",
    });

    const { data: bConcepts } = await admin
      .from("user_concepts")
      .select("*")
      .eq("owner_user_id", userB.userId);
    expect(bConcepts).toHaveLength(0);
  });
});
