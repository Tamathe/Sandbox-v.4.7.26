import { NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret } from '../../../lib/server-auth'
import { evaluateWorkflows, evaluateDPAWorkflows, evaluateLowScoreWorkflows } from '../../../lib/compliance-workflow-service'
import { withErrorHandling } from '../../../lib/api-utils'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const forbidden = verifyCronSecret(request)
  if (forbidden) return forbidden

  try {
    const [userResult, dpaCount, lowScoreCount] = await Promise.all([
      evaluateWorkflows(),
      evaluateDPAWorkflows(),
      evaluateLowScoreWorkflows(),
    ])

    return NextResponse.json({
      success: true,
      processed: userResult.processed,
      actionsExecuted: userResult.actionsExecuted + dpaCount + lowScoreCount,
      breakdown: {
        userWorkflows: userResult.actionsExecuted,
        dpaWorkflows: dpaCount,
        lowScoreWorkflows: lowScoreCount,
      },
    }, {
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
    })
  } catch (error) {
    console.error('[CRON] compliance-workflows error:', error)
    return NextResponse.json({ error: 'Workflow evaluation failed' }, { status: 500 })
  }
})
