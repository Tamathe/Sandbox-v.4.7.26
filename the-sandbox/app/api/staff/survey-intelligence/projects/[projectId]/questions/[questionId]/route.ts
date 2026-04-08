import { NextRequest, NextResponse } from 'next/server'
import { requireStaffOrAdminUser, isAuthFailure, parseRequestBody } from '../../../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../../../lib/api-utils'
import { prisma } from '../../../../../../../lib/prisma'

export const PATCH = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; questionId: string }> },
) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { projectId, questionId } = await params
  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as Record<string, unknown>

  // Verify project ownership
  const project = await prisma.surveyProject.findUnique({
    where: { id: projectId, creatorId: auth.user.id },
    select: { id: true },
  })
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  // Verify question belongs to project
  const existing = await prisma.surveyQuestion.findUnique({
    where: { id: questionId },
  })
  if (!existing || existing.projectId !== projectId) {
    return NextResponse.json({ error: 'Question not found' }, { status: 404 })
  }

  const data: Record<string, unknown> = {}
  if (body.questionText !== undefined) data.questionText = body.questionText
  if (body.category !== undefined) data.category = body.category
  if (body.status !== undefined) data.status = body.status
  if (body.draftResponse !== undefined) data.draftResponse = body.draftResponse
  if (body.wordLimit !== undefined) data.wordLimit = body.wordLimit
  if (body.writingTips !== undefined) data.writingTips = body.writingTips
  if (body.evidenceTable !== undefined) data.evidenceTable = body.evidenceTable
  if (body.gapAnalysis !== undefined) data.gapAnalysis = body.gapAnalysis

  // Increment draftVersion when draftResponse changes
  if (body.draftResponse !== undefined) {
    data.draftVersion = existing.draftVersion + 1
  }

  const updated = await prisma.surveyQuestion.update({
    where: { id: questionId },
    data,
  })

  return NextResponse.json(updated)
})

export const DELETE = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; questionId: string }> },
) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { projectId, questionId } = await params

  // Verify project ownership
  const project = await prisma.surveyProject.findUnique({
    where: { id: projectId, creatorId: auth.user.id },
    select: { id: true },
  })
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  // Verify question belongs to project
  const existing = await prisma.surveyQuestion.findUnique({
    where: { id: questionId },
  })
  if (!existing || existing.projectId !== projectId) {
    return NextResponse.json({ error: 'Question not found' }, { status: 404 })
  }

  await prisma.surveyQuestion.delete({ where: { id: questionId } })

  return NextResponse.json({ success: true })
})
