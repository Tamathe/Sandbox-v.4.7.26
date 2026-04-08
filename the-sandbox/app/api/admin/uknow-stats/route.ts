import { type NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'
import { requireAdminUser, isAuthFailure } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireAdminUser(req)
  if (isAuthFailure(auth)) return auth.response

  const [articlesResult, chunksResult, lastResult, breakdownResult] = await Promise.all([
    pool.query<{ count: string }>('SELECT COUNT(*) FROM "UKNowArticle"'),
    pool.query<{ count: string }>('SELECT COUNT(*) FROM "UKNowChunk"'),
    pool.query<{ max: string | null }>('SELECT MAX("embeddedAt") FROM "UKNowArticle"'),
    pool.query<{ section: string; sectionLabel: string; count: string }>(
      'SELECT section, "sectionLabel", COUNT(*) as count FROM "UKNowArticle" GROUP BY section, "sectionLabel" ORDER BY count DESC',
    ),
  ])

  return NextResponse.json({
    totalArticles: parseInt(articlesResult.rows[0].count, 10),
    totalChunks: parseInt(chunksResult.rows[0].count, 10),
    lastIngestedAt: lastResult.rows[0].max ?? null,
    sectionBreakdown: breakdownResult.rows.map((r) => ({
      section: r.section,
      sectionLabel: r.sectionLabel,
      count: parseInt(r.count, 10),
    })),
  }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
