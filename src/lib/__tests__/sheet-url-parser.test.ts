import { describe, it, expect } from "vitest";
import { parseGoogleSheetUrl } from "../sheet-url-parser";

describe("parseGoogleSheetUrl", () => {
  // ── Valid URL formats ──────────────────────────────────────────────────────

  it("parses standard /edit URL with hash gid", () => {
    const result = parseGoogleSheetUrl(
      "https://docs.google.com/spreadsheets/d/1aBcDeFgHiJkLmNoPqRsTuVwXyZ/edit#gid=123456",
    );
    expect(result).toEqual({
      spreadsheetId: "1aBcDeFgHiJkLmNoPqRsTuVwXyZ",
      gid: 123456,
    });
  });

  it("parses /edit URL with query param gid", () => {
    const result = parseGoogleSheetUrl(
      "https://docs.google.com/spreadsheets/d/1aBcDeFgHiJkLmNoPqRsTuVwXyZ/edit?foo=bar&gid=789",
    );
    expect(result).toEqual({
      spreadsheetId: "1aBcDeFgHiJkLmNoPqRsTuVwXyZ",
      gid: 789,
    });
  });

  it("parses /export URL with gid in query", () => {
    const result = parseGoogleSheetUrl(
      "https://docs.google.com/spreadsheets/d/1aBcDeFgHiJkLmNoPqRsTuVwXyZ/export?format=csv&gid=42",
    );
    expect(result).toEqual({
      spreadsheetId: "1aBcDeFgHiJkLmNoPqRsTuVwXyZ",
      gid: 42,
    });
  });

  it("parses URL without gid", () => {
    const result = parseGoogleSheetUrl(
      "https://docs.google.com/spreadsheets/d/1aBcDeFgHiJkLmNoPqRsTuVwXyZ",
    );
    expect(result).toEqual({
      spreadsheetId: "1aBcDeFgHiJkLmNoPqRsTuVwXyZ",
      gid: null,
    });
  });

  it("parses gid=0 correctly (first sheet)", () => {
    const result = parseGoogleSheetUrl(
      "https://docs.google.com/spreadsheets/d/abc123/edit#gid=0",
    );
    expect(result).toEqual({ spreadsheetId: "abc123", gid: 0 });
  });

  // ── Plain spreadsheet ID ──────────────────────────────────────────────────

  it("accepts plain spreadsheet ID string (> 10 chars)", () => {
    const result = parseGoogleSheetUrl("1aBcDeFgHiJkLmNoPqRsTuVwXyZ");
    expect(result).toEqual({
      spreadsheetId: "1aBcDeFgHiJkLmNoPqRsTuVwXyZ",
      gid: null,
    });
  });

  it("accepts ID with hyphens and underscores", () => {
    const result = parseGoogleSheetUrl("abc-def_ghi-123456");
    expect(result).toEqual({
      spreadsheetId: "abc-def_ghi-123456",
      gid: null,
    });
  });

  // ── Whitespace handling ───────────────────────────────────────────────────

  it("trims leading/trailing whitespace", () => {
    const result = parseGoogleSheetUrl(
      "  https://docs.google.com/spreadsheets/d/abc123def456/edit#gid=1  ",
    );
    expect(result).toEqual({ spreadsheetId: "abc123def456", gid: 1 });
  });

  // ── Invalid inputs ────────────────────────────────────────────────────────

  it("returns null for empty string", () => {
    expect(parseGoogleSheetUrl("")).toBeNull();
  });

  it("returns null for whitespace-only string", () => {
    expect(parseGoogleSheetUrl("   ")).toBeNull();
  });

  it("returns null for random short string", () => {
    expect(parseGoogleSheetUrl("hello")).toBeNull();
  });

  it("returns null for non-Google URL", () => {
    expect(parseGoogleSheetUrl("https://example.com/spreadsheet/abc")).toBeNull();
  });

  it("returns null for Google Docs URL (not Sheets)", () => {
    expect(
      parseGoogleSheetUrl("https://docs.google.com/document/d/abc123def456/edit"),
    ).toBeNull();
  });

  // ── Hash gid takes priority over query gid ────────────────────────────────

  it("prefers hash gid over query gid when both present", () => {
    const result = parseGoogleSheetUrl(
      "https://docs.google.com/spreadsheets/d/abc123def456/edit?gid=100#gid=200",
    );
    expect(result?.gid).toBe(200);
  });

  // ── Boundary: plain ID exactly 10 chars is rejected ───────────────────────

  it("rejects plain ID of exactly 10 chars", () => {
    expect(parseGoogleSheetUrl("abcdefghij")).toBeNull();
  });

  it("accepts plain ID of 11 chars", () => {
    const result = parseGoogleSheetUrl("abcdefghijk");
    expect(result).toEqual({ spreadsheetId: "abcdefghijk", gid: null });
  });
});
