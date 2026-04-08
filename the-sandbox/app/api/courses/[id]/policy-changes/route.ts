import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { requireRequestUser, requireCourseOwner, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { recordPolicyChange } from '../../../../lib/policy-change-service'
import { withErrorHandling } from '../../../../lib/api-utils'

export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id: courseId } = await params

  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const changes = await prisma.coursePolicyChange.findMany({
    where: { courseId },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, summary: true, createdAt: true },
  })

  return NextResponse.json({ changes }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

export const POST = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id: courseId } = await params

  const auth = await requireCourseOwner(req, courseId)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { oldPolicies, newPolicies, courseCode } = parsed.data as { oldPolicies?: unknown; newPolicies?: unknown; courseCode?: string }

  if (!Array.isArray(oldPolicies) || !Array.isArray(newPolicies)) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  await recordPolicyChange(courseId, auth.user.id, oldPolicies, newPolicies, courseCode)

  return NextResponse.json({ recorded: true }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
