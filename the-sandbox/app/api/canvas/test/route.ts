import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'

export const runtime = 'nodejs'

// POST /api/canvas/test
// Faculty: verify that CANVAS_BASE_URL + CANVAS_API_TOKEN are valid.
// Optionally accepts { canvasCourseId } to verify that specific course exists.
export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const baseUrl = process.env.CANVAS_BASE_URL
  const token = process.env.CANVAS_API_TOKEN

  if (!baseUrl || !token) {
    return NextResponse.json({
      ok: false,
      message: 'CANVAS_BASE_URL and CANVAS_API_TOKEN are not configured in your environment.',
    })
  }

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as { canvasCourseId?: string }

  try {
    if (body.canvasCourseId) {
      // Verify specific course exists
      const res = await fetch(`${baseUrl}/api/v1/courses/${body.canvasCourseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 401) {
        return NextResponse.json({ ok: false, message: 'Invalid Canvas API token — authentication failed.' })
      }
      if (res.status === 404) {
        return NextResponse.json({ ok: false, message: `Canvas course ID "${body.canvasCourseId}" was not found.` })
      }
      if (!res.ok) {
        return NextResponse.json({ ok: false, message: `Canvas returned status ${res.status}.` })
      }
      const course = await res.json() as { name: string }
      return NextResponse.json({ ok: true, message: `Connected! Found course: "${course.name}"` })
    }

    // Basic auth check — hit /api/v1/users/self
    const res = await fetch(`${baseUrl}/api/v1/users/self`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.status === 401) {
      return NextResponse.json({ ok: false, message: 'Invalid Canvas API token — authentication failed.' })
    }
    if (!res.ok) {
      return NextResponse.json({ ok: false, message: `Canvas returned status ${res.status}.` })
    }
    const me = await res.json() as { name: string }
    return NextResponse.json({ ok: true, message: `Connected to Canvas as "${me.name}"` })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, message: `Could not reach Canvas: ${msg}` })
  }
})
