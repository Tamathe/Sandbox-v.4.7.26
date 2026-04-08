import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { getPolicyByNumber } from '../../../../lib/staff/policy-service'
import { prisma } from '../../../../lib/prisma'

export const GET = withErrorHandling(async (req: NextRequest, context: { params: Promise<{ number: string }> }) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { number: rawNumber } = await context.params
  const decoded = decodeURIComponent(rawNumber)

  // Try exact match first (handles URL-encoded policy numbers)
  let document = await getPolicyByNumber(decoded)

  // Fallback: try legacy dash-to-colon decoding (e.g., "AR-2-9" → "AR 2:9")
  if (!document) {
    const legacyNumber = decoded.replace(/-(\d+)-(\d+)$/, ' $1:$2')
    document = await getPolicyByNumber(legacyNumber)
  }

  // Fallback: case-insensitive search by policyNumber starting with the decoded string
  if (!document) {
    document = await prisma.policyDocument.findFirst({
      where: { policyNumber: { startsWith: decoded, mode: 'insensitive' } },
      include: {
        chunks: {
          orderBy: { chunkIndex: 'asc' },
          select: { id: true, sectionTitle: true, content: true, chunkIndex: true },
        },
      },
    })
  }

  if (!document) {
    return NextResponse.json({ error: 'Policy not found' }, { status: 404 })
  }

  return NextResponse.json({ document }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
