import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '../../../lib/prisma'
import { parseRequestBody, requireRequestUser, isAuthFailure } from '../../../lib/server-auth'
import { validateBody } from '../../../lib/validate'
import { withErrorHandling } from '../../../lib/api-utils'

const DismissSchema = z.object({
  suggestionKey: z.string().min(1).max(200),
})

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { user } = auth

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const validation = validateBody(DismissSchema, parsed.data)
  if ('error' in validation) return validation.error
  const { suggestionKey } = validation.value

  await prisma.userMemory.create({
    data: {
      userId: user.id,
      category: 'PERSONAL',
      content: `dismiss:${suggestionKey}`,
      source: 'concierge',
    },
  })

  return NextResponse.json({ ok: true })
})
