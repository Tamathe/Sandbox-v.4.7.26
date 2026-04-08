import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../../../../../lib/prisma'

export const runtime = 'nodejs'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function getUser(req: NextRequest) {
  const email = req.headers.get('x-demo-user-email')
  if (!email) return null
  return prisma.user.findUnique({ where: { email } })
}

function canManageCourse(
  course: { instructorId: string },
  user: { id: string; role: string } | null
) {
  if (!user) return false
  if (user.role === 'ADMIN') return true
  return user.role === 'EDUCATOR' && user.id === course.instructorId
}

function extractJsonPayload(text: string): string {
  const trimmed = text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '')
  const firstBracket = trimmed.indexOf('[')
  const lastBracket = trimmed.lastIndexOf(']')
  if (firstBracket !== -1 && lastBracket !== -1) return trimmed.slice(firstBracket, lastBracket + 1)
  return trimmed
}

type SyllabusItem = {
  title: string
  moduleNumber: number | null
  materialType: string
  content: string
}

function normalizeItems(raw: unknown): SyllabusItem[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((item) => ({
      title: typeof item.title === 'string' ? item.title.slice(0, 200) : 'Untitled',
      moduleNumber:
        item.moduleNumber !== null && item.moduleNumber !== undefined && Number.isFinite(Number(item.moduleNumber))
          ? Number(item.moduleNumber)
          : null,
      materialType:
        ['syllabus', 'lecture', 'reading', 'assignment', 'case', 'rubric', 'quiz'].includes(String(item.materialType))
          ? String(item.materialType)
          : 'lecture',
      content: typeof item.content === 'string' ? item.content.slice(0, 8000) : '',
    }))
    .filter((item) => item.title && item.content)
    .slice(0, 20)
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
      select: { id: true, instructorId: true },
    })
    if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    if (!canManageCourse(course, user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 })
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 413 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    let syllabusText = ''
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>
      const data = await pdfParse(buffer)
      syllabusText = data.text?.trim() || ''
    } catch {
      return NextResponse.json({ error: 'Failed to parse PDF' }, { status: 422 })
    }

    if (!syllabusText) {
      return NextResponse.json({ error: 'No text could be extracted from this PDF' }, { status: 422 })
    }

    const prompt = `You are a course structure extractor. Given a university syllabus, extract each week or module as a separate item.

Return a JSON array with this exact shape — no markdown fences, just raw JSON:
[
  {
    "title": "string — descriptive name of this week/module",
    "moduleNumber": number | null,
    "materialType": "syllabus" | "lecture" | "reading" | "assignment",
    "content": "string — the relevant text excerpt from the syllabus for this section"
  }
]

Rules:
- Maximum 20 items.
- Use moduleNumber = null for course-level items (grading policy, contact info, schedule overview, etc.).
- For a week-by-week syllabus each week becomes one item with moduleNumber = that week number.
- materialType should be "syllabus" for the course overview/policies entry, otherwise pick the most fitting type.
- content should be the raw extracted text for that section, not a paraphrase.

SYLLABUS TEXT:
${syllabusText.slice(0, 15000)}`

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    })

    const responseText = message.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('')

    let items: SyllabusItem[] = []
    try {
      items = normalizeItems(JSON.parse(extractJsonPayload(responseText)))
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }

    if (items.length === 0) {
      return NextResponse.json({ error: 'No modules could be extracted from this syllabus' }, { status: 422 })
    }

    const created = await prisma.courseMaterial.createManyAndReturn({
      data: items.map((item) => ({
        courseId: id,
        title: item.title,
        content: item.content,
        materialType: item.materialType,
        moduleNumber: item.moduleNumber,
        isVisible: true,
      })),
    })

    return NextResponse.json({ created, count: created.length })
  } catch (err) {
    console.error('POST /api/courses/[id]/materials/import-syllabus error:', err)
    return NextResponse.json({ error: 'Import failed' }, { status: 500 })
  }
}
