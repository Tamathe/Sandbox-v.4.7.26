import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { requireAdminUser, isAuthFailure } from '../../../../../lib/server-auth'
import { generateAndSaveNarrative } from '../../../../../lib/accreditation/narrative-generator'
import { getActiveCycle } from '../../../../../lib/accreditation/dashboard-service'

export const POST = withErrorHandling(async (request: NextRequest, context: { params: Promise<{ standardId: string }> }) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { standardId } = await context.params

  const cycle = await getActiveCycle()
  if (!cycle) {
    return NextResponse.json({ error: 'No active accreditation cycle found' }, { status: 404 })
  }

  const result = await generateAndSaveNarrative(standardId, cycle.id)
  return NextResponse.json(result)
})
