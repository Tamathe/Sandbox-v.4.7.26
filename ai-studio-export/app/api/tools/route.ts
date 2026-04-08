import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../lib/prisma'
import { shouldFastTrackTool } from '../../lib/admin-control-tower'
import { maybeCreatePortfolioItem } from '../../lib/portfolio'
import { requireRequestUser, parseRequestBody, isAuthFailure } from '../../lib/server-auth'
import { validateBody } from '../../lib/validate'
import { CreateToolSchema, ToolsQuerySchema } from '../../lib/schemas'
import { TOOL_CARD_INCLUDE } from '../../lib/prisma-includes'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const queryValidation = validateBody(ToolsQuerySchema, Object.fromEntries(searchParams.entries()))
    if ('error' in queryValidation) return queryValidation.error
    const {
      search = '',
      category: categoryFilter = '',
      toolType: toolTypeFilter = '',
      difficulty: difficultyFilter = '',
      approvalStatus: approvalStatusFilter = '',
      audioEnabled: audioEnabledFilter = '',
      featured: featuredFilter = '',
      sort = 'newest',
      published: publishedParam,
      creator: creatorFilter = '',
      creatorEmail: creatorEmailParam = '',
      page,
      limit,
      since,
    } = queryValidation.value
    const skip = (page - 1) * limit

    const userEmail = req.headers.get('x-demo-user-email')
    let currentUserId: string | null = null
    let currentUserRole: string | null = null
    if (userEmail) {
      const user = await prisma.user.findUnique({ where: { email: userEmail } })
      if (user) {
        currentUserId = user.id
        currentUserRole = user.role
      }
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
    if (categoryFilter) where.category = categoryFilter
    if (toolTypeFilter) where.toolType = toolTypeFilter
    if (difficultyFilter) where.difficultyLevel = difficultyFilter
    if (approvalStatusFilter) where.approvalStatus = approvalStatusFilter
    if (audioEnabledFilter === 'true') where.audioEnabled = true
    if (featuredFilter === 'true') where.featured = true
    if (since) {
      where.createdAt = { gte: new Date(since) }
    }

    const isViewingOwnTools =
      Boolean(currentUserId) &&
      (creatorFilter === 'me' || (creatorEmailParam && creatorEmailParam === userEmail))

    if (!approvalStatusFilter && currentUserRole !== 'ADMIN' && !isViewingOwnTools) {
      where.approvalStatus = { notIn: ['REJECTED', 'SUSPENDED'] }
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
          ...TOOL_CARD_INCLUDE,
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
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response
    const { user } = auth
    if (!['EDUCATOR', 'STUDENT', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const parsed = await parseRequestBody(req)
    if ('error' in parsed) return parsed.error
    const validation = validateBody(CreateToolSchema, parsed.data)
    if ('error' in validation) return validation.error
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
      audioEnabled,
      audioPersonaName,
      audioEngine,
      audioVoiceName,
      audioSpeakingStyle,
      audioSpeed,
      audioSystemSuffix,
      audioBackgroundTrack,
      customMetrics,
      gamificationConfig,
    } = validation.value

    const fastTracked = shouldFastTrackTool({
      userRole: user.role,
      published,
      toolType,
      externalUrl,
      referenceDocUrls,
      isOfficialService,
      systemPrompt,
    })

    const normalizedApprovalStatus =
      fastTracked
        ? 'APPROVED'
        : user.role === 'STUDENT'
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
        fastTrackApprovedAt: fastTracked ? new Date() : null,
        isOfficialService: isOfficialService === true && user.role === 'ADMIN',
        serviceProtocol: serviceProtocol || null,
        escalationEmail: escalationEmail || null,
        audioEnabled: Boolean(audioEnabled),
        audioPersonaName: audioEnabled ? audioPersonaName?.trim() || null : null,
        audioEngine: audioEnabled ? String(audioEngine || 'openai') : 'openai',
        audioVoiceName: audioEnabled ? audioVoiceName || null : null,
        audioSpeakingStyle: audioEnabled ? audioSpeakingStyle || null : null,
        audioSpeed:
          audioEnabled
            ? Math.min(Math.max(Number(audioSpeed) || 1, 0.25), 4)
            : 1,
        audioSystemSuffix: audioEnabled ? audioSystemSuffix?.trim() || null : null,
        audioBackgroundTrack: audioEnabled ? audioBackgroundTrack || null : null,
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
