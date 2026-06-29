import { NextRequest, NextResponse } from "next/server";

interface ExportRow {
  label: string;
  caption: string;
  hashtags: string[];
  callToAction: string;
}

interface ExportRequest {
  results: ExportRow[];
  format: "csv" | "json";
}

export async function POST(request: NextRequest): Promise<Response> {
  let body: ExportRequest;
  try {
    body = (await request.json()) as ExportRequest;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 },
    );
  }

  if (!body.results?.length) {
    return NextResponse.json(
      { success: false, error: "No results to export" },
      { status: 400 },
    );
  }

  if (body.format === "json") {
    const json = JSON.stringify(body.results, null, 2);
    return new Response(json, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": 'attachment; filename="adapted-content.json"',
      },
    });
  }

  // Default: CSV export
  const csvLines: string[] = [
    "Label,Caption,Hashtags,Call to Action",
  ];

  for (const row of body.results) {
    const caption = escapeCsvField(row.caption);
    const hashtags = escapeCsvField(
      row.hashtags.map((h) => `#${h}`).join(" "),
    );
    const cta = escapeCsvField(row.callToAction);
    const label = escapeCsvField(row.label);
    csvLines.push(`${label},${caption},${hashtags},${cta}`);
  }

  // UTF-8 BOM for Excel compatibility
  const BOM = "\uFEFF";
  const csv = BOM + csvLines.join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="adapted-content.csv"',
    },
  });
}

function escapeCsvField(value: string): string {
  if (
    value.includes(",") ||
    value.includes('"') ||
    value.includes("\n") ||
    value.includes("\r")
  ) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
