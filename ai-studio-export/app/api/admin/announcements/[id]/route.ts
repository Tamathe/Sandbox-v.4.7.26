import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { recordAdminAudit } from '../../../../lib/admin-control-tower'
import { prisma } from '../../../../lib/prisma'
import { isAuthFailure, parseRequestBody, requireAdminUser } from '../../../../lib/server-auth'
import { validateBody } from '../../../../lib/validate'

const PatchAnnouncementSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  message: z.string().min(1).max(5000).optional(),
  tone: z.string().max(50).optional(),
  dismissible: z.boolean().optional(),
  isActive: z.boolean().optional(),
  startsAt: z.string().datetime({ offset: true }).optional().nullable(),
  endsAt: z.string().datetime({ offset: true }).optional().nullable(),
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
    const validation = validateBody(PatchAnnouncementSchema, parsed.data)
    if ('error' in validation) return validation.error
    const { title, message, tone, dismissible, isActive, startsAt, endsAt } = validation.value

    const announcement = await prisma.adminAnnouncement.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(message !== undefined && { message: message.trim() }),
        ...(tone !== undefined && { tone: tone.toUpperCase() }),
        ...(dismissible !== undefined && { dismissible }),
        ...(isActive !== undefined && { isActive }),
        ...(startsAt !== undefined && {
          startsAt: startsAt ? new Date(startsAt) : new Date(),
        }),
        ...(endsAt !== undefined && {
          endsAt: endsAt ? new Date(endsAt) : null,
        }),
      },
    })

    await recordAdminAudit({
      adminId: user.id,
      action: 'announcement_updated',
      targetType: 'ANNOUNCEMENT',
      targetId: announcement.id,
      targetLabel: announcement.title,
      metadata: {
        isActive: announcement.isActive,
        tone: announcement.tone,
      },
    })

    return NextResponse.json({ announcement })
  } catch (error) {
    console.error('PATCH /api/admin/announcements/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update announcement' }, { status: 500 })
  }
}
