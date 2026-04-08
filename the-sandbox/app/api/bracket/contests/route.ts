import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, parseRequestBody } from '../../../lib/server-auth'
import { getUserContests, getPickCountsForUser, getUserScoresForContests, createContest } from '../../../lib/bracket/bracket-service'
import type { BracketNotifyFreq, BracketNudgeLevel } from '../../../generated/prisma'
import { withErrorHandling } from '../../../lib/api-utils'

export const runtime = 'nodejs'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireRequestUser(request)
  if ('response' in auth) return auth.response

  const contests = await getUserContests(auth.user.id)
  const contestIds = contests.map((c) => c.id)
  const [pickCounts, scores] = await Promise.all([
    getPickCountsForUser(auth.user.id, contestIds),
    getUserScoresForContests(auth.user.id, contestIds),
  ])
  const contestsWithPickCount = contests.map((c) => ({
    ...c,
    myPickCount: pickCounts.get(c.id) ?? 0,
    myScore: scores.get(c.id)?.score,
    myRank: scores.get(c.id)?.rank,
  }))
  return NextResponse.json({ contests: contestsWithPickCount }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

export const POST = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireRequestUser(request)
  if ('response' in auth) return auth.response

  const parsed = await parseRequestBody<{ name: unknown; notifyFrequency: unknown; nudgeIntensity: unknown; allowAiNudges: unknown }>(request)
  if ('error' in parsed) return parsed.error
  const { name, notifyFrequency, nudgeIntensity, allowAiNudges } = parsed.data

  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  const contest = await createContest(auth.user.id, {
    name,
    notifyFrequency: notifyFrequency as BracketNotifyFreq | undefined,
    nudgeIntensity: nudgeIntensity as BracketNudgeLevel | undefined,
    allowAiNudges: allowAiNudges as boolean | undefined,
  })

  return NextResponse.json({ contest }, { status: 201 })
})
