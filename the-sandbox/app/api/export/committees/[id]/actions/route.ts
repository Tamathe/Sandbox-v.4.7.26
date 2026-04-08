import { NextRequest, NextResponse } from 'next/server'
import { requireStaffOrAdminUser, isAuthFailure } from '../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { prisma } from '../../../../../lib/prisma'
import { generateCSV } from '../../../../../lib/export-service'
import type { ExportColumn } from '../../../../../lib/export-service'

const COLUMNS: ExportColumn[] = [
  { key: 'title', label: 'Title' },
  { key: 'assignee', label: 'Assignee' },
  { key: 'dueDate', label: 'Due Date', format: 'date' },
  { key: 'status', label: 'Status' },
  { key: 'committee', label: 'Committee' },
]

export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { id: committeeId } = await params

  // Fetch committee name and action items
  const [committee, actionItems] = await Promise.all([
    prisma.committee.findUnique({
      where: { id: committeeId },
      select: { name: true },
    }),
    prisma.committeeActionItem.findMany({
      where: { committeeId },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  if (!committee) {
    return NextResponse.json({ error: 'Committee not found' }, { status: 404 })
  }

  const data = actionItems.map((item) => ({
    title: item.action,
    assignee: item.ownerName ?? '',
    dueDate: item.dueDate,
    status: item.status,
    committee: committee.name,
  }))

  const csv = generateCSV(data, COLUMNS)
  const timestamp = new Date().toISOString().slice(0, 10)
  const safeName = committee.name.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase()

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${safeName}-actions-${timestamp}.csv"`,
    },
  })
})
