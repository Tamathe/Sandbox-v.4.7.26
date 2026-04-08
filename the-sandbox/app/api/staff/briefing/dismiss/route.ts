import { NextRequest, NextResponse } from 'next/server'
import { requireStaffOrAdminUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { prisma } from '../../../../lib/prisma'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { itemType, itemId } = parsed.data as { itemType: string; itemId: string }

  if (!itemType || !itemId) {
    return NextResponse.json({ error: 'itemType and itemId required' }, { status: 400 })
  }

  const dismissal = await prisma.staffBriefingDismissal.upsert({
    where: {
      userId_itemType_itemId: {
        userId: auth.user.id,
        itemType,
        itemId,
      },
    },
    update: {},
    create: {
      userId: auth.user.id,
      itemType,
      itemId,
    },
  })

  return NextResponse.json({ dismissal })
})
