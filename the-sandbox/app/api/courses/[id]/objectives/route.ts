import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../../../../lib/prisma'
import { requireRequestUser, requireCourseOwner, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { checkRateLimit } from '../../../../lib/rate-limit'

// GET /api/courses/[id]/objectives — list all objectives for a course
export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id: courseId } = await params
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response

    const objectives = await prisma.learningObjective.findMany({
      where: { courseId },
      orderBy: [{ moduleNumber: 'asc' }, { orderIndex: 'asc' }],
      select: {
        id: true,
        title: true,
        description: true,
        bloomLevel: true,
        source: true,
        moduleNumber: true,
        orderIndex: true,
        materialId: true,
        material: { select: { id: true, title: true } },
      },
    })
    return NextResponse.json({ objectives }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch objectives' }, { status: 500 })
  }
})

// PUT /api/courses/[id]/objectives — add a single manual objective
export const PUT = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id: courseId } = await params
  const auth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(auth)) return auth.response

  try {
    const parsed = await parseRequestBody(req)
    if ('error' in parsed) return parsed.error
    const body = parsed.data as { title?: string; description?: string; moduleNumber?: number | null }
    const title = typeof body?.title === 'string' ? body.title.trim() : ''
    const description = typeof body?.description === 'string' ? body.description.trim() : null
    const moduleNumber = body?.moduleNumber != null ? Number(body.moduleNumber) : null

    if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 })

    const maxOrder = await prisma.learningObjective.findFirst({
      where: { courseId },
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true },
    })

    const objective = await prisma.learningObjective.create({
      data: {
        courseId,
        title,
        description: description || null,
        moduleNumber,
        orderIndex: (maxOrder?.orderIndex ?? -1) + 1,
      },
    })

    return NextResponse.json({ objective }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create objective' }, { status: 500 })
  }
})

// POST /api/courses/[id]/objectives — extract objectives from materials using Claude
export const POST = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id: courseId } = await params
  const auth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(auth)) return auth.response

  const rateLimitError = await checkRateLimit(req, auth.user.id, 'CHAT', auth.user.role !== 'STUDENT')
  if (rateLimitError) return rateLimitError

  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 503 })
    }

    const materials = await prisma.courseMaterial.findMany({
      where: { courseId, isVisible: true },
      orderBy: [{ moduleNumber: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, title: true, content: true, moduleNumber: true, materialType: true },
    })

    if (materials.length === 0) {
      return NextResponse.json({ error: 'No materials to extract from' }, { status: 400 })
    }

    const materialsText = materials
      .map(
        (m) =>
          `[MATERIAL_ID:${m.id}] Module ${m.moduleNumber ?? '?'} | ${m.materialType} | ${m.title}\n${m.content.slice(0, 2000)}`
      )
      .join('\n\n---\n\n')

    const prompt = `You are an expert curriculum analyst. Extract every discrete learning objective from the course materials below.

A learning objective is a specific, measurable thing a student should know or be able to do after studying that section. Be granular — a 20-page lecture note might yield 8-12 objectives.

For each objective, output a JSON object with:
- "materialId": the MATERIAL_ID value from the source section (or null if it spans multiple)
- "moduleNumber": integer module number from the source (or null)
- "title": short action-oriented phrase, e.g. "Explain the role of ATP in cellular respiration"
- "description": 1-2 sentences describing what full mastery looks like

Output ONLY a valid JSON array of these objects — no explanation, no markdown fences.

COURSE MATERIALS:
${materialsText}`

    const client = new Anthropic()
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
    // Strip markdown fences if Claude included them anyway
    const jsonText = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()

    type RawObjective = { materialId?: string | null; moduleNumber?: number | null; title?: string; description?: string }
    let extracted: RawObjective[] = []
    try {
      extracted = JSON.parse(jsonText) as RawObjective[]
    } catch {
      return NextResponse.json({ error: 'Failed to parse Claude response', raw }, { status: 500 })
    }

    // Delete existing objectives for this course and replace
    await prisma.learningObjective.deleteMany({ where: { courseId } })

    const created = await prisma.$transaction(
      extracted.map((obj, i) =>
        prisma.learningObjective.create({
          data: {
            courseId,
            materialId: obj.materialId ?? null,
            moduleNumber: obj.moduleNumber ?? null,
            title: obj.title ?? 'Untitled objective',
            description: obj.description ?? null,
            orderIndex: i,
          },
        })
      )
    )

    return NextResponse.json({ objectives: created, count: created.length })
  } catch (err) {
    console.error('POST /api/courses/[id]/objectives error:', err)
    return NextResponse.json({ error: 'Failed to extract objectives' }, { status: 500 })
  }
})

// DELETE /api/courses/[id]/objectives — clear all objectives
export const DELETE = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id: courseId } = await params
  const auth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(auth)) return auth.response

  try {
    await prisma.learningObjective.deleteMany({ where: { courseId } })
    return NextResponse.json({ deleted: true }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  } catch {
    return NextResponse.json({ error: 'Failed to delete objectives' }, { status: 500 })
  }
})
