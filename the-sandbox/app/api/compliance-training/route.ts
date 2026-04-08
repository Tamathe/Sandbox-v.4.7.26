import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../lib/server-auth'
import { prisma } from '../../lib/prisma'
import { withErrorHandling } from '../../lib/api-utils'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response

  try {
    const modules = await prisma.complianceTrainingModule.findMany({
      where: { active: true },
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        requiredForRoles: true,
        passingScore: true,
        active: true,
        createdAt: true,
        completions: {
          where: { userId: auth.user.id },
          select: { id: true, score: true, passed: true, completedAt: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    const result = modules.map((m) => {
      const completion = m.completions[0] || null
      return {
        id: m.id,
        title: m.title,
        description: m.description,
        type: m.type,
        requiredForRoles: m.requiredForRoles,
        passingScore: m.passingScore,
        completed: !!completion?.passed,
        completion: completion ? {
          score: completion.score,
          passed: completion.passed,
          completedAt: completion.completedAt,
        } : null,
      }
    })

    return NextResponse.json({ modules: result }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  } catch (error) {
    console.error('[COMPLIANCE-TRAINING] list modules error:', error)
    return NextResponse.json({ error: 'Failed to list training modules' }, { status: 500 })
  }
})
