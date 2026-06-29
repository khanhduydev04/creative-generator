import { createClient } from '@/lib/supabase/server'
import { requireUser, handleApiError } from '@/lib/user-context'
import { ConceptPromptService } from '@/services/conceptPromptService'
import { UserConceptService } from '@/services/userConceptService'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/concepts
 * Returns merged system concepts + user-custom concepts.
 * Shape: { system: ConceptPrompt[], custom: UserConcept[] }
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireUser(request)
    const supabase = await createClient()
    const sys = new ConceptPromptService(supabase)
    const user = new UserConceptService(supabase, userId)
    const [system, custom] = await Promise.all([sys.listSystemConcepts(), user.list()])
    return NextResponse.json({ system, custom })
  } catch (e) {
    return handleApiError(e)
  }
}
