import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { seedStaffData } from '../../../lib/staff/staff-seed-data'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req, { requireAdmin: true })
  if (isAuthFailure(auth)) return auth.response

  await seedStaffData()
  return NextResponse.json({ success: true, message: 'Staff demo data seeded' }, { status: 201 })
})
