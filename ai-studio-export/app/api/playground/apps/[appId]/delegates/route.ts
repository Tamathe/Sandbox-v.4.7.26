import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'
import { handlePlaygroundError, requireDemoUser } from '../../../../../lib/playground-storage'

async function assertCreator(appId: string, userId: string) {
  const app = await prisma.playgroundApp.findUnique({
    where: { id: appId },
    select: { id: true, creatorId: true },
  })

  if (!app) {
    return { missing: true as const }
  }

  if (app.creatorId !== userId) {
    return { forbidden: true as const }
  }

  return { missing: false as const, forbidden: false as const }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  try {
    const { appId } = await params
    const user = await requireDemoUser(request)
    const access = await assertCreator(appId, user.id)

    if (access.missing) {
      return NextResponse.json({ error: 'Playground app not found' }, { status: 404 })
    }

    if (access.forbidden) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const delegates = await prisma.appStoreDelegate.findMany({
      where: { appId },
      orderBy: { grantedAt: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json({
      delegates: delegates.map((delegate) => ({
        id: delegate.id,
        userId: delegate.user.id,
        name: delegate.user.name,
        email: delegate.user.email,
        grantedAt: delegate.grantedAt,
      })),
    })
  } catch (error) {
    return handlePlaygroundError(error, 'GET /api/playground/apps/[appId]/delegates error:')
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  try {
    const { appId } = await params
    const user = await requireDemoUser(request)
    const access = await assertCreator(appId, user.id)

    if (access.missing) {
      return NextResponse.json({ error: 'Playground app not found' }, { status: 404 })
    }

    if (access.forbidden) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = (await request.json()) as { email?: string }
    const email = body.email?.trim().toLowerCase() ?? ''

    if (!email) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 })
    }

    const delegateUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true },
    })

    if (!delegateUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const app = await prisma.playgroundApp.findUnique({
      where: { id: appId },
      select: { creatorId: true },
    })

    if (!app) {
      return NextResponse.json({ error: 'Playground app not found' }, { status: 404 })
    }

    if (delegateUser.id === app.creatorId) {
      return NextResponse.json({ error: 'Creator already has full access' }, { status: 400 })
    }

    const existing = await prisma.appStoreDelegate.findUnique({
      where: {
        appId_userId: {
          appId,
          userId: delegateUser.id,
        },
      },
    })

    if (existing) {
      return NextResponse.json({
        id: existing.id,
        userId: delegateUser.id,
        email: delegateUser.email,
        name: delegateUser.name,
      })
    }

    const delegate = await prisma.appStoreDelegate.create({
      data: {
        appId,
        userId: delegateUser.id,
      },
    })

    return NextResponse.json(
      {
        id: delegate.id,
        userId: delegateUser.id,
        email: delegateUser.email,
        name: delegateUser.name,
      },
      { status: 201 }
    )
  } catch (error) {
    return handlePlaygroundError(error, 'POST /api/playground/apps/[appId]/delegates error:')
  }
}
