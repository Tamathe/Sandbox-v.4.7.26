import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { seedCommunicationData } from '../../../../lib/staff/communication-seed-data'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  await seedCommunicationData()
  return NextResponse.json({ success: true, message: 'Communication templates and demo data seeded' })
})
