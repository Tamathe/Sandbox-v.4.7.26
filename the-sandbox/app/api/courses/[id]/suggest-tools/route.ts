import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../../../../lib/prisma'

type AuthUser = { id: string; role: string } | null

type Suggestion = {
  title: string
  description: string
  toolType: string
  recommendation: string
  rationale: string
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function canAccessCourse(
  course: { instructorId: string; isPublic: boolean },
  user: AuthUser
) {
  if (user?.role === 'ADMIN') return true
  if (course.isPublic) return true
  return user?.id === course.instructorId
}

function canSeeMaterial(
  material: { isVisible: boolean },
  user: { role: string } | null
) {
  if (!user || user.role === 'STUDENT') return material.isVisible
  return true
}

function parseModuleNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number.parseInt(String(value), 10)
  return Number.isNaN(parsed) ? null : parsed
}

function extractJsonPayload(text: string) {
  const trimmed = text.trim()
  const withoutCodeFence = trimmed
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '')

  const firstBracket = withoutCodeFence.indexOf('[')
  const lastBracket = withoutCodeFence.lastIndexOf(']')
  if (firstBracket !== -1 && lastBracket !== -1) {
    return withoutCodeFence.slice(firstBracket, lastBracket + 1)
  }

  const firstBrace = withoutCodeFence.indexOf('{')
  const lastBrace = withoutCodeFence.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace !== -1) {
    return withoutCodeFence.slice(firstBrace, lastBrace + 1)
  }

  return withoutCodeFence
}

function normalizeSuggestions(payload: unknown): Suggestion[] {
  const rawSuggestions = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object' && Array.isArray((payload as { suggestions?: unknown[] }).suggestions)
      ? (payload as { suggestions: unknown[] }).suggestions
      : []

  return rawSuggestions
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((item) => {
      const recommendation =
        typeof item.recommendation === 'string'
          ? item.recommendation
          : typeof item.rationale === 'string'
            ? item.rationale
            : 'This fills an uncovered learning gap in the current course setup.'

      return {
        title: typeof item.title === 'string' ? item.title : 'Suggested Tool',
        description: typeof item.description === 'string' ? item.description : 'AI-generated course tool suggestion.',
        toolType: typeof item.toolType === 'string' ? item.toolType : 'CHATBOT',
        recommendation,
        rationale: recommendation,
      }
    })
    .slice(0, 3)
}

async function getUser(req: NextRequest) {
  const email = req.headers.get('x-demo-user-email')
  if (!email) return null
  return prisma.user.findUnique({ where: { email } })
}

async function buildSuggestions(courseId: string, user: Awaited<ReturnType<typeof getUser>>, moduleNumber: number | null) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 503 })
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      materials: {
        where: moduleNumber ? { moduleNumber } : {},
        orderBy: [{ moduleNumber: 'asc' }, { createdAt: 'asc' }],
        select: {
          title: true,
          content: true,
          materialType: true,
          isVisible: true,
        },
      },
      linkedTools: {
        include: {
          tool: {
            select: {
              name: true,
              shortDescription: true,
              category: true,
              toolType: true,
            },
          },
        },
      },
    },
  })

  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  }

  if (!canAccessCourse(course, user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const visibleMaterials = course.materials.filter((material) => canSeeMaterial(material, user))
  if (moduleNumber !== null && visibleMaterials.length === 0) {
    return NextResponse.json({ error: 'No materials found for this module' }, { status: 400 })
  }

  const materialsText = visibleMaterials.length
    ? visibleMaterials
        .map((material) => `- [${material.materialType}] ${material.title}: ${material.content.slice(0, 300)}`)
        .join('\n')
    : 'No materials uploaded yet.'

  const toolsText = course.linkedTools.length
    ? course.linkedTools
        .map((link) => `- ${link.tool.name} (${link.tool.toolType}): ${link.tool.shortDescription}`)
        .join('\n')
    : 'None linked yet.'

  const prompt = `You are an educational tool designer helping a faculty member or student builder identify missing AI tools for a course.

Course: "${course.title}" (${course.courseCode})
${course.description ? `Description: ${course.description}` : ''}
${moduleNumber !== null ? `Focus module: ${moduleNumber}` : ''}

Course Materials:
${materialsText}

Already Linked Tools:
${toolsText}

Based on the course materials and the gaps in existing tools, suggest 3 high-impact AI tools that would most help students in this course. For each suggestion:
- Give it a specific, descriptive title
- Write a 1-sentence description of what it does
- Pick the best tool type from: CHATBOT, QUIZ, AI_INTERVIEW, DEBATE, STUDY_BUDDY, SIMULATION
- Write a 1-sentence recommendation explaining why this gap matters

Respond ONLY with a JSON array, no markdown fences, in this exact shape:
[
  {
    "title": "...",
    "description": "...",
    "toolType": "CHATBOT",
    "recommendation": "..."
  }
]`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')

  try {
    const suggestions = normalizeSuggestions(JSON.parse(extractJsonPayload(text)))
    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error('[suggest-tools] parse error:', error)
    return NextResponse.json({ error: 'Failed to parse suggestions' }, { status: 500 })
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const moduleNumber = parseModuleNumber(new URL(req.url).searchParams.get('moduleNumber'))
  try {
    return await buildSuggestions(id, user, moduleNumber)
  } catch (error) {
    console.error('[suggest-tools][GET]', error)
    return NextResponse.json({ error: 'Failed to generate suggestions' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    const body = await req.json()
    const moduleNumber = parseModuleNumber(body.moduleNumber)
    return await buildSuggestions(id, user, moduleNumber)
  } catch (error) {
    console.error('[suggest-tools][POST]', error)
    return NextResponse.json({ error: 'Failed to generate suggestions' }, { status: 500 })
  }
}
