import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { prisma } from '../../../lib/prisma'
import { getWellnessHubTool } from '../../../lib/wellness-hub'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  if (!slug) {
    return NextResponse.json({ error: 'slug is required' }, { status: 400 })
  }

  const tool = getWellnessHubTool(slug)
  if (!tool) {
    return NextResponse.json({ error: 'Unknown tool slug' }, { status: 400 })
  }

  const where: Record<string, unknown> = {
    userId: user.id,
    toolSlug: slug,
  }

  if (from || to) {
    const dateFilter: Record<string, Date> = {}
    if (from) dateFilter.gte = new Date(from)
    if (to) dateFilter.lte = new Date(to)
    where.date = dateFilter
  }

  const entries = await prisma.wellnessEntry.findMany({
    where,
    orderBy: { date: 'asc' },
  })

  return NextResponse.json(entries, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
