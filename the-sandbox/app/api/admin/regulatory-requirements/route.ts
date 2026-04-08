import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireAdminUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { listRequirements, createRequirement } from '../../../lib/regulatory-mapping-service'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const regulation = request.nextUrl.searchParams.get('regulation') || undefined

    const requirements = await listRequirements(regulation)
    return NextResponse.json({ requirements }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })

})

export const POST = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const body = await parseRequestBody<{
    regulation: string; articleRef: string; title: string
    description: string; featureMapping: string[]; status?: string; notes?: string
  }>(request)
  if ('error' in body) return body.error

  const { regulation, articleRef, title, description, featureMapping } = body.data
  if (!regulation || !articleRef || !title || !description || !featureMapping?.length) {
    return NextResponse.json({ error: 'regulation, articleRef, title, description, and featureMapping are required' }, { status: 400 })
  }

    const req = await createRequirement(body.data)
    return NextResponse.json({ requirement: req }, { status: 201 })

})
