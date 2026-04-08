import { NextRequest, NextResponse } from 'next/server'
import { requireStaffOrAdminUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { prisma } from '../../../../lib/prisma'
import { getTemplate } from '../../../../lib/staff/survey-intelligence-templates'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const projects = await prisma.surveyProject.findMany({
    where: { creatorId: auth.user.id },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      surveyOrg: true,
      status: true,
      templateKey: true,
      dueDate: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { questions: true } },
    },
  })

  const result = projects.map((p) => ({
    id: p.id,
    title: p.title,
    surveyOrg: p.surveyOrg,
    status: p.status,
    templateKey: p.templateKey,
    dueDate: p.dueDate,
    notes: p.notes,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    questionCount: p._count.questions,
  }))

  return NextResponse.json({ projects: result }, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as { title: string; surveyOrg?: string; templateKey?: string; dueDate?: string; notes?: string }

  if (!body.title || typeof body.title !== 'string') {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }

  const project = await prisma.surveyProject.create({
    data: {
      creatorId: auth.user.id,
      title: body.title,
      surveyOrg: body.surveyOrg ?? null,
      templateKey: body.templateKey ?? null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      notes: body.notes ?? null,
    },
  })

  // Auto-populate questions from template if templateKey provided
  if (body.templateKey) {
    const template = getTemplate(body.templateKey)
    if (template) {
      await prisma.surveyQuestion.createMany({
        data: template.questions.map(q => ({
          projectId: project.id,
          questionNumber: q.questionNumber,
          questionText: q.questionText,
          category: q.category,
          wordLimit: q.wordLimit,
          writingTips: q.writingTips,
        })),
      })
    }
  }

  // Fetch with questions included
  const result = await prisma.surveyProject.findUniqueOrThrow({
    where: { id: project.id },
    include: {
      questions: { orderBy: { questionNumber: 'asc' } },
      _count: { select: { questions: true, documents: true } },
    },
  })

  return NextResponse.json(result, { status: 201 })
})
