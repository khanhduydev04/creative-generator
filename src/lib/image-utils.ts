// Shared image utility — resize images for API consumption
// Used by both Gemini (base64) and KIE (URL) pipelines

import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

// ─── Core Resize ────────────────────────────────────────────────────────────

/**
 * Resize an image buffer to fit within maxWidth, compress to JPEG quality 80.
 * Returns the resized buffer.
 */
export async function resizeImageBuffer(
  imageBuffer: Buffer,
  maxWidth = 1024,
): Promise<Buffer> {
  return sharp(imageBuffer)
    .resize({
      width: maxWidth,
      height: maxWidth,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 80 })
    .toBuffer();
}

/**
 * Fetch an image from URL and resize it. Returns resized buffer.
 */
export async function fetchAndResizeImage(
  url: string,
  maxWidth = 1024,
): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch image for resize (${response.status}): ${url}`,
    );
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  return resizeImageBuffer(buffer, maxWidth);
}

// ─── Resize + Upload (for KIE API which requires URLs) ─────────────────────

// Hoist Supabase client to module level — avoid re-creating on every call
let _supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (_supabaseClient) return _supabaseClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase credentials not configured");
  _supabaseClient = createClient(url, key);
  return _supabaseClient;
}

/**
 * Resize an image from URL and upload to Supabase storage.
 * Returns the public URL of the resized image.
 * Used to prepare images for KIE API which requires URL inputs.
 */
export async function resizeAndUploadImage(
  imageUrl: string,
  maxWidth = 1024,
): Promise<string> {
  const resizedBuffer = await fetchAndResizeImage(imageUrl, maxWidth);

  const supabase = getSupabaseClient();
  const fileName = `temp-resized/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from("generated-ads")
    .upload(fileName, resizedBuffer, {
      contentType: "image/jpeg",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Failed to upload resized image: ${uploadError.message}`);
  }

  const { data: urlData } = supabase.storage
    .from("generated-ads")
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}

/**
 * Resize multiple images and upload them to Supabase storage.
 * Returns array of public URLs for the resized images.
 */
export async function resizeAndUploadImages(
  imageUrls: string[],
  maxWidth = 1024,
): Promise<string[]> {
  const settled = await Promise.allSettled(
    imageUrls.map((url) => resizeAndUploadImage(url, maxWidth)),
  );

  const urls: string[] = [];
  for (let i = 0; i < settled.length; i++) {
    const result = settled[i];
    if (result.status === "fulfilled") {
      urls.push(result.value);
    } else {
      console.warn(`[image-utils] Failed to resize image ${i}: ${result.reason}`);
      // Fall back to original URL so the pipeline continues
      urls.push(imageUrls[i]);
    }
  }
  return urls;
}
