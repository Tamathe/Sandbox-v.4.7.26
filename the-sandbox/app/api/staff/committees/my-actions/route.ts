import { NextRequest, NextResponse } from 'next/server'
import { requireStaffOrAdminUser, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { prisma } from '../../../../lib/prisma'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { user } = auth

  // Find all open/in-progress action items for the current user
  // Match on ownerUserId OR fuzzy match on ownerName against user's name
  const items = await prisma.committeeActionItem.findMany({
    where: {
      status: { in: ['open', 'in-progress'] },
      OR: [
        { ownerUserId: user.id },
        { ownerName: { contains: user.name ?? '', mode: 'insensitive' } },
      ],
    },
    include: {
      committee: { select: { id: true, name: true } },
      meeting: { select: { meetingNumber: true } },
    },
    orderBy: [
      { dueDate: { sort: 'asc', nulls: 'last' } },
      { priority: 'asc' },
    ],
  })

  // Group by committee
  const grouped = new Map<string, { id: string; name: string; items: typeof items }>()
  for (const item of items) {
    const key = item.committeeId
    if (!grouped.has(key)) {
      grouped.set(key, { id: item.committee.id, name: item.committee.name, items: [] })
    }
    grouped.get(key)!.items.push(item)
  }

  type ActionItemRow = typeof items[number]
  const committees = Array.from(grouped.values()).map((g) => ({
    id: g.id,
    name: g.name,
    items: g.items.map((item: ActionItemRow) => ({
      id: item.id,
      action: item.action,
      ownerName: item.ownerName,
      dueDate: item.dueDate?.toISOString() ?? null,
      priority: item.priority,
      status: item.status,
      notes: item.notes,
      meetingId: item.meetingId,
      meetingNumber: item.meeting.meetingNumber,
    })),
  }))

  const totalCount = items.length

  return NextResponse.json({ committees, totalCount }, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})
