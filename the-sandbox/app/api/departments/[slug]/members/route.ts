import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireRequestUser, requireDepartmentOwner, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { getDepartmentBySlug, addMember, removeMember, listMembers, updateMemberRole } from '../../../../lib/department-service'
import type { DepartmentMemberRole } from '../../../../generated/prisma'

export const GET = withErrorHandling(async (req: NextRequest, context: { params: Promise<{ slug: string }> }) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { slug } = await context.params
  const dept = await getDepartmentBySlug(slug)
  if (!dept) return NextResponse.json({ error: 'Department not found' }, { status: 404 })

  const members = await listMembers(dept.id)
  return NextResponse.json({ members }, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})

export const POST = withErrorHandling(async (req: NextRequest, context: { params: Promise<{ slug: string }> }) => {
  const { slug } = await context.params
  const dept = await getDepartmentBySlug(slug)
  if (!dept) return NextResponse.json({ error: 'Department not found' }, { status: 404 })

  const auth = await requireDepartmentOwner(req, dept.id)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { userId, role } = parsed.data as { userId: string; role: DepartmentMemberRole }
  if (!userId || !role) {
    return NextResponse.json({ error: 'userId and role are required' }, { status: 400 })
  }

  const member = await addMember(dept.id, userId, role)
  return NextResponse.json(member, { status: 201 })
})

export const DELETE = withErrorHandling(async (req: NextRequest, context: { params: Promise<{ slug: string }> }) => {
  const { slug } = await context.params
  const dept = await getDepartmentBySlug(slug)
  if (!dept) return NextResponse.json({ error: 'Department not found' }, { status: 404 })

  const auth = await requireDepartmentOwner(req, dept.id)
  if (isAuthFailure(auth)) return auth.response

  const parsedDel = await parseRequestBody(req)
  if ('error' in parsedDel) return parsedDel.error
  const { userId } = parsedDel.data as { userId: string }
  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  }

  await removeMember(dept.id, userId)
  return NextResponse.json({ ok: true })
})

export const PATCH = withErrorHandling(async (req: NextRequest, context: { params: Promise<{ slug: string }> }) => {
  const { slug } = await context.params
  const dept = await getDepartmentBySlug(slug)
  if (!dept) return NextResponse.json({ error: 'Department not found' }, { status: 404 })

  const auth = await requireDepartmentOwner(req, dept.id)
  if (isAuthFailure(auth)) return auth.response

  const parsedPatch = await parseRequestBody(req)
  if ('error' in parsedPatch) return parsedPatch.error
  const { userId, role } = parsedPatch.data as { userId: string; role: DepartmentMemberRole }
  if (!userId || !role) {
    return NextResponse.json({ error: 'userId and role are required' }, { status: 400 })
  }

  const member = await updateMemberRole(dept.id, userId, role)
  return NextResponse.json(member)
})
