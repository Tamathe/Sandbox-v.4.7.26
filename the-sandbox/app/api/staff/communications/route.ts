import { NextRequest, NextResponse } from 'next/server'
import { requireStaffOrAdminUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { getDrafts, createDraft, createFromTemplate } from '../../../lib/staff/communication-service'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const url = req.nextUrl
  const status = url.searchParams.get('status')?.split(',') || undefined
  const type = url.searchParams.get('type')?.split(',') || undefined
  const limit = parseInt(url.searchParams.get('limit') || '20', 10)
  const offset = parseInt(url.searchParams.get('offset') || '0', 10)

  const result = await getDrafts(auth.user.id, { status, type, limit, offset })
  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireStaffOrAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as { templateId?: string; filledValues?: Record<string, string>; prompt?: string; type?: string; tone?: string; audience?: string; context?: { relatedActionItemId?: string; relatedPolicyNumber?: string; relatedAlertId?: string } }

  // If templateId is provided, create from template; otherwise create from prompt
  if (body.templateId) {
    const communication = await createFromTemplate(body.templateId, auth.user.id, body.filledValues || {})
    return NextResponse.json(communication, { status: 201 })
  }

  const result = await createDraft({
    authorId: auth.user.id,
    prompt: body.prompt as string,
    type: body.type,
    tone: body.tone,
    audience: body.audience,
    context: body.context,
  })
  return NextResponse.json(result, { status: 201 })
})
