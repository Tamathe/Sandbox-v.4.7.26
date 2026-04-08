import { NextRequest, NextResponse } from 'next/server'
import { requireStaffOrAdminUser, isAuthFailure } from '../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { submitForApproval } from '../../../../../lib/staff/communication-service'
import { createApprovalChain } from '../../../../../lib/staff/approval-service'
import { prisma } from '../../../../../lib/prisma'

export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params

  // Fetch communication to get its type
  const comm = await prisma.staffCommunication.findUniqueOrThrow({ where: { id } })

  // Create structured approval chain steps
  const steps = await createApprovalChain(id, comm.type, auth.user.email)

  // Update communication status to pending-review (unless all steps were auto-approved)
  const allAutoApproved = steps.length > 0 && steps.every((s) => s.status === 'approved')

  let communication
  if (steps.length === 0 || allAutoApproved) {
    // No approval needed or all auto-approved — mark as approved directly
    communication = await prisma.staffCommunication.update({
      where: { id },
      data: { status: 'approved' },
      include: { approvalSteps: { orderBy: { stepOrder: 'asc' } } },
    })
  } else {
    communication = await submitForApproval(id)
    // Re-fetch with approval steps
    communication = await prisma.staffCommunication.findUniqueOrThrow({
      where: { id },
      include: { approvalSteps: { orderBy: { stepOrder: 'asc' } } },
    })
  }

  return NextResponse.json({ communication, approvalSteps: steps })
})
