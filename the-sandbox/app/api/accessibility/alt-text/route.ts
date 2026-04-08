import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireEducatorUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { generateAltText, saveAltText } from '../../../lib/accessibility/alt-text-service'
import type { AltTextTargetType } from '../../../lib/accessibility/types'

// POST — generate alt text for an image via Claude Vision
export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as {
    imageUrl: string
    targetType: AltTextTargetType
    targetId: string
    context?: string
  }

  if (!body.imageUrl || !body.targetType || !body.targetId) {
    return NextResponse.json(
      { error: 'imageUrl, targetType, and targetId are required' },
      { status: 400 },
    )
  }

  const result = await generateAltText(body.imageUrl, body.context)

  return NextResponse.json({ ...result, imageUrl: body.imageUrl, targetType: body.targetType, targetId: body.targetId })
})

// PATCH — save approved alt text to the target model
export const PATCH = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as {
    targetType: AltTextTargetType
    targetId: string
    altText: string
  }

  if (!body.targetType || !body.targetId || body.altText === undefined) {
    return NextResponse.json(
      { error: 'targetType, targetId, and altText are required' },
      { status: 400 },
    )
  }

  await saveAltText(body.targetType, body.targetId, body.altText)

  return NextResponse.json({ saved: true, targetType: body.targetType, targetId: body.targetId })
})
