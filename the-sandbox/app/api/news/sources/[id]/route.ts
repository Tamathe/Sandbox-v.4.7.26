import { NextRequest, NextResponse } from 'next/server'
import { getPrismaClient } from '../../../../lib/prisma'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'

export const PATCH = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response
  if (auth.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const { id } = await params
  const prisma = getPrismaClient()

  const parsed = await parseRequestBody<{
    active?: boolean
    name?: string
    rssUrl?: string
    category?: string
  }>(request)
  if ('error' in parsed) return parsed.error
  const body = parsed.data

  try {
    const source = await prisma.newsSource.update({
      where: { id },
      data: {
        ...(typeof body.active === 'boolean' ? { active: body.active } : {}),
        ...(body.name ? { name: body.name } : {}),
        ...(body.rssUrl ? { rssUrl: body.rssUrl } : {}),
        ...(body.category !== undefined ? { category: body.category } : {}),
      },
    })

    return NextResponse.json({ source })
  } catch (err) {
    console.error('PATCH /api/news/sources/[id] error:', err)
    return NextResponse.json({ error: 'Failed to update source' }, { status: 500 })
  }
})
