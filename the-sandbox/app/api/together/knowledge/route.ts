import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { addContribution, listContributions, upvoteContribution } from '../../../lib/together-service'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { searchParams } = new URL(req.url)
  const topic = searchParams.get('topic') ?? undefined
  const courseId = searchParams.get('courseId') ?? undefined

  const contributions = await listContributions({ topic, courseId })
  return NextResponse.json({ contributions }, {
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
    id?: string
    title?: string
    content?: string
    type?: string
    topic?: string
    courseId?: string
  }

  if (body.action === 'upvote') {
    if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const c = await upvoteContribution(body.id)
    return NextResponse.json({ contribution: c }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }

  if (!body.title || !body.content || !body.type || !body.topic) {
    return NextResponse.json({ error: 'title, content, type, and topic required' }, { status: 400 })
  }

  const contribution = await addContribution(auth.user.id, { title: body.title, content: body.content, type: body.type, topic: body.topic, courseId: body.courseId })
  return NextResponse.json({ contribution }, { status: 201 })
})
