import { NextRequest, NextResponse } from 'next/server'
import { requireStaffOrAdminUser, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { advanceApproval, getCurrentActiveStep } from '../../../../../lib/staff/approval-service'
import { prisma } from '../../../../../lib/prisma'

export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params
  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as { decision?: string; comment?: string; stepId?: string }

  const decision = (body.decision ?? 'approved') as 'approved' | 'rejected'
  if (decision !== 'approved' && decision !== 'rejected') {
    return NextResponse.json({ error: 'Decision must be "approved" or "rejected"' }, { status: 400 })
  }

  // Find the step to advance — either specified by stepId or the current active step
  let stepId = body.stepId
  if (!stepId) {
    const activeStep = await getCurrentActiveStep(id)
    if (!activeStep) {
      return NextResponse.json({ error: 'No pending approval step found' }, { status: 400 })
    }
    stepId = activeStep.id
  }

  const step = await advanceApproval(stepId, decision, body.comment)

  // Fetch updated communication with all steps
  const communication = await prisma.staffCommunication.findUniqueOrThrow({
    where: { id },
    include: { approvalSteps: { orderBy: { stepOrder: 'asc' } } },
  })

  return NextResponse.json({ communication, step })
})
