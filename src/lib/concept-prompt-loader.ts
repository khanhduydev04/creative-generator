// Server-only module — loads concept prompt data from Supabase
import { createClient } from "@/lib/supabase/server";
import { ConceptPromptService } from "@/services/conceptPromptService";
import type { ConceptWithPrompt } from "@/lib/concepts";
import { toConceptWithPromptFromRow } from "@/lib/concepts";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ConceptPrompt {
  conceptId: string;
  label: string;
  prompt: string;
  referenceImages: string[];
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Load concept prompt data from database.
 * Returns null if the concept has no prompt content (empty prompt).
 */
export async function loadConceptPrompt(
  conceptId: string,
): Promise<ConceptPrompt | null> {
  try {
    const supabase = await createClient();
    const service = new ConceptPromptService(supabase);
    const row = await service.getByConceptId(conceptId);

    if (!row) return null;

    // If prompt is empty, treat as not yet configured
    if (!row.prompt) return null;

    return {
      conceptId: row.concept_id,
      label: row.label,
      prompt: row.prompt,
      referenceImages: row.reference_images,
    };
  } catch (err) {
    console.warn(
      `[concept-prompt-loader] Failed to load concept "${conceptId}" from DB: ${err instanceof Error ? err.message : String(err)}`,
    );
    return null;
  }
}

/**
 * Load full concept data (metadata + prompts) from database.
 * Used by the generation pipeline to get both concept info and prompt content in one query.
 */
export async function loadFullConcept(
  conceptId: string,
): Promise<ConceptWithPrompt | null> {
  try {
    const supabase = await createClient();
    const service = new ConceptPromptService(supabase);
    const row = await service.getByConceptId(conceptId);

    if (!row) return null;

    return toConceptWithPromptFromRow(row);
  } catch (err) {
    console.warn(
      `[concept-prompt-loader] Failed to load full concept "${conceptId}" from DB: ${err instanceof Error ? err.message : String(err)}`,
    );
    return null;
  }
}

/**
 * Check which concepts have prompt data configured.
 */
export async function getAvailableConceptPrompts(): Promise<string[]> {
  try {
    const supabase = await createClient();
    const service = new ConceptPromptService(supabase);
    const rows = await service.getAll();

    return rows
      .filter((row) => row.prompt)
      .map((row) => row.concept_id);
  } catch {
    return [];
  }
}
