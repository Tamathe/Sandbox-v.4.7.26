import { NextRequest, NextResponse } from 'next/server'
import { requireStaffOrAdminUser, isAuthFailure, parseRequestBody } from '../../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../../lib/api-utils'
import { prisma } from '../../../../../../lib/prisma'

export const GET = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { projectId } = await params

  // Verify project ownership
  const project = await prisma.surveyProject.findUnique({
    where: { id: projectId, creatorId: auth.user.id },
    select: { id: true },
  })
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const questions = await prisma.surveyQuestion.findMany({
    where: { projectId },
    orderBy: { questionNumber: 'asc' },
  })

  return NextResponse.json({ questions }, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})

export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { projectId } = await params
  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as { questionText: string; category: string; questionNumber: number; wordLimit?: number; writingTips?: string }

  // Verify project ownership
  const project = await prisma.surveyProject.findUnique({
    where: { id: projectId, creatorId: auth.user.id },
    select: { id: true },
  })
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  if (!body.questionText || typeof body.questionText !== 'string') {
    return NextResponse.json({ error: 'questionText is required' }, { status: 400 })
  }
  if (!body.category || typeof body.category !== 'string') {
    return NextResponse.json({ error: 'category is required' }, { status: 400 })
  }
  if (body.questionNumber === undefined || typeof body.questionNumber !== 'number') {
    return NextResponse.json({ error: 'questionNumber is required' }, { status: 400 })
  }

  const question = await prisma.surveyQuestion.create({
    data: {
      projectId,
      questionNumber: body.questionNumber,
      questionText: body.questionText,
      category: body.category,
      wordLimit: body.wordLimit ?? null,
      writingTips: body.writingTips ?? null,
    },
  })

  return NextResponse.json(question, { status: 201 })
})
