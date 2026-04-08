import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { checkContrast } from '../../../lib/accessibility/contrast-checker'

// POST — check HTML content for WCAG AA contrast violations
export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as { htmlContent: string }

  if (!body.htmlContent) {
    return NextResponse.json({ error: 'htmlContent is required' }, { status: 400 })
  }

  const result = checkContrast(body.htmlContent)

  return NextResponse.json(result)
})
