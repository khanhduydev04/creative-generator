# Supabase CRUD Service — Reference Implementations

Production code from `static-ads-generator` that this skill is based on.
These are the source of truth for patterns, naming, and error handling.

---

## Pattern 1: Simple CRUD (BrandProductService)

The simplest pattern — direct CRUD with parent FK filtering.

```typescript
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../types/database.types'

type BrandProductRow = Database['public']['Tables']['brand_products']['Row']
type BrandProductInsert = Database['public']['Tables']['brand_products']['Insert']
type BrandProductUpdate = Database['public']['Tables']['brand_products']['Update']

export class BrandProductService {
  constructor(private supabase: SupabaseClient<Database>) {}

  async getByBrandId(brandId: string): Promise<BrandProductRow[]> {
    const { data, error } = await this.supabase
      .from('brand_products')
      .select('*')
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return data ?? []
  }

  async getById(id: string): Promise<BrandProductRow | null> {
    const { data, error } = await this.supabase
      .from('brand_products')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(error.message)
    }
    return data
  }

  async create(product: BrandProductInsert): Promise<BrandProductRow> {
    const { data, error } = await this.supabase
      .from('brand_products')
      .insert(product)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  }

  async update(id: string, updates: BrandProductUpdate): Promise<BrandProductRow> {
    const { data, error } = await this.supabase
      .from('brand_products')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('brand_products')
      .delete()
      .eq('id', id)

    if (error) throw new Error(error.message)
  }
}
```

---

## Pattern 2: Soft Delete (BrandService)

When table has `deleted_at` column — reads filter `.is('deleted_at', null)`, delete uses `.update()`.

```typescript
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../types/database.types'

type BrandRow = Database['public']['Tables']['brands']['Row']

export class BrandService {
  constructor(private supabase: SupabaseClient<Database>) {}

  async getBrandsByClient(clientId: string): Promise<BrandRow[]> {
    const { data, error } = await this.supabase
      .from('brands')
      .select('*')
      .eq('client_id', clientId)
      .is('deleted_at', null)              // <-- soft delete filter
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return data || []
  }

  async getBrandById(id: string): Promise<BrandRow> {
    const { data, error } = await this.supabase
      .from('brands')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)              // <-- soft delete filter
      .single()

    if (error) throw new Error(error.message)
    if (!data) throw new Error('Brand not found')
    return data
  }

  async createBrand(clientId: string, name: string, description?: string): Promise<BrandRow> {
    const { data, error } = await this.supabase
      .from('brands')
      .insert({ client_id: clientId, name, description: description ?? null })
      .select()
      .single()

    if (error) throw new Error(error.message)
    if (!data) throw new Error('Failed to create brand')
    return data
  }

  async updateBrand(
    id: string,
    updates: { name?: string; description?: string },
  ): Promise<BrandRow> {
    const { data, error } = await this.supabase
      .from('brands')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    if (!data) throw new Error('Failed to update brand')
    return data
  }

  async deleteBrand(id: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('brands')
      .update({ deleted_at: new Date().toISOString() })  // <-- soft delete
      .eq('id', id)

    if (error) throw new Error(error.message)
    return true
  }
}
```

---

## Pattern 3: Custom Key + Computed Fields (ProductMarketService)

When create/update has computed fields (auto-parsed from input).

```typescript
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../types/database.types";
import { parseGoogleSheetUrl } from "@/lib/sheet-url-parser";

type ProductMarketRow = Database["public"]["Tables"]["product_markets"]["Row"];
type ProductMarketInsert = Database["public"]["Tables"]["product_markets"]["Insert"];
type ProductMarketUpdate = Database["public"]["Tables"]["product_markets"]["Update"];

export class ProductMarketService {
  constructor(private supabase: SupabaseClient<Database>) {}

  async getByProductId(productId: string): Promise<ProductMarketRow[]> {
    const { data, error } = await this.supabase
      .from("product_markets")
      .select("*")
      .eq("product_id", productId)
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async getById(id: string): Promise<ProductMarketRow | null> {
    const { data, error } = await this.supabase
      .from("product_markets")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(error.message);
    }
    return data;
  }

  // Omit computed fields from input type
  async create(
    input: Omit<ProductMarketInsert, "spreadsheet_id" | "sheet_gid">,
  ): Promise<ProductMarketRow> {
    const insertData: ProductMarketInsert = { ...input };

    // Auto-compute fields from input
    if (input.sheet_url) {
      const parsed = parseGoogleSheetUrl(input.sheet_url);
      if (parsed) {
        insertData.spreadsheet_id = parsed.spreadsheetId;
        insertData.sheet_gid = parsed.gid;
      }
    }

    const { data, error } = await this.supabase
      .from("product_markets")
      .insert(insertData)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async update(
    id: string,
    updates: Omit<ProductMarketUpdate, "spreadsheet_id" | "sheet_gid">,
  ): Promise<ProductMarketRow> {
    const updateData: ProductMarketUpdate = { ...updates };

    // Re-compute when source field changes
    if (updates.sheet_url !== undefined) {
      if (updates.sheet_url) {
        const parsed = parseGoogleSheetUrl(updates.sheet_url);
        if (parsed) {
          updateData.spreadsheet_id = parsed.spreadsheetId;
          updateData.sheet_gid = parsed.gid;
        } else {
          updateData.spreadsheet_id = null;
          updateData.sheet_gid = null;
        }
      } else {
        updateData.spreadsheet_id = null;
        updateData.sheet_gid = null;
      }

      // Clear cache when source changes
      updateData.cached_csv = null;
      updateData.cached_at = null;
    }

    updateData.updated_at = new Date().toISOString();

    const { data, error } = await this.supabase
      .from("product_markets")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("product_markets")
      .delete()
      .eq("id", id);

    if (error) throw new Error(error.message);
  }

  // Extra: cache update method
  async updateCache(id: string, cachedCsv: string): Promise<ProductMarketRow> {
    const { data, error } = await this.supabase
      .from("product_markets")
      .update({
        cached_csv: cachedCsv,
        cached_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }
}
```

---

## Pattern 4: Non-ID Primary Key (ConceptPromptService)

When the lookup field is not `id` but a custom field (e.g., `concept_id`).

```typescript
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../types/database.types'

type ConceptPromptRow = Database['public']['Tables']['concept_prompts']['Row']
type ConceptPromptInsert = Database['public']['Tables']['concept_prompts']['Insert']
type ConceptPromptUpdate = Database['public']['Tables']['concept_prompts']['Update']

export class ConceptPromptService {
  constructor(private supabase: SupabaseClient<Database>) {}

  async getAll(): Promise<ConceptPromptRow[]> {
    const { data, error } = await this.supabase
      .from('concept_prompts')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) throw new Error(error.message)
    return data ?? []
  }

  async getByConceptId(conceptId: string): Promise<ConceptPromptRow | null> {
    const { data, error } = await this.supabase
      .from('concept_prompts')
      .select('*')
      .eq('concept_id', conceptId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(error.message)
    }
    return data
  }

  // Batch fetch by multiple keys
  async getByConceptIds(conceptIds: string[]): Promise<ConceptPromptRow[]> {
    const { data, error } = await this.supabase
      .from('concept_prompts')
      .select('*')
      .in('concept_id', conceptIds)

    if (error) throw new Error(error.message)
    return data ?? []
  }

  async create(input: ConceptPromptInsert): Promise<ConceptPromptRow> {
    const { data, error } = await this.supabase
      .from('concept_prompts')
      .insert(input)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  }

  async update(conceptId: string, input: ConceptPromptUpdate): Promise<ConceptPromptRow> {
    const { data, error } = await this.supabase
      .from('concept_prompts')
      .update(input)
      .eq('concept_id', conceptId)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  }

  async delete(conceptId: string): Promise<void> {
    const { error } = await this.supabase
      .from('concept_prompts')
      .delete()
      .eq('concept_id', conceptId)

    if (error) throw new Error(error.message)
  }
}
```

---

## Pattern 5: Storage Service (File Uploads)

Companion service for tables that need file storage.

```typescript
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../types/database.types'

export type StorageBucket = 'brand-assets' | 'campaign-inputs' | 'generated-ads'

export class StorageService {
  constructor(private supabase: SupabaseClient<Database>) {}

  async upload(
    bucket: StorageBucket,
    path: string,
    file: File | Blob | ArrayBuffer,
    contentType?: string,
  ): Promise<string> {
    const { error } = await this.supabase.storage
      .from(bucket)
      .upload(path, file, { contentType, upsert: true })

    if (error) throw new Error(error.message)
    return path
  }

  getPublicUrl(bucket: StorageBucket, path: string): string {
    const { data } = this.supabase.storage.from(bucket).getPublicUrl(path)
    return data.publicUrl
  }

  async remove(bucket: StorageBucket, paths: string[]): Promise<void> {
    const { error } = await this.supabase.storage.from(bucket).remove(paths)
    if (error) throw new Error(error.message)
  }

  buildPath(namespace: string, entityId: string, filename: string): string {
    const timestamp = Date.now()
    const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
    return `${namespace}/${entityId}/${timestamp}_${sanitized}`
  }
}
```

---

## API Route Patterns (Next.js App Router)

### List + Create Route

```typescript
// src/app/api/{kebab-name}/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { BrandProductService } from "@/services/brandProductService";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const service = new BrandProductService(supabase);

    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get("brandId");
    if (!brandId) {
      return NextResponse.json(
        { error: "brandId query param is required" },
        { status: 400 },
      );
    }

    const items = await service.getByBrandId(brandId);
    return NextResponse.json({ items });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const service = new BrandProductService(supabase);
    const body = await request.json();

    if (!body.brand_id || !body.name) {
      return NextResponse.json(
        { error: "brand_id and name are required" },
        { status: 400 },
      );
    }

    const item = await service.create(body);
    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

### Single Item Route (Next.js 15+ async params)

```typescript
// src/app/api/{kebab-name}/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { BrandProductService } from "@/services/brandProductService";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const service = new BrandProductService(supabase);

    const item = await service.getById(id);
    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ item });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const service = new BrandProductService(supabase);
    const body = await request.json();

    const item = await service.update(id, body);
    return NextResponse.json({ item });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const service = new BrandProductService(supabase);

    await service.delete(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

---

## Supabase Client Setup Reference

### Server Client (RSC + API routes)
```typescript
// src/lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Database } from "@/types/database.types";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    },
  );
}
```

### Admin Client (bypass RLS)
```typescript
// src/lib/supabase/admin.ts
import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";

export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
```

### Browser Client
```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";
import { Database } from "@/types/database.types";

export function createBrowserSupabaseClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```
