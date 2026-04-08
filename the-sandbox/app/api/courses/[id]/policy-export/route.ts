import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { requireCourseOwner, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'

const RECOMMENDED_CATEGORIES = ['late', 'attendance', 'grading', 'academic_integrity']

export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id: courseId } = await params

  const auth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(auth)) return auth.response

  const format = req.nextUrl.searchParams.get('format') ?? 'json'

  const [course, policies, weights, totalEnrolled, acknowledgedCount] = await Promise.all([
    prisma.course.findUnique({
      where: { id: courseId },
      select: { courseCode: true, title: true, semester: true, instructor: { select: { name: true } } },
    }),
    prisma.coursePolicy.findMany({ where: { courseId }, orderBy: { createdAt: 'asc' } }),
    prisma.gradingWeight.findMany({ where: { courseId }, orderBy: { createdAt: 'asc' } }),
    prisma.courseEnrollment.count({ where: { courseId } }),
    prisma.coursePolicyAck.count({ where: { courseId } }),
  ])

  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  }

  const presentCategories = new Set(policies.map((p) => p.policyType))
  const missingCategories = RECOMMENDED_CATEGORIES.filter((c) => !presentCategories.has(c))

  const exportData = {
    courseMetadata: {
      courseCode: course.courseCode,
      title: course.title,
      semester: course.semester ?? 'Not specified',
      instructor: course.instructor.name ?? 'Unknown',
    },
    policies: policies.map((p) => ({
      category: p.policyType,
      title: p.title,
      content: p.content,
    })),
    gradingWeights: weights.map((w) => ({
      category: w.category,
      weight: w.weight,
      description: w.description,
    })),
    completeness: {
      presentCategories: [...presentCategories],
      missingCategories,
      isComplete: missingCategories.length === 0,
    },
    acknowledgmentSummary: {
      totalEnrolled,
      acknowledged: acknowledgedCount,
      pending: totalEnrolled - acknowledgedCount,
    },
    exportedAt: new Date().toISOString(),
  }

  if (format === 'text') {
    const lines: string[] = []
    lines.push('=' .repeat(60))
    lines.push(`COURSE POLICY EXPORT`)
    lines.push('=' .repeat(60))
    lines.push('')
    lines.push(`Course: ${course.courseCode} — ${course.title}`)
    lines.push(`Semester: ${course.semester ?? 'Not specified'}`)
    lines.push(`Instructor: ${course.instructor.name ?? 'Unknown'}`)
    lines.push(`Exported: ${new Date().toISOString()}`)
    lines.push('')

    lines.push('-'.repeat(60))
    lines.push('POLICIES')
    lines.push('-'.repeat(60))
    for (const p of policies) {
      lines.push('')
      lines.push(`[${p.policyType.toUpperCase()}] ${p.title}`)
      lines.push(p.content)
    }
    if (policies.length === 0) lines.push('No policies on file.')

    lines.push('')
    lines.push('-'.repeat(60))
    lines.push('GRADING WEIGHTS')
    lines.push('-'.repeat(60))
    for (const w of weights) {
      const pct = `${Math.round(w.weight * 100)}%`.padStart(5)
      lines.push(`${pct}  ${w.category}${w.description ? ` — ${w.description}` : ''}`)
    }
    if (weights.length === 0) lines.push('No grading weights on file.')

    lines.push('')
    lines.push('-'.repeat(60))
    lines.push('ACKNOWLEDGMENT SUMMARY')
    lines.push('-'.repeat(60))
    lines.push(`Enrolled: ${totalEnrolled}`)
    lines.push(`Acknowledged: ${acknowledgedCount}`)
    lines.push(`Pending: ${totalEnrolled - acknowledgedCount}`)

    lines.push('')
    lines.push('-'.repeat(60))
    lines.push('COMPLETENESS')
    lines.push('-'.repeat(60))
    if (missingCategories.length === 0) {
      lines.push('All recommended policy categories are present.')
    } else {
      lines.push(`Missing categories: ${missingCategories.join(', ')}`)
    }

    const text = lines.join('\n')
    return new NextResponse(text, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${course.courseCode}-policies.txt"`,
      },
    })
  }

  // Default: JSON
  return NextResponse.json(exportData, {
    headers: {
      'Content-Disposition': `attachment; filename="${course.courseCode}-policies.json"`,
    },
  })
})
