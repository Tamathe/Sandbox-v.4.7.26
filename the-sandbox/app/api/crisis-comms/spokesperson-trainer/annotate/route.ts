import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { generateAnnotations } from '../../../../lib/crisis-comms/spokesperson-trainer/annotation-service'
import type { AnnotateRequest } from '../../../../lib/crisis-comms/spokesperson-trainer/types'
import { withErrorHandling } from '../../../../lib/api-utils'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as AnnotateRequest
  const { messages, keyMessages, scenarioTitle, difficulty } = body
  if (!messages || !scenarioTitle || !difficulty) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
    const annotations = await generateAnnotations(
      messages,
      keyMessages ?? [],
      scenarioTitle,
      difficulty,
    )
    return NextResponse.json(annotations)
  } catch (error) {
    console.error('Annotation generation error:', error)
    return NextResponse.json({ error: 'Annotation generation failed' }, { status: 500 })
  }
})
