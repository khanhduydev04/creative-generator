import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { validateEnv } from "../env";

const REQUIRED_VARS = {
  NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "eyJ-test-key",
  GOOGLE_API_KEY: "AIza-test-key",
  KIE_API_KEY: "kie-test-key",
};

describe("validateEnv", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, ...REQUIRED_VARS };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("passes when all required vars are set", () => {
    expect(() => validateEnv()).not.toThrow();
  });

  it("throws when NEXT_PUBLIC_SUPABASE_URL is missing", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    expect(() => validateEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it("throws when NEXT_PUBLIC_SUPABASE_ANON_KEY is missing", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    expect(() => validateEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  });

  it("throws when GOOGLE_API_KEY is missing", () => {
    delete process.env.GOOGLE_API_KEY;
    expect(() => validateEnv()).toThrow(/GOOGLE_API_KEY/);
  });

  it("throws when KIE_API_KEY is missing", () => {
    delete process.env.KIE_API_KEY;
    expect(() => validateEnv()).toThrow(/KIE_API_KEY/);
  });

  it("throws with all missing required vars listed", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.GOOGLE_API_KEY;
    expect(() => validateEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
    try {
      process.env = { ...originalEnv };
      validateEnv();
    } catch (e) {
      expect((e as Error).message).toContain("GOOGLE_API_KEY");
    }
  });

  it("does NOT throw when optional vars are missing", () => {
    delete process.env.GOOGLE_CONSOLE_API_KEY;
    delete process.env.SPREADSHEET_ID;
    expect(() => validateEnv()).not.toThrow();
  });

  it("warns about missing optional vars", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    delete process.env.GOOGLE_CONSOLE_API_KEY;
    validateEnv();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("GOOGLE_CONSOLE_API_KEY"));
    warnSpy.mockRestore();
  });
});
