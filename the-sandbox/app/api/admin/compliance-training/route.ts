import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireAdminUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { listModules, createModule } from '../../../lib/compliance-training-service'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const activeOnly = request.nextUrl.searchParams.get('active') === 'true'

    const modules = await listModules(activeOnly)
    return NextResponse.json({ modules }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })

})

export const POST = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const body = await parseRequestBody<{
    title: string
    description: string
    type: string
    requiredForRoles: string[]
    passingScore?: number
    content: unknown
    active?: boolean
  }>(request)
  if ('error' in body) return body.error

  const { title, description, type, requiredForRoles, content } = body.data
  if (!title || !description || !type || !content) {
    return NextResponse.json({ error: 'title, description, type, and content are required' }, { status: 400 })
  }

    const mod = await createModule({ ...body.data, requiredForRoles: requiredForRoles ?? [] })
    return NextResponse.json({ module: mod }, { status: 201 })

})
