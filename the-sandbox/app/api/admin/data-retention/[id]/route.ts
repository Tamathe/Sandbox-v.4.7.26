import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireAdminUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { prisma } from '../../../../lib/prisma'

export const PATCH = withErrorHandling(async (request: NextRequest,
  { params }: { params: Promise<{ id: string }> },) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params

  const parsed = await parseRequestBody(request)
  if ('error' in parsed) return parsed.error
  const body = parsed.data
  const { retentionDays, action, active } = body as {
    retentionDays?: number
    action?: string
    active?: boolean
  }

  // Validate action if provided
  if (action && !['anonymize', 'delete', 'archive'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action. Must be anonymize, delete, or archive.' }, { status: 400 })
  }

  if (retentionDays !== undefined && (typeof retentionDays !== 'number' || retentionDays < 1)) {
    return NextResponse.json({ error: 'retentionDays must be a positive integer.' }, { status: 400 })
  }

  const data: Record<string, unknown> = {}
  if (retentionDays !== undefined) data.retentionDays = retentionDays
  if (action !== undefined) data.action = action
  if (active !== undefined) data.active = active

  try {
    const updated = await prisma.dataRetentionPolicy.update({
      where: { id },
      data,
    })
    return NextResponse.json({ policy: updated })
  } catch {
    return NextResponse.json({ error: 'Policy not found' }, { status: 404 })
  }

})
