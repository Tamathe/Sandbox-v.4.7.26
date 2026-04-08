import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { getScenario, updateScenario } from '../../../../lib/audio/scenario-service'

export const GET = withErrorHandling(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { id } = await ctx.params
  const scenario = await getScenario(id)
  if (!scenario) return NextResponse.json({ error: 'Scenario not found' }, { status: 404 })
  return NextResponse.json(scenario, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

export const PATCH = withErrorHandling(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { id } = await ctx.params
  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const scenario = await updateScenario(id, parsed.data as Parameters<typeof updateScenario>[1])
  return NextResponse.json(scenario, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
