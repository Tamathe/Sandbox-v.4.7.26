import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../../../lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const userEmail = req.headers.get('x-demo-user-email')
    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { email: userEmail } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Study guides are for students only' }, { status: 403 })
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not configured' }, { status: 503 })
    }

    const { courseId } = await req.json().catch(() => ({}))

    let scopedToolIds: string[] | null = null
    let courseMaterials: Array<{ title: string; content: string }> = []

    if (courseId) {
      const links = await prisma.courseToolLink.findMany({
        where: { courseId: String(courseId) },
        select: { toolId: true, tool: { select: { name: true } } },
      })
      scopedToolIds = links.map((link) => link.toolId)
      courseMaterials = await prisma.courseMaterial.findMany({
        where: { courseId: String(courseId), isVisible: true },
        select: { title: true, content: true },
        orderBy: [{ moduleNumber: 'asc' }, { createdAt: 'asc' }],
      })
    }

    const sessions = await prisma.toolSession.findMany({
      where: {
        userId: user.id,
        ...(scopedToolIds ? { toolId: { in: scopedToolIds } } : {}),
      },
      include: {
        tool: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { startedAt: 'desc' },
    })

    const sessionIds = sessions.map((session) => session.id)
    const metricEvents = sessionIds.length
      ? await prisma.metricEvent.findMany({
          where: {
            sessionId: { in: sessionIds },
          },
          orderBy: { createdAt: 'desc' },
        })
      : []

    const latestScoreBySession = new Map<string, string>()
    for (const event of metricEvents) {
      if (!event.sessionId || latestScoreBySession.has(event.sessionId)) continue
      if (event.metricName.toLowerCase() !== 'score') continue
      latestScoreBySession.set(event.sessionId, event.metricValue)
    }

    const libraryEntries = await prisma.libraryEntry.findMany({
      where: { userId: user.id },
      include: {
        tool: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { addedAt: 'desc' },
    })

    const candidateTools = courseId
      ? await prisma.courseToolLink.findMany({
          where: { courseId: String(courseId) },
          include: {
            tool: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        }).then((links) => links.map((link) => link.tool))
      : libraryEntries.map((entry) => entry.tool)

    const triedToolIds = new Set(sessions.map((session) => session.toolId))
    const untriedTools = candidateTools.filter((tool) => !triedToolIds.has(tool.id)).map((tool) => tool.name)

    const toolSessions = sessions
      .slice(0, 20)
      .map((session) => {
        const score = latestScoreBySession.get(session.id)
        return `- ${session.tool.name}: ${score ? `${score}%` : 'used without a recorded score'}`
      })
      .join('\n') || '- No recent tool activity recorded.'

    const untriedSummary =
      untriedTools.map((toolName) => `- ${toolName}`).join('\n') || '- No obvious gaps detected.'

    const courseMaterialSummary =
      courseMaterials
        .slice(0, 10)
        .map((material) => `- ${material.title}: ${material.content.replace(/\s+/g, ' ').slice(0, 180)}`)
        .join('\n') || '- No course materials available.'

    const prompt = `You are a personalized study advisor for a university student using The Sandbox learning platform.

Based on the student's activity data below, generate a concise, encouraging study guide.

TOOLS USED AND SCORES:
${toolSessions}

TOOLS IN COURSE NOT YET TRIED:
${untriedSummary}

COURSE MATERIALS COVERED:
${courseMaterialSummary}

Respond with exactly three sections using these headers:
## Strengths
## Areas for Review
## Suggested Next Steps

Be specific, encouraging, and actionable. Reference tool names directly. Keep each section to 2-3 bullet points.`

    const client = new Anthropic()
    const stream = client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 900,
      system: 'You are a concise and encouraging university study advisor.',
      messages: [{ role: 'user', content: prompt }],
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
              controller.enqueue(encoder.encode(chunk.delta.text))
            }
          }
        } catch (error) {
          console.error('Study guide stream error:', error)
        } finally {
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    console.error('POST /api/study/guide error:', error)
    return NextResponse.json({ error: 'Failed to generate study guide' }, { status: 500 })
  }
}
