import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireAdminUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { listTags, createTag } from '../../../lib/compliance-tag-service'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

    const tags = await listTags()
    return NextResponse.json({ tags }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })

})

export const POST = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const body = await parseRequestBody<{ name: string; color?: string; description?: string }>(request)
  if ('error' in body) return body.error

  const { name, color, description } = body.data
  if (!name || !name.trim()) {
    return NextResponse.json({ error: 'Tag name is required' }, { status: 400 })
  }

    const tag = await createTag({ name: name.trim(), color, description })
    return NextResponse.json({ tag }, { status: 201 })

})
