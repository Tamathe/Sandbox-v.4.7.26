import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { seedCommitteeData } from '../../../../lib/staff/committee-seed-data'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  await seedCommitteeData()
  return NextResponse.json({ success: true, message: 'Committee data seeded' })
})
