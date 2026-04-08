import { NextRequest, NextResponse } from 'next/server'
import { requireCourseOwner, isAuthFailure } from '../../../../../lib/server-auth'
import { generateCourseMap } from '../../../../../lib/course-map-service'
import { prisma } from '../../../../../lib/prisma'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { checkRateLimit } from '../../../../../lib/rate-limit'

export const runtime = 'nodejs'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const MAX_FILES = 5

export const POST = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id: courseId } = await params
  const auth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(auth)) return auth.response

  const rateLimitError = await checkRateLimit(req, auth.user.id, 'GENERATE', auth.user.role !== 'STUDENT')
  if (rateLimitError) return rateLimitError

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 503 })
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { title: true, courseCode: true },
  })
  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  }

  const formData = await req.formData()
  const files = formData.getAll('files') as File[]

  if (files.length === 0) {
    return NextResponse.json({ error: 'No files provided' }, { status: 400 })
  }
  if (files.length > MAX_FILES) {
    return NextResponse.json({ error: `Maximum ${MAX_FILES} files allowed` }, { status: 400 })
  }

  // Validate all files are PDFs within size limit
  for (const file of files) {
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: `File "${file.name}" is not a PDF` }, { status: 400 })
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `File "${file.name}" exceeds 10 MB limit` }, { status: 413 })
    }
  }

  // Parse all PDFs
  const { extractPdfText } = await import('../../../../../lib/pdf-extract')

  const parsedTexts: { filename: string; text: string }[] = []
  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    try {
      const data = await extractPdfText(buffer)
      const text = data.text?.trim() || ''
      if (text) {
        parsedTexts.push({ filename: file.name, text })
      }
    } catch {
      return NextResponse.json({ error: `Failed to parse PDF: ${file.name}` }, { status: 422 })
    }
  }

  if (parsedTexts.length === 0) {
    return NextResponse.json({ error: 'No text could be extracted from the uploaded PDFs' }, { status: 422 })
  }

  // First file is the primary syllabus
  const primaryText = parsedTexts[0].text
  const supplementalTexts = parsedTexts.slice(1)

  const courseMap = await generateCourseMap(
    courseId,
    primaryText,
    supplementalTexts,
    course.title,
    course.courseCode,
  )

  return NextResponse.json({ courseMap }, {
    headers: { 'Cache-Control': 'no-store' },
  })
})
