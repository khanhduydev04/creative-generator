import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ScriptService } from "@/services/scriptService";

describe("ScriptService.create", () => {
  it("stores promptConfig.productId as the product_id column", async () => {
    const insertedRows: Record<string, unknown>[] = [];
    const supabase = {
      from: () => ({
        insert: (row: Record<string, unknown>) => {
          insertedRows.push(row);
          return { select: () => ({ single: () => Promise.resolve({ data: { ...row, id: "script-1" }, error: null }) }) };
        },
      }),
      // Safe: fake only implements the from().insert().select().single() chain this method calls.
    } as unknown as SupabaseClient;

    const service = new ScriptService(supabase);
    const script = await service.create(
      "transcript-1",
      "brand-1",
      "raw text",
      { tone: "friendly", notes: "", productId: "product-1" },
      "claude-sonnet",
    );

    expect(script.product_id).toBe("product-1");
    expect(insertedRows[0]).toMatchObject({ product_id: "product-1" });
  });

  it("stores null product_id when promptConfig.productId is absent", async () => {
    const insertedRows: Record<string, unknown>[] = [];
    const supabase = {
      from: () => ({
        insert: (row: Record<string, unknown>) => {
          insertedRows.push(row);
          return { select: () => ({ single: () => Promise.resolve({ data: { ...row, id: "script-2" }, error: null }) }) };
        },
      }),
      // Safe: fake only implements the from().insert().select().single() chain this method calls.
    } as unknown as SupabaseClient;

    const service = new ScriptService(supabase);
    const script = await service.create(
      "transcript-1",
      "brand-1",
      "raw text",
      { tone: "friendly", notes: "" },
      "claude-sonnet",
    );

    expect(script.product_id).toBeNull();
    expect(insertedRows[0]).toMatchObject({ product_id: null });
  });
});
