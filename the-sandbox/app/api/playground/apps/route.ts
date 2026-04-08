import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { requireDemoUser } from '../../../lib/playground-storage'
import { checkRateLimit } from '../../../lib/rate-limit'
import { withErrorHandling } from '../../../lib/api-utils'
import { parseRequestBody } from '../../../lib/server-auth'

export const GET = withErrorHandling(async (request: NextRequest) => {
    const user = await requireDemoUser(request)
    const apps = await prisma.playgroundApp.findMany({
      where: { creatorId: user.id },
      select: { id: true, title: true, description: true, createdAt: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    })
    return NextResponse.json({ apps }, {
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
    })
  })

export const POST = withErrorHandling(async (request: NextRequest) => {
    const user = await requireDemoUser(request)
    const rl = await checkRateLimit(request, user.id, 'API', user.role !== 'STUDENT')
    if (rl) return rl
    const parsed = await parseRequestBody<{
      title?: string
      description?: string | null
      htmlContent?: string
      sourceId?: string
    }>(request)
    if ('error' in parsed) return parsed.error
    const body = parsed.data

    let htmlContent = body.htmlContent?.trim() ?? ''
    let description = body.description?.trim() || null

    if (body.sourceId) {
      const source = await prisma.playgroundApp.findUnique({
        where: { id: body.sourceId },
        select: { htmlContent: true, description: true },
      })
      if (!source || !source.htmlContent) {
        return NextResponse.json({ error: 'Source app not found' }, { status: 404 })
      }
      htmlContent = source.htmlContent
      if (!description) {
        description = source.description
      }
    }

    if (!htmlContent) {
      return NextResponse.json({ error: 'htmlContent is required' }, { status: 400 })
    }

    const app = await prisma.playgroundApp.create({
      data: {
        creatorId: user.id,
        title: body.title?.trim() || 'Untitled App',
        description,
        htmlContent,
      },
      select: {
        id: true,
        title: true,
        description: true,
      },
    })

    return NextResponse.json(app, { status: 201 })
  })
