"use client";
// Client Component: drag-drop Excel file upload with preview of parsed rows

import type { ContentRow } from "@/lib/excel-parser";
import { FileSpreadsheet, Loader2, Upload, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";

interface ExcelUploadZoneProps {
  onParsed: (rows: ContentRow[]) => void;
  parsedRows: ContentRow[];
  onClear: () => void;
}

export function ExcelUploadZone({
  onParsed,
  parsedRows,
  onClear,
}: ExcelUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setIsUploading(true);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/content-adapt/parse-excel", {
          method: "POST",
          body: formData,
        });

        const data = (await res.json()) as {
          success: boolean;
          rows?: ContentRow[];
          error?: string;
        };

        if (!data.success || !data.rows) {
          setError(data.error ?? "Failed to parse Excel file");
          return;
        }

        onParsed(data.rows);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to upload file",
        );
      } finally {
        setIsUploading(false);
      }
    },
    [onParsed],
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    // Reset input so re-uploading same file triggers change
    e.target.value = "";
  }

  // Show parsed rows preview
  if (parsedRows.length > 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-green-400">
            <FileSpreadsheet className="h-4 w-4" />
            <span>{parsedRows.length} content rows loaded</span>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        </div>

        <div className="max-h-48 overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900/50">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-700 text-zinc-400">
                <th className="px-3 py-2 text-left font-medium w-1/3">
                  Image Name
                </th>
                <th className="px-3 py-2 text-left font-medium">Content</th>
              </tr>
            </thead>
            <tbody>
              {parsedRows.map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-zinc-800 last:border-0"
                >
                  <td className="px-3 py-2 text-zinc-300 truncate max-w-[150px]">
                    {row.imageName}
                  </td>
                  <td className="px-3 py-2 text-zinc-400 truncate max-w-[300px]">
                    {row.content}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        role="button"
        tabIndex={0}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        className={`
          flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8
          transition-colors cursor-pointer
          ${isDragging ? "border-blue-500 bg-blue-500/10" : "border-zinc-700 bg-zinc-900/30 hover:border-zinc-500"}
          ${isUploading ? "pointer-events-none opacity-60" : ""}
        `}
      >
        {isUploading ? (
          <Loader2 className="h-8 w-8 text-zinc-400 animate-spin" />
        ) : (
          <Upload className="h-8 w-8 text-zinc-500" />
        )}
        <div className="text-center">
          <p className="text-sm text-zinc-300">
            {isUploading
              ? "Parsing Excel file..."
              : "Drop Excel file here or click to browse"}
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            .xlsx or .xls — 2 columns: image name, content
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleInputChange}
        className="hidden"
      />

      {error && (
        <p className="text-xs text-red-400 px-1">{error}</p>
      )}
    </div>
  );
}
