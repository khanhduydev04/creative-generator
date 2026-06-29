import { NextResponse } from "next/server";

// Google Fonts API key is a platform-level env secret — no auth required for this utility.
const GOOGLE_CONSOLE_API_KEY = process.env.GOOGLE_CONSOLE_API_KEY ?? "";

/**
 * GET /api/google-fonts
 *
 * Proxies the Google Fonts API request server-side so the API key
 * is never exposed to the browser.
 */
export async function GET() {
  const apiKey = GOOGLE_CONSOLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Google API key not configured" },
      { status: 500 },
    );
  }

  try {
    const res = await fetch(
      `https://www.googleapis.com/webfonts/v1/webfonts?key=${apiKey}&sort=popularity`,
      { next: { revalidate: 86400 } }, // Cache for 24 hours
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch Google Fonts" },
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch Google Fonts" },
      { status: 500 },
    );
  }
}
