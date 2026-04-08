import { NextRequest } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { computeComplianceScore, computeAllComplianceScores } from '../../../../lib/compliance-scoring-service'
import { getComplianceNotifications } from '../../../../lib/compliance-notification-service'
import { getComplianceStatusLabel, formatResponse } from '../../../../lib/compliance-api-version'
import { prisma } from '../../../../lib/prisma'
import { withErrorHandling } from '../../../../lib/api-utils'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { user } = auth

  // Parallel fetch: score, notifications, consent categories, FERPA training
  const [
    scoreResult,
    allScores,
    notifications,
    consentCategories,
    ferpaAttempts,
  ] = await Promise.all([
    computeComplianceScore(user.id),
    computeAllComplianceScores(),
    getComplianceNotifications(user.id),
    prisma.userConsentCategory.findMany({
      where: { userId: user.id },
      select: { category: true, consentedAt: true, revokedAt: true },
    }),
    prisma.ferpaTrainingAttempt.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, score: true, passed: true, createdAt: true },
    }),
  ])

  const scoreValues = Object.values(allScores)
  const belowCount = scoreValues.filter((s) => s < scoreResult.score).length
  const percentileRank = scoreValues.length > 0
    ? Math.round((belowCount / scoreValues.length) * 100)
    : 0

  // Notification summary
  const unreadNotifications = notifications.filter((n) => !n.read)
  const notificationsByType: Record<string, number> = {}
  for (const n of unreadNotifications) {
    notificationsByType[n.type] = (notificationsByType[n.type] ?? 0) + 1
  }

  const response = formatResponse(
    {
      score: {
        value: scoreResult.score,
        breakdown: scoreResult.breakdown,
        percentileRank,
        statusLabel: getComplianceStatusLabel(scoreResult.score),
      },
      notifications: {
        totalUnread: unreadNotifications.length,
        byType: notificationsByType,
        recent: notifications.slice(0, 5),
      },
      consentCategories: consentCategories.map((c) => ({
        category: c.category,
        consentedAt: c.consentedAt,
        active: !c.revokedAt,
      })),
      ferpaTraining: {
        attempts: ferpaAttempts,
        latestPassed: ferpaAttempts[0]?.passed ?? null,
        latestScore: ferpaAttempts[0]?.score ?? null,
      },
    },
    '2',
    user.id,
  )
  response.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=300')
  return response
})
