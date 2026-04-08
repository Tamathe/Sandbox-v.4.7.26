import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import {
  fetchFullListeningWindow,
  listeningToText,
  listeningToSocialPosts,
  isSproutConfigured,
} from '../../../lib/sprout-social-client'

/**
 * POST /api/sprout/messages
 * Body: { topicId: number, maxPosts?: number, keyword?: string, format?: 'text' | 'posts' }
 *
 * Returns listening messages from a Sprout topic.
 * format=text → plain text (for Sentiment Analyzer paste)
 * format=posts → SocialPost[] (for Reputation Pulse)
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  if (!isSproutConfigured()) {
    return NextResponse.json({ error: 'Sprout Social is not configured' }, { status: 503 })
  }

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { topicId, maxPosts, keyword, format = 'text' } = parsed.data as {
    topicId: number
    maxPosts?: number
    keyword?: string
    format?: 'text' | 'posts'
  }

  if (!topicId) {
    return NextResponse.json({ error: 'topicId is required' }, { status: 400 })
  }

  const messages = await fetchFullListeningWindow(topicId, { maxPosts, keyword })

  if (format === 'posts') {
    return NextResponse.json({
      posts: listeningToSocialPosts(messages),
      rawCount: messages.length,
    })
  }

  return NextResponse.json({
    text: listeningToText(messages),
    rawCount: messages.length,
  })
})
