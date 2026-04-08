/**
 * GET /api/dashboard/suggested-tools
 *
 * Returns up to 3 tools suggested for the current student.
 * Priority: tools linked to enrolled courses that the student hasn't saved/used yet.
 * Fallback: top APPROVED tools by upvote count.
 *
 * Response: { tools: ToolCard[], label: string | null }
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../lib/server-auth'
import { prisma } from '../../../lib/prisma'
import { withErrorHandling } from '../../../lib/api-utils'

export const runtime = 'nodejs'

export const GET = withErrorHandling(async (req: NextRequest) => {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response
    const { user } = auth

    // Only meaningful for students — educators/admins get empty list
    if (user.role !== 'STUDENT') {
      return NextResponse.json({ tools: [], label: null }, {
        headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
      })
    }

    // IDs to exclude: tools already saved or already used
    const [savedToolIds, usedToolIds] = await Promise.all([
      prisma.libraryEntry
        .findMany({ where: { userId: user.id }, select: { toolId: true } })
        .then((entries) => entries.map((e) => e.toolId)),
      prisma.toolSession
        .findMany({
          where: { userId: user.id },
          select: { toolId: true },
          distinct: ['toolId'],
        })
        .then((sessions) => sessions.map((s) => s.toolId)),
    ])
    const excludeIds = [...new Set([...savedToolIds, ...usedToolIds])]
    const excludeFilter = excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}

    // Course-linked tools from enrolled courses
    const enrollments = await prisma.courseEnrollment.findMany({
      where: { studentId: user.id },
      select: { courseId: true },
    })
    const enrolledCourseIds = enrollments.map((e) => e.courseId)

    let tools: ReturnType<typeof formatTool>[] = []
    let label: string | null = null

    if (enrolledCourseIds.length > 0) {
      const courseLinks = await prisma.courseToolLink.findMany({
        where: {
          courseId: { in: enrolledCourseIds },
          tool: { approvalStatus: 'APPROVED', ...excludeFilter },
        },
        include: {
          tool: {
            include: {
              creator: {
                select: { name: true, college: true, department: true, role: true },
              },
              _count: { select: { upvotes: true } },
            },
          },
        },
      })

      // Sort by upvote count in application code (avoids nested orderBy complexity)
      courseLinks.sort((a, b) => b.tool._count.upvotes - a.tool._count.upvotes)
      tools = courseLinks.slice(0, 3).map((link) => formatTool(link.tool))
      if (tools.length > 0) label = 'From your courses'
    }

    // Fallback: top APPROVED tools not already included
    if (tools.length < 3) {
      const needed = 3 - tools.length
      const alreadyIncluded = tools.map((t) => t.id)
      const fallbackExclude = [...excludeIds, ...alreadyIncluded]
      const fallbackFilter = fallbackExclude.length > 0 ? { id: { notIn: fallbackExclude } } : {}

      const fallback = await prisma.tool.findMany({
        where: { approvalStatus: 'APPROVED', ...fallbackFilter },
        include: {
          creator: {
            select: { name: true, college: true, department: true, role: true },
          },
          _count: { select: { upvotes: true } },
        },
        orderBy: { upvotes: { _count: 'desc' } },
        take: needed,
      })

      tools = [...tools, ...fallback.map(formatTool)]
      if (!label && tools.length > 0) label = 'Popular on campus'
    }

    return NextResponse.json({ tools, label }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  })

function formatTool(tool: {
  id: string
  name: string
  category: string
  shortDescription: string | null
  creatorId: string
  creator: {
    name: string | null
    college: string | null
    department: string | null
    role: string
  }
  _count: { upvotes: number }
}) {
  return {
    id: tool.id,
    name: tool.name,
    category: tool.category,
    shortDescription: tool.shortDescription,
    creatorId: tool.creatorId,
    creator: {
      name: tool.creator.name ?? '',
      college: tool.creator.college,
      department: tool.creator.department,
      role: tool.creator.role,
    },
    _count: { upvotes: tool._count.upvotes },
  }
}
