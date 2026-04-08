import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { z } from 'zod'
import { recordAdminAudit } from '../../../lib/admin-control-tower'
import { prisma } from '../../../lib/prisma'
import { isAuthFailure, parseRequestBody, requireAdminUser } from '../../../lib/server-auth'
import { validateBody } from '../../../lib/validate'

const CreateAnnouncementBodySchema = z.object({
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
  tone: z.string().max(50).optional(),
  dismissible: z.boolean().optional(),
  isActive: z.boolean().optional(),
  startsAt: z.string().datetime({ offset: true }).optional().nullable(),
  endsAt: z.string().datetime({ offset: true }).optional().nullable(),
})

export const GET = withErrorHandling(async (req: NextRequest) => {
    const auth = await requireAdminUser(req)
    if (isAuthFailure(auth)) {
      return auth.response
    }

    const announcements = await prisma.adminAnnouncement.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json({ announcements }, {
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
    })

})

export const POST = withErrorHandling(async (req: NextRequest) => {
    const auth = await requireAdminUser(req)
    if (isAuthFailure(auth)) {
      return auth.response
    }
    const { user } = auth
    const parsed = await parseRequestBody(req)
    if ('error' in parsed) return parsed.error
    const validation = validateBody(CreateAnnouncementBodySchema, parsed.data)
    if ('error' in validation) return validation.error
    const { title, message, tone, dismissible, isActive, startsAt, endsAt } = validation.value

    const announcement = await prisma.adminAnnouncement.create({
      data: {
        title: title.trim(),
        message: message.trim(),
        tone: tone ? tone.toUpperCase() : 'INFO',
        dismissible: dismissible !== false,
        isActive: isActive !== false,
        startsAt: startsAt ? new Date(startsAt) : new Date(),
        endsAt: endsAt ? new Date(endsAt) : null,
        createdById: user.id,
      },
    })

    await recordAdminAudit({
      adminId: user.id,
      action: 'announcement_created',
      targetType: 'ANNOUNCEMENT',
      targetId: announcement.id,
      targetLabel: announcement.title,
    })

    return NextResponse.json({ announcement }, { status: 201 })

})
