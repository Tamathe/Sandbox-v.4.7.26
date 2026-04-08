import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { requireCourseOwner, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import Anthropic from '@anthropic-ai/sdk'
import { withErrorHandling } from '../../../../lib/api-utils'

export const runtime = 'nodejs'

// GET /api/courses/[id]/rubrics
export const GET = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const auth = await requireCourseOwner(req, id)
  if (isAuthFailure(auth)) return auth.response

  const rubrics = await prisma.rubric.findMany({
    where: { courseId: id },
    include: {
      criteria: {
        include: { bands: { orderBy: { minPoints: 'desc' } } },
        orderBy: { order: 'asc' },
      },
      _count: { select: { assignments: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(rubrics, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})

// POST /api/courses/[id]/rubrics
// Body options:
//   1. Manual: { title, description?, criteria: [{ title, description?, maxPoints, order?, bands: [{ label, minPoints, maxPoints, description }] }] }
//   2. Extract from syllabus: { title, extractFromMaterialId: "<CourseMaterial id>" }
export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const auth = await requireCourseOwner(req, id)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as { extractFromMaterialId?: string; title?: string; description?: string; criteria?: Array<{ title: string; description?: string; maxPoints: number; order?: number; bands?: Array<{ label: string; minPoints: number; maxPoints: number; description: string }> }> }

  // ── Extract from syllabus document ──────────────────────────────────────────
  if (body.extractFromMaterialId) {
    const material = await prisma.courseMaterial.findFirst({
      where: { id: String(body.extractFromMaterialId), courseId: id },
      select: { title: true, content: true },
    })
    if (!material) return NextResponse.json({ error: 'Material not found' }, { status: 404 })
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY required for extraction' }, { status: 503 })
    }

    const client = new Anthropic()
    const prompt = `Extract ALL grading rubrics from the following course document. Return ONLY valid JSON matching this schema exactly:

{
  "rubrics": [
    {
      "title": "string",
      "description": "string or null",
      "criteria": [
        {
          "title": "string",
          "description": "string or null",
          "maxPoints": number,
          "order": number,
          "bands": [
            { "label": "string", "minPoints": number, "maxPoints": number, "description": "string" }
          ]
        }
      ]
    }
  ]
}

If no rubric is found, return { "rubrics": [] }.

DOCUMENT:
${material.content.slice(0, 12000)}`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    })

    let parsed: { rubrics: Array<{ title: string; description?: string; criteria: Array<{ title: string; description?: string; maxPoints: number; order?: number; bands: Array<{ label: string; minPoints: number; maxPoints: number; description: string }> }> }> }
    try {
      const text = response.content[0].type === 'text' ? response.content[0].text : ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      parsed = JSON.parse(jsonMatch?.[0] ?? '{"rubrics":[]}')
    } catch {
      return NextResponse.json({ error: 'Failed to parse rubric from document' }, { status: 422 })
    }

    if (parsed.rubrics.length === 0) {
      return NextResponse.json({ rubrics: [], message: 'No rubrics found in document' })
    }

    // Create all extracted rubrics
    const created = await Promise.all(
      parsed.rubrics.map((r) =>
        prisma.rubric.create({
          data: {
            courseId: id,
            title: r.title,
            description: r.description ?? undefined,
            criteria: {
              create: (r.criteria ?? []).map((c, i) => ({
                title: c.title,
                description: c.description ?? undefined,
                maxPoints: Number(c.maxPoints),
                order: c.order ?? i,
                bands: {
                  create: (c.bands ?? []).map((b) => ({
                    label: b.label,
                    minPoints: Number(b.minPoints),
                    maxPoints: Number(b.maxPoints),
                    description: b.description,
                  })),
                },
              })),
            },
          },
          include: {
            criteria: { include: { bands: true }, orderBy: { order: 'asc' } },
          },
        })
      )
    )
    return NextResponse.json({ rubrics: created }, { status: 201 })
  }

  // ── Manual creation ──────────────────────────────────────────────────────────
  const { title, description, criteria } = body
  if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 })

  const rubric = await prisma.rubric.create({
    data: {
      courseId: id,
      title: String(title),
      description: description ? String(description) : undefined,
      criteria: criteria
        ? {
            create: (criteria as Array<{ title: string; description?: string; maxPoints: number; order?: number; bands?: Array<{ label: string; minPoints: number; maxPoints: number; description: string }> }>).map(
              (c, i) => ({
                title: c.title,
                description: c.description ?? undefined,
                maxPoints: Number(c.maxPoints),
                order: c.order ?? i,
                bands: c.bands
                  ? {
                      create: c.bands.map((b) => ({
                        label: b.label,
                        minPoints: Number(b.minPoints),
                        maxPoints: Number(b.maxPoints),
                        description: b.description,
                      })),
                    }
                  : undefined,
              })
            ),
          }
        : undefined,
    },
    include: {
      criteria: {
        include: { bands: { orderBy: { minPoints: 'desc' } } },
        orderBy: { order: 'asc' },
      },
    },
  })

  return NextResponse.json(rubric, { status: 201 })
})
