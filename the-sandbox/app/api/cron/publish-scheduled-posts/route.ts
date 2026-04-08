import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { verifyCronSecret } from '../../../lib/server-auth'
import { publishScheduledPosts } from '../../../lib/course-post-service'

// POST — cron job: publish scheduled course posts that are due
export const POST = withErrorHandling(async (req: NextRequest) => {
  const authError = verifyCronSecret(req)
  if (authError) return authError

  const result = await publishScheduledPosts()

  return NextResponse.json(result)
})
