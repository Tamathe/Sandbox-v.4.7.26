/**
 * GET /api/recommendations
 *
 * Personalized tool recommendations for the requesting student.
 * Uses StudentProfile.preferredModality + topConceptsThisWeek to rank approved,
 * published tools the student has not used recently.
 *
 * Returns up to 4 recommendations with a human-readable reason and
 * ready-to-render marketplace card payloads.
 */

import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '../../lib/prisma'
import { TOOL_CARD_INCLUDE } from '../../lib/prisma-includes'
import { buildToolTrustMetadata } from '../../lib/provenance-service'
import { requireRequestUser, isAuthFailure } from '../../lib/server-auth'
import { buildToolDeploymentSummary } from '../../lib/tool-deployment'
import {
  createEmptyToolStorefrontSummary,
  getVisibleToolStorefrontSummaryMap,
} from '../../lib/tool-storefronts'
import { withErrorHandling } from '../../lib/api-utils'

export const runtime = 'nodejs'

const MODALITY_TO_TOOL_TYPES: Record<string, string[]> = {
  dialogue: ['CHATBOT', 'DEBATE', 'STUDY_BUDDY'],
  quiz: ['QUIZ', 'AI_INTERVIEW'],
  simulation: ['SIMULATION', 'AI_INTERVIEW'],
  document: ['EXTERNAL', 'CHATBOT'],
}

function normalize(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').trim()
}

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  if (user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Students only' }, { status: 403 })
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const [profile, recentSessions, allTools] = await Promise.all([
    prisma.studentProfile.findUnique({ where: { userId: user.id } }),
    prisma.toolSession.findMany({
      where: { userId: user.id, startedAt: { gte: thirtyDaysAgo } },
      select: { toolId: true },
      distinct: ['toolId'],
    }),
    prisma.tool.findMany({
      where: {
        published: true,
        approvalStatus: 'APPROVED',
      },
      include: TOOL_CARD_INCLUDE,
    }),
  ])

  const recentToolIds = new Set(recentSessions.map((session) => session.toolId))
  const unusedTools = allTools.filter((tool) => !recentToolIds.has(tool.id))

  if (unusedTools.length === 0) {
    return NextResponse.json({ recommendations: [] }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }

  const preferredModality = profile?.preferredModality ?? null
  const topConcepts = (profile?.topConceptsThisWeek ?? []).map(normalize)
  const preferredTypes = preferredModality
    ? (MODALITY_TO_TOOL_TYPES[preferredModality] ?? [])
    : []

  const scored = unusedTools.map((tool) => {
    let score = 0
    const reasons: string[] = []

    if (preferredTypes.length > 0 && preferredTypes.includes(tool.toolType)) {
      score += 3
      const modalityLabel =
        preferredModality === 'dialogue'
          ? 'conversation'
          : preferredModality === 'quiz'
            ? 'quizzes'
            : preferredModality === 'simulation'
              ? 'simulations'
              : 'reading'
      reasons.push(`Matches your preferred ${modalityLabel} style`)
    }

    if (topConcepts.length > 0) {
      const toolText = normalize(`${tool.name} ${tool.learningObjectives.join(' ')}`)
      const firstToken = toolText.split(' ')[0] ?? ''
      const matchedConcepts = topConcepts.filter(
        (concept) => toolText.includes(concept) || (firstToken && concept.includes(firstToken)),
      )
      if (matchedConcepts.length > 0) {
        score += matchedConcepts.length * 2
        reasons.push('Covers concepts you are studying this week')
      }
    }

    score += Math.random() * 0.5

    return {
      tool,
      score,
      reason: reasons[0] ?? 'Expand your learning beyond your recent tools',
    }
  })

  scored.sort((left, right) => right.score - left.score)
  const top = scored.slice(0, 4)

  const storefrontSummaryByTool = await getVisibleToolStorefrontSummaryMap(
    top.map(({ tool }) => tool.id),
    { userId: user.id, userRole: user.role },
  )

  const recommendations = top.map(({ tool, reason }) => {
    const { ratings, ...rest } = tool
    const ratingValues = (ratings as Array<{ rating: number }> | undefined) ?? []
    const storefront =
      storefrontSummaryByTool.get(tool.id) ?? createEmptyToolStorefrontSummary()
    const avgRating =
      ratingValues.length > 0
        ? ratingValues.reduce((sum, entry) => sum + entry.rating, 0) / ratingValues.length
        : null

    return {
      tool: {
        ...rest,
        avgRating,
        deployment: buildToolDeploymentSummary({
          published: Boolean(tool.published),
          approvalStatus: String(tool.approvalStatus ?? 'COMMUNITY'),
          deploymentMode: typeof tool.deploymentMode === 'string' ? tool.deploymentMode : null,
          toolType: typeof tool.toolType === 'string' ? tool.toolType : null,
          externalUrl: typeof tool.externalUrl === 'string' ? tool.externalUrl : null,
          isOfficialService: Boolean(tool.isOfficialService),
          requiresInstitutionalReview: Boolean(tool.requiresInstitutionalReview),
          reviewedAt: tool.reviewedAt instanceof Date ? tool.reviewedAt : null,
          reviewExpiresAt: tool.reviewExpiresAt instanceof Date ? tool.reviewExpiresAt : null,
          referenceDocUrls: Array.isArray(tool.referenceDocUrls) ? tool.referenceDocUrls : [],
          courseLinkCount:
            typeof rest._count?.courseLinks === 'number' ? rest._count.courseLinks : 0,
          storefrontPlacementCount: storefront.placementCount,
          storefrontDepartmentCount: storefront.departmentCount,
        }),
        storefront: storefront.placementCount > 0 ? storefront : undefined,
        trust: buildToolTrustMetadata({
          approvalStatus: String(tool.approvalStatus ?? 'COMMUNITY'),
          requiresInstitutionalReview: Boolean(tool.requiresInstitutionalReview),
          reviewedBy: typeof tool.reviewedBy === 'string' ? tool.reviewedBy : null,
          reviewExpiresAt: tool.reviewExpiresAt instanceof Date ? tool.reviewExpiresAt : null,
        }),
      },
      reason,
    }
  })

  return NextResponse.json({ recommendations }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
