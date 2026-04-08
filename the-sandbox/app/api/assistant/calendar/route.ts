import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { getCalendarProviderSelection } from '../../../lib/assistant/providers'
import { withErrorHandling } from '../../../lib/api-utils'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const url = new URL(req.url)
  const startDate = url.searchParams.get('start')
  const endDate = url.searchParams.get('end')

  if (!startDate || !endDate) {
    return NextResponse.json({ error: 'start and end query params required' }, { status: 400 })
  }

  const selection = await getCalendarProviderSelection()
  const events = await selection.provider.getEvents(auth.user.id, new Date(startDate), new Date(endDate))
  return NextResponse.json({ events, provider: selection.descriptor, integration: selection.integration }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { title, description, startTime, endTime, location, attendees, category } = parsed.data as {
    title: string; description?: string; startTime: string; endTime: string;
    location?: string; attendees?: string[]; category?: string
  }

  if (!title || !startTime || !endTime) {
    return NextResponse.json({ error: 'title, startTime, endTime required' }, { status: 400 })
  }

  const selection = await getCalendarProviderSelection()
  const event = await selection.provider.createEvent(auth.user.id, {
    title,
    description,
    startTime: new Date(startTime),
    endTime: new Date(endTime),
    location,
    attendees: attendees ?? [],
    category,
  })

  return NextResponse.json(
    { event, provider: selection.descriptor, integration: selection.integration },
    { status: 201 },
  )
})
