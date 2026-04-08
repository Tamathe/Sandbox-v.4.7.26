import { NextRequest, NextResponse } from 'next/server'
import { requireEducatorUser, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { prisma } from '../../../../lib/prisma'

export const runtime = 'nodejs'

export const GET = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params

  const intervention = await prisma.teachingIntervention.findUnique({
    where: { id },
    include: {
      course: { select: { title: true } },
    },
  })

  if (!intervention) {
    return NextResponse.json({ error: 'Intervention not found' }, { status: 404 })
  }

  return NextResponse.json(intervention, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
