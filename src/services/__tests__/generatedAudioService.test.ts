import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { GeneratedAudioService } from "@/services/generatedAudioService";

describe("GeneratedAudioService.listByBrand", () => {
  it("selects the nested brand_product join and returns the product name", async () => {
    let capturedSelect = "";
    const rowWithProduct = {
      id: "audio-1",
      brand_script: {
        final_text: "hello",
        raw_text: null,
        brand_product: { id: "product-1", name: "Kho quẹt tôm thịt" },
      },
    };
    const supabase = {
      from: () => ({
        select: (query: string) => {
          capturedSelect = query;
          return {
            eq: () => ({
              order: () => Promise.resolve({ data: [rowWithProduct], error: null }),
            }),
          };
        },
      }),
      // Safe: fake only implements the from().select().eq().order() chain this method calls.
    } as unknown as SupabaseClient;

    const service = new GeneratedAudioService(supabase);
    const audios = await service.listByBrand("brand-1");

    expect(capturedSelect).toContain("brand_product:brand_products(id, name)");
    expect(audios[0]?.brand_script?.brand_product?.name).toBe("Kho quẹt tôm thịt");
  });

  it("throws when the query fails", async () => {
    const supabase = {
      from: () => ({
        select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: null, error: { message: "boom" } }) }) }),
      }),
      // Safe: fake only implements the from().select().eq().order() chain this method calls.
    } as unknown as SupabaseClient;

    const service = new GeneratedAudioService(supabase);
    await expect(service.listByBrand("brand-1")).rejects.toThrow("boom");
  });
});
