import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../../../lib/api-utils'
import { requireRequestUser, isAuthFailure } from '../../../../../../lib/server-auth'
import { generateReimbursementForm } from '../../../../../../lib/university-systems-service'

export const GET = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { id } = await params

  const result = await generateReimbursementForm(id)
  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
