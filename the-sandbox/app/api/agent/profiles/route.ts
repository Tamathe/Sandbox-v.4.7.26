import { NextRequest, NextResponse } from 'next/server'
import { AGENT_CATEGORIES, AGENT_ROLE_OPTIONS } from '../../../lib/agent/agent-profile-constants'
import {
  createAgentProfile,
  listAgentProfiles,
  validateCapabilities,
  type CreateProfileInput,
} from '../../../lib/agent/agent-profile-service'
import { withErrorHandling } from '../../../lib/api-utils'
import { isAuthFailure, parseRequestBody, requireRequestUser } from '../../../lib/server-auth'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const searchParams = req.nextUrl.searchParams
  const category = searchParams.get('category')
  const role = searchParams.get('role')
  const visibility = searchParams.get('visibility')
  const search = searchParams.get('search') ?? undefined
  const limit = Number(searchParams.get('limit') ?? 20)
  const offset = Number(searchParams.get('offset') ?? 0)

  const result = await listAgentProfiles({
    userId: auth.user.id,
    userRole: auth.user.role,
    category: AGENT_CATEGORIES.includes(category as (typeof AGENT_CATEGORIES)[number])
      ? (category as (typeof AGENT_CATEGORIES)[number])
      : undefined,
    role: AGENT_ROLE_OPTIONS.includes(role as (typeof AGENT_ROLE_OPTIONS)[number])
      ? (role as (typeof AGENT_ROLE_OPTIONS)[number])
      : undefined,
    visibility:
      visibility === 'mine' ||
      visibility === 'shared' ||
      visibility === 'institutional' ||
      visibility === 'favorites'
        ? visibility
        : undefined,
    search,
    limit: Number.isFinite(limit) ? limit : 20,
    offset: Number.isFinite(offset) ? offset : 0,
  })

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody<CreateProfileInput>(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data

  if (!body.name?.trim() || !body.description?.trim() || !body.systemPrompt?.trim()) {
    return NextResponse.json({ error: 'name, description, and systemPrompt are required' }, { status: 400 })
  }

  const invalid = validateCapabilities(body.capabilities ?? [], auth.user.role, body.visibility ?? 'PRIVATE')
  if (invalid.length > 0) {
    return NextResponse.json({ error: 'Invalid capabilities', invalid }, { status: 400 })
  }

  const profile = await createAgentProfile(body, auth.user.id)
  return NextResponse.json(profile, { status: 201 })
})
