import { NextRequest, NextResponse } from 'next/server'
import { requireStaffOrAdminUser, isAuthFailure } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { getActionQueue } from '../../../lib/staff/action-queue-service'
import { generateCSV } from '../../../lib/export-service'
import type { ExportColumn } from '../../../lib/export-service'

const COLUMNS: ExportColumn[] = [
  { key: 'title', label: 'Title' },
  { key: 'priority', label: 'Priority' },
  { key: 'type', label: 'Type' },
  { key: 'department', label: 'Department' },
  { key: 'deadline', label: 'Deadline', format: 'date' },
  { key: 'status', label: 'Status' },
]

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { items } = await getActionQueue(auth.user.id, {
    status: ['pending'],
    limit: 500,
  })

  const data = items.map((item) => ({
    title: item.title,
    priority: item.priority,
    type: item.type,
    department: item.department ?? '',
    deadline: item.deadline,
    status: item.status,
  }))

  const csv = generateCSV(data, COLUMNS)
  const timestamp = new Date().toISOString().slice(0, 10)

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="action-queue-${timestamp}.csv"`,
    },
  })
})
