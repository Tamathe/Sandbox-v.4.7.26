import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { prisma } from '../../../../../lib/prisma'

export const POST = withErrorHandling(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { id } = await ctx.params
  await prisma.voiceSession.update({
    where: { id },
    data: { audioSaved: true },
  })
  return NextResponse.json({ ok: true })
})
