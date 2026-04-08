import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { recordAdminAudit } from '../../../../lib/admin-control-tower'
import { prisma } from '../../../../lib/prisma'
import { isAuthFailure, parseRequestBody, requireAdminUser } from '../../../../lib/server-auth'
import { validateBody } from '../../../../lib/validate'

const PatchSubmissionSchema = z.object({
  approvalStatus: z.enum(['APPROVED', 'REJECTED', 'PENDING', 'SUSPENDED']),
  aiRejectReason: z.string().max(2000).optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminUser(req)
    if (isAuthFailure(auth)) {
      return auth.response
    }
    const { user } = auth
    const { id } = await params
    const parsed = await parseRequestBody(req)
    if ('error' in parsed) return parsed.error
    const validation = validateBody(PatchSubmissionSchema, parsed.data)
    if ('error' in validation) return validation.error
    const { approvalStatus, aiRejectReason } = validation.value

    const submission = await prisma.sandcastleSubmission.update({
      where: { id },
      data: {
        approvalStatus,
        reviewedByAdminId: user.id,
        aiRejectReason:
          approvalStatus === 'REJECTED' && aiRejectReason !== undefined
            ? aiRejectReason.trim()
            : undefined,
      },
    })

    await recordAdminAudit({
      adminId: user.id,
      action: `sandcastle_${approvalStatus.toLowerCase()}`,
      targetType: 'SANDCASTLE_SUBMISSION',
      targetId: submission.id,
      targetLabel: submission.title,
      metadata: {
        approvalStatus,
        aiVerdict: submission.aiVerdict,
      },
    })

    return NextResponse.json({ submission })
  } catch (error) {
    console.error('PATCH /api/admin/sandcastle-submissions/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update submission' }, { status: 500 })
  }
}
