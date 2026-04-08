import { NextRequest } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { computeComplianceScore, computeAllComplianceScores } from '../../../../lib/compliance-scoring-service'
import { formatResponse, getComplianceStatusLabel } from '../../../../lib/compliance-api-version'
import { withErrorHandling } from '../../../../lib/api-utils'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { user } = auth
  const { score, breakdown } = await computeComplianceScore(user.id)

  // Compute percentile rank among all users
  const allScores = await computeAllComplianceScores()
  const scoreValues = Object.values(allScores)
  const belowCount = scoreValues.filter((s) => s < score).length
  const percentileRank = scoreValues.length > 0
    ? Math.round((belowCount / scoreValues.length) * 100)
    : 0

  const statusLabel = getComplianceStatusLabel(score)

  const response = formatResponse(
    {
      score,
      breakdown,
      percentileRank,
      statusLabel,
      totalUsers: scoreValues.length,
    },
    '2',
    user.id,
  )
  response.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=300')
  return response
})
