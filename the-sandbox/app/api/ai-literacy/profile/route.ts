import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { prisma } from '../../../lib/prisma'
import { recalculateProfile, getReadinessBand } from '../../../lib/progressive-profile-service'

// GET — fetch the user's progressive AI profile
export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const profile = await prisma.aILiteracyProfile.findUnique({
    where: { userId: auth.user.id },
    select: {
      comfort: true,
      pedagogyAlignment: true,
      curiosity: true,
      ethicalAwareness: true,
      currentUsage: true,
      readiness: true,
      modulesCompleted: true,
      profileMaterialized: true,
      lastScoredAt: true,
    },
  })

  if (!profile) {
    return NextResponse.json({ profile: null, materialized: false })
  }

  if (!profile.profileMaterialized) {
    return NextResponse.json({
      profile: null,
      materialized: false,
      modulesCompleted: profile.modulesCompleted,
      hint: `Complete ${2 - profile.modulesCompleted} more modules to unlock your AI Profile`,
    }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }

  return NextResponse.json({
    profile: {
      comfort: profile.comfort,
      pedagogyAlignment: profile.pedagogyAlignment,
      curiosity: profile.curiosity,
      ethicalAwareness: profile.ethicalAwareness,
      currentUsage: profile.currentUsage,
      readiness: profile.readiness,
      modulesCompleted: profile.modulesCompleted,
      lastScoredAt: profile.lastScoredAt?.toISOString() ?? null,
    },
    materialized: true,
    readinessBand: getReadinessBand(profile.readiness),
  }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})

// POST — trigger a profile recalculation
export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  let studentLessonCompletions: string[] | undefined
  const parsed = await parseRequestBody(req)
  if (!('error' in parsed)) {
    const body = parsed.data as { studentLessonCompletions?: string[] }
    if (Array.isArray(body?.studentLessonCompletions)) {
      studentLessonCompletions = body.studentLessonCompletions
    }
  }
  // No body or invalid JSON — that's fine, recalculate with defaults

  const updated = await recalculateProfile(auth.user.id, { studentLessonCompletions })

  if (!updated.profileMaterialized) {
    return NextResponse.json({
      profile: null,
      materialized: false,
      modulesCompleted: updated.modulesCompleted,
      hint: `Complete ${2 - updated.modulesCompleted} more modules to unlock your AI Profile`,
    }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }

  return NextResponse.json({
    profile: {
      comfort: updated.comfort,
      pedagogyAlignment: updated.pedagogyAlignment,
      curiosity: updated.curiosity,
      ethicalAwareness: updated.ethicalAwareness,
      currentUsage: updated.currentUsage,
      readiness: updated.readiness,
      modulesCompleted: updated.modulesCompleted,
      lastScoredAt: updated.lastScoredAt?.toISOString() ?? null,
    },
    materialized: true,
    readinessBand: getReadinessBand(updated.readiness),
  }, {
    headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
  })
})
