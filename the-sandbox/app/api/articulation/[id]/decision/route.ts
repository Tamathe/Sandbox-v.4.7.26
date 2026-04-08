import { NextRequest, NextResponse } from 'next/server'
import { ArticulationStatus } from '../../../../generated/prisma'
import { canReviewArticulations } from '../../../../lib/articulation'
import { prisma } from '../../../../lib/prisma'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { validateBody } from '../../../../lib/validate'
import { z } from 'zod'
import { withErrorHandling } from '../../../../lib/api-utils'

const ArticulationDecisionSchema = z.object({
  decision: z.enum(['APPROVED', 'DENIED']),
})

type RouteContext = {
  params: Promise<{ id: string }>
}

export const POST = withErrorHandling(async (request: NextRequest, context: RouteContext) => {
    const auth = await requireRequestUser(request)
    if (isAuthFailure(auth)) return auth.response

    if (!canReviewArticulations(auth.user.role)) {
      return NextResponse.json({ error: 'Educator or admin access required.' }, { status: 403 })
    }

    const parsed = await parseRequestBody(request)
    if ('error' in parsed) return parsed.error
    const validation = validateBody(ArticulationDecisionSchema, parsed.data)
    if ('error' in validation) return validation.error
    const { decision } = validation.value

    const { id } = await context.params
    const existing = await prisma.articulationRequest.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Articulation request not found.' }, { status: 404 })
    }

    const updated = await prisma.articulationRequest.update({
      where: { id },
      data: {
        status:
          decision === 'APPROVED'
            ? ArticulationStatus.APPROVED
            : ArticulationStatus.DENIED,
        reviewedBy: auth.user.email,
      },
    })

    return NextResponse.json(updated)
  })
