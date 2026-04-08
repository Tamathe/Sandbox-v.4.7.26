import { NextRequest, NextResponse } from 'next/server'
import { requireRegistrarUser, isAuthFailure } from '../../../../lib/server-auth'
import { getStudent360 } from '../../../../lib/registrar/student-360'
import { withErrorHandling } from '../../../../lib/api-utils'

export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> },
) => {
  const { studentId } = await params
  const auth = await requireRegistrarUser(request)
  if (isAuthFailure(auth)) return auth.response

  try {
    const data = await getStudent360(studentId)
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
})
