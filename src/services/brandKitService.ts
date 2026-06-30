import { SupabaseClient } from '@supabase/supabase-js'
import { Database, Json } from '../types/database.types'
import { ApiError } from '@/lib/user-context'
import { StorageService } from './storageService'

type BrandKitRow = Database['public']['Tables']['brand_kits']['Row']
type BrandKitUpdate = Database['public']['Tables']['brand_kits']['Update']

interface FontFileEntry {
  filename: string
  path: string
  variant: string
}

export class BrandKitService {
  private storage: StorageService

  constructor(
    private supabase: SupabaseClient<Database>,
    private userId: string,
  ) {
    this.storage = new StorageService(supabase)
  }

  /** Verify the parent brand exists (not soft-deleted). RLS handles authz. */
  private async verifyBrandExists(brandId: string): Promise<void> {
    const { data } = await this.supabase
      .from('brands')
      .select('id')
      .eq('id', brandId)
      .is('deleted_at', null)
      .single()
    if (!data) throw new ApiError(404, 'brand_not_found')
  }

  /**
   * Fetch the brand kit for a brand. Returns null if not yet created.
   */
  async getBrandKit(brandId: string): Promise<BrandKitRow | null> {
    const { data, error } = await this.supabase
      .from('brand_kits')
      .select('*')
      .eq('brand_id', brandId)
      .maybeSingle()

    if (error) throw new ApiError(500, 'db_error', error.message)
    if (!data) return null

    return data
  }

  /**
   * Upsert brand kit fields (create or update).
   * Pre-flight verifies the parent brand exists.
   */
  async saveBrandKit(
    brandId: string,
    fields: Omit<BrandKitUpdate, 'id' | 'brand_id' | 'updated_at'>,
  ): Promise<BrandKitRow> {
    await this.verifyBrandExists(brandId)

    const existing = await this.getBrandKit(brandId)

    if (existing) {
      const { data, error } = await this.supabase
        .from('brand_kits')
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq('brand_id', brandId)
        .select()
        .single()

      if (error) throw new ApiError(500, 'db_error', error.message)
      if (!data) throw new ApiError(500, 'db_error', 'Failed to update brand kit')
      return data
    }

    const { data, error } = await this.supabase
      .from('brand_kits')
      .insert({ brand_id: brandId, ...fields })
      .select()
      .single()

    if (error) throw new ApiError(500, 'db_error', error.message)
    if (!data) throw new ApiError(500, 'db_error', 'Failed to create brand kit')
    return data
  }

  /**
   * Upload a logo and save the path to the brand kit.
   * logoType: 'light' | 'dark'
   */
  async uploadLogo(
    brandId: string,
    logoType: 'light' | 'dark',
    file: File | Blob,
    filename: string,
  ): Promise<BrandKitRow> {
    const path = this.storage.buildPath(`${this.userId}/logos`, brandId, filename)
    await this.storage.upload('brand-assets', path, file)

    const field =
      logoType === 'light'
        ? { logo_light_path: path }
        : { logo_dark_path: path }

    return this.saveBrandKit(brandId, field)
  }

  /**
   * Get public URLs for both logos.
   */
  getLogoUrls(kit: BrandKitRow): { lightUrl: string | null; darkUrl: string | null } {
    return {
      lightUrl: kit.logo_light_path
        ? this.storage.getPublicUrl('brand-assets', kit.logo_light_path)
        : null,
      darkUrl: kit.logo_dark_path
        ? this.storage.getPublicUrl('brand-assets', kit.logo_dark_path)
        : null,
    }
  }

  /**
   * Upload font files (multiple variants of a single font family) and a specimen image.
   * Stores files in brand-assets/fonts/{brandId}/, saves paths + specimen to brand_kits.
   */
  async uploadFontFiles(
    brandId: string,
    fontName: string,
    files: { file: File | Blob; filename: string; variant: string }[],
    specimenFile: File | Blob | null,
  ): Promise<BrandKitRow> {
    const entries: FontFileEntry[] = []

    for (const f of files) {
      const path = this.storage.buildPath(`${this.userId}/fonts`, brandId, f.filename)
      await this.storage.upload('brand-assets', path, f.file)
      entries.push({ filename: f.filename, path, variant: f.variant })
    }

    let specimenPath: string | null = null
    if (specimenFile) {
      specimenPath = this.storage.buildPath(`${this.userId}/fonts`, brandId, 'specimen.png')
      await this.storage.upload('brand-assets', specimenPath, specimenFile, 'image/png')
    }

    return this.saveBrandKit(brandId, {
      typography: fontName,
      font_source: 'local',
      font_file_paths: entries as unknown as Json,
      font_specimen_path: specimenPath,
    })
  }

  /**
   * Get public URL for font specimen image.
   */
  getFontSpecimenUrl(kit: BrandKitRow): string | null {
    return kit.font_specimen_path
      ? this.storage.getPublicUrl('brand-assets', kit.font_specimen_path)
      : null
  }
}
