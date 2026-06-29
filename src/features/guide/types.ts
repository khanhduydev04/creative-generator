// ─── Guide Content Block Types ──────────────────────────────────────────────

export type GuideContentBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; level: 3 | 4; text: string; id: string }
  | { type: 'steps'; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'tip'; text: string }
  | { type: 'warning'; text: string }
  | { type: 'list'; items: string[]; ordered?: boolean }

// ─── Guide Structure ────────────────────────────────────────────────────────

export interface GuideSubSection {
  id: string
  title: string
  content: GuideContentBlock[]
}

export interface GuideSection {
  id: string
  number: number
  title: string
  icon: string
  description: string
  adminOnly: boolean
  content: GuideContentBlock[]
  subsections: GuideSubSection[]
}

// ─── Setup Checklist ────────────────────────────────────────────────────────

export interface SetupChecklistItem {
  id: string
  label: string
  description: string
  required: boolean
  linkTo: string
}

// ─── Search ─────────────────────────────────────────────────────────────────

export interface GuideSearchResult {
  sectionId: string
  sectionTitle: string
  subsectionId?: string
  subsectionTitle?: string
  matchedText: string
}
