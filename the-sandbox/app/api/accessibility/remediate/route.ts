import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireEducatorUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import {
  generateRemediation,
  applyRemediation,
  type FixType,
} from '../../../lib/accessibility/remediation-service'

// POST — generate or apply remediation
export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as {
    action: 'generate' | 'apply'
    targetType: string
    targetId: string
    text?: string
    fixTypes?: FixType[]
    remediatedContent?: string
    approvedChangeIds?: string[]
  }

  if (!body.targetType || !body.targetId) {
    return NextResponse.json({ error: 'targetType and targetId are required' }, { status: 400 })
  }

  if (body.action === 'apply') {
    if (!body.remediatedContent) {
      return NextResponse.json(
        { error: 'remediatedContent required for apply' },
        { status: 400 },
      )
    }

    const result = await applyRemediation(
      body.targetType,
      body.targetId,
      body.remediatedContent,
    )

    return NextResponse.json(result)
  }

  // Default: generate (pass raw text for freetext mode)
  const result = await generateRemediation(
    body.targetType,
    body.targetId,
    body.fixTypes ?? ['all'],
    body.text,
  )

  return NextResponse.json(result)
})
