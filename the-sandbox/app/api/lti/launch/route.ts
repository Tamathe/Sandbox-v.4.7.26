/**
 * LTI 1.3 OIDC Launch endpoint
 *
 * Canvas POSTs to this route when a student or instructor clicks a Sandbox
 * LTI tool link inside Canvas.  We verify the signed id_token, resolve the
 * user + course in our DB, and redirect to the appropriate tool page.
 *
 * This route intentionally has NO requireRequestUser guard — the inbound
 * request comes from Canvas (unauthenticated to our demo auth system).
 * Authentication is established by verifying Canvas's signed JWT.
 *
 * On success: 302 → /tools/[toolId]?courseId=[courseId]&lti=true
 * On error:   401 JSON response with error message
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyLtiLaunch } from '../../../lib/lti-service'
import { prisma } from '../../../lib/prisma'
import { withErrorHandling } from '../../../lib/api-utils'

export const POST = withErrorHandling(async (request: NextRequest) => {
  // Canvas sends the launch as application/x-www-form-urlencoded
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid request body — expected form data' }, { status: 400 })
  }

  const idToken = formData.get('id_token')
  if (!idToken || typeof idToken !== 'string') {
    return NextResponse.json({ error: 'Missing id_token in LTI launch request' }, { status: 400 })
  }

  // Verify the Canvas-signed JWT and extract LTI claims
  let claims
  try {
    claims = await verifyLtiLaunch(idToken)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'JWT verification failed'
    console.error('[lti/launch] Token verification error:', msg)
    return NextResponse.json({ error: `LTI launch rejected: ${msg}` }, { status: 401 })
  }

  // Look up or create the user in our DB by email
  let user
  try {
    user = await prisma.user.upsert({
      where: { email: claims.email },
      update: { name: claims.name ?? undefined },
      create: {
        email: claims.email,
        name: claims.name ?? claims.email.split('@')[0],
        role: 'STUDENT',
      },
    })
  } catch (err) {
    console.error('[lti/launch] User upsert failed:', err)
    return NextResponse.json({ error: 'Failed to resolve user account' }, { status: 500 })
  }

  // Optionally resolve the course by canvasCourseId
  let courseId: string | null = null
  if (claims.canvasCourseId) {
    try {
      const course = await prisma.course.findFirst({
        where: { canvasCourseId: claims.canvasCourseId },
        select: { id: true },
      })
      courseId = course?.id ?? null
    } catch {
      // Non-fatal — proceed without course context
    }
  }

  // Build redirect URL
  // If a toolId was provided via custom claim, go directly to that tool
  // Otherwise fall back to the tool marketplace
  let redirectPath: string
  if (claims.toolId) {
    const params = new URLSearchParams({ lti: 'true' })
    if (courseId) params.set('courseId', courseId)
    redirectPath = `/tools/${claims.toolId}?${params.toString()}`
  } else if (courseId) {
    redirectPath = `/courses/${courseId}?lti=true`
  } else {
    redirectPath = '/tools?lti=true'
  }

  // In demo mode, auth is conveyed via x-demo-user-email header, which browser
  // navigation cannot set directly.  We set a short-lived cookie that the
  // middleware or client can read to establish the demo session.
  const response = NextResponse.redirect(new URL(redirectPath, request.url), { status: 302 })

  // Set a cookie that the auth-context client reads on load.
  // HttpOnly so JS can't read it, but the server can pick it up for SSR auth.
  // SameSite=None + Secure required for cross-origin Canvas iframe embedding.
  response.cookies.set('lti-demo-user', user.email, {
    httpOnly: true,
    sameSite: 'none',
    secure: true,
    maxAge: 60 * 60 * 8, // 8 hours — typical class session
    path: '/',
  })

  return response
})

// GET is used by Canvas during the OIDC login initiation (step 1 of the 3-step
// LTI 1.3 OIDC flow).  Canvas sends the user here first, we redirect them
// back to Canvas with a login hint, then Canvas POSTs the id_token.
export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const loginHint = searchParams.get('login_hint') ?? ''
  const ltiMessageHint = searchParams.get('lti_message_hint') ?? ''
  const clientId = process.env.LTI_CLIENT_ID
  const baseUrl = process.env.CANVAS_BASE_URL
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin

  if (!clientId || !baseUrl) {
    return NextResponse.json(
      { error: 'LTI not configured (missing LTI_CLIENT_ID or CANVAS_BASE_URL)' },
      { status: 503 }
    )
  }

  // Redirect to Canvas OIDC auth endpoint to complete step 1 handshake
  const params = new URLSearchParams({
    scope: 'openid',
    response_type: 'id_token',
    client_id: clientId,
    redirect_uri: `${appUrl}/api/lti/launch`,
    login_hint: loginHint,
    lti_message_hint: ltiMessageHint,
    state: crypto.randomUUID(),
    response_mode: 'form_post',
    nonce: crypto.randomUUID(),
    prompt: 'none',
  })

  const oidcEndpoint = `${baseUrl}/api/lti/authorize_redirect?${params.toString()}`
  return NextResponse.redirect(oidcEndpoint, { status: 302 })
})
