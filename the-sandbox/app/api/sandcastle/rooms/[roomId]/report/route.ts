/**
 * GET /api/sandcastle/rooms/[roomId]/report
 *
 * Returns the PostSessionReport for a room.
 * HOST only. Returns { status: 'PENDING' } while generating.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { prisma } from '../../../../../lib/prisma'

export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> },
) => {
  const auth = await requireRequestUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { roomId } = await params

  const room = await prisma.room.findUnique({ where: { id: roomId }, select: { hostId: true } })
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  if (room.hostId !== auth.user.id && auth.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const report = await prisma.postSessionReport.findFirst({
    where: { roomId },
    orderBy: { createdAt: 'desc' },
  })

  if (!report) return NextResponse.json({ status: 'PENDING' }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })

  if (report.status !== 'COMPLETE') {
    return NextResponse.json({ status: report.status, reportId: report.id })
  }

  return NextResponse.json({
    reportId: report.id,
    status: report.status,
    reportHtml: report.reportHtml,
    generatedAt: report.generatedAt?.toISOString(),
  })
})
