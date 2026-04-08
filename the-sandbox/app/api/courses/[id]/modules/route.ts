import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { CourseService, CoursePermissionError, CourseValidationError } from '../../../../lib/courses/course-service'

export const GET = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const modules = await prisma.courseModule.findMany({
    where: { courseId: id },
    orderBy: { order: 'asc' },
    include: { lessons: { orderBy: { order: 'asc' } } },
  })
  return NextResponse.json(modules)
})

export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  if (!body?.title || typeof body.title !== 'string') {
    return NextResponse.json({ error: 'title required' }, { status: 400 })
  }

  try {
    const mod = await CourseService.addModule(auth.user, id, { title: body.title, summary: body.summary })
    return NextResponse.json(mod, { status: 201 })
  } catch (err) {
    if (err instanceof CoursePermissionError) return NextResponse.json({ error: err.message }, { status: 403 })
    if (err instanceof CourseValidationError) return NextResponse.json({ error: err.message }, { status: 400 })
    throw err
  }
})
