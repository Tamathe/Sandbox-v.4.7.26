import { NextRequest, NextResponse } from 'next/server'
import { requireStaffOrAdminUser, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { prisma } from '../../../../../lib/prisma'

export const GET = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { projectId } = await params

  const project = await prisma.surveyProject.findUnique({
    where: { id: projectId, creatorId: auth.user.id },
    include: {
      questions: { orderBy: { questionNumber: 'asc' } },
      _count: { select: { documents: true } },
    },
  })

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  // Compute status counts
  const pending = project.questions.filter((q) => q.status === 'pending').length
  const drafted = project.questions.filter((q) => q.status === 'drafted' || q.status === 'refined').length
  const approved = project.questions.filter((q) => q.status === 'approved').length

  return NextResponse.json({
    ...project,
    vaultDocCount: project._count.documents,
    stats: { pending, drafted, approved },
  })
})

export const PATCH = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { projectId } = await params
  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as { title?: string; status?: string; dueDate?: string; notes?: string }

  // Verify ownership
  const existing = await prisma.surveyProject.findUnique({
    where: { id: projectId, creatorId: auth.user.id },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const data: Record<string, unknown> = {}
  if (body.title !== undefined) data.title = body.title
  if (body.status !== undefined) data.status = body.status
  if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null
  if (body.notes !== undefined) data.notes = body.notes

  const updated = await prisma.surveyProject.update({
    where: { id: projectId },
    data,
    include: {
      questions: { orderBy: { questionNumber: 'asc' } },
      _count: { select: { documents: true } },
    },
  })

  return NextResponse.json(updated, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})

export const DELETE = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ projectId: string }> }) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { projectId } = await params

  // Verify ownership
  const existing = await prisma.surveyProject.findUnique({
    where: { id: projectId, creatorId: auth.user.id },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  await prisma.surveyProject.delete({ where: { id: projectId } })

  return NextResponse.json({ success: true }, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})
