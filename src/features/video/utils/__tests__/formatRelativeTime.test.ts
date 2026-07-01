import { describe, it, expect } from "vitest";
import { formatRelativeTime } from "@/features/video/utils/formatRelativeTime";

describe("formatRelativeTime", () => {
  const now = new Date("2026-07-01T12:00:00.000Z");

  it("returns 'Vừa xong' for under a minute ago", () => {
    const iso = new Date(now.getTime() - 30_000).toISOString();
    expect(formatRelativeTime(iso, now)).toBe("Vừa xong");
  });

  it("returns minutes for under an hour ago", () => {
    const iso = new Date(now.getTime() - 5 * 60_000).toISOString();
    expect(formatRelativeTime(iso, now)).toBe("5 phút trước");
  });

  it("returns hours for under a day ago", () => {
    const iso = new Date(now.getTime() - 3 * 60 * 60_000).toISOString();
    expect(formatRelativeTime(iso, now)).toBe("3 giờ trước");
  });

  it("returns days for under 30 days ago", () => {
    const iso = new Date(now.getTime() - 5 * 24 * 60 * 60_000).toISOString();
    expect(formatRelativeTime(iso, now)).toBe("5 ngày trước");
  });

  it("falls back to an absolute vi-VN date beyond 30 days", () => {
    const iso = new Date(now.getTime() - 40 * 24 * 60 * 60_000).toISOString();
    const expected = new Date(iso).toLocaleDateString("vi-VN");
    expect(formatRelativeTime(iso, now)).toBe(expected);
  });

  it("defaults `now` to the current time when omitted", () => {
    const iso = new Date().toISOString();
    expect(formatRelativeTime(iso)).toBe("Vừa xong");
  });
});
