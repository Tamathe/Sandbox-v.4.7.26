import { NextResponse } from 'next/server'
import { getActiveAnnouncements } from '../../lib/announcements-service'
import { withErrorHandling } from '../../lib/api-utils'

// Public endpoint — active announcements are displayed to all users (including
// pre-login splash screens). Only returns non-sensitive broadcast data.
export const GET = withErrorHandling(async () => {
    const announcements = await getActiveAnnouncements()

    return NextResponse.json({ announcements }, {
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
    })
  })
