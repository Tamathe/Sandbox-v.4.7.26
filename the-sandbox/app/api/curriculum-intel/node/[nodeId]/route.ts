import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { getNodeDetail } from '../../../../lib/curriculum-intel/curriculum-service'

export const GET = withErrorHandling(async (req: NextRequest, context: { params: Promise<{ nodeId: string }> }) => {
  const auth = await requireAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { nodeId } = await context.params
  const node = await getNodeDetail(nodeId)

  if (!node) {
    return NextResponse.json({ error: 'Node not found' }, { status: 404 })
  }

  return NextResponse.json(node, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
