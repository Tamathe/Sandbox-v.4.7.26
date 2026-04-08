import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { withErrorHandling } from '../../../lib/api-utils'
import { parseRequestBody } from '../../../lib/server-auth'

// POST /api/onboarding/check-email
export const POST = withErrorHandling(async (req: NextRequest) => {
  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { email } = parsed.data as { email?: string }

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  const lower = email.toLowerCase().trim()

  if (!lower.endsWith('@uky.edu')) {
    return NextResponse.json({ error: 'UK email required' }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email: lower }, select: { id: true } })

  return NextResponse.json({ exists: !!existing })
})
