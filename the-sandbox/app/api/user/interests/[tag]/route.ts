// PATCH /api/user/interests/[tag]
// Sets accepted = false for a user's interest tag (post-onboarding removal).

import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { prisma } from '../../../../lib/prisma'
import { withErrorHandling } from '../../../../lib/api-utils'

export const PATCH = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ tag: string }> },
) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { tag } = await params
  const decodedTag = decodeURIComponent(tag)

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as { accepted?: boolean }
  const accepted = body.accepted ?? false

  await prisma.userInterest.updateMany({
    where: { userId: auth.user.id, tag: decodedTag },
    data: { accepted },
  })

  return NextResponse.json({ ok: true })
})
