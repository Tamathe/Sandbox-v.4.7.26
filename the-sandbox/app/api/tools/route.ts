import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../lib/prisma'
import { maybeCreatePortfolioItem } from '../../lib/portfolio'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const category = searchParams.get('category') || ''
    const toolType = searchParams.get('toolType') || ''
    const difficulty = searchParams.get('difficulty') || ''
    const approvalStatusFilter = searchParams.get('approvalStatus') || ''
    const sort = searchParams.get('sort') || 'newest'
    const publishedParam = searchParams.get('published')
    const creatorFilter = searchParams.get('creator') || ''
    const creatorEmailParam = searchParams.get('creatorEmail') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1)
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '24') || 24))
    const skip = (page - 1) * limit

    const userEmail = req.headers.get('x-demo-user-email')
    let currentUserId: string | null = null
    if (userEmail) {
      const user = await prisma.user.findUnique({ where: { email: userEmail } })
      if (user) currentUserId = user.id
    }

    const where: Record<string, unknown> = {}

    let publishedFilter: boolean | undefined = true
    if (publishedParam === 'all') {
      publishedFilter = undefined
    } else if (publishedParam === 'draft') {
      publishedFilter = false
    } else if (
      publishedParam === 'false' &&
      creatorEmailParam === userEmail &&
      currentUserId
    ) {
      publishedFilter = false
    }
    if (publishedFilter !== undefined) {
      where.published = publishedFilter
    }

    if (
      currentUserId &&
      (
        creatorFilter === 'me' ||
        (creatorEmailParam && creatorEmailParam === userEmail)
      )
    ) {
      where.creatorId = currentUserId
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { shortDescription: { contains: search, mode: 'insensitive' } },
        { fullDescription: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (category) where.category = category
    if (toolType) where.toolType = toolType
    if (difficulty) where.difficultyLevel = difficulty
    if (approvalStatusFilter) where.approvalStatus = approvalStatusFilter
    const since = searchParams.get('since') || ''
    if (since) {
      where.createdAt = { gte: new Date(since) }
    }

    let orderBy: Record<string, unknown> = { createdAt: 'desc' }
    if (sort === 'sessions') {
      orderBy = { sessions: { _count: 'desc' } }
    } else if (sort === 'upvotes') {
      orderBy = { upvotes: { _count: 'desc' } }
    } else if (sort === 'favorites') {
      orderBy = { favorites: { _count: 'desc' } }
    } else if (sort === 'updated') {
      orderBy = { updatedAt: 'desc' }
    }

    const [tools, total] = await Promise.all([
      prisma.tool.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          creator: true,
          _count: {
            select: {
              upvotes: true,
              favorites: true,
              comments: true,
              sessions: true,
              ratings: true,
            },
          },
          ratings: { select: { rating: true } },
          ...(currentUserId
            ? {
                upvotes: { where: { userId: currentUserId } },
                favorites: { where: { userId: currentUserId } },
              }
            : {}),
        },
      }),
      prisma.tool.count({ where }),
    ])

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toolsWithStatus = (tools as any[]).map((tool) => {
      const { upvotes, favorites, ratings, ...rest } = tool
      const ratingValues = (ratings as Array<{ rating: number }> | undefined) ?? []
      const avgRating =
        ratingValues.length > 0
          ? ratingValues.reduce((sum, entry) => sum + entry.rating, 0) / ratingValues.length
          : null

      return {
        ...rest,
        avgRating,
        hasUpvoted: currentUserId ? ((upvotes as unknown[])?.length ?? 0) > 0 : false,
        hasFavorited: currentUserId ? ((favorites as unknown[])?.length ?? 0) > 0 : false,
      }
    })

    return NextResponse.json({ tools: toolsWithStatus, total, page, limit })
  } catch (error) {
    console.error('GET /api/tools error:', error)
    return NextResponse.json({ error: 'Failed to fetch tools' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userEmail = req.headers.get('x-demo-user-email')
    if (!userEmail) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    const user = await prisma.user.findUnique({ where: { email: userEmail } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    if (!['EDUCATOR', 'STUDENT', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const {
      name,
      shortDescription,
      fullDescription,
      category,
      difficultyLevel,
      estimatedMinutes,
      thumbnailUrl,
      toolType,
      externalUrl,
      systemPrompt,
      personaName,
      personaAvatar,
      welcomeMessage,
      starterQuestions,
      referenceDocUrls,
      learningObjectives,
      intendedAudience,
      published,
      approvalStatus,
      isOfficialService,
      serviceProtocol,
      escalationEmail,
      customMetrics,
      gamificationConfig,
    } = body

    if (!name || !shortDescription || !fullDescription || !category || !toolType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const normalizedApprovalStatus =
      user.role === 'STUDENT'
        ? 'PENDING'
        : isOfficialService && user.role === 'ADMIN'
          ? 'APPROVED'
          : approvalStatus === 'PENDING'
            ? 'PENDING'
            : 'COMMUNITY'

    const tool = await prisma.tool.create({
      data: {
        name,
        shortDescription,
        fullDescription,
        category,
        difficultyLevel: difficultyLevel || 'Introductory',
        estimatedMinutes: estimatedMinutes ? parseInt(estimatedMinutes) : null,
        thumbnailUrl: thumbnailUrl || null,
        toolType,
        externalUrl: externalUrl || null,
        systemPrompt: systemPrompt || null,
        personaName: personaName?.trim() || (toolType === 'CHATBOT' ? 'Sandy' : null),
        personaAvatar: personaAvatar || null,
        welcomeMessage: welcomeMessage || null,
        starterQuestions: starterQuestions || [],
        referenceDocUrls: referenceDocUrls || [],
        learningObjectives: learningObjectives || [],
        intendedAudience: intendedAudience || null,
        published: published ?? false,
        approvalStatus: normalizedApprovalStatus,
        isOfficialService: isOfficialService === true && user.role === 'ADMIN',
        serviceProtocol: serviceProtocol || null,
        escalationEmail: escalationEmail || null,
        creatorId: user.id,
        gamificationConfig:
          gamificationConfig?.totalSteps
            ? {
                create: {
                  totalSteps: Number(gamificationConfig.totalSteps),
                  stepLabel: gamificationConfig.stepLabel ? String(gamificationConfig.stepLabel) : 'Step',
                },
              }
            : undefined,
        customMetrics: customMetrics?.length
          ? {
              create: customMetrics.map((m: { name: string; type: string; description?: string }) => ({
                name: m.name,
                type: m.type,
                description: m.description || null,
              })),
            }
          : undefined,
      },
      include: {
        creator: true,
        customMetrics: true,
        _count: { select: { upvotes: true, favorites: true, comments: true } },
      },
    })

    if (tool.published) {
      try {
        await maybeCreatePortfolioItem(prisma, tool, user.id)
      } catch (portfolioError) {
        console.error('POST /api/tools portfolio capture error:', portfolioError)
      }
    }

    return NextResponse.json(tool, { status: 201 })
  } catch (error) {
    console.error('POST /api/tools error:', error)
    return NextResponse.json({ error: 'Failed to create tool' }, { status: 500 })
  }
}
