import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { prisma } from '../../../../lib/prisma'

export const GET = withErrorHandling(
  async (req: NextRequest, { params }: { params: Promise<{ buildingId: string }> }) => {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response

    const { buildingId } = await params

    const profile = await prisma.buildingAcademicProfile.findUnique({
      where: { buildingId },
      include: { building: true },
    })

    if (!profile) {
      return NextResponse.json(
        { error: 'No weather data for this building' },
        { status: 404 },
      )
    }

    return NextResponse.json(profile, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  },
)
