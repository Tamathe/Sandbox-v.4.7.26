import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { listScenarios, createScenario } from '../../../lib/audio/scenario-service'
import type { ScenarioTemplateType } from '../../../lib/audio/types'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const url = req.nextUrl
  const templateType = url.searchParams.get('type') as ScenarioTemplateType | null
  const courseId = url.searchParams.get('courseId') ?? undefined
  const scenarios = await listScenarios({
    templateType: templateType ?? undefined,
    courseId,
    published: true,
  })
  return NextResponse.json({ scenarios }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const scenario = await createScenario(auth.user.id, parsed.data as Parameters<typeof createScenario>[1])
  return NextResponse.json(scenario, { status: 201 })
})
