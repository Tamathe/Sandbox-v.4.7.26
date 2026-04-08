import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { validateBody } from '../../../lib/validate'
import { z } from 'zod'
import { importFromSessions } from '../../../lib/portfolio-service'
import { withErrorHandling } from '../../../lib/api-utils'

const ImportSchema = z.object({
  portfolioId: z.string().min(1),
  sessionIds: z.array(z.string()).min(1).max(20),
})

export const POST = withErrorHandling(async (req: NextRequest) => {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response

    const parsed = await parseRequestBody(req)
    if ('error' in parsed) return parsed.error
    const v = validateBody(ImportSchema, parsed.data)
    if ('error' in v) return v.error

    const artifacts = await importFromSessions(v.value.portfolioId, auth.user.id, v.value.sessionIds)
    return NextResponse.json({ artifacts, count: artifacts.length })
  })
