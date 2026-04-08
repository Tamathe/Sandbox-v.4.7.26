import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../../../../../lib/prisma'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function getUser(req: NextRequest) {
  const email = req.headers.get('x-demo-user-email')
  if (!email) return null
  return prisma.user.findUnique({ where: { email } })
}

function extractJsonPayload(text: string): string {
  const trimmed = text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '')
  const firstBracket = trimmed.indexOf('[')
  const lastBracket = trimmed.lastIndexOf(']')
  if (firstBracket !== -1 && lastBracket !== -1) return trimmed.slice(firstBracket, lastBracket + 1)
  return trimmed
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 503 })
    }

    const { id } = await params
    const user = await getUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        materials: {
          where: { isVisible: true },
          orderBy: [{ moduleNumber: 'asc' }, { createdAt: 'asc' }],
          select: { id: true, title: true, moduleNumber: true, materialType: true },
        },
      },
    })

    if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })

    const materialSummary = course.materials.length > 0
      ? course.materials.map((m) =>
          `- ${m.moduleNumber ? `Module ${m.moduleNumber}: ` : ''}[${m.materialType}] ${m.title}`
        ).join('\n')
      : 'No materials uploaded yet.'

    const prompt = `You are a university instructor's assistant. Given the course materials below, suggest 3 high-quality discussion thread prompts that would spark meaningful student engagement.

For each prompt:
- Make it open-ended (no single correct answer)
- Ground it in a specific concept from the materials
- Be concise (title under 10 words, content 2-3 sentences max)
- targetModule should be the module number the prompt relates to, or null if course-wide

Return raw JSON array only, no markdown:
[{"title": "...", "content": "...", "targetModule": number|null}]

COURSE: ${course.title} (${course.courseCode})
MATERIALS:
${materialSummary}`

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const responseText = message.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('')

    let suggestions: Array<{ title: string; content: string; targetModule: number | null }> = []
    try {
      const raw = JSON.parse(extractJsonPayload(responseText))
      suggestions = Array.isArray(raw)
        ? raw
            .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
            .map((item) => ({
              title: typeof item.title === 'string' ? item.title : 'Discussion prompt',
              content: typeof item.content === 'string' ? item.content : '',
              targetModule:
                item.targetModule !== null &&
                item.targetModule !== undefined &&
                Number.isFinite(Number(item.targetModule))
                  ? Number(item.targetModule)
                  : null,
            }))
            .slice(0, 3)
        : []
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }

    return NextResponse.json({ suggestions })
  } catch (err) {
    console.error('POST /api/courses/[id]/discussions/suggest error:', err)
    return NextResponse.json({ error: 'Failed to generate suggestions' }, { status: 500 })
  }
}
