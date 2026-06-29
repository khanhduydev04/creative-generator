import { describe, it, expect, vi, beforeEach } from "vitest";
import { encryptKey } from "../crypto";
import { getUserApiKey, clearUserKeyCache } from "../key-provider";
import { MissingApiKeyError } from "../user-context";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));
import { createAdminClient } from "@/lib/supabase/admin";

const mockSelect = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  (createAdminClient as any).mockReturnValue({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: mockSelect,
          }),
        }),
      }),
    }),
  });
});

describe("getUserApiKey", () => {
  it("fetches, decrypts, and returns the key", async () => {
    const plaintext = "sk-ant-123";
    mockSelect.mockResolvedValue({ data: { encrypted_key: encryptKey(plaintext) } });
    const result = await getUserApiKey("user-1", "anthropic");
    expect(result).toBe(plaintext);
  });

  it("caches the result for 60s", async () => {
    const plaintext = "sk-google-123";
    mockSelect.mockResolvedValue({ data: { encrypted_key: encryptKey(plaintext) } });

    await getUserApiKey("user-2", "google");
    await getUserApiKey("user-2", "google");
    expect(mockSelect).toHaveBeenCalledTimes(1);
  });

  it("isolates cache per user", async () => {
    mockSelect.mockResolvedValueOnce({ data: { encrypted_key: encryptKey("key-a") } });
    mockSelect.mockResolvedValueOnce({ data: { encrypted_key: encryptKey("key-b") } });

    const ka = await getUserApiKey("user-A", "anthropic");
    const kb = await getUserApiKey("user-B", "anthropic");

    expect(ka).toBe("key-a");
    expect(kb).toBe("key-b");
    expect(mockSelect).toHaveBeenCalledTimes(2);
  });

  it("throws MissingApiKeyError when row not found (PGRST116)", async () => {
    mockSelect.mockResolvedValue({ data: null, error: { code: "PGRST116", message: "no rows" } });
    await expect(getUserApiKey("user-3", "kie")).rejects.toBeInstanceOf(MissingApiKeyError);
  });

  it("re-throws non-PGRST116 DB errors instead of masking as MissingApiKeyError", async () => {
    const dbErr = { code: "PGRST301", message: "JWT expired" };
    mockSelect.mockResolvedValue({ data: null, error: dbErr });
    await expect(getUserApiKey("user-5", "anthropic")).rejects.toMatchObject(dbErr);
  });

  it("clearUserKeyCache wipes entries for a user", async () => {
    mockSelect.mockResolvedValue({ data: { encrypted_key: encryptKey("k") } });
    await getUserApiKey("user-4", "anthropic");
    clearUserKeyCache("user-4");
    await getUserApiKey("user-4", "anthropic");
    expect(mockSelect).toHaveBeenCalledTimes(2);
  });
});
