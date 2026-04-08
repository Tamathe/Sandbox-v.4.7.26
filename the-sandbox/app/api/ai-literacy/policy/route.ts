import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../lib/api-utils'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { getCoursesForPolicyWizard, getPolicyGapData, generatePolicy, savePolicy } from '../../../lib/policy-builder-service'
import { prisma } from '../../../lib/prisma'
import { recalculateProfile } from '../../../lib/progressive-profile-service'
import type { AIStance, DisciplineFamily } from '../../../generated/prisma'

// GET — courses for wizard + gap data
export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const view = req.nextUrl.searchParams.get('view')

  if (view === 'gap') {
    const data = await getPolicyGapData(auth.user.id, auth.user.role)
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }

  // Default: courses for wizard
  const profile = await prisma.aILiteracyProfile.findUnique({
    where: { userId: auth.user.id },
  })
  const stance = profile?.stance ?? 'GUIDED'
  const courses = await getCoursesForPolicyWizard(auth.user.id, stance as AIStance)
  return NextResponse.json({ courses, stance, disciplineFamily: profile?.disciplineFamily })
})

// POST — generate or save policy
export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as {
    action: string
    stance?: AIStance
    courseName?: string
    assignmentLevels?: { title: string; level: 'PROHIBITED' | 'LIMITED' | 'GUIDED' | 'REQUIRED' }[]
    disciplineFamily?: DisciplineFamily
    courseId?: string
    policyText?: string
    policyJson?: { assignmentLevels: { assignmentId: string; title: string; level: 'PROHIBITED' | 'LIMITED' | 'GUIDED' | 'REQUIRED' }[]; disclosureRequirements: string; consequencesLanguage: string }
    publishToStudents?: boolean
    addToCoursePolicy?: boolean
  }

  // Generate policy (preview, not saved)
  if (body.action === 'generate') {
    const { stance, courseName, assignmentLevels, disciplineFamily } = body
    const policy = generatePolicy(
      stance as AIStance,
      courseName as string,
      assignmentLevels as { title: string; level: 'PROHIBITED' | 'LIMITED' | 'GUIDED' | 'REQUIRED' }[],
      disciplineFamily,
    )
    return NextResponse.json(policy, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }

  // Save policy
  if (body.action === 'save') {
    const result = await savePolicy({
      courseId: body.courseId as string,
      userId: auth.user.id,
      stance: body.stance as AIStance,
      policyText: body.policyText as string,
      policyJson: body.policyJson as { assignmentLevels: { assignmentId: string; title: string; level: 'PROHIBITED' | 'LIMITED' | 'GUIDED' | 'REQUIRED' }[]; disclosureRequirements: string; consequencesLanguage: string },
      publishToStudents: body.publishToStudents ?? false,
      addToCoursePolicy: body.addToCoursePolicy ?? true,
    })
    void recalculateProfile(auth.user.id)
    return NextResponse.json({ id: result.id, saved: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
})
