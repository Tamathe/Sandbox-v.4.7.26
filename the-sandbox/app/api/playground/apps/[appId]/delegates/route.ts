import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'
import { requireDemoUser } from '../../../../../lib/playground-storage'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { parseRequestBody } from '../../../../../lib/server-auth'

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

export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) => {
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
    }, {
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
    })
  })

export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) => {
    const { appId } = await params
    const user = await requireDemoUser(request)
    const access = await assertCreator(appId, user.id)

    if (access.missing) {
      return NextResponse.json({ error: 'Playground app not found' }, { status: 404 })
    }

    if (access.forbidden) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const parsed = await parseRequestBody<{ email?: string }>(request)
    if ('error' in parsed) return parsed.error
    const body = parsed.data
    const email = (typeof body.email === 'string' ? body.email.trim().toLowerCase() : '')

    if (!email) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
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
      }, {
        headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
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
  })
