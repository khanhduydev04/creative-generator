/**
 * SSRF guard for any URL we are about to fetch server-side from
 * user-controlled input. Blocks non-https, localhost, link-local,
 * IMDS endpoints, and RFC 1918 private ranges.
 *
 * Returns the parsed URL if safe; throws if not.
 */
export class UnsafeUrlError extends Error {
  constructor(public reason: string, public url: string) {
    super(`Unsafe URL rejected (${reason}): ${url}`);
  }
}

// RFC 1918 private ranges, link-local, loopback, and IMDS prefix check
const PRIVATE_IP_PATTERN =
  /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|169\.254\.|0\.0\.0\.0)/;

const BLOCKED_HOSTNAMES = [
  "localhost",
  "0.0.0.0",
  // IPv6 loopback literals
  "[::1]",
  "::1",
  // GCE/GCP instance metadata endpoint
  "metadata.google.internal",
  // Bare "metadata" — also blocks AWS IMDSv1 if accessed via hostname
  "metadata",
];

export function assertSafeOutboundUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new UnsafeUrlError("unparseable", rawUrl);
  }

  // Only allow HTTPS — no HTTP, data:, file:, ftp:, etc.
  if (parsed.protocol !== "https:") {
    throw new UnsafeUrlError("non-https protocol", rawUrl);
  }

  const hostname = parsed.hostname.toLowerCase();

  // Reject known blocked hostnames (exact match)
  if (BLOCKED_HOSTNAMES.includes(hostname)) {
    throw new UnsafeUrlError("blocked hostname", rawUrl);
  }

  // Reject hostnames matching private / reserved IPv4 ranges
  if (PRIVATE_IP_PATTERN.test(hostname)) {
    throw new UnsafeUrlError("private or reserved IP range", rawUrl);
  }

  // Reject *.internal and *.local TLDs
  if (hostname.endsWith(".internal") || hostname.endsWith(".local")) {
    throw new UnsafeUrlError("internal/local TLD", rawUrl);
  }

  // Reject any host that contains ":" — IPv6 literals in URLs look like
  // [2001:db8::1]; the brackets are stripped by URL.hostname, leaving
  // "2001:db8::1". We also catch link-local fe80:: here.
  // Best-effort: reject all IPv6 literals rather than try to classify them.
  if (hostname.includes(":")) {
    throw new UnsafeUrlError("IPv6 literal (blocked for safety)", rawUrl);
  }

  return parsed;
}
