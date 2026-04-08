import { NextRequest, NextResponse } from 'next/server'
import { getSuggestions } from '../../../lib/interest-taxonomy'
import { withErrorHandling } from '../../../lib/api-utils'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url)
  const department = searchParams.get('department')
  const title = searchParams.get('title')
  const role = (searchParams.get('role') ?? 'EDUCATOR') as 'EDUCATOR' | 'STUDENT' | 'ADMIN'
  const excludeRaw = searchParams.get('exclude') ?? ''
  const exclude = excludeRaw ? excludeRaw.split(',').map((s) => s.trim()).filter(Boolean) : []

  const suggestions = getSuggestions({ department, title, role, exclude, limit: 5 })

  return NextResponse.json({ suggestions }, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})
