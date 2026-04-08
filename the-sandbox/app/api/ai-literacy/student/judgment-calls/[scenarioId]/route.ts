import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import {
  getScenario,
  getUserAttempts,
  submitAttempt,
} from '../../../../../lib/ai-literacy/judgment-calls-service'
import type { ChoiceMade, Reflection } from '../../../../../lib/ai-literacy/judgment-calls-service'

export const GET = withErrorHandling(async (req: NextRequest, context: { params: Promise<{ scenarioId: string }> }) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { scenarioId } = await context.params
  const scenario = await getScenario(scenarioId)
  if (!scenario) {
    return NextResponse.json({ error: 'Scenario not found' }, { status: 404 })
  }

  const userAttempts = await getUserAttempts(auth.user.id, [scenarioId])

  return NextResponse.json({ scenario, userAttempts }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

export const POST = withErrorHandling(async (req: NextRequest, context: { params: Promise<{ scenarioId: string }> }) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { scenarioId } = await context.params
  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as { choicesMade?: ChoiceMade[]; reflections?: Reflection[] }
  const choicesMade: ChoiceMade[] = body.choicesMade ?? []
  const reflections: Reflection[] = body.reflections ?? []

  if (!choicesMade.length) {
    return NextResponse.json({ error: 'No choices provided' }, { status: 400 })
  }

  const result = await submitAttempt(auth.user.id, scenarioId, choicesMade, reflections)
  return NextResponse.json(result)
})
