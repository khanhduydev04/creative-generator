import { parseContentExcel } from "@/lib/excel-parser";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { success: false, error: "No file provided. Upload an .xlsx or .xls file." },
        { status: 400 },
      );
    }

    // Validate file type
    const name = file instanceof File ? file.name : "unknown";
    const isExcel =
      name.endsWith(".xlsx") ||
      name.endsWith(".xls") ||
      file.type ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.type === "application/vnd.ms-excel";

    if (!isExcel) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid file type: "${name}". Only .xlsx and .xls files are supported.`,
        },
        { status: 400 },
      );
    }

    const buffer = await file.arrayBuffer();
    const rows = parseContentExcel(buffer);

    return NextResponse.json({ success: true, rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to parse Excel file";
    console.error("[content-adapt/parse-excel]", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 },
    );
  }
}
