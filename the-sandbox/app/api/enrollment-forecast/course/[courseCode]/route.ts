import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireAdminUser, isAuthFailure } from '../../../../lib/server-auth'
import { getForecastForCourse } from '../../../../lib/enrollment-forecast/forecast-service'
import { forecastCourseDemand } from '../../../../lib/enrollment-forecast/demand-forecaster'
import { recommendRooms } from '../../../../lib/enrollment-forecast/room-optimizer'

export const GET = withErrorHandling(
  async (req: NextRequest, context: { params: Promise<{ courseCode: string }> }) => {
    const auth = await requireAdminUser(req)
    if (isAuthFailure(auth)) return auth.response

    const { courseCode } = await context.params
    const term = req.nextUrl.searchParams.get('term') ?? 'Fall 2026'

    // Return cached forecast if available
    const cached = await getForecastForCourse(courseCode, term)
    if (cached) return NextResponse.json(cached, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })

    // Compute on-demand if no cached forecast
    const demand = await forecastCourseDemand(courseCode, term)
    const rooms = await recommendRooms(demand.predictedEnrollment, demand.predictedSections)

    return NextResponse.json({ ...demand, recommendedRooms: rooms })
  }
)
