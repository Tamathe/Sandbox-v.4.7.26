import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireAdminUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { listAllComplianceRoleAssignments, assignComplianceRole, isValidComplianceRole } from '../../../lib/compliance-rbac-service'
import { prisma } from '../../../lib/prisma'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

    const assignments = await listAllComplianceRoleAssignments()
    return NextResponse.json({ assignments }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })

})

export const POST = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const body = await parseRequestBody<{ email: string; role: string }>(request)
  if ('error' in body) return body.error

  const { email, role } = body.data
  if (!email || !role) {
    return NextResponse.json({ error: 'email and role are required' }, { status: 400 })
  }
  if (!isValidComplianceRole(role)) {
    return NextResponse.json({ error: 'Invalid role. Must be: compliance-officer, dpo, auditor, or viewer' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

    const assignment = await assignComplianceRole(user.id, role, auth.user.id)
    return NextResponse.json({ assignment }, { status: 201 })

})
