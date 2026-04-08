import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { requireRequestUser, isAuthFailure } from '../../../../../lib/server-auth'
import { getEncounter } from '../../../../../lib/virtual-clinic/encounter-service'
import { scoreEncounter } from '../../../../../lib/virtual-clinic/scoring-service'

export const POST = withErrorHandling(async (req: NextRequest, context: { params: Promise<{ encounterId: string }> }) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { encounterId } = await context.params

  // Validate ownership
  const encounter = await getEncounter(encounterId)
  if (encounter.userId !== auth.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const scored = await scoreEncounter(encounterId)
  return NextResponse.json(scored)
})
