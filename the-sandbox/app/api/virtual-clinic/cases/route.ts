import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, requireEducatorUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { listCases, createCase } from '../../../lib/virtual-clinic/case-service'
import type { ClinicalCaseInput } from '../../../lib/virtual-clinic/types'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const url = req.nextUrl
  const filters = {
    program: url.searchParams.get('program') ?? undefined,
    difficulty: url.searchParams.get('difficulty') ?? undefined,
    organSystem: url.searchParams.get('organSystem') ?? undefined,
    courseId: url.searchParams.get('courseId') ?? undefined,
    creatorId: url.searchParams.get('creatorId') ?? undefined,
    published: url.searchParams.has('published')
      ? url.searchParams.get('published') === 'true'
      : undefined,
  }

  const cases = await listCases(filters)
  return NextResponse.json(cases, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const parsed = await parseRequestBody<ClinicalCaseInput>(req)
  if ('error' in parsed) return parsed.error

  const created = await createCase(parsed.data, user.id)
  return NextResponse.json(created, { status: 201 })
})
