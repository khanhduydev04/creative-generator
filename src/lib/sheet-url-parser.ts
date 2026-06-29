/**
 * Parse a Google Sheets URL to extract spreadsheetId and gid.
 *
 * Supported formats:
 * - https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit#gid={GID}
 * - https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit?...&gid={GID}
 * - https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/export?format=csv&gid={GID}
 * - https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}
 * - Plain spreadsheet ID string (no URL)
 */
export interface ParsedSheetUrl {
  spreadsheetId: string;
  gid: number | null;
}

export function parseGoogleSheetUrl(url: string): ParsedSheetUrl | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Try to extract spreadsheet ID from URL
  const spreadsheetMatch = trimmed.match(
    /\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/,
  );

  if (spreadsheetMatch) {
    const spreadsheetId = spreadsheetMatch[1];

    // Try to extract gid from hash fragment or query params
    let gid: number | null = null;

    const hashGidMatch = trimmed.match(/#gid=(\d+)/);
    if (hashGidMatch) {
      gid = parseInt(hashGidMatch[1], 10);
    } else {
      const queryGidMatch = trimmed.match(/[?&]gid=(\d+)/);
      if (queryGidMatch) {
        gid = parseInt(queryGidMatch[1], 10);
      }
    }

    return { spreadsheetId, gid };
  }

  // If no URL pattern, check if it's a plain spreadsheet ID (alphanumeric + hyphens/underscores)
  if (/^[a-zA-Z0-9_-]+$/.test(trimmed) && trimmed.length > 10) {
    return { spreadsheetId: trimmed, gid: null };
  }

  return null;
}
