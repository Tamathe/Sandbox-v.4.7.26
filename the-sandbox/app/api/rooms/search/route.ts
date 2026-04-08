import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { getRoomSearchSystemPrompt, parseSearchParams, searchRooms } from '../../../lib/room-reservation-service'

const anthropic = new Anthropic()

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as { query: string }

  if (!body.query?.trim()) return NextResponse.json({ error: 'No query provided' }, { status: 400 })

  // Use Sandy to parse the natural language query
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: getRoomSearchSystemPrompt({ query: body.query, userId: auth.user.id, userName: auth.user.name }),
    messages: [{ role: 'user', content: body.query }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const params = parseSearchParams(text)

  if (!params) {
    return NextResponse.json({ error: 'Could not parse search request', raw: text }, { status: 400 })
  }

  // Search rooms with parsed parameters
  const results = searchRooms({
    date: params.date,
    startTime: params.startTime,
    endTime: params.endTime,
    minCapacity: params.minCapacity,
    amenities: params.amenities,
    building: params.building ?? undefined,
  })

  return NextResponse.json({
    sandyMessage: params.sandyMessage,
    searchParams: params,
    results: results.slice(0, 10),
    totalResults: results.length,
  })
})
