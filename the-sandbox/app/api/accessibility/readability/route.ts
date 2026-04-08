import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import {
  analyzeReadability,
  scanAndPersistReadability,
  suggestSimplification,
  bulkScanCourseReadability,
} from '../../../lib/accessibility/readability-service'
import type { ReadabilityTargetType } from '../../../lib/accessibility/types'

// POST — analyze readability of text, optionally persist to AccessibilityReport
export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as {
    text?: string
    targetType?: ReadabilityTargetType
    targetId?: string
    courseId?: string
    simplify?: boolean
  }

  // Bulk course scan mode
  if (body.courseId) {
    const result = await bulkScanCourseReadability(body.courseId)
    return NextResponse.json(result)
  }

  if (!body.text) {
    return NextResponse.json({ error: 'text or courseId is required' }, { status: 400 })
  }

  // Persist mode — store in AccessibilityReport
  if (body.targetType && body.targetId) {
    const result = await scanAndPersistReadability(body.targetType, body.targetId, body.text)

    // Optional AI simplification
    if (body.simplify) {
      const simplified = await suggestSimplification(body.text)
      const simplifiedResult = analyzeReadability(simplified)
      return NextResponse.json({
        original: result,
        simplified: { text: simplified, readability: simplifiedResult },
      })
    }

    return NextResponse.json(result)
  }

  // Freetext mode — analyze without persisting
  const result = analyzeReadability(body.text)

  if (body.simplify) {
    const simplified = await suggestSimplification(body.text)
    const simplifiedResult = analyzeReadability(simplified)
    return NextResponse.json({
      original: result,
      simplified: { text: simplified, readability: simplifiedResult },
    })
  }

  return NextResponse.json(result)
})
