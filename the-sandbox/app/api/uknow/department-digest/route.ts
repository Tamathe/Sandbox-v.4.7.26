import { NextRequest, NextResponse } from 'next/server'
import { isAuthFailure, requireAdminUser } from '../../../lib/server-auth'
import { getDepartmentDigest, getDepartmentAlertHeatMap } from '../../../lib/uknow-alert-service'
import { withErrorHandling } from '../../../lib/api-utils'

export const GET = withErrorHandling(async (req: NextRequest) => {
    const auth = await requireAdminUser(req)
    if (isAuthFailure(auth)) return auth.response

    const { searchParams } = new URL(req.url)
    const department = searchParams.get('department')
    const days = parseInt(searchParams.get('days') ?? '7', 10)

    if (department) {
      const digest = await getDepartmentDigest(department, days)
      return NextResponse.json(digest, {
        headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
      })
    }

    // No department specified — return heat map of all departments
    const heatMap = await getDepartmentAlertHeatMap(days)
    return NextResponse.json({ departments: heatMap }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  })
