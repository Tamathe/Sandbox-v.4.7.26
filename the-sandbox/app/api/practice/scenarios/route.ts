import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { listScenarios, getScenario, createEducatorScenario } from '../../../lib/practice-service'
import type { RubricDimension } from '../../../lib/practice-service'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const category = searchParams.get('category') ?? undefined

  if (id) {
    const scenario = await getScenario(id)
    if (!scenario) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ scenario }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }

  const scenarios = await listScenarios(category)
  return NextResponse.json({ scenarios }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as {
    title: string; description: string; category: string; difficulty?: string; emoji?: string
    aiRole: string; aiPersonality: string; studentRole: string
    rubricJson: RubricDimension[]; estimatedMinutes?: number; turnLimit?: number; courseId?: string
  }
  if (!body.title || !body.description || !body.aiRole || !body.aiPersonality || !body.studentRole || !body.rubricJson) {
    return NextResponse.json({ error: 'title, description, aiRole, aiPersonality, studentRole, and rubricJson required' }, { status: 400 })
  }

  const scenario = await createEducatorScenario(auth.user.id, body)
  return NextResponse.json({ scenario }, { status: 201 })
})
