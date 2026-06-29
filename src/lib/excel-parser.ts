// Minimal Excel parser for 2-column content files (image_name, content).
// Server-only — uses the xlsx package to parse .xlsx/.xls buffers.

import * as XLSX from "xlsx";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ContentRow {
  /** Filename from Excel column A (e.g. "gym_selfie_1.jpg") */
  imageName: string;
  /** Sample content from Excel column B */
  content: string;
}

// Common header patterns to auto-detect and skip
const HEADER_PATTERNS = [
  "image",
  "file",
  "name",
  "filename",
  "ảnh",
  "tên",
  "hình",
  "content",
  "nội dung",
  "caption",
  "text",
];

// ─── Parser ──────────────────────────────────────────────────────────────────

/**
 * Parse a 2-column Excel file (image_name, content) into ContentRow[].
 *
 * - Reads the first sheet only
 * - Auto-detects and skips header row
 * - Trims whitespace, skips empty rows
 * - Throws descriptive errors for malformed files
 */
export function parseContentExcel(buffer: ArrayBuffer): ContentRow[] {
  const workbook = XLSX.read(buffer, { type: "array" });

  if (workbook.SheetNames.length === 0) {
    throw new Error("Excel file contains no sheets.");
  }

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`Sheet "${sheetName}" is empty.`);
  }

  // Convert to array of arrays (raw rows)
  const rawRows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
  });

  if (rawRows.length === 0) {
    throw new Error("Excel sheet is empty — no rows found.");
  }

  // Determine start index (skip header row if detected)
  let startIndex = 0;
  const firstRow = rawRows[0];
  if (firstRow && firstRow.length >= 2) {
    const cellA = String(firstRow[0]).toLowerCase().trim();
    const cellB = String(firstRow[1]).toLowerCase().trim();
    const isHeader = HEADER_PATTERNS.some(
      (p) => cellA.includes(p) || cellB.includes(p),
    );
    if (isHeader) startIndex = 1;
  }

  const rows: ContentRow[] = [];

  for (let i = startIndex; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || row.length < 2) continue;

    const imageName = String(row[0]).trim();
    const content = String(row[1]).trim();

    // Skip empty rows
    if (!imageName && !content) continue;

    if (!imageName) {
      console.warn(
        `[excel-parser] Row ${i + 1}: empty image name, skipping.`,
      );
      continue;
    }

    if (!content) {
      console.warn(
        `[excel-parser] Row ${i + 1}: empty content for "${imageName}", skipping.`,
      );
      continue;
    }

    rows.push({ imageName, content });
  }

  if (rows.length === 0) {
    throw new Error(
      "No valid rows found. Ensure the Excel file has 2 columns: image name and content.",
    );
  }

  return rows;
}
