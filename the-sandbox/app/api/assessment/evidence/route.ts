import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '../../../lib/rate-limit'
import { prisma } from '../../../lib/prisma'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { createEvidence, deleteEvidence, listEvidenceForGradebookEntry, updateEvidence } from '../../../lib/assessment/evidence-service'
import { EVIDENCE_TYPES, type EvidenceInput, type EvidenceUpdateInput } from '../../../lib/assessment/types'

export const runtime = 'nodejs'

type EntryAccessShape = {
  submission: {
    student: { id: string }
    assignment: {
      course: { instructorId: string }
    }
  }
}

async function getEntryAccessContext(gradebookEntryId: string) {
  return prisma.gradebookEntry.findUnique({
    where: { id: gradebookEntryId },
    include: {
      submission: {
        include: {
          student: { select: { id: true } },
          assignment: {
            include: {
              course: { select: { instructorId: true } },
            },
          },
        },
      },
    },
  })
}

async function getEvidenceAccessContext(evidenceId: string) {
  return prisma.assessmentEvidence.findUnique({
    where: { id: evidenceId },
    include: {
      gradebookEntry: {
        include: {
          submission: {
            include: {
              student: { select: { id: true } },
              assignment: {
                include: {
                  course: { select: { instructorId: true } },
                },
              },
            },
          },
        },
      },
    },
  })
}

function isFacultyForEntry(
  user: { id: string; role: string },
  entry: EntryAccessShape
) {
  return (
    user.role === 'ADMIN' ||
    (user.role === 'EDUCATOR' && user.id === entry.submission.assignment.course.instructorId)
  )
}

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const rateLimitError = await checkRateLimit(req, user.id, 'API')
  if (rateLimitError) return rateLimitError

  const gradebookEntryId = req.nextUrl.searchParams.get('gradebookEntryId')
  if (!gradebookEntryId) {
    return NextResponse.json({ error: 'gradebookEntryId is required' }, { status: 400 })
  }

  const entry = await getEntryAccessContext(gradebookEntryId)
  if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isFaculty = isFacultyForEntry(user, entry)
  const isOwner = entry.submission.student.id === user.id
  if (!isFaculty && !isOwner) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json(await listEvidenceForGradebookEntry(gradebookEntryId), {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const rateLimitError = await checkRateLimit(req, user.id, 'API')
  if (rateLimitError) return rateLimitError

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as Partial<EvidenceInput>

  if (!body.gradebookEntryId || !body.evidenceType || !body.sourceId || !body.sourceLabel) {
    return NextResponse.json(
      { error: 'gradebookEntryId, evidenceType, sourceId, and sourceLabel are required' },
      { status: 400 },
    )
  }

  if (!EVIDENCE_TYPES.includes(body.evidenceType)) {
    return NextResponse.json({ error: 'Invalid evidenceType' }, { status: 400 })
  }

  const entry = await getEntryAccessContext(body.gradebookEntryId)
  if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!isFacultyForEntry(user, entry)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const weight = body.weight == null ? 1 : Number(body.weight)
  if (!Number.isFinite(weight) || weight <= 0 || weight > 10) {
    return NextResponse.json({ error: 'weight must be between 0 and 10' }, { status: 400 })
  }

  const created = await createEvidence({
    gradebookEntryId: body.gradebookEntryId,
    evidenceType: body.evidenceType,
    sourceId: String(body.sourceId),
    sourceLabel: String(body.sourceLabel),
    weight,
    studentAnnotation:
      body.studentAnnotation == null ? null : String(body.studentAnnotation).trim() || null,
  })

  return NextResponse.json(created, { status: 201 })
})

export const PATCH = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const rateLimitError = await checkRateLimit(req, user.id, 'API')
  if (rateLimitError) return rateLimitError

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as {
    id?: string
    studentAnnotation?: unknown
    facultyScore?: number | string | null
    facultyNotes?: unknown
    weight?: number | string
  }

  if (!body.id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  const evidence = await getEvidenceAccessContext(body.id)
  if (!evidence) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isFaculty = isFacultyForEntry(user, evidence.gradebookEntry)
  const isOwner = evidence.gradebookEntry.submission.student.id === user.id
  if (!isFaculty && !isOwner) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const update: EvidenceUpdateInput = {}

  if (body.studentAnnotation !== undefined) {
    update.studentAnnotation =
      body.studentAnnotation == null ? null : String(body.studentAnnotation).trim() || null
  }

  if (body.weight !== undefined || body.facultyScore !== undefined || body.facultyNotes !== undefined) {
    if (!isFaculty) {
      return NextResponse.json({ error: 'Only faculty can review assessment evidence' }, { status: 403 })
    }
  }

  if (body.weight !== undefined) {
    const weight = Number(body.weight)
    if (!Number.isFinite(weight) || weight <= 0 || weight > 10) {
      return NextResponse.json({ error: 'weight must be between 0 and 10' }, { status: 400 })
    }
    update.weight = weight
  }

  if (body.facultyScore !== undefined) {
    if (body.facultyScore == null || body.facultyScore === '') {
      update.facultyScore = null
    } else {
      const score = Number(body.facultyScore)
      if (!Number.isFinite(score) || score < 0 || score > 1) {
        return NextResponse.json({ error: 'facultyScore must be between 0 and 1' }, { status: 400 })
      }
      update.facultyScore = score
    }
  }

  if (body.facultyNotes !== undefined) {
    update.facultyNotes = body.facultyNotes == null ? null : String(body.facultyNotes)
  }

  return NextResponse.json(await updateEvidence(body.id, update))
})

export const DELETE = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const rateLimitError = await checkRateLimit(req, user.id, 'API')
  if (rateLimitError) return rateLimitError

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as { id?: string }

  if (!body.id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  const evidence = await getEvidenceAccessContext(body.id)
  if (!evidence) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!isFacultyForEntry(user, evidence.gradebookEntry)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json(await deleteEvidence(body.id), {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
