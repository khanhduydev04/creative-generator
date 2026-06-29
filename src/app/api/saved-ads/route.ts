import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser, handleApiError } from "@/lib/user-context";
import { SavedAdService } from "@/services/savedAdService";

interface StorageObject {
  name: string;
  id: string;
  created_at: string;
  updated_at: string;
  metadata: Record<string, string> | null;
}

interface SavedAdResponse {
  name: string;
  storagePath: string;
  publicUrl: string;
  createdAt: string;
  productId: string | null;
  headline: string | null;
  concept: string | null;
  source: string;
}

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

function isImageFile(name: string): boolean {
  return IMAGE_EXTENSIONS.some((ext) => name.endsWith(ext));
}

function isDateFolder(name: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(name);
}

/**
 * GET /api/saved-ads?brandId=xxx&productId=yyy
 *
 * Lists saved ads. Queries saved_ads DB table first (with optional productId filter).
 * Falls back to Storage listing for legacy ads not yet in the table.
 * Deduplicates by storage_path — DB records take priority.
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireUser(request);
    const brandId = request.nextUrl.searchParams.get("brandId");
    const productId = request.nextUrl.searchParams.get("productId");

    if (!brandId) {
      return NextResponse.json(
        { error: "brandId query parameter is required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const savedAdService = new SavedAdService(supabase, userId);

    // ── Step 1: Query saved_ads table ──────────────────────────────
    const dbAds = await savedAdService.getByBrandId(brandId, productId);

    const ads: SavedAdResponse[] = dbAds.map((row) => ({
      name: row.storage_path.split("/").pop() ?? row.storage_path,
      storagePath: row.storage_path,
      publicUrl: row.image_url,
      createdAt: row.created_at,
      productId: row.product_id,
      headline: row.headline,
      concept: row.concept,
      source: row.source,
    }));

    // If productId filter is active, skip Storage fallback — only DB-tracked ads have product_id
    if (productId) {
      return NextResponse.json({ ads });
    }

    // ── Step 2: Storage fallback for legacy ads ────────────────────
    const dbPaths = new Set(dbAds.map((r) => r.storage_path));
    const storageAds = await listStorageAds(supabase, brandId);

    // Only add ads not already in DB
    for (const sa of storageAds) {
      if (!dbPaths.has(sa.storagePath)) {
        ads.push(sa);
      }
    }

    // Sort all by createdAt descending (newest first)
    ads.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ ads });
  } catch (e) {
    return handleApiError(e);
  }
}

/**
 * List ads from Supabase Storage (legacy fallback).
 * Handles both flat and date-folder structures.
 */
async function listStorageAds(
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
  brandId: string,
): Promise<SavedAdResponse[]> {
  const prefix = `workspace/${brandId}`;

  const { data, error } = await supabase.storage
    .from("generated-ads")
    .list(prefix, { limit: 1000, sortBy: { column: "name", order: "desc" } });

  if (error || !data) return [];

  const items = data as StorageObject[];
  const flatImages: StorageObject[] = [];
  const dateFolders: string[] = [];

  for (const item of items) {
    if (item.name === ".emptyFolderPlaceholder") continue;
    if (isImageFile(item.name)) flatImages.push(item);
    else if (isDateFolder(item.name)) dateFolders.push(item.name);
  }

  const ads: SavedAdResponse[] = flatImages.map((file) => {
    const storagePath = `${prefix}/${file.name}`;
    const { data: urlData } = supabase.storage
      .from("generated-ads")
      .getPublicUrl(storagePath);

    return {
      name: file.name,
      storagePath,
      publicUrl: urlData.publicUrl,
      createdAt: file.created_at,
      productId: null,
      headline: null,
      concept: null,
      source: "workspace",
    };
  });

  if (dateFolders.length > 0) {
    const folderResults = await Promise.all(
      dateFolders.map(async (folder) => {
        const folderPrefix = `${prefix}/${folder}`;
        const { data: folderData, error: folderError } = await supabase.storage
          .from("generated-ads")
          .list(folderPrefix, { limit: 1000, sortBy: { column: "name", order: "desc" } });

        if (folderError || !folderData) return [];

        return (folderData as StorageObject[])
          .filter((f) => f.name !== ".emptyFolderPlaceholder" && isImageFile(f.name))
          .map((file) => {
            const storagePath = `${folderPrefix}/${file.name}`;
            const { data: urlData } = supabase.storage
              .from("generated-ads")
              .getPublicUrl(storagePath);

            return {
              name: file.name,
              storagePath,
              publicUrl: urlData.publicUrl,
              createdAt: file.created_at,
              productId: null,
              headline: null,
              concept: null,
              source: "workspace",
            } satisfies SavedAdResponse;
          });
      }),
    );

    for (const folderAds of folderResults) {
      ads.push(...folderAds);
    }
  }

  return ads;
}

interface DeleteBody {
  path?: string;
  paths?: string[];
}

/**
 * DELETE /api/saved-ads
 *
 * Deletes saved ad(s) from both Supabase Storage and saved_ads table.
 * Supports single: { path: "..." } or bulk: { paths: ["...", "..."] }
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await requireUser(request);
    const body = (await request.json()) as DeleteBody;

    const pathsToDelete = body.paths ?? (body.path ? [body.path] : []);

    if (pathsToDelete.length === 0) {
      return NextResponse.json(
        { error: "path or paths is required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // Delete from Storage
    const { error } = await supabase.storage
      .from("generated-ads")
      .remove(pathsToDelete);

    if (error) {
      return NextResponse.json(
        { error: `Failed to delete file(s): ${error.message}` },
        { status: 500 },
      );
    }

    // Delete from saved_ads table (best-effort — don't fail if not found)
    try {
      const savedAdService = new SavedAdService(supabase, userId);
      await savedAdService.bulkDeleteByStoragePaths(pathsToDelete);
    } catch (dbErr) {
      console.warn("[saved-ads] Failed to delete DB records:", dbErr);
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return handleApiError(e);
  }
}
