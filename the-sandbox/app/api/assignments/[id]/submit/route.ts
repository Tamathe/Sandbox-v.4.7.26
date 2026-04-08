import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { scoreSubmission } from '../../../../lib/grading-service'
import { sendEmail } from '../../../../lib/email'
import { format } from 'date-fns'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { linkSubmissionEvidence } from '../../../../lib/assessment/evidence-service'
import { scoreAndPersistProcess } from '../../../../lib/assessment/process-scoring-service'
import { syncAuthenticAssessmentSubmission } from '../../../../lib/assessment/authentic-assessment-service'
import {
  serializeProcessAnnotationPayload,
  type ProcessAnnotation,
} from '../../../../lib/assessment/types'

export const runtime = 'nodejs'

function sanitizeAnnotations(value: unknown): ProcessAnnotation[] {
  if (!Array.isArray(value)) return []

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null

      const rawIndex = (item as { messageIndex?: unknown }).messageIndex
      const rawText = (item as { text?: unknown }).text
      const messageIndex = Number(rawIndex)
      const text = typeof rawText === 'string' ? rawText.trim() : ''

      if (!Number.isInteger(messageIndex) || messageIndex < 0 || !text) {
        return null
      }

      return { messageIndex, text }
    })
    .filter((item): item is ProcessAnnotation => item != null)
}

function serializeSubmittedProcessAnnotation(value: unknown): string | null {
  if (typeof value === 'string') {
    return value.trim() || null
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  const annotations = sanitizeAnnotations((value as { annotations?: unknown }).annotations)
  const reflection =
    typeof (value as { reflection?: unknown }).reflection === 'string'
      ? (value as { reflection?: string }).reflection?.trim()
      : undefined

  return serializeProcessAnnotationPayload({
    annotations,
    ...(reflection ? { reflection } : {}),
  })
}

function fireSubmissionEmail({
  studentName,
  studentEmail,
  assignmentTitle,
  courseTitle,
  submittedAt,
  pointsPossible,
  assignmentId,
}: {
  studentName: string
  studentEmail: string
  assignmentTitle: string
  courseTitle: string
  submittedAt: Date
  pointsPossible: number
  assignmentId: string
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://thesandbox.uky.edu'
  const link = `${appUrl}/assignments/${assignmentId}`
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1f2937">
      <div style="background:#0033A0;padding:24px 32px;border-radius:8px 8px 0 0">
        <h1 style="color:white;margin:0;font-size:20px">Submission Received</h1>
        <p style="color:#93c5fd;margin:4px 0 0">University of Kentucky</p>
      </div>
      <div style="background:white;padding:24px 32px;border:1px solid #e5e7eb;border-top:none">
        <p style="margin:0 0 16px">Hi <strong>${studentName}</strong>,</p>
        <p style="margin:0 0 16px">Your submission has been received. Here are the details:</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px">
          <tr><td style="padding:8px 0;color:#6b7280;width:40%">Assignment</td><td style="padding:8px 0;font-weight:600">${assignmentTitle}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280">Course</td><td style="padding:8px 0">${courseTitle}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280">Submitted</td><td style="padding:8px 0">${format(submittedAt, 'MMM d, yyyy h:mm a')}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280">Points possible</td><td style="padding:8px 0">${pointsPossible}</td></tr>
        </table>
        <a href="${link}" style="display:inline-block;background:#0033A0;color:white;text-decoration:none;padding:10px 20px;border-radius:6px;font-size:14px;font-weight:600">View Assignment →</a>
        <p style="margin-top:24px;font-size:12px;color:#9ca3af">
          Submitted via <a href="${appUrl}" style="color:#0033A0">University of Kentucky</a> · University of Kentucky
        </p>
      </div>
    </div>`

  sendEmail({
    to: studentEmail,
    subject: `Submission received: ${assignmentTitle}`,
    html,
  }).catch(console.error)
}

// POST /api/assignments/[id]/submit
// Student submits work for an assignment.
// - LEGACY_SUBMISSION: body.textContent or body.fileUrl + body.fileName
// - AI_EXPERIENCE: body.sessionId (ToolSession id of completed chat)
//
// Creates Submission + GradebookEntry (status=AI_DRAFT, awaiting AI scoring in Phase 3).
export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth
  if (user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Only students can submit assignments' }, { status: 403 })
  }

  const assignment = await prisma.assignment.findUnique({
    where: { id },
    include: { course: { select: { id: true, title: true } } },
  })
  if (!assignment) return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
  if (!assignment.isPublished) {
    return NextResponse.json({ error: 'Assignment is not published' }, { status: 403 })
  }
  if (assignment.dueAt && assignment.dueAt < new Date() && !assignment.acceptingLate) {
    return NextResponse.json({ error: 'Assignment deadline has passed' }, { status: 400 })
  }

  // Check for existing submission (one per student per assignment)
  const existing = await prisma.submission.findUnique({
    where: { assignmentId_studentId: { assignmentId: id, studentId: user.id } },
  })
  if (existing) {
    return NextResponse.json({ error: 'You have already submitted this assignment' }, { status: 409 })
  }

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as Record<string, unknown>
  const studentAnnotation = serializeSubmittedProcessAnnotation(body.studentAnnotation)

  if (assignment.type === 'AI_EXPERIENCE') {
    const { sessionId } = body
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required for AI_EXPERIENCE submissions' }, { status: 400 })
    }
    // Verify the session belongs to this student and tool
    const session = await prisma.toolSession.findUnique({
      where: { id: String(sessionId) },
      select: { id: true, userId: true, toolId: true },
    })
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    if (session.userId !== user.id) {
      return NextResponse.json({ error: 'Session does not belong to you' }, { status: 403 })
    }
    if (assignment.toolId && session.toolId !== assignment.toolId) {
      return NextResponse.json({ error: 'Session is not for the required tool' }, { status: 400 })
    }
    // Check session isn't already linked to another submission
    const sessionTaken = await prisma.submission.findUnique({ where: { sessionId: String(sessionId) }, select: { id: true } })
    if (sessionTaken) {
      return NextResponse.json({ error: 'This session has already been submitted' }, { status: 409 })
    }

    const submission = await prisma.submission.create({
      data: {
        assignmentId: id,
        studentId: user.id,
        type: 'AI_EXPERIENCE',
        sessionId: String(sessionId),
      },
    })
    const entry = await prisma.gradebookEntry.create({
      data: { submissionId: submission.id, status: 'AI_DRAFT' },
    })
    // Fire-and-forget AI scoring — responds immediately, scores in background
    const linkedEvidence = await linkSubmissionEvidence({
      gradebookEntryId: entry.id,
      assignmentTitle: assignment.title,
      submissionType: submission.type,
      sessionId: submission.sessionId,
      studentAnnotation,
    })
    if (assignment.assessmentMode === 'PROCESS' && submission.sessionId && linkedEvidence?.evidence.id) {
      scoreAndPersistProcess(linkedEvidence.evidence.id, submission.sessionId).catch(console.error)
    }
    scoreSubmission(submission.id).catch(console.error)
    fireSubmissionEmail({
      studentName: user.name,
      studentEmail: user.email,
      assignmentTitle: assignment.title,
      courseTitle: assignment.course.title,
      submittedAt: submission.submittedAt,
      pointsPossible: assignment.pointsPossible,
      assignmentId: id,
    })
    return NextResponse.json({ submission, gradebookEntry: entry }, { status: 201 })
  }

  const { textContent, fileUrl, fileName, toolId } = body

  if (assignment.assessmentMode === 'AUTHENTIC') {
    if (!toolId || typeof toolId !== 'string') {
      return NextResponse.json(
        { error: 'toolId is required for authentic assessment submissions' },
        { status: 400 }
      )
    }

    const tool = await prisma.tool.findUnique({
      where: { id: toolId },
      select: {
        id: true,
        name: true,
        creatorId: true,
        published: true,
      },
    })

    if (!tool) {
      return NextResponse.json({ error: 'Linked tool not found' }, { status: 404 })
    }

    if (tool.creatorId !== user.id) {
      return NextResponse.json(
        { error: 'You can only submit tools that you created' },
        { status: 403 }
      )
    }

    if (!tool.published) {
      return NextResponse.json(
        { error: 'Publish your tool before submitting it for authentic assessment' },
        { status: 400 }
      )
    }

    const submission = await prisma.submission.create({
      data: {
        assignmentId: id,
        studentId: user.id,
        type: 'LEGACY_SUBMISSION',
        textContent: typeof textContent === 'string' && textContent.trim().length > 0
          ? textContent.trim()
          : undefined,
        linkedToolId: tool.id,
      },
    })

    const entry = await prisma.gradebookEntry.create({
      data: { submissionId: submission.id, status: 'AI_DRAFT' },
    })

    syncAuthenticAssessmentSubmission(submission.id).catch(console.error)
    fireSubmissionEmail({
      studentName: user.name,
      studentEmail: user.email,
      assignmentTitle: assignment.title,
      courseTitle: assignment.course.title,
      submittedAt: submission.submittedAt,
      pointsPossible: assignment.pointsPossible,
      assignmentId: id,
    })

    return NextResponse.json({ submission, gradebookEntry: entry }, { status: 201 })
  }

  // LEGACY_SUBMISSION
  if (!textContent && !fileUrl) {
    return NextResponse.json({ error: 'textContent or fileUrl is required' }, { status: 400 })
  }

  const submission = await prisma.submission.create({
    data: {
      assignmentId: id,
      studentId: user.id,
      type: 'LEGACY_SUBMISSION',
      textContent: textContent ? String(textContent) : undefined,
      fileUrl: fileUrl ? String(fileUrl) : undefined,
      fileName: fileName ? String(fileName) : undefined,
    },
  })
  const entry = await prisma.gradebookEntry.create({
    data: { submissionId: submission.id, status: 'AI_DRAFT' },
  })
  scoreSubmission(submission.id).catch(console.error)
  fireSubmissionEmail({
    studentName: user.name,
    studentEmail: user.email,
    assignmentTitle: assignment.title,
    courseTitle: assignment.course.title,
    submittedAt: submission.submittedAt,
    pointsPossible: assignment.pointsPossible,
    assignmentId: id,
  })
  return NextResponse.json({ submission, gradebookEntry: entry }, { status: 201 })
})
