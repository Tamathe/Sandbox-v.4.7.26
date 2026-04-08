import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import {
  createReflection, listReflections, toggleReflectionSharing, getSharedReflections,
} from '../../../lib/reflect-service'
import type { ReflectionTrigger } from '../../../generated/prisma'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { searchParams } = new URL(req.url)
  const trigger = searchParams.get('trigger') as ReflectionTrigger | null
  const courseId = searchParams.get('courseId')
  const shared = searchParams.get('shared') === 'true'

  if (shared && courseId) {
    const reflections = await getSharedReflections(courseId)
    return NextResponse.json({ reflections }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }

  const reflections = await listReflections(auth.user.id, 20, trigger ?? undefined)
  return NextResponse.json({ reflections }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as {
    action?: string
    reflectionId?: string
    content?: string
    trigger?: ReflectionTrigger
    prompt?: string
    tags?: string[]
    sessionId?: string
    courseId?: string
    concept?: string
    sharedWithGroup?: boolean
  }

  if (body.action === 'toggle-share') {
    const r = await toggleReflectionSharing(auth.user.id, body.reflectionId as string)
    if (!r) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ reflection: r }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }

  if (!body.content || typeof body.content !== 'string') {
    return NextResponse.json({ error: 'Content required' }, { status: 400 })
  }

  const reflection = await createReflection(auth.user.id, {
    trigger: body.trigger ?? 'MANUAL',
    prompt: body.prompt,
    content: body.content.trim(),
    tags: body.tags,
    sessionId: body.sessionId,
    courseId: body.courseId,
    concept: body.concept,
    sharedWithGroup: body.sharedWithGroup,
  })
  return NextResponse.json({ reflection }, { status: 201 })
})
