import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import {
  createCircle, listCircles, getMyCircles, joinCircle, leaveCircle,
  addCirclePost, getCirclePosts,
} from '../../../lib/together-service'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')
  const circleId = searchParams.get('circleId')

  if (action === 'my') {
    const circles = await getMyCircles(auth.user.id)
    return NextResponse.json({ circles }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }

  if (action === 'posts' && circleId) {
    const posts = await getCirclePosts(circleId)
    return NextResponse.json({ posts }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }

  const circles = await listCircles()
  return NextResponse.json({ circles }, {
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
    circleId?: string
    content?: string
    type?: string
    name?: string
    description?: string
    topic?: string
    emoji?: string
    isOpen?: boolean
    maxMembers?: number
  }

  if (body.action === 'join') {
    const result = await joinCircle(auth.user.id, body.circleId as string)
    if (!result) return NextResponse.json({ error: 'Circle not found or closed' }, { status: 404 })
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 })
    return NextResponse.json({ membership: result }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }

  if (body.action === 'leave') {
    const ok = await leaveCircle(auth.user.id, body.circleId as string)
    if (!ok) return NextResponse.json({ error: 'Not a member' }, { status: 404 })
    return NextResponse.json({ ok: true }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }

  if (body.action === 'post') {
    if (!body.circleId || !body.content) return NextResponse.json({ error: 'circleId and content required' }, { status: 400 })
    const post = await addCirclePost(auth.user.id, body.circleId, { content: body.content, type: body.type })
    if (!post) return NextResponse.json({ error: 'Not a member' }, { status: 403 })
    return NextResponse.json({ post }, { status: 201 })
  }

  // Create circle
  if (!body.name || !body.topic) return NextResponse.json({ error: 'name and topic required' }, { status: 400 })
  const circle = await createCircle(auth.user.id, body as { name: string; description?: string; topic: string; emoji?: string; isOpen?: boolean; maxMembers?: number })
  return NextResponse.json({ circle }, { status: 201 })
})
