import { describe, expect, it } from "vitest";
import type { ConceptPrompt } from "../concept-prompt-loader";
import type { AudienceProfile, ConceptDirective } from "../concept-skills";
import type { CompetitorAdAnalysis, ProductContext } from "../gemini-reader";
import type { BrandProfile, OutputConfig } from "../prompt-assembler";
import {
  assembleCompetitorRefPrompt,
  assemblePrompt,
} from "../prompt-assembler";

// ── Test Fixtures ─────────────────────────────────────────────────────────────

const mockDirective: ConceptDirective = {
  headline: "Power Your Day with Nutricost",
  bodyText: "5g Pure Creatine",
  visualDirection: "Product hero centered on gradient",
  emotionalHook: "Feel unstoppable energy",
  differentiator: "Only brand with gummy form factor",
};

const mockProductContext: ProductContext = {
  brandName: "Nutricost",
  productName: "Creatine Gummies",
  tagline: "Fuel Your Performance",
  packagingForm: "resealable pouch containing gummies",
  physicalDimensions: "approximately 20cm tall × 14cm wide × 6cm deep — handheld size, similar to a small book",
  productFormDetails: "bear-shaped gummies, ~2cm each, orange/yellow color, soft chewy texture with sugar coating",
  claims: ["5g creatine per serving", "Clinically tested"],
  keyIngredients: ["Creatine Monohydrate", "Vitamin B12"],
  benefits: ["Increased strength", "Better recovery"],
  tone: "bold and scientific",
  targetSignals: ["gym-goers", "athletes"],
  rawSummary: "A premium creatine gummy supplement",
  priceInfo: "$24.99 (60 gummies)",
  servingInfo: "60 gummies per pouch, 2 gummies per serving (30 servings), 5g creatine per serving",
  certifications: ["GMP Certified", "Third-Party Tested", "Made in USA"],
  socialProof: "4.7/5 stars (2,847 reviews)",
  flavorVariant: "Mixed Berry",
  uniqueSellingPoints: ["Only creatine gummy with 5g per serving", "No chalky powder taste"],
  visualIdentifiers: "Matte black stand-up pouch with bold gold CREATINE text, orange stripe at bottom, white Nutricost logo at top-left",
};

const mockBrandProfile: BrandProfile = {
  brandName: "Nutricost",
  logoUrl: null,
  primaryColor1: "#1A1A2E",
  primaryColor2: "#16213E",
  secondaryColor1: "#0F3460",
  secondaryColor2: "#533483",
  accentColor1: "#E94560",
  accentColor2: "#FF6B6B",
  typography: "Inter",
};

const mockAudience: AudienceProfile = {
  title: "Fitness Enthusiasts 25-35",
  pain: "Tired of chalky powders",
  angle: "Convenience + taste",
  emotion: "excitement",
};

const mockOutputConfig: OutputConfig = {
  aspectRatio: "1:1",
  resolution: "1K",
  funnelStage: "awareness",
  count: 1,
  variantIndex: 0,
};

// ── assemblePrompt Tests ────────────────────────────────────────────────────

describe("assemblePrompt", () => {
  it("includes all critical sections", () => {
    const result = assemblePrompt(
      mockDirective,
      mockProductContext,
      mockBrandProfile,
      mockAudience,
      mockOutputConfig,
      null,
    );

    expect(result).toContain("## BRAND");
    expect(result).toContain("Nutricost");
    expect(result).toContain("Creatine Gummies");
    expect(result).toContain("Power Your Day with Nutricost");
    expect(result).toContain("5g Pure Creatine");
    expect(result).toContain("#1A1A2E");
    expect(result).toContain("Inter");
    expect(result).toContain("Fitness Enthusiasts 25-35");
    expect(result).toContain("1:1");
    expect(result).toContain("1K");
  });

  it("includes product claims and ingredients", () => {
    const result = assemblePrompt(
      mockDirective,
      mockProductContext,
      mockBrandProfile,
      mockAudience,
      mockOutputConfig,
      null,
    );

    expect(result).toContain("5g creatine per serving");
    expect(result).toContain("Creatine Monohydrate");
    expect(result).toContain("Increased strength");
  });

  it("omits body text instruction when bodyText is null", () => {
    const noBodyDirective = { ...mockDirective, bodyText: null };
    const result = assemblePrompt(
      noBodyDirective,
      mockProductContext,
      mockBrandProfile,
      mockAudience,
      mockOutputConfig,
      null,
    );

    expect(result).toContain("Body: NONE");
  });

  it("includes language override for non-English", () => {
    const result = assemblePrompt(
      mockDirective,
      mockProductContext,
      mockBrandProfile,
      mockAudience,
      mockOutputConfig,
      null,
      undefined,
      undefined,
      undefined,
      undefined,
      "de",
    );

    expect(result).toContain("LANGUAGE OVERRIDE");
    expect(result).toContain("German (Deutsch)");
  });

  it("omits language block for English", () => {
    const result = assemblePrompt(
      mockDirective,
      mockProductContext,
      mockBrandProfile,
      mockAudience,
      mockOutputConfig,
      null,
      undefined,
      undefined,
      undefined,
      undefined,
      "en-US",
    );

    expect(result).not.toContain("LANGUAGE OVERRIDE");
  });

  it("includes ad copy override when provided", () => {
    const result = assemblePrompt(
      mockDirective,
      mockProductContext,
      mockBrandProfile,
      mockAudience,
      mockOutputConfig,
      null,
      undefined,
      undefined,
      { headline: "Custom Headline!", bodyText: "Custom body" },
    );

    expect(result).toContain("MANDATORY AD COPY");
    expect(result).toContain("Custom Headline!");
    expect(result).toContain("Custom body");
  });

  it("uses productName override when provided", () => {
    const result = assemblePrompt(
      mockDirective,
      mockProductContext,
      mockBrandProfile,
      mockAudience,
      mockOutputConfig,
      null,
      "Override Product Name",
    );

    expect(result).toContain("Override Product Name");
  });

  it("uses concept prompt layout variants when available", () => {
    const conceptPrompt: ConceptPrompt = {
      conceptId: "data_hook",
      label: "Data Hook",
      prompt:
        "Base rules\n### Variant A\nLayout A content\n### Variant B\nLayout B content",
      referenceImages: [],
    };

    const result = assemblePrompt(
      mockDirective,
      mockProductContext,
      mockBrandProfile,
      mockAudience,
      mockOutputConfig,
      conceptPrompt,
    );

    expect(result).toContain('CONCEPT: "Data Hook"');
    expect(result).toContain("Variant A");
  });

  it("selects correct variant based on variantIndex", () => {
    const conceptPrompt: ConceptPrompt = {
      conceptId: "data_hook",
      label: "Data Hook",
      prompt: "### Variant A\nFirst layout\n### Variant B\nSecond layout",
      referenceImages: [],
    };

    const config1 = { ...mockOutputConfig, variantIndex: 1, count: 2 };
    const result = assemblePrompt(
      mockDirective,
      mockProductContext,
      mockBrandProfile,
      mockAudience,
      config1,
      conceptPrompt,
    );

    expect(result).toContain("Variant B");
  });

  it("includes image layout info section for multiple product images", () => {
    const result = assemblePrompt(
      mockDirective,
      mockProductContext,
      mockBrandProfile,
      mockAudience,
      mockOutputConfig,
      null,
      undefined,
      undefined,
      undefined,
      3,
    );

    expect(result).toContain("OUR PRODUCT (FRONT)");
    expect(result).toContain("OUR PRODUCT (BACK)");
    expect(result).toContain("OUR PRODUCT (EXTRA ANGLES)");
  });
});

// ── assembleCompetitorRefPrompt Tests ───────────────────────────────────────

describe("assembleCompetitorRefPrompt", () => {
  const mockAnalysis: CompetitorAdAnalysis = {
    layout: "Product centered, text top-left",
    colorScheme: "#FF0000, #00FF00",
    typographyStyle: "Bold sans-serif",
    visualHierarchy: "Product first, then headline",
    composition: "Centered symmetrical",
    textPlacement: "Top-left quadrant",
    mood: "Energetic, bold",
    strengths: ["Strong visual hook", "Clear CTA"],
    weaknesses: ["Generic background", "Low contrast text"],
    replicationGuide: "Place product center at 50%...",
    creativeConcept: "Data-driven ingredient callout",
    productPresentation: "Product floating on gradient",
    propsAndContext: "Scattered pills, measuring scoop",
    textContent: "5g Pure Creatine | Power Up",
    authenticityScore: "7/10 — mostly realistic",
    improvementOpportunities: ["Better lighting", "Stronger CTA"],
    adType: "traditional",
    funnelStage: "product_aware",
    productVisibility: "hero",
    stealthCategory: null,
    textDensity: "moderate",
    brandingLevel: "strong",
    hasHumanElements: false,
    humanDescription: null,
  };

  it("includes competitor analysis sections", () => {
    const result = assembleCompetitorRefPrompt(
      mockAnalysis,
      mockProductContext,
      mockBrandProfile,
      mockAudience,
      mockOutputConfig,
    );

    expect(result).toContain("REPLICATE the competitor reference");
    expect(result).toContain("BRAND COLORS (ZERO TOLERANCE");
    expect(result).toContain("Product centered, text top-left");
    expect(result).toContain("Data-driven ingredient callout");
    expect(result).toContain("FIX: Generic background");
  });

  it("includes brand colors and bans competitor colors", () => {
    const result = assembleCompetitorRefPrompt(
      mockAnalysis,
      mockProductContext,
      mockBrandProfile,
      mockAudience,
      mockOutputConfig,
    );

    expect(result).toContain("#1A1A2E");
    expect(result).toContain("BANNED");
    expect(result).toContain("#FF0000, #00FF00");
  });

  it("applies different variant optimizations", () => {
    const config0 = { ...mockOutputConfig, variantIndex: 0 };
    const config1 = { ...mockOutputConfig, variantIndex: 1, count: 3 };

    const result0 = assembleCompetitorRefPrompt(
      mockAnalysis,
      mockProductContext,
      mockBrandProfile,
      mockAudience,
      config0,
    );
    const result1 = assembleCompetitorRefPrompt(
      mockAnalysis,
      mockProductContext,
      mockBrandProfile,
      mockAudience,
      config1,
    );

    expect(result0).toContain("Maximum fidelity to reference");
    expect(result1).toContain("elevated production quality");
  });

  it("includes language override for non-English", () => {
    const result = assembleCompetitorRefPrompt(
      mockAnalysis,
      mockProductContext,
      mockBrandProfile,
      mockAudience,
      mockOutputConfig,
      undefined,
      undefined,
      undefined,
      "fr",
    );

    expect(result).toContain("LANGUAGE OVERRIDE");
    expect(result).toContain("French (Français)");
  });

  it("handles missing weaknesses gracefully", () => {
    const noWeaknesses = {
      ...mockAnalysis,
      weaknesses: [],
      improvementOpportunities: [],
    };
    const result = assembleCompetitorRefPrompt(
      noWeaknesses,
      mockProductContext,
      mockBrandProfile,
      mockAudience,
      mockOutputConfig,
    );

    expect(result).toContain("sharper, more polished");
  });
});
