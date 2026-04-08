import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import { prisma } from '../../../../../lib/prisma'

export const POST = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { id } = await params
  const parsed = await parseRequestBody<{ helpful: boolean; actedOn?: string }>(req)
  if ('error' in parsed) return parsed.error

  const { helpful, actedOn } = parsed.data

  await prisma.bridgeRecommendation.update({
    where: { id },
    data: {
      status: 'acted',
      helpful,
      actedOn: actedOn ?? null,
    },
  })

  return NextResponse.json({ success: true })
})
