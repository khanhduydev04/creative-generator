export interface BrandColors {
  primary1: string;
  primary2: string;
  secondary1: string;
  secondary2: string;
  accent1: string;
  accent2: string;
}

export interface BrandFormValues {
  name: string;
  description: string;
  typography: string;
  colors: BrandColors;
}

export interface BrandIntelligenceValues {
  research: string;
  summary: string;
  painPoints: string;
  angleIdeas: string;
}

export interface BrandProduct {
  id: string;
  brand_id: string;
  name: string;
  description: string | null;
  images: string[];
  product_url: string | null;
  cached_product_context: Record<string, unknown> | null;
  context_cached_at: string | null;
  primary_color_1: string | null;
  primary_color_2: string | null;
  secondary_color_1: string | null;
  secondary_color_2: string | null;
  accent_color_1: string | null;
  accent_color_2: string | null;
  attributes: string | null;
  target_audience: string | null;
  selling_points: string | null;
  price: string | null;
  created_at: string;
}

export interface ProductMarket {
  id: string;
  product_id: string;
  market_code: string;
  market_label: string;
  language: string;
  sheet_url: string | null;
  spreadsheet_id: string | null;
  sheet_gid: number | null;
  sheet_name: string | null;
  cached_csv: string | null;
  cached_at: string | null;
  created_at: string;
}

export interface Persona {
  id: string;
  brand_id: string;
  research_summary_id: string | null;
  title: string;
  pain: string | null;
  angle: string | null;
  emotion: string | null;
  source: "ai" | "manual";
  created_at: string;
}
