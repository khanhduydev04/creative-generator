---
name: supabase-crud-service
description: Generate a complete Supabase CRUD service + API routes + types for a database table. Use when creating a new feature that needs database operations, adding a new table, or when user asks to scaffold CRUD for a Supabase table.
argument-hint: "[table-name] [parent-field?]"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Supabase CRUD Service Generator

Generate a complete, type-safe CRUD layer for a Supabase table: Service class + Next.js API routes + TypeScript types.

## Arguments

- `$0` = Table name (required, e.g. `products`, `product_markets`, `concept_prompts`)
- `$1` = Parent FK field (optional, e.g. `brand_id`, `product_id`) — enables `getByParentId()` method
- `$ARGUMENTS` = Full argument string for context

## What to Generate

### File 1: Service Class — `src/services/{tableName}Service.ts`

Pattern: Class with constructor injection of `SupabaseClient<Database>`.

```typescript
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../types/database.types";

// Type aliases from generated Database types
type {TableName}Row = Database["public"]["Tables"]["{table_name}"]["Row"];
type {TableName}Insert = Database["public"]["Tables"]["{table_name}"]["Insert"];
type {TableName}Update = Database["public"]["Tables"]["{table_name}"]["Update"];

export class {TableName}Service {
  constructor(private supabase: SupabaseClient<Database>) {}

  // --- If parent FK field ($1) is provided ---
  async getByParentId(parentId: string): Promise<{TableName}Row[]> {
    const { data, error } = await this.supabase
      .from("{table_name}")
      .select("*")
      .eq("{parent_field}", parentId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  // --- Always include ---
  async getById(id: string): Promise<{TableName}Row | null> {
    const { data, error } = await this.supabase
      .from("{table_name}")
      .select("*")
      .eq("id", id)
      .single();
    if (error) {
      if (error.code === "PGRST116") return null; // Not found
      throw new Error(error.message);
    }
    return data;
  }

  async getAll(): Promise<{TableName}Row[]> {
    const { data, error } = await this.supabase
      .from("{table_name}")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async create(input: {TableName}Insert): Promise<{TableName}Row> {
    const { data, error } = await this.supabase
      .from("{table_name}")
      .insert(input)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async update(id: string, updates: {TableName}Update): Promise<{TableName}Row> {
    const { data, error } = await this.supabase
      .from("{table_name}")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("{table_name}")
      .delete()
      .eq("id", id);
    if (error) throw new Error(error.message);
  }
}
```

**Variations to apply based on context:**

| If table has... | Then add... |
|---|---|
| `deleted_at` column | Soft delete: `.update({ deleted_at: new Date().toISOString() })` instead of `.delete()`, filter `.is("deleted_at", null)` on reads |
| Parent FK (`$1`) | `getByParentId()` method, filter by parent in list queries |
| Unique non-id field (e.g. `concept_id`) | `getByField()` + use that field in update/delete instead of `id` |
| `cached_*` columns | `updateCache()` method for cache refresh |
| Computed fields on insert | `create()` omits those fields from input type using `Omit<>` |

### File 2: API Route (List + Create) — `src/app/api/{kebab-name}/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { {TableName}Service } from "@/services/{tableName}Service";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const service = new {TableName}Service(supabase);

    // If parent FK: read from searchParams
    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get("{parent_field}");
    if (!parentId) {
      return NextResponse.json({ error: "{parent_field} is required" }, { status: 400 });
    }

    const items = await service.getByParentId(parentId);
    // OR if no parent FK:
    // const items = await service.getAll();

    return NextResponse.json({ items });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const service = new {TableName}Service(supabase);
    const body = await request.json();

    // Validate required fields
    if (!body.{required_field}) {
      return NextResponse.json({ error: "{required_field} is required" }, { status: 400 });
    }

    const item = await service.create(body);
    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

### File 3: API Route (Single Item) — `src/app/api/{kebab-name}/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { {TableName}Service } from "@/services/{tableName}Service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const service = new {TableName}Service(supabase);

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
    const service = new {TableName}Service(supabase);
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
    const service = new {TableName}Service(supabase);

    await service.delete(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

## Pre-generation Checklist

Before writing code, Claude MUST:

1. **Read `src/types/database.types.ts`** — verify table exists in generated types, get exact column names and types
2. **Check `src/services/`** — verify no existing service for this table
3. **Check `src/app/api/`** — verify no existing routes for this table
4. **Check `src/lib/supabase/server.ts`** — verify `createClient` exists and its import path
5. **Read an existing service** (e.g., `brandService.ts`) — match the project's code style (semicolons, quotes, spacing)
6. **Determine soft delete** — check if table has `deleted_at` column
7. **Determine parent FK** — from `$1` argument or infer from table columns ending in `_id`

## Naming Conventions

| Input | Service Class | Service File | API Route | Type Alias |
|---|---|---|---|---|
| `brands` | `BrandService` | `brandService.ts` | `/api/brands/` | `BrandRow` |
| `brand_products` | `BrandProductService` | `brandProductService.ts` | `/api/brand-products/` | `BrandProductRow` |
| `product_markets` | `ProductMarketService` | `productMarketService.ts` | `/api/product-markets/` | `ProductMarketRow` |
| `concept_prompts` | `ConceptPromptService` | `conceptPromptService.ts` | `/api/concepts/` | `ConceptPromptRow` |

**Rules:**
- Service file: camelCase of singular table name + `Service.ts`
- Service class: PascalCase of singular table name + `Service`
- API route: kebab-case of table name (underscores → hyphens)
- Type aliases: PascalCase + `Row`, `Insert`, `Update`
- Route param context: `{ params: Promise<{ id: string }> }` (Next.js 15+ async params)

## Advanced Patterns

### Soft Delete (when table has `deleted_at`)
```typescript
// In getAll/getByParentId — filter out soft-deleted:
.is("deleted_at", null)

// In delete — soft delete instead of hard delete:
async delete(id: string): Promise<boolean> {
  const { error } = await this.supabase
    .from("{table_name}")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  return true;
}
```

### Batch Operations
```typescript
// Get multiple by IDs
async getByIds(ids: string[]): Promise<{TableName}Row[]> {
  const { data, error } = await this.supabase
    .from("{table_name}")
    .select("*")
    .in("id", ids);
  if (error) throw new Error(error.message);
  return data ?? [];
}
```

### Cache Update Pattern
```typescript
// For tables with cached_csv/cached_at columns
async updateCache(id: string, cachedData: string): Promise<{TableName}Row> {
  const { data, error } = await this.supabase
    .from("{table_name}")
    .update({
      cached_csv: cachedData,
      cached_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}
```

### File Upload Sub-route
```typescript
// src/app/api/{kebab-name}/[id]/upload/route.ts
export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Validate file type
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  }

  // Validate file size (10MB)
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
  }

  const supabase = await createClient();
  const storage = new StorageService(supabase);
  const path = storage.buildPath("{namespace}", id, file.name);
  await storage.upload("{bucket}", path, file, file.type);
  const url = storage.getPublicUrl("{bucket}", path);

  return NextResponse.json({ url, path });
}
```

## After Generation

1. Verify types exist: check `src/types/database.types.ts` for the table
2. Run `npx tsc --noEmit` to verify no type errors
3. Test API routes manually or inform user of available endpoints
4. If table doesn't exist yet, inform user they need to:
   - Create the Supabase migration SQL
   - Run `npx supabase gen types typescript` to regenerate types
