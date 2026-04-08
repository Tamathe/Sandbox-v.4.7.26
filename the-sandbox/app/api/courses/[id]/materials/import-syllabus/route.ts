import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../../../../../lib/prisma'
import { toJsonValue } from '../../../../../lib/prisma-utils'
import { processCourseMaterial } from '../../../../../lib/document-processor'
import { parseSyllabusBuffer } from '../../../../../lib/syllabus-architect/pdf-parser'
import { createInitialCourseMap } from '../../../../../lib/syllabus-architect/course-map-builder'
import { validateCourseMap } from '../../../../../lib/syllabus-architect/validator'
import { requireCourseOwner, isAuthFailure } from '../../../../../lib/server-auth'
import { buildCourseMaterialGovernanceDefaults } from '../../../../../lib/content-permissions'
import { withErrorHandling } from '../../../../../lib/api-utils'

export const runtime = 'nodejs'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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

export const POST = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 503 })
    }

    const { id } = await params
    const auth = await requireCourseOwner(req, id)
    if (isAuthFailure(auth)) return auth.response
    const currentUser = auth.user

    const course = await prisma.course.findUnique({
      where: { id },
      select: {
        id: true,
        isPublic: true,
        facultyAiRetrievalApproved: true,
        studentUploadsAllowed: true,
      },
    })
    if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const ACCEPTED_TYPES = new Set([
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ])
    if (!ACCEPTED_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'Only PDF and DOCX files are supported' }, { status: 400 })
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 413 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    let syllabusText = ''
    try {
      if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const { extractText } = await import('../../../../../lib/syllabus-parser-service')
        syllabusText = await extractText(buffer, file.type)
      } else {
        const { extractPdfText } = await import('../../../../../lib/pdf-extract')
        const data = await extractPdfText(buffer)
        syllabusText = data.text?.trim() || ''
      }
    } catch (err) {
      console.error('[import-syllabus] File parse error:', err)
      return NextResponse.json({ error: 'Failed to parse file' }, { status: 422 })
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
        ...buildCourseMaterialGovernanceDefaults({
          courseIsPublic: course.isPublic,
          facultyAiRetrievalApproved: course.facultyAiRetrievalApproved,
          studentUploadsAllowed: course.studentUploadsAllowed,
          uploaderId: currentUser.id,
          uploaderRole: currentUser.role,
          sourceSystem: 'syllabus',
          approvalBasis: 'syllabus_import',
        }),
      })),
    })

    // ── Fire-and-forget: RAG embed each material for Sandy context ──────
    for (const mat of created) {
      processCourseMaterial(mat.id, id, mat.content).catch((err) => {
        console.error(`[import-syllabus] RAG embed failed for material ${mat.id}:`, err)
      })
    }

    // ── Fire-and-forget: full 3-pass parse → CourseMap + Assignments + Objectives
    // Creates a PENDING parse job first so the UI can poll for status
    autoPopulateCourseStructure(id, buffer, file.type).catch((err) => {
      console.error(`[import-syllabus] Auto-populate course structure failed for ${id}:`, err)
    })

    return NextResponse.json({ created, count: created.length })
})

/**
 * Runs the full 3-pass syllabus parse pipeline on the uploaded file buffer,
 * then auto-applies the result to create CourseMap, Assignments, and
 * LearningObjectives — so a single upload populates everything.
 *
 * Creates a PENDING parse job upfront so the UI can poll status via
 * /api/courses/[id]/syllabus-status. Updates to COMPLETE or FAILED on finish.
 *
 * Skips silently if the course already has a CourseMap (educator may have
 * manually set one up via the CourseMap tab).
 */
async function autoPopulateCourseStructure(
  courseId: string,
  fileBuffer: Buffer,
  mimeType: string = 'application/pdf',
): Promise<void> {
  // Skip if course already has a CourseMap
  const existingMap = await prisma.courseMap.findUnique({ where: { courseId } })
  if (existingMap) {
    console.info(`[import-syllabus] Course ${courseId} already has a CourseMap — skipping auto-populate`)
    return
  }

  // Create a PENDING job so the UI can poll for status
  const pendingJob = await prisma.syllabusParseJob.create({
    data: {
      courseId,
      fileHash: 'pending',
      status: 'PENDING',
      extractedData: {},
    },
  })

  try {
    // Run the 3-pass Haiku pipeline (structure → dates → edges)
    const { fileHash, result, existingJobId } = await parseSyllabusBuffer(fileBuffer, courseId, mimeType)

    // If we got a cache hit, mark the pending job complete and skip
    if (existingJobId) {
      await prisma.syllabusParseJob.update({
        where: { id: pendingJob.id },
        data: { status: 'COMPLETE', fileHash },
      })
      return
    }

    // Update the pending job with extracted data
    await prisma.syllabusParseJob.update({
      where: { id: pendingJob.id },
      data: {
        fileHash,
        extractedData: toJsonValue(result),
      },
    })

    // Build CourseMap + units + nodes + edges + assignments + objectives
    // Uses the shared builder (single source of truth)
    await createInitialCourseMap(courseId, result, pendingJob.id, fileHash)

    console.info(
      `[import-syllabus] Auto-populated course ${courseId}: ` +
      `${result.units.length} units, ${result.edges.length} edges`
    )

    // Validate the course map (non-critical, just logs)
    const finalMap = await prisma.courseMap.findUnique({ where: { courseId } })
    if (finalMap) {
      validateCourseMap(finalMap.id).catch((err) => {
        console.error(`[import-syllabus] Course map validation failed:`, err)
      })
    }
  } catch (err) {
    // Mark the job as FAILED so the UI can show the error
    await prisma.syllabusParseJob.update({
      where: { id: pendingJob.id },
      data: { status: 'FAILED' },
    }).catch(() => {})
    throw err
  }
}
