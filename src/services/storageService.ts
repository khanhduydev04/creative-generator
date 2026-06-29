import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../types/database.types'

export type StorageBucket = 'brand-assets' | 'campaign-inputs' | 'generated-ads'

export class StorageService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Upload a file to a storage bucket. Returns the stored path.
   */
  async upload(
    bucket: StorageBucket,
    path: string,
    file: File | Blob | ArrayBuffer,
    contentType?: string,
  ): Promise<string> {
    const { error } = await this.supabase.storage
      .from(bucket)
      .upload(path, file, {
        contentType,
        upsert: true,
      })

    if (error) throw new Error(error.message)
    return path
  }

  /**
   * Get a public URL for a stored file.
   */
  getPublicUrl(bucket: StorageBucket, path: string): string {
    const { data } = this.supabase.storage.from(bucket).getPublicUrl(path)
    return data.publicUrl
  }

  /**
   * Delete a file from storage.
   */
  async remove(bucket: StorageBucket, paths: string[]): Promise<void> {
    const { error } = await this.supabase.storage.from(bucket).remove(paths)
    if (error) throw new Error(error.message)
  }

  /**
   * Build a unique storage path for a file.
   * Format: {namespace}/{entityId}/{timestamp}_{filename}
   */
  buildPath(namespace: string, entityId: string, filename: string): string {
    const timestamp = Date.now()
    const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
    return `${namespace}/${entityId}/${timestamp}_${sanitized}`
  }
}
