// Server-only module — fetches competitor ad data from Google Sheets
import { promises as fs } from "fs";
import path from "path";
// Google Console API key is a platform-level env secret — not a per-user BYOK key.
const GOOGLE_CONSOLE_API_KEY = process.env.GOOGLE_CONSOLE_API_KEY ?? "";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CompetitorAdRow {
  rank: number;
  productName: string;
  imageUrl: string | null;
  landingPageUrl: string | null;
  pageName: string;
  durationDays: number;
  wowScore: string;
  caption: string;
}

// ─── Market → Sheet GID mapping ──────────────────────────────────────────────

const MARKET_GID_MAP: Record<string, { gid: number; sheetName: string }> = {
  US: { gid: 380665574, sheetName: "Top 30 Competitors" },
  // Add more markets here as new tabs are created in the spreadsheet
  // UK: { gid: 123456789, sheetName: "UK Competitors" },
};

// ─── Sheets API (primary — extracts hyperlinks) ─────────────────────────────

/**
 * Fetch rows via Google Sheets API v4 with hyperlink extraction.
 * Requires GOOGLE_CONSOLE_API_KEY with Sheets API enabled.
 */
/**
 * Extract the real URL from a Facebook redirect link.
 * e.g. "https://l.facebook.com/l.php?u=https%3A%2F%2Fgetswoly.com%2F..." → "https://getswoly.com/"
 */
function extractRealUrl(url: string | null): string | null {
  if (!url) return null;

  // Facebook redirect: extract the 'u' parameter
  if (url.includes("l.facebook.com/l.php")) {
    try {
      const parsed = new URL(url);
      const realUrl = parsed.searchParams.get("u");
      if (realUrl) {
        // Remove fbclid tracking param from the extracted URL
        const clean = new URL(realUrl);
        clean.searchParams.delete("fbclid");
        return clean.toString().replace(/\?$/, "");
      }
    } catch {
      // If URL parsing fails, return original
    }
  }

  return url;
}

async function fetchViaGoogleSheetsApiDynamic(
  spreadsheetId: string,
  sheetName: string,
): Promise<CompetitorAdRow[]> {
  const apiKey = GOOGLE_CONSOLE_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_CONSOLE_API_KEY environment variable is not set");
  }

  // Use includeGridData to get cell-level hyperlink property
  const sheetRange = encodeURIComponent(sheetName);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?includeGridData=true&ranges=${sheetRange}&key=${apiKey}`;
  const res = await fetch(url, { cache: "no-store" });

  if (!res.ok) {
    const body = await res.text();
    console.warn(
      `[sheets-reader] Sheets API error (${res.status}). Is the API enabled in Cloud Console? Body: ${body.substring(0, 200)}`,
    );
    throw new Error(`Sheets API returned ${res.status}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (await res.json()) as any;
  const sheet = data.sheets?.[0];
  const gridData = sheet?.data?.[0];
  if (!gridData?.rowData?.length) {
    throw new Error("No data found in sheet");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rowDataArray = gridData.rowData as any[];
  // Skip header row (index 0)
  const rows: CompetitorAdRow[] = [];

  for (let i = 1; i < rowDataArray.length; i++) {
    try {
      const cells = rowDataArray[i].values;
      if (!cells || cells.length < 8) continue;

      const rank = Number(cells[0]?.effectiveValue?.numberValue ?? 0);
      const productName =
        cells[1]?.effectiveValue?.stringValue?.trim() ?? "";
      if (!productName) continue;

      rows.push({
        rank,
        productName,
        imageUrl: cells[2]?.hyperlink ?? null,
        landingPageUrl: extractRealUrl(cells[3]?.hyperlink ?? null),
        pageName: cells[4]?.effectiveValue?.stringValue?.trim() ?? "",
        durationDays: Number(
          cells[5]?.effectiveValue?.numberValue ?? 0,
        ),
        wowScore: cells[6]?.effectiveValue?.stringValue?.trim() ?? "",
        caption: cells[7]?.effectiveValue?.stringValue?.trim() ?? "",
      });
    } catch (err) {
      console.warn(
        `[sheets-reader] Skipped row ${i + 1}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  console.log(
    `[sheets-reader] Fetched ${rows.length} rows via Sheets API`,
  );
  return rows;
}

/** Legacy wrapper that reads config from MARKET_GID_MAP + env vars */
async function fetchViaGoogleSheetsApi(
  market: string,
): Promise<CompetitorAdRow[]> {
  const spreadsheetId = process.env.SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new Error("SPREADSHEET_ID not configured");
  }
  const marketConfig = MARKET_GID_MAP[market];
  if (!marketConfig) {
    throw new Error(`No sheet tab configured for market: ${market}`);
  }
  return fetchViaGoogleSheetsApiDynamic(spreadsheetId, marketConfig.sheetName);
}

// ─── CSV Export (fallback — no hyperlinks) ───────────────────────────────────

/**
 * Fetch sheet as CSV via Google Docs public export.
 * Works without API key for public sheets. Loses hyperlink URLs.
 */
async function fetchCsvExportDynamic(
  spreadsheetId: string,
  gid: number,
): Promise<CompetitorAdRow[]> {
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
  const res = await fetch(url, { cache: "no-store" });

  if (!res.ok) {
    throw new Error(`CSV export returned ${res.status}`);
  }

  const csv = await res.text();
  return parseCsvToRows(csv);
}

/** Legacy wrapper for backward compatibility */
export async function fetchSheetViaCsvExport(
  market: string,
): Promise<CompetitorAdRow[]> {
  const spreadsheetId = process.env.SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new Error("SPREADSHEET_ID not configured");
  }
  const marketConfig = MARKET_GID_MAP[market];
  if (!marketConfig) {
    throw new Error(`No sheet tab configured for market: ${market}`);
  }
  return fetchCsvExportDynamic(spreadsheetId, marketConfig.gid);
}

/**
 * Parse CSV text into CompetitorAdRow array.
 * Handles quoted fields with commas and newlines.
 */
export function parseCsvToRows(csv: string): CompetitorAdRow[] {
  const lines = parseCsvLines(csv);
  if (lines.length < 2) return [];

  // Skip header
  const rows: CompetitorAdRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    try {
      const cols = lines[i];
      if (cols.length < 8) continue;

      const rank = Number(cols[0]);
      const productName = cols[1]?.trim() ?? "";
      if (!productName || isNaN(rank)) continue;

      rows.push({
        rank,
        productName,
        imageUrl: null, // CSV export loses hyperlinks
        landingPageUrl: null,
        pageName: cols[4]?.trim() ?? "",
        durationDays: Number(cols[5]) || 0,
        wowScore: cols[6]?.trim() ?? "",
        caption: cols[7]?.trim() ?? "",
      });
    } catch (err) {
      console.warn(
        `[sheets-reader] CSV parse skipped row ${i + 1}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  console.log(
    `[sheets-reader] Parsed ${rows.length} rows from CSV export (no hyperlinks)`,
  );
  return rows;
}

/**
 * RFC 4180 compliant CSV line parser.
 * Handles quoted fields containing commas and newlines.
 */
function parseCsvLines(csv: string): string[][] {
  const results: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];

    if (inQuotes) {
      if (ch === '"') {
        if (csv[i + 1] === '"') {
          field += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        current.push(field);
        field = "";
      } else if (ch === "\n" || (ch === "\r" && csv[i + 1] === "\n")) {
        current.push(field);
        field = "";
        if (current.some((f) => f.trim())) results.push(current);
        current = [];
        if (ch === "\r") i++; // skip \n after \r
      } else {
        field += ch;
      }
    }
  }

  // Push last field/row
  if (field || current.length > 0) {
    current.push(field);
    if (current.some((f) => f.trim())) results.push(current);
  }

  return results;
}

// ─── Local CSV (final fallback) ─────────────────────────────────────────────

async function readLocalCsv(market: string): Promise<CompetitorAdRow[]> {
  const csvPath = path.join(
    process.cwd(),
    "src",
    "data",
    "competitors",
    `${market}.csv`,
  );

  const csv = await fs.readFile(csvPath, "utf-8");
  console.log(
    `[sheets-reader] Falling back to local CSV: ${csvPath}`,
  );
  return parseCsvToRows(csv);
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Fetch competitor ad data for a market.
 * Priority: Sheets API (hyperlinks) → CSV export → local CSV file.
 */
/**
 * Fetch competitor data using dynamic per-market config from product_markets table.
 * Priority: Sheets API → CSV export → cached CSV → empty.
 */
export async function fetchCompetitorSheetDynamic(config: {
  spreadsheetId: string | null;
  gid: number | null;
  sheetName: string | null;
  cachedCsv: string | null;
}): Promise<{ rows: CompetitorAdRow[]; rawCsv: string | null }> {
  // 1. Try Sheets API (extracts hyperlinks)
  if (config.spreadsheetId && config.sheetName) {
    try {
      const rows = await fetchViaGoogleSheetsApiDynamic(
        config.spreadsheetId,
        config.sheetName,
      );
      // Build CSV string from rows for caching
      const csvLines = [
        "Rank,Product Name,Image Link,Landing Page Link,Page Name,Duration (days),Steal-Worthy Score,Caption",
        ...rows.map(
          (r) =>
            `${r.rank},"${(r.productName ?? "").replace(/"/g, '""')}",${r.imageUrl ?? ""},${r.landingPageUrl ?? ""},"${(r.pageName ?? "").replace(/"/g, '""')}",${r.durationDays},${r.wowScore},"${(r.caption ?? "").replace(/"/g, '""')}"`,
        ),
      ];
      return { rows, rawCsv: csvLines.join("\n") };
    } catch (err) {
      console.warn(
        `[sheets-reader] Dynamic Sheets API failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // 2. Try CSV export
  if (config.spreadsheetId && config.gid !== null) {
    try {
      const rows = await fetchCsvExportDynamic(
        config.spreadsheetId,
        config.gid,
      );
      const csvLines = [
        "Rank,Product Name,Image Link,Landing Page Link,Page Name,Duration (days),Steal-Worthy Score,Caption",
        ...rows.map(
          (r) =>
            `${r.rank},"${(r.productName ?? "").replace(/"/g, '""')}",,,,"${(r.pageName ?? "").replace(/"/g, '""')}",${r.durationDays},${r.wowScore},"${(r.caption ?? "").replace(/"/g, '""')}"`,
        ),
      ];
      return { rows, rawCsv: csvLines.join("\n") };
    } catch (err) {
      console.warn(
        `[sheets-reader] Dynamic CSV export failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // 3. Use cached CSV
  if (config.cachedCsv) {
    console.log("[sheets-reader] Using cached CSV data");
    const rows = parseCsvToRows(config.cachedCsv);
    return { rows, rawCsv: config.cachedCsv };
  }

  console.warn("[sheets-reader] No data source available for dynamic fetch");
  return { rows: [], rawCsv: null };
}

/**
 * Legacy: fetch competitor data using hardcoded MARKET_GID_MAP.
 * Priority: Sheets API → CSV export → local CSV file.
 */
export async function fetchCompetitorSheet(
  market: string,
): Promise<CompetitorAdRow[]> {
  // 1. Try Sheets API (extracts hyperlinks)
  try {
    return await fetchViaGoogleSheetsApi(market);
  } catch (err) {
    console.warn(
      `[sheets-reader] Sheets API failed: ${err instanceof Error ? err.message : String(err)}. Trying CSV export...`,
    );
  }

  // 2. Try public CSV export
  try {
    return await fetchSheetViaCsvExport(market);
  } catch (err) {
    console.warn(
      `[sheets-reader] CSV export failed: ${err instanceof Error ? err.message : String(err)}. Trying local CSV...`,
    );
  }

  // 3. Fall back to local CSV
  try {
    return await readLocalCsv(market);
  } catch (err) {
    console.error(
      `[sheets-reader] All sources failed for market ${market}: ${err instanceof Error ? err.message : String(err)}`,
    );
    return [];
  }
}
