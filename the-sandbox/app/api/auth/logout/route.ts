import { NextResponse } from 'next/server'
import { clearSessionCookie } from '../../../lib/auth-jwt'
import { withErrorHandling } from '../../../lib/api-utils'

export const POST = withErrorHandling(async () => {
  const response = NextResponse.json({ ok: true })
  clearSessionCookie(response.headers)
  return response
})
