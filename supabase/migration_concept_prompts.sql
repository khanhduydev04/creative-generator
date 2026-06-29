-- Migration: Create concept_prompts table
-- Replaces file-based concept system (src/lib/concepts.ts + src/data/concept/skills/*/PROMPT.md)
-- with a database-driven approach that works on serverless platforms

CREATE TABLE IF NOT EXISTS concept_prompts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  concept_id TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  description TEXT NOT NULL,
  requires_competitor BOOLEAN DEFAULT FALSE,
  creative_strategy TEXT NOT NULL DEFAULT '',
  visual_prompt TEXT NOT NULL DEFAULT '',
  layout_variants TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE concept_prompts ENABLE ROW LEVEL SECURITY;

-- Allow read access for all authenticated and anon users (concepts are public data)
CREATE POLICY "concept_prompts_select" ON concept_prompts
  FOR SELECT USING (true);

-- Allow full access for authenticated users (admin CRUD)
CREATE POLICY "concept_prompts_insert" ON concept_prompts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "concept_prompts_update" ON concept_prompts
  FOR UPDATE USING (true);

CREATE POLICY "concept_prompts_delete" ON concept_prompts
  FOR DELETE USING (true);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_concept_prompts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER concept_prompts_updated_at
  BEFORE UPDATE ON concept_prompts
  FOR EACH ROW
  EXECUTE FUNCTION update_concept_prompts_updated_at();

-- Seed with existing concepts
-- data_hook has full prompt data from PROMPT.md; others get metadata only (empty prompt fields)

INSERT INTO concept_prompts (concept_id, label, description, requires_competitor, creative_strategy, visual_prompt, layout_variants)
VALUES
  (
    'data_hook',
    'Data Hook',
    'Lead with a compelling statistic or percentage claim. No competitor product needed.',
    FALSE,
    E'You are a senior performance marketing strategist specialized in the "Data Hook" methodology for static Meta ads.\n\n### Core Philosophy\n- Lead with a SPECIFIC, compelling data point — a number, percentage, or measurable claim that stops the scroll\n- The data must feel concrete and verifiable, not vague ("74% reported improvement" > "most people love it")\n- Skimmability is king: the entire ad must be readable in under 2 seconds\n\n### Headline Construction Rules\n1. Open with the NUMBER or DATA POINT — it must be the first thing the eye hits\n2. Use "Level 5" benefits, not "Level 1":\n   - BAD (Level 1): "Lose Weight Fast"\n   - GOOD (Level 5): "Fit into the dress that''s been in your closet for 6 months"\n3. Maximum 8 words. Every word must earn its place\n4. Prefer odd numbers and specific percentages (e.g., "73%" feels more real than "75%")\n5. If possible, tie the data to the audience''s specific fear or desire\n\n### Body Text Rules\n- Optional. If used, maximum 6 words\n- Should reinforce the headline data with a secondary proof point or CTA\n- Examples: "Clinically proven formula" / "Join 50,000+ users" / "See results in 14 days"\n\n### Emotional Hook Strategy\n- Primary trigger: CREDIBILITY through specificity\n- Secondary trigger: FOMO — "others already know this, you don''t"\n- The viewer should feel: "This is backed by real data, I can trust this"\n- Avoid hype language. Let the number speak\n\n### Differentiation Approach\n- Analyze competitor ads for VAGUE claims ("best", "amazing", "#1")\n- Counter with SPECIFIC data points that competitors cannot match\n- Use the 70/20/10 rule: 70% borrow proven patterns, 20% iterate on winners, 10% creative swings\n- Find the "white space" — what data point is NO competitor using?\n\n### Audience Targeting\n- Define a singular avatar, not a demographic ("Susan, 45, afraid of her next doctor visit")\n- Address their specific objection: WHY they won''t buy → counter with data\n- Match the data point to their awareness level:\n  - Problem-Aware: data about the problem severity\n  - Solution-Aware: data about the solution''s effectiveness\n  - Product-Aware: data about this specific product''s superiority',
    E'### Required Elements (every variant MUST include all 4)\n1. **DATA ANCHOR** — The number/percentage rendered as the dominant visual element (2-3x scale vs any other text)\n2. **PRODUCT HERO** — Product packaging with photographic precision: sharp focus, studio lighting, slight shadow for depth\n3. **PROOF ELEMENT** — One supporting credibility signal: ingredient scatter, clinical badge, certification mark, data visualization, or user count\n4. **BRAND MARK** — Logo, small and non-competing\n\n### Typography Rules\n- Data number/percentage: Extra-bold weight, always the largest text element on canvas\n- High contrast: light text on dark background OR dark text on light background\n- Never place text over busy product imagery\n- Clean sans-serif preferred for data-driven credibility\n\n### Color Strategy\n- Limit to 3 colors maximum — data-driven = clean and clinical\n- Use accent color ONLY on the key number/percentage to draw the eye\n- High contrast ratio for mobile feed legibility (minimum 4.5:1)\n- Brand primary color should dominate the canvas (60-70%)\n\n### Visual Style\n- Minimalist, science-driven aesthetic\n- No decorative clutter — every element serves conversion\n- Product must look premium: sharp edges, accurate labels, no distortion\n- Background: subtle gradient or solid — never busy patterns\n- Lighting: clean, even, commercial photography quality\n- Strong mobile-first contrast — designed to pop in a fast-scrolling feed\n\n### Anti-Patterns (NEVER do these)\n- No generic stock imagery or lifestyle scenes without purpose\n- No white text on yellow/light backgrounds\n- No more than 2 text elements (headline + optional body)\n- No decorative borders or frames that waste space\n- No faces unless the concept specifically requires social proof imagery',
    E'When generating a Data Hook ad, select or rotate among the following layout variants. Each variant repositions the 4 Required Elements into a different spatial hierarchy while preserving the core Data Hook DNA.\n\n### Variant A — "Classic Stack"\n- **Structure:** Vertical top-down flow\n- **Data Anchor:** Top 35-40% of canvas, centered, maximum scale\n- **Product Hero:** Center, below the data, medium scale\n- **Proof Element:** Below product, small horizontal strip (badge, icon row, or single-line text)\n- **Brand Mark:** Bottom-right corner\n- **Best for:** Single-product focus, clean and authoritative. Strong default choice\n\n### Variant B — "Split Frame"\n- **Structure:** Canvas divided vertically into 2 columns (roughly 55/45 or 60/40)\n- **Left column:** Data Anchor (top) + Body Text or Proof Element (bottom)\n- **Right column:** Product Hero, vertically centered, with subtle background color differentiation\n- **Brand Mark:** Bottom of either column\n- **Best for:** When product packaging is visually strong and deserves equal weight with the data\n\n### Variant C — "Data Dominant"\n- **Structure:** The number/percentage fills 50-60% of the canvas as oversized typographic art\n- **Product Hero:** Overlapping or anchored at bottom-right corner, 25-30% of canvas\n- **Proof Element:** Integrated into or directly below the data (e.g., "73% — Clinically Verified")\n- **Brand Mark:** Top-left or bottom-left, subtle\n- **Best for:** When the data point itself is the most compelling differentiator, and the number alone should stop the scroll\n\n### Variant D — "Product Pedestal"\n- **Structure:** Product dominates the center (40-50% of canvas)\n- **Data Anchor:** Positioned as a bold overlay badge or banner across the top or angled corner\n- **Proof Element:** Floating around the product (ingredient scatter, certification stamps, micro-icons)\n- **Brand Mark:** Integrated near product base\n- **Best for:** When the product packaging is premium and the visual sells as much as the data\n\n### Variant E — "Comparison Strip"\n- **Structure:** Horizontal or diagonal division — "Before/Without" vs "After/With"\n- **Data Anchor:** Positioned at the dividing line or spanning both sections as a bridging element\n- **Left/Top section:** Problem state (muted colors, grayscale, or red-tinted)\n- **Right/Bottom section:** Solution state with Product Hero (vibrant, brand colors)\n- **Proof Element:** Below the comparison or integrated into the "solution" side\n- **Brand Mark:** Bottom-right of solution side\n- **Best for:** Problem-aware audiences, competitive positioning, "with vs. without" narratives\n\n### Variant F — "Editorial Card"\n- **Structure:** Resembles a magazine feature or news headline card\n- **Data Anchor:** Top, styled as a bold editorial headline (think newspaper front page)\n- **Body Text:** Subheadline below the data, slightly longer allowed (up to 10 words) for editorial feel\n- **Product Hero:** Lower half, offset left or right with white space\n- **Proof Element:** Styled as a "source citation" or "study badge" at the bottom\n- **Brand Mark:** Top-right corner, small\n- **Best for:** Solution-aware and product-aware audiences. Gives a PR/news credibility feel. Works well with COA data, clinical study results, or third-party validation\n\n### Variant Selection Guide\n\nWhen choosing a variant, consider these factors:\n\n| Factor | Recommended Variant |\n|--------|-------------------|\n| Default / Testing new creative | A (Classic Stack) |\n| Strong product packaging | B (Split Frame) or D (Product Pedestal) |\n| Breakthrough data point (COA, clinical study) | C (Data Dominant) or F (Editorial Card) |\n| Competitive positioning / "us vs. them" | E (Comparison Strip) |\n| PR / third-party validation angle | F (Editorial Card) |\n| Scaling: need volume of variants fast | Rotate A → B → C across ad sets |\n\n### Creative Testing Protocol\n- Start with Variant A as control\n- Test 2-3 alternative variants per ad set\n- Same headline + data point across variants to isolate layout impact\n- Winner becomes new control; iterate with next variant batch'
  ),
  (
    'before_after',
    'Before / After',
    'Show transformation. Optional competitor product for contrast.',
    FALSE,
    '',
    '',
    ''
  ),
  (
    'vs_competitor',
    'Vs. Competitor',
    'Direct comparison against a named competitor product. Competitor product required.',
    TRUE,
    '',
    '',
    ''
  ),
  (
    'social_proof',
    'Social Proof',
    'Highlight reviews, testimonials, or user numbers as the lead hook.',
    FALSE,
    '',
    '',
    ''
  ),
  (
    'ingredient_callout',
    'Ingredient Callout',
    'Feature a hero ingredient with clinical or scientific backing.',
    FALSE,
    '',
    '',
    ''
  ),
  (
    'urgency_scarcity',
    'Urgency / Scarcity',
    'Time-limited offer or low-stock signal as the primary driver.',
    FALSE,
    '',
    '',
    ''
  )
ON CONFLICT (concept_id) DO NOTHING;
