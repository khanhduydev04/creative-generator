// Shared concept type definitions — safe for both client and server imports
// Concept data is now stored in the concept_prompts Supabase table
// Client components fetch via GET /api/concepts
// Server code fetches via ConceptPromptService

import type { Database } from "@/types/database.types";

type ConceptPromptRow = Database["public"]["Tables"]["concept_prompts"]["Row"];

/** Client-safe concept metadata (no prompt content) */
export interface Concept {
  id: string;
  label: string;
  description: string;
  requiresCompetitor: boolean;
  referenceImages: string[];
}

/** Full concept with prompt data (server-side only) */
export interface ConceptWithPrompt extends Concept {
  prompt: string;
}

/** Convert a DB row to client-safe Concept */
export function toConceptFromRow(row: ConceptPromptRow): Concept {
  return {
    id: row.concept_id,
    label: row.label,
    description: row.description,
    requiresCompetitor: row.requires_competitor,
    referenceImages: row.reference_images,
  };
}

/** Convert a DB row to full ConceptWithPrompt */
export function toConceptWithPromptFromRow(row: ConceptPromptRow): ConceptWithPrompt {
  return {
    id: row.concept_id,
    label: row.label,
    description: row.description,
    requiresCompetitor: row.requires_competitor,
    referenceImages: row.reference_images,
    prompt: row.prompt,
  };
}
