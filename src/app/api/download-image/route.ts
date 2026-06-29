import { NextRequest, NextResponse } from "next/server";
import { requireUser, handleApiError, ApiError } from "@/lib/user-context";
import { assertSafeOutboundUrl, UnsafeUrlError } from "@/lib/url-guard";

export async function GET(request: NextRequest) {
  try {
    await requireUser(request);

    const rawUrl = request.nextUrl.searchParams.get("url");
    if (!rawUrl) throw new ApiError(400, "missing_url");

    let safeUrl: URL;
    try {
      safeUrl = assertSafeOutboundUrl(rawUrl);
    } catch (e) {
      if (e instanceof UnsafeUrlError) throw new ApiError(400, "unsafe_url");
      throw e;
    }

    const filename = request.nextUrl.searchParams.get("filename") ?? "image";

    const upstream = await fetch(safeUrl.toString());
    if (!upstream.ok) throw new ApiError(502, "upstream_failed");

    const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";

    // Only serve image content — prevent this endpoint being used as an SSRF
    // relay for arbitrary data (HTML, JSON, credentials, etc.)
    if (!contentType.startsWith("image/")) throw new ApiError(400, "not_an_image");

    const body = await upstream.arrayBuffer();

    // Sanitize filename — only allow safe characters
    const safeFilename = filename.replace(/[^A-Za-z0-9._-]/g, "_");

    return new NextResponse(body, {
      headers: {
        "content-type": contentType,
        "content-disposition": `attachment; filename="${safeFilename}"`,
        "content-length": body.byteLength.toString(),
      },
    });
  } catch (e) {
    return handleApiError(e);
  }
}
