import { NextRequest, NextResponse } from 'next/server'

// ── API Versioning Helper ───────────────────────────────────────────────────

export type ApiVersion = '1' | '2'

export function getApiVersion(request: NextRequest): ApiVersion {
  const header = request.headers.get('X-API-Version') ?? '1'
  return header === '2' ? '2' : '1'
}

/**
 * Wraps a payload in the V2 envelope format.
 * V1 responses pass through unchanged.
 */
export function formatResponse(
  data: unknown,
  version: ApiVersion,
  userId?: string,
): NextResponse {
  if (version === '2') {
    return NextResponse.json({
      apiVersion: '2',
      data,
      meta: {
        requestedAt: new Date().toISOString(),
        userId: userId ?? null,
      },
    })
  }
  return NextResponse.json(data)
}

/**
 * Returns the compliance status label based on score.
 */
export function getComplianceStatusLabel(score: number): 'compliant' | 'at-risk' | 'non-compliant' {
  if (score >= 80) return 'compliant'
  if (score >= 50) return 'at-risk'
  return 'non-compliant'
}
