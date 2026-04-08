import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, parseRequestBody } from '../../../../../lib/server-auth'
import { submitPitch } from '../../../../../lib/pitch'
import { withErrorHandling } from '../../../../../lib/api-utils'

export const runtime = 'nodejs'

export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) => {
  const auth = await requireRequestUser(request)
  if ('response' in auth) return auth.response

  const { roomId } = await params
  const parsed = await parseRequestBody<{ teamName?: string; summary?: string; recommendation?: string; rationale?: string }>(request)
  if ('error' in parsed) return parsed.error
  const { teamName, summary, recommendation, rationale } = parsed.data

  if (!teamName || typeof teamName !== 'string' || !teamName.trim()) {
    return NextResponse.json({ error: 'teamName is required' }, { status: 400 })
  }
  if (!summary || typeof summary !== 'string' || !summary.trim()) {
    return NextResponse.json({ error: 'summary is required' }, { status: 400 })
  }
  if (!recommendation || typeof recommendation !== 'string' || !recommendation.trim()) {
    return NextResponse.json({ error: 'recommendation is required' }, { status: 400 })
  }
  if (!rationale || typeof rationale !== 'string' || !rationale.trim()) {
    return NextResponse.json({ error: 'rationale is required' }, { status: 400 })
  }

  try {
    const pitch = await submitPitch(
      roomId,
      auth.user.id,
      teamName.trim(),
      summary.trim(),
      recommendation.trim(),
      rationale.trim()
    )
    return NextResponse.json({ pitch }, { status: 201 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Submission error'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
})
