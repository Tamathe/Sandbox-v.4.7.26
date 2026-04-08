// GET /api/interests/suggest?q=...
// Returns up to 8 taxonomy tag matches for autocomplete.
// Public endpoint — taxonomy data is not sensitive and is needed during onboarding
// before the user account exists.

import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import {
  ALL_INTEREST_TAGS,
  DEPARTMENT_INTERESTS,
  TITLE_INTERESTS,
  POPULAR_EDUCATOR_INTERESTS,
  POPULAR_STUDENT_INTERESTS,
} from '../../../lib/interest-taxonomy'

// Precompute tag → category map once at module load
const TAG_CATEGORY = new Map<string, string>()

for (const [dept, tags] of Object.entries(DEPARTMENT_INTERESTS)) {
  for (const tag of tags) {
    if (!TAG_CATEGORY.has(tag)) TAG_CATEGORY.set(tag, dept)
  }
}
for (const tags of Object.values(TITLE_INTERESTS)) {
  for (const tag of tags) {
    if (!TAG_CATEGORY.has(tag)) TAG_CATEGORY.set(tag, 'Professional')
  }
}
for (const tag of POPULAR_EDUCATOR_INTERESTS) {
  if (!TAG_CATEGORY.has(tag)) TAG_CATEGORY.set(tag, 'Educator Skills')
}
for (const tag of POPULAR_STUDENT_INTERESTS) {
  if (!TAG_CATEGORY.has(tag)) TAG_CATEGORY.set(tag, 'Student Skills')
}

export const GET = withErrorHandling(async (req: NextRequest) => {
  const q = new URL(req.url).searchParams.get('q')?.trim().toLowerCase() ?? ''

  if (!q || q.length < 1) {
    return NextResponse.json({ suggestions: [] }, {
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
    })
  }

  // Prefer starts-with matches first, then contains
  const startsWith: string[] = []
  const contains: string[] = []

  for (const tag of ALL_INTEREST_TAGS) {
    const lower = tag.toLowerCase()
    if (lower.startsWith(q)) startsWith.push(tag)
    else if (lower.includes(q)) contains.push(tag)
  }

  const results = [...startsWith, ...contains].slice(0, 8).map((tag) => ({
    tag,
    category: TAG_CATEGORY.get(tag) ?? 'General',
  }))

  return NextResponse.json({ suggestions: results }, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  })
})
