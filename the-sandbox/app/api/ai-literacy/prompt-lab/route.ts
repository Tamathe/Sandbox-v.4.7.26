import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireRequestUser, isAuthFailure } from '../../../lib/server-auth'
import { getChallenges } from '../../../lib/prompt-lab-service'
import { getStudentChallenges } from '../../../lib/ai-literacy/student-prompt-craft-service'
import type { DisciplineFamilyKey } from '../../../lib/ai-literacy/student-prompt-craft-service'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const context = req.nextUrl.searchParams.get('context')

  // Student context: filter by discipline and level
  if (context === 'student') {
    const discipline = req.nextUrl.searchParams.get('discipline') as DisciplineFamilyKey | null
    const levelParam = req.nextUrl.searchParams.get('level')
    const level = levelParam ? Number(levelParam) : undefined

    const challenges = getStudentChallenges(discipline ?? undefined, level)
    return NextResponse.json({ challenges }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }

  // Educator context (default)
  const level = Number(req.nextUrl.searchParams.get('level') ?? '1')
  if (isNaN(level) || level < 1 || level > 5) {
    return NextResponse.json({ error: 'Invalid level (1-5)' }, { status: 400 })
  }

  const challenges = getChallenges(level)
  return NextResponse.json({ challenges }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
