import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { validateBody } from '../../../../lib/validate'
import { z } from 'zod'
import { listSessions, upsertSession } from '../../../../lib/research-session-service'
import { withErrorHandling } from '../../../../lib/api-utils'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const sessions = await listSessions(auth.user.id)
  return NextResponse.json({ sessions }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

const UpsertSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1).max(200),
  messages: z.array(z.object({ role: z.string(), content: z.string() })),
  sources: z.array(z.object({ url: z.string(), title: z.string(), snippet: z.string() })).optional(),
  notes: z.string().max(10000).optional(),
})

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const validation = validateBody(UpsertSchema, parsed.data)
  if ('error' in validation) return validation.error

  const session = await upsertSession(auth.user.id, validation.value)
  if (!session) {
    return NextResponse.json({ error: 'Session not found or access denied' }, { status: 404 })
  }

  return NextResponse.json({ session }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
