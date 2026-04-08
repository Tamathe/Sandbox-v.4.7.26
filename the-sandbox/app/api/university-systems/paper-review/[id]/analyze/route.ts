import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import { analyzePaperStructure } from '../../../../../lib/university-systems-service'

export const POST = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { id } = await params
  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { paperContent } = parsed.data as { paperContent?: string }

  if (!paperContent) {
    return NextResponse.json({ error: 'paperContent is required' }, { status: 400 })
  }

  const result = await analyzePaperStructure(id, paperContent)
  return NextResponse.json(result)
})
