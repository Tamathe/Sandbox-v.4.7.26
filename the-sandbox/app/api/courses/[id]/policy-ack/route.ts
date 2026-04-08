import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'

export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id: courseId } = await params

  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const user = auth.user

  if (user.role === 'STUDENT') {
    const ack = await prisma.coursePolicyAck.findUnique({
      where: { userId_courseId: { userId: user.id, courseId } },
    })
    return NextResponse.json({
      acknowledged: !!ack,
      ackedAt: ack?.ackedAt?.toISOString() ?? null,
    }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }

  // Educator/admin view — return aggregate counts
  const [totalEnrolled, acknowledged] = await Promise.all([
    prisma.courseEnrollment.count({ where: { courseId } }),
    prisma.coursePolicyAck.count({ where: { courseId } }),
  ])

  return NextResponse.json({
    totalEnrolled,
    acknowledged,
    acknowledgedCount: acknowledged,
    pending: totalEnrolled - acknowledged,
  }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

export const POST = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id: courseId } = await params

  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const user = auth.user

  const ack = await prisma.coursePolicyAck.upsert({
    where: { userId_courseId: { userId: user.id, courseId } },
    create: { userId: user.id, courseId },
    update: { ackedAt: new Date() },
  })

  return NextResponse.json({
    acknowledged: true,
    ackedAt: ack.ackedAt.toISOString(),
  }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
