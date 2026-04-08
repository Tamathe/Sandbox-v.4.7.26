import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { handlePlaygroundError, requireDemoUser } from '../../../../lib/playground-storage'

async function assertCreator(appId: string, userId: string) {
  const app = await prisma.playgroundApp.findUnique({
    where: { id: appId },
    select: { id: true, creatorId: true },
  })

  if (!app) {
    throw new Error('NOT_FOUND')
  }

  if (app.creatorId !== userId) {
    throw new Error('FORBIDDEN')
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  try {
    const { appId } = await params
    const user = await requireDemoUser(request)
    const app = await prisma.playgroundApp.findUnique({
      where: { id: appId },
      select: { id: true, title: true, description: true, htmlContent: true, creatorId: true, updatedAt: true },
    })
    if (!app) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (app.creatorId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json(app)
  } catch (error) {
    return handlePlaygroundError(error, 'GET /api/playground/apps/[appId] error:')
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  try {
    const { appId } = await params
    const user = await requireDemoUser(request)

    try {
      await assertCreator(appId, user.id)
    } catch (error) {
      if (error instanceof Error && error.message === 'NOT_FOUND') {
        return NextResponse.json({ error: 'Playground app not found' }, { status: 404 })
      }

      if (error instanceof Error && error.message === 'FORBIDDEN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      throw error
    }

    const body = (await request.json()) as {
      title?: string
      description?: string | null
      htmlContent?: string
    }

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

    return NextResponse.json(app)
  } catch (error) {
    return handlePlaygroundError(error, 'PUT /api/playground/apps/[appId] error:')
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  try {
    const { appId } = await params
    const user = await requireDemoUser(request)

    try {
      await assertCreator(appId, user.id)
    } catch (error) {
      if (error instanceof Error && error.message === 'NOT_FOUND') {
        return NextResponse.json({ error: 'Playground app not found' }, { status: 404 })
      }

      if (error instanceof Error && error.message === 'FORBIDDEN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      throw error
    }

    await prisma.playgroundApp.delete({ where: { id: appId } })

    return NextResponse.json({ deleted: true })
  } catch (error) {
    return handlePlaygroundError(error, 'DELETE /api/playground/apps/[appId] error:')
  }
}
