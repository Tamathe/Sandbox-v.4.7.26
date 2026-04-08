import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import type { MetricType } from '../../../generated/prisma'
import { maybeCreatePortfolioItem } from '../../../lib/portfolio'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const courseId = req.nextUrl.searchParams.get('courseId')
    const userEmail = req.headers.get('x-demo-user-email')
    let currentUserId: string | null = null
    if (userEmail) {
      const user = await prisma.user.findUnique({ where: { email: userEmail } })
      if (user) currentUserId = user.id
    }

    const tool = await prisma.tool.findUnique({
      where: { id },
      include: {
        creator: true,
        customMetrics: true,
        gamificationConfig: {
          select: {
            totalSteps: true,
            stepLabel: true,
          },
        },
        ratings: { select: { rating: true } },
        _count: { select: { upvotes: true, favorites: true, comments: true, ratings: true } },
        ...(courseId
          ? {
              courseLinks: {
                where: { courseId },
                select: {
                  courseId: true,
                  syllabusContext: true,
                  weekLabel: true,
                },
                take: 1,
              },
            }
          : {}),
        ...(currentUserId
          ? {
              upvotes: { where: { userId: currentUserId } },
              favorites: { where: { userId: currentUserId } },
            }
          : {}),
      },
    })

    if (!tool) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 })
    }

    const { upvotes, favorites, ratings, gamificationConfig, courseLinks, ...rest } = tool as typeof tool & {
      upvotes?: { id: string }[]
      favorites?: { id: string }[]
      ratings?: { rating: number }[]
      gamificationConfig?: { totalSteps: number | null; stepLabel: string | null } | null
      courseLinks?: Array<{
        courseId: string
        syllabusContext: string | null
        weekLabel: string | null
      }>
    }
    const avgRating =
      ratings && ratings.length > 0
        ? ratings.reduce((sum, entry) => sum + entry.rating, 0) / ratings.length
        : null

    return NextResponse.json({
      ...rest,
      avgRating,
      totalSteps: gamificationConfig?.totalSteps ?? null,
      stepLabel: gamificationConfig?.stepLabel ?? null,
      courseContext: courseLinks?.[0] ?? null,
      hasUpvoted: currentUserId ? (upvotes?.length ?? 0) > 0 : false,
      hasFavorited: currentUserId ? (favorites?.length ?? 0) > 0 : false,
    })
  } catch (error) {
    console.error('GET /api/tools/[id] error:', error)
    return NextResponse.json({ error: 'Failed to fetch tool' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const userEmail = req.headers.get('x-demo-user-email')
    if (!userEmail) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    const user = await prisma.user.findUnique({ where: { email: userEmail } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const tool = await prisma.tool.findUnique({ where: { id } })
    if (!tool) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 })
    }
    if (tool.creatorId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const wasPublished = tool.published
    // Whitelist updatable fields — never allow creatorId, id, or audit fields via API
    const {
      name, shortDescription, fullDescription, category, difficultyLevel,
      estimatedMinutes, thumbnailUrl, toolType, externalUrl, systemPrompt,
      personaName, personaAvatar,
      welcomeMessage, starterQuestions, referenceDocUrls, learningObjectives,
      intendedAudience, published, featured, approvalStatus, customMetrics, gamificationConfig,
    } = body

    const validApprovalStatuses = ['COMMUNITY', 'PENDING', 'APPROVED', 'REJECTED'] as const
    const normalizedApprovalStatus =
      approvalStatus === undefined
        ? undefined
        : user.role === 'ADMIN' && validApprovalStatuses.includes(approvalStatus)
          ? approvalStatus
          : user.role === 'STUDENT'
            ? 'PENDING'
            : approvalStatus === 'PENDING'
              ? 'PENDING'
              : 'COMMUNITY'

    const updated = await prisma.tool.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(shortDescription !== undefined && { shortDescription }),
        ...(fullDescription !== undefined && { fullDescription }),
        ...(category !== undefined && { category }),
        ...(difficultyLevel !== undefined && { difficultyLevel }),
        ...(estimatedMinutes !== undefined && { estimatedMinutes: estimatedMinutes ? parseInt(estimatedMinutes) : null }),
        ...(thumbnailUrl !== undefined && { thumbnailUrl }),
        ...(toolType !== undefined && { toolType }),
        ...(externalUrl !== undefined && { externalUrl }),
        ...(systemPrompt !== undefined && { systemPrompt }),
        ...(personaName !== undefined && { personaName: personaName?.trim() || null }),
        ...(personaAvatar !== undefined && { personaAvatar: personaAvatar || null }),
        ...(welcomeMessage !== undefined && { welcomeMessage }),
        ...(starterQuestions !== undefined && { starterQuestions }),
        ...(referenceDocUrls !== undefined && { referenceDocUrls }),
        ...(learningObjectives !== undefined && { learningObjectives }),
        ...(intendedAudience !== undefined && { intendedAudience }),
        ...(published !== undefined && { published }),
        ...(normalizedApprovalStatus !== undefined && { approvalStatus: normalizedApprovalStatus }),
        ...(gamificationConfig !== undefined && {
          gamificationConfig: gamificationConfig?.totalSteps
            ? {
                upsert: {
                  create: {
                    totalSteps: Number(gamificationConfig.totalSteps),
                    stepLabel: gamificationConfig.stepLabel ? String(gamificationConfig.stepLabel) : 'Step',
                  },
                  update: {
                    totalSteps: Number(gamificationConfig.totalSteps),
                    stepLabel: gamificationConfig.stepLabel ? String(gamificationConfig.stepLabel) : 'Step',
                  },
                },
              }
            : undefined,
        }),
        ...(customMetrics !== undefined && {
          customMetrics: {
            deleteMany: {},
            create: (customMetrics as { name: string; type: string; description?: string }[])
              .filter((metric) => metric.name?.trim())
              .map((metric) => ({
                name: metric.name,
                type: metric.type as MetricType,
                description: metric.description || null,
              })),
          },
        }),
        // Only admins can toggle featured
        ...(featured !== undefined && user.role === 'ADMIN' && { featured }),
      },
      include: {
        creator: true,
        customMetrics: true,
        _count: { select: { upvotes: true, favorites: true, comments: true } },
      },
    })

    if (!wasPublished && updated.published) {
      try {
        await maybeCreatePortfolioItem(prisma, updated, user.id)
      } catch (portfolioError) {
        console.error('PUT /api/tools/[id] portfolio capture error:', portfolioError)
      }
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('PUT /api/tools/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update tool' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const userEmail = req.headers.get('x-demo-user-email')
    if (!userEmail) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    const user = await prisma.user.findUnique({ where: { email: userEmail } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const tool = await prisma.tool.findUnique({ where: { id } })
    if (!tool) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 })
    }
    if (tool.creatorId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.$transaction([
      prisma.xPEvent.deleteMany({ where: { toolId: id } }),
      prisma.metricEvent.deleteMany({ where: { toolId: id } }),
      prisma.toolDocument.deleteMany({ where: { toolId: id } }),
      prisma.gamificationConfig.deleteMany({ where: { toolId: id } }),
      prisma.quest.deleteMany({ where: { toolId: id } }),
      prisma.toolSession.deleteMany({ where: { toolId: id } }),
      prisma.comment.deleteMany({ where: { toolId: id } }),
      prisma.upvote.deleteMany({ where: { toolId: id } }),
      prisma.favorite.deleteMany({ where: { toolId: id } }),
      prisma.customMetricDefinition.deleteMany({ where: { toolId: id } }),
      prisma.tool.delete({ where: { id } }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/tools/[id] error:', error)
    return NextResponse.json({ error: 'Failed to delete tool' }, { status: 500 })
  }
}
