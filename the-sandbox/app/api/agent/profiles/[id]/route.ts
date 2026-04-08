import { NextRequest, NextResponse } from 'next/server'
import {
  deleteAgentProfile,
  getAgentProfile,
  updateAgentProfile,
  validateCapabilities,
  type CreateProfileInput,
} from '../../../../lib/agent/agent-profile-service'
import { withErrorHandling } from '../../../../lib/api-utils'
import { isAuthFailure, parseRequestBody, requireRequestUser } from '../../../../lib/server-auth'

export const GET = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params
  const profile = await getAgentProfile(id, auth.user.id)
  if (!profile) {
    return NextResponse.json({ error: 'Agent profile not found' }, { status: 404 })
  }

  return NextResponse.json(profile, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

export const PUT = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody<Partial<CreateProfileInput>>(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data

  if (body.capabilities) {
    const invalid = validateCapabilities(body.capabilities, auth.user.role, body.visibility ?? 'PRIVATE')
    if (invalid.length > 0) {
      return NextResponse.json({ error: 'Invalid capabilities', invalid }, { status: 400 })
    }
  }

  const { id } = await params
  const profile = await updateAgentProfile(id, body, auth.user.id, auth.user.role)
  return NextResponse.json(profile, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

export const DELETE = withErrorHandling(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params
  await deleteAgentProfile(id, auth.user.id, auth.user.role)
  return NextResponse.json({ success: true }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
