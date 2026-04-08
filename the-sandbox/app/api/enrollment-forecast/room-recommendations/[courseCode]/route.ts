import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireAdminUser, isAuthFailure } from '../../../../lib/server-auth'
import { getForecastForCourse } from '../../../../lib/enrollment-forecast/forecast-service'
import { recommendRooms } from '../../../../lib/enrollment-forecast/room-optimizer'
import { forecastCourseDemand } from '../../../../lib/enrollment-forecast/demand-forecaster'

export const GET = withErrorHandling(
  async (req: NextRequest, context: { params: Promise<{ courseCode: string }> }) => {
    const auth = await requireAdminUser(req)
    if (isAuthFailure(auth)) return auth.response

    const { courseCode } = await context.params
    const term = req.nextUrl.searchParams.get('term') ?? 'Fall 2026'

    // Try cached forecast first for enrollment numbers
    const cached = await getForecastForCourse(courseCode, term)
    if (cached) {
      return NextResponse.json({
        courseCode,
        term,
        predictedEnrollment: cached.predictedEnrollment,
        predictedSections: cached.predictedSections,
        recommendations: cached.recommendedRooms,
      }, {
        headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
      })
    }

    // Compute on-demand
    const demand = await forecastCourseDemand(courseCode, term)
    const rooms = await recommendRooms(demand.predictedEnrollment, demand.predictedSections)

    return NextResponse.json({
      courseCode,
      term,
      predictedEnrollment: demand.predictedEnrollment,
      predictedSections: demand.predictedSections,
      recommendations: rooms,
    }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }
)
