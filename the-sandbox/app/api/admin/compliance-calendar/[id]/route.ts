import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireAdminUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { updateEvent, deleteEvent, markComplete } from '../../../../lib/compliance-calendar-service'

export const PATCH = withErrorHandling(async (request: NextRequest,
  { params }: { params: Promise<{ id: string }> },) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params
  const body = await parseRequestBody<{
    title?: string
    description?: string
    eventType?: string
    dueDate?: string
    metadata?: unknown
    completed?: boolean
  }>(request)
  if ('error' in body) return body.error

    // If marking complete, use dedicated function
    if (body.data.completed === true) {
      const event = await markComplete(id)
      return NextResponse.json({ event })
    }

    const event = await updateEvent(id, body.data)
    return NextResponse.json({ event })

})

export const DELETE = withErrorHandling(async (request: NextRequest,
  { params }: { params: Promise<{ id: string }> },) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params

    await deleteEvent(id)
    return NextResponse.json({ ok: true })

})
