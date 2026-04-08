import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../../../lib/prisma'

type StudyGuideCitation = {
  materialId: string
  note: string
}

type StudyGuideItem = {
  text: string
  citations: StudyGuideCitation[]
}

type StructuredStudyGuide = {
  strengths: StudyGuideItem[]
  areasForReview: StudyGuideItem[]
  nextSteps: StudyGuideItem[]
}

function extractJsonPayload(text: string) {
  const trimmed = text.trim()
  const withoutCodeFence = trimmed
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '')

  const firstBrace = withoutCodeFence.indexOf('{')
  const lastBrace = withoutCodeFence.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace !== -1) {
    return withoutCodeFence.slice(firstBrace, lastBrace + 1)
  }

  return withoutCodeFence
}

function normalizeGuideItems(value: unknown, allowedMaterialIds: Set<string>): StudyGuideItem[] {
  if (!Array.isArray(value)) return []

  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((item) => {
      const text =
        typeof item.text === 'string'
          ? item.text
          : typeof item.summary === 'string'
            ? item.summary
            : ''

      const citations = Array.isArray(item.citations)
        ? item.citations
            .filter((citation): citation is Record<string, unknown> => !!citation && typeof citation === 'object')
            .map((citation) => ({
              materialId: typeof citation.materialId === 'string' ? citation.materialId : '',
              note: typeof citation.note === 'string' ? citation.note : '',
            }))
            .filter((citation) => citation.materialId && allowedMaterialIds.has(citation.materialId))
            .slice(0, 2)
        : []

      return {
        text: text.trim(),
        citations,
      }
    })
    .filter((item) => item.text.length > 0)
    .slice(0, 3)
}

function fallbackGuide(): StructuredStudyGuide {
  return {
    strengths: [{ text: 'You are building momentum by showing up in your course tools and study spaces.', citations: [] }],
    areasForReview: [{ text: 'There is not enough structured evidence yet to identify a precise content gap.', citations: [] }],
    nextSteps: [{ text: 'Open one course material and one linked tool, then regenerate this guide for more targeted advice.', citations: [] }],
  }
}

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
    let courseMaterials: Array<{ id: string; title: string; content: string; moduleNumber: number | null; materialType: string }> = []

    if (courseId) {
      const links = await prisma.courseToolLink.findMany({
        where: { courseId: String(courseId) },
        select: { toolId: true, tool: { select: { name: true } } },
      })
      scopedToolIds = links.map((link) => link.toolId)
      courseMaterials = await prisma.courseMaterial.findMany({
        where: { courseId: String(courseId), isVisible: true },
        select: { id: true, title: true, content: true, moduleNumber: true, materialType: true },
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
        .slice(0, 12)
        .map(
          (material) =>
            `- [materialId:${material.id}] ${material.moduleNumber ? `Module ${material.moduleNumber} | ` : ''}${material.materialType} | ${material.title}: ${material.content.replace(/\s+/g, ' ').slice(0, 180)}`
        )
        .join('\n') || '- No course materials available.'

    const prompt = `You are a personalized study advisor for a university student using The Sandbox learning platform.

Based on the student's activity data below, generate a concise, encouraging study guide.

TOOLS USED AND SCORES:
${toolSessions}

TOOLS IN COURSE NOT YET TRIED:
${untriedSummary}

COURSE MATERIALS COVERED:
${courseMaterialSummary}

Return ONLY valid JSON in this exact shape:
{
  "strengths": [
    {
      "text": "...",
      "citations": [{ "materialId": "...", "note": "..." }]
    }
  ],
  "areasForReview": [
    {
      "text": "...",
      "citations": [{ "materialId": "...", "note": "..." }]
    }
  ],
  "nextSteps": [
    {
      "text": "...",
      "citations": [{ "materialId": "...", "note": "..." }]
    }
  ]
}

Rules:
- Give 2 to 3 bullet items per section.
- Each item should be one concise sentence.
- Cite course materials whenever an item makes a claim about course content or recommends a specific source to review.
- Only use materialIds that appear in the COURSE MATERIALS list.
- If an item is based only on tool usage or scores, citations can be an empty array.
- Be specific, encouraging, and actionable. Reference tool names directly when useful.`

    const client = new Anthropic()
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      system: 'You are a concise and encouraging university study advisor. Return only valid JSON.',
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('')

    const parsed = JSON.parse(extractJsonPayload(text)) as Record<string, unknown>
    const allowedMaterialIds = new Set(courseMaterials.map((material) => material.id))

    const guide: StructuredStudyGuide = {
      strengths: normalizeGuideItems(parsed.strengths, allowedMaterialIds),
      areasForReview: normalizeGuideItems(parsed.areasForReview, allowedMaterialIds),
      nextSteps: normalizeGuideItems(parsed.nextSteps, allowedMaterialIds),
    }

    const normalizedGuide =
      guide.strengths.length > 0 || guide.areasForReview.length > 0 || guide.nextSteps.length > 0
        ? guide
        : fallbackGuide()

    return NextResponse.json(normalizedGuide)
  } catch (error) {
    console.error('POST /api/study/guide error:', error)
    return NextResponse.json(fallbackGuide())
  }
}
