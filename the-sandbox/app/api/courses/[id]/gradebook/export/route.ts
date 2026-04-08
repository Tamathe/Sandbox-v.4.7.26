import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'
import { requireRequestUser, isAuthFailure } from '../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../lib/api-utils'

export const runtime = 'nodejs'

// Escape a CSV field: wrap in quotes and double any internal quotes.
function csvField(value: string | number | null | undefined): string {
  if (value == null) return ''
  const str = String(value)
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function csvRow(fields: (string | number | null | undefined)[]): string {
  return fields.map(csvField).join(',')
}

// GET /api/courses/[id]/gradebook/export
// Faculty / admin only — returns a CSV of all GradebookEntries for the course.
export const GET = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const course = await prisma.course.findUnique({
    where: { id },
    select: { id: true, instructorId: true },
  })
  if (!course) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isFaculty = user.role === 'ADMIN' || (user.role === 'EDUCATOR' && user.id === course.instructorId)
  if (!isFaculty) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const entries = await prisma.gradebookEntry.findMany({
    where: {
      submission: {
        assignment: { courseId: id },
      },
    },
    select: {
      id: true,
      status: true,
      aiScore: true,
      facultyScore: true,
      submission: {
        select: {
          submittedAt: true,
          student: { select: { name: true, email: true } },
          assignment: {
            select: { title: true, pointsPossible: true },
          },
        },
      },
    },
    orderBy: [
      { submission: { student: { name: 'asc' } } },
      { submission: { assignment: { title: 'asc' } } },
    ],
  })

  const header = csvRow([
    'Student Name',
    'Student Email',
    'Assignment Title',
    'Points Possible',
    'AI Score',
    'AI Score %',
    'Faculty Score',
    'Faculty Score %',
    'Status',
    'Submitted At',
  ])

  const rows = entries.map((e) => {
    const pts = e.submission.assignment.pointsPossible
    const aiPct =
      e.aiScore != null && pts > 0
        ? `${((e.aiScore / pts) * 100).toFixed(1)}%`
        : ''
    const facPct =
      e.facultyScore != null && pts > 0
        ? `${((e.facultyScore / pts) * 100).toFixed(1)}%`
        : ''

    return csvRow([
      e.submission.student.name,
      e.submission.student.email,
      e.submission.assignment.title,
      pts,
      e.aiScore,
      aiPct,
      e.facultyScore,
      facPct,
      e.status,
      e.submission.submittedAt.toISOString(),
    ])
  })

  const csv = [header, ...rows].join('\r\n')

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="gradebook-${id}.csv"`,
    },
  })
})
