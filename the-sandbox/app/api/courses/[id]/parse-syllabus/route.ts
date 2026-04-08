/**
 * POST /api/courses/[id]/parse-syllabus
 *
 * Accepts a PDF upload (multipart form data), runs the 3-pass Haiku pipeline
 * (structure detection → date normalization → prerequisite edges), and returns
 * the structured ParseResult.
 *
 * Creates a SyllabusParseJob record. If the same fileHash was already parsed
 * for this course, returns the cached result (idempotent).
 *
 * Auth: requireCourseOwner (educator who owns the course, or admin).
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireCourseOwner, isAuthFailure } from '../../../../lib/server-auth'
import { prisma } from '../../../../lib/prisma'
import { toJsonValue } from '../../../../lib/prisma-utils'
import { parseSyllabusBuffer } from '../../../../lib/syllabus-architect/pdf-parser'
import { withErrorHandling } from '../../../../lib/api-utils'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

export const POST = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id: courseId } = await params

  const auth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(auth)) return auth.response

  const formData = await req.formData()
  const file = formData.get('file')

  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: 'Missing file. Upload a PDF as form field "file".' },
      { status: 400 },
    )
  }

  const ACCEPTED_TYPES = new Set([
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ])
  if (!ACCEPTED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: 'Only PDF and DOCX files are supported.' },
      { status: 400 },
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  if (buffer.length > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `File size ${(buffer.length / 1024 / 1024).toFixed(1)} MB exceeds the 10 MB limit.` },
      { status: 400 },
    )
  }

  // Run the 3-pass pipeline (or return cached result)
  const { fileHash, result, existingJobId } = await parseSyllabusBuffer(buffer, courseId, file.type)

  // If this was a cache hit, return immediately
  if (existingJobId) {
    return NextResponse.json({
      jobId: existingJobId,
      cached: true,
      fileHash,
      result,
    })
  }

  // Persist the new parse job
  const job = await prisma.syllabusParseJob.create({
    data: {
      courseId,
      fileHash,
      status: 'COMPLETE',
      extractedData: toJsonValue(result),
    },
  })

  return NextResponse.json({
    jobId: job.id,
    cached: false,
    fileHash,
    result,
  })
})
