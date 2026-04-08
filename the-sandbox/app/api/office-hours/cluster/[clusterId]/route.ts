import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { validateBody } from '../../../../lib/validate'
import { z } from 'zod'
import { respondToCluster } from '../../../../lib/office-hours-service'
import { prisma } from '../../../../lib/prisma'
import { withErrorHandling } from '../../../../lib/api-utils'

const RespondSchema = z.object({
  answer: z.string().min(1),
})

export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ clusterId: string }> }
) => {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response

    const { clusterId } = await params
    const cluster = await prisma.officeHoursCluster.findUnique({
      where: { id: clusterId },
      include: { course: { select: { instructorId: true } } },
    })
    if (!cluster || cluster.course.instructorId !== auth.user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const questions = await prisma.officeHoursQuestion.findMany({
      where: { clusterId },
      include: { student: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({ cluster, questions })
  })

export const POST = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ clusterId: string }> }
) => {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response

    const { clusterId } = await params
    const parsed = await parseRequestBody(req)
    if ('error' in parsed) return parsed.error
    const v = validateBody(RespondSchema, parsed.data)
    if ('error' in v) return v.error

    await respondToCluster(clusterId, auth.user.id, v.value.answer)
    return NextResponse.json({ success: true }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  })
