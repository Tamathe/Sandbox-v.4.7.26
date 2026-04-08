import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { handlePlaygroundError, requireDemoUser } from '../../../lib/playground-storage'

export async function GET(request: NextRequest) {
  try {
    const user = await requireDemoUser(request)
    const apps = await prisma.playgroundApp.findMany({
      where: { creatorId: user.id },
      select: { id: true, title: true, description: true, createdAt: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    })
    return NextResponse.json({ apps })
  } catch (error) {
    return handlePlaygroundError(error, 'GET /api/playground/apps error:')
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireDemoUser(request)
    const body = (await request.json()) as {
      title?: string
      description?: string | null
      htmlContent?: string
    }

    const htmlContent = body.htmlContent?.trim() ?? ''
    if (!htmlContent) {
      return NextResponse.json({ error: 'htmlContent is required' }, { status: 400 })
    }

    const app = await prisma.playgroundApp.create({
      data: {
        creatorId: user.id,
        title: body.title?.trim() || 'Untitled App',
        description: body.description?.trim() || null,
        htmlContent,
      },
      select: {
        id: true,
        title: true,
        description: true,
      },
    })

    return NextResponse.json(app, { status: 201 })
  } catch (error) {
    return handlePlaygroundError(error, 'POST /api/playground/apps error:')
  }
}
