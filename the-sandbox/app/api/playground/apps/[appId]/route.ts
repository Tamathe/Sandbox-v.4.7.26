import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { PlaygroundHttpError, requireDemoUser } from '../../../../lib/playground-storage'
import { checkRateLimit } from '../../../../lib/rate-limit'
import { withErrorHandling } from '../../../../lib/api-utils'
import { parseRequestBody } from '../../../../lib/server-auth'

async function assertCreator(appId: string, userId: string) {
  const app = await prisma.playgroundApp.findUnique({
    where: { id: appId },
    select: { id: true, creatorId: true },
  })

  if (!app) {
    throw new PlaygroundHttpError(404, 'Playground app not found')
  }

  if (app.creatorId !== userId) {
    throw new PlaygroundHttpError(403, 'Forbidden')
  }
}

export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) => {
    const { appId } = await params
    const user = await requireDemoUser(request)
    const app = await prisma.playgroundApp.findUnique({
      where: { id: appId },
      select: { id: true, title: true, description: true, htmlContent: true, tags: true, creatorId: true, updatedAt: true, publishedAt: true },
    })
    if (!app) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (app.creatorId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json(app, {
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
    })
  })

export const PATCH = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) => {
    const { appId } = await params
    const user = await requireDemoUser(request)
    await assertCreator(appId, user.id)

    const parsed = await parseRequestBody<{
      title?: string
      description?: string | null
      tags?: string[]
    }>(request)
    if ('error' in parsed) return parsed.error
    const body = parsed.data

    const data: {
      title?: string
      description?: string | null
      tags?: string[]
    } = {}

    if (typeof body.title === 'string') {
      data.title = body.title.trim() || 'Untitled App'
    }

    if (body.description !== undefined) {
      data.description = body.description?.trim() || null
    }

    if (Array.isArray(body.tags)) {
      const cleaned = body.tags
        .map((t) => String(t).trim().toLowerCase().slice(0, 30))
        .filter(Boolean)
      data.tags = cleaned.slice(0, 5)
    }

    const app = await prisma.playgroundApp.update({
      where: { id: appId },
      data,
      select: { id: true, title: true, tags: true },
    })

    return NextResponse.json(app, {
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
    })
  })

export const PUT = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) => {
    const { appId } = await params
    const user = await requireDemoUser(request)
    const rl = await checkRateLimit(request, user.id, 'GENERATE', user.role !== 'STUDENT')
    if (rl) return rl
    await assertCreator(appId, user.id)

    const parsed = await parseRequestBody<{
      title?: string
      description?: string | null
      htmlContent?: string
    }>(request)
    if ('error' in parsed) return parsed.error
    const body = parsed.data

    const data: {
      title?: string
      description?: string | null
      htmlContent?: string
    } = {}

    if (typeof body.title === 'string') {
      data.title = body.title.trim() || 'Untitled App'
    }

    if (body.description !== undefined) {
      data.description = body.description?.trim() || null
    }

    if (typeof body.htmlContent === 'string') {
      data.htmlContent = body.htmlContent.trim()
    }

    // Auto-snapshot before overwriting htmlContent (non-blocking — PUT succeeds even if snapshot fails)
    if (typeof data.htmlContent === 'string') {
      const current = await prisma.playgroundApp.findUnique({
        where: { id: appId },
        select: { htmlContent: true, title: true },
      })
      if (current && current.htmlContent !== data.htmlContent) {
        void (async () => {
          try {
            await prisma.playgroundAppSnapshot.create({
              data: {
                appId,
                title: current.title,
                htmlContent: current.htmlContent,
                reason: 'auto',
              },
            })
            const count = await prisma.playgroundAppSnapshot.count({ where: { appId } })
            if (count > 20) {
              const oldest = await prisma.playgroundAppSnapshot.findFirst({
                where: { appId },
                orderBy: { createdAt: 'asc' },
                select: { id: true },
              })
              if (oldest) {
                await prisma.playgroundAppSnapshot.delete({ where: { id: oldest.id } })
              }
            }
          } catch (e) {
            console.error('Auto-snapshot failed:', e)
          }
        })()
      }
    }

    const app = await prisma.playgroundApp.update({
      where: { id: appId },
      data,
      select: {
        id: true,
        title: true,
        description: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(app, {
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
    })
  })

export const DELETE = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) => {
    const { appId } = await params
    const user = await requireDemoUser(request)
    const rl = await checkRateLimit(request, user.id, 'API', user.role !== 'STUDENT')
    if (rl) return rl
    await assertCreator(appId, user.id)

    await prisma.playgroundApp.delete({ where: { id: appId } })

    return NextResponse.json({ deleted: true }, {
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
    })
  })
