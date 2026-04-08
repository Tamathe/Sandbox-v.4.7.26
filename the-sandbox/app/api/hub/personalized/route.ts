import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireRequestUser, isAuthFailure } from '../../../lib/server-auth'
import { getPersonalizedCollections } from '../../../lib/hub-personalization'
import { personalizeCollectionOrder } from '../../../lib/fingerprint/hub-personalization'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  let collections = await getPersonalizedCollections(
    auth.user.id,
    auth.user.role,
    auth.user.college,
  )

  // Reorder tools within each collection based on engagement fingerprint
  try {
    collections = await personalizeCollectionOrder(auth.user.id, collections)
  } catch {
    // Non-fatal — return default ordering if fingerprint unavailable
  }

  return NextResponse.json({ collections }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
