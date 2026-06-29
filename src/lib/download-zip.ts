// Client-side utility: download multiple images as a single ZIP file
// Uses JSZip to bundle images fetched via the download-image proxy API

import JSZip from "jszip";

interface DownloadItem {
  url: string;
  filename: string;
}

/**
 * Fetch all images, bundle into a ZIP, and trigger browser download.
 * Uses /api/download-image proxy to avoid CORS issues with external URLs.
 */
export async function downloadAsZip(
  items: DownloadItem[],
  zipFilename: string,
  onProgress?: (completed: number, total: number) => void,
): Promise<void> {
  if (items.length === 0) return;

  const zip = new JSZip();
  let completed = 0;

  // Fetch all images in parallel (max 6 concurrent to avoid overwhelming browser)
  const CONCURRENCY = 6;
  const queue = [...items];
  const workers: Promise<void>[] = [];

  for (let i = 0; i < Math.min(CONCURRENCY, queue.length); i++) {
    workers.push(processQueue());
  }

  async function processQueue(): Promise<void> {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;

      try {
        const proxyUrl = `/api/download-image?url=${encodeURIComponent(item.url)}`;
        const res = await fetch(proxyUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        zip.file(item.filename, blob);
      } catch (err) {
        console.warn(`[download-zip] Failed to fetch ${item.filename}:`, err);
      }

      completed++;
      onProgress?.(completed, items.length);
    }
  }

  await Promise.all(workers);

  // Generate ZIP and trigger download
  const zipBlob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = zipFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
