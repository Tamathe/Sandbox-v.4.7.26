import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireAdminUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { listPlaybooks, createPlaybook, seedPlaybooks } from '../../../lib/incident-playbook-service'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

    const playbooks = await listPlaybooks()
    return NextResponse.json({ playbooks }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })

})

export const POST = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAdminUser(request)
  if (isAuthFailure(auth)) return auth.response

  const body = await parseRequestBody<{
    seed?: boolean
    name?: string
    incidentType?: string
    severity?: string
    steps?: { order: number; title: string; description: string; assignee: string; slaHours: number }[]
    notifyRoles?: string[]
  }>(request)
  if ('error' in body) return body.error

    if (body.data.seed) {
      const seeded = await seedPlaybooks()
      return NextResponse.json({ seeded: seeded.length, playbooks: seeded }, { status: 201 })
    }

    const { name, incidentType, severity, steps, notifyRoles } = body.data
    if (!name || !incidentType || !severity || !steps || !notifyRoles) {
      return NextResponse.json({ error: 'name, incidentType, severity, steps, and notifyRoles are required' }, { status: 400 })
    }

    const playbook = await createPlaybook({ name, incidentType, severity, steps, notifyRoles })
    return NextResponse.json({ playbook }, { status: 201 })

})
