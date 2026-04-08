import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { requireRequestUser, isAuthFailure } from '../../../../../lib/server-auth'
import { prisma } from '../../../../../lib/prisma'
import { generatePolicy } from '../../../../../lib/policy-builder-service'
import type { AssignmentAILevel } from '../../../../../lib/policy-builder-service'

export const POST = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ packId: string }> }
) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { packId } = await params

  const pack = await prisma.customStarterPack.findUnique({
    where: { id: packId },
    include: {
      items: { include: { template: true }, orderBy: { sortOrder: 'asc' } },
      course: { select: { id: true, courseCode: true, title: true, instructorId: true } },
    },
  })

  if (!pack) {
    return NextResponse.json({ error: 'Pack not found' }, { status: 404 })
  }
  if (pack.userId !== auth.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (pack.status === 'ADOPTED' || pack.status === 'IN_PROGRESS' || pack.status === 'COMPLETED') {
    return NextResponse.json({ error: 'Pack already adopted' }, { status: 400 })
  }

  // Build assignment levels from items
  const assignmentLevels = pack.items.map(item => ({
    title: item.customTitle ?? item.template?.title ?? 'Untitled',
    level: (item.customAiLevel ?? item.template?.aiTier ?? 'GUIDED') as AssignmentAILevel,
  }))

  // Determine stance from pack discipline default
  const stanceMap: Record<string, string> = {
    STEM: 'GUIDED',
    HUMANITIES: 'CAUTIOUS',
    SOCIAL_SCIENCES: 'GUIDED',
    ARTS: 'INTEGRATE',
    PROFESSIONAL: 'INTEGRATE',
    HEALTH_SCIENCES: 'CAUTIOUS',
  }
  const stance = (stanceMap[pack.disciplineFamily] ?? 'GUIDED') as 'PROHIBIT' | 'CAUTIOUS' | 'GUIDED' | 'INTEGRATE' | 'REQUIRE'

  const courseName = `${pack.course.courseCode} — ${pack.course.title}`
  const policy = generatePolicy(stance, courseName, assignmentLevels, pack.disciplineFamily)

  // Create or update CourseAIPolicy
  await prisma.courseAIPolicy.upsert({
    where: { courseId: pack.courseId },
    create: {
      courseId: pack.courseId,
      createdById: auth.user.id,
      stance,
      policyText: pack.policyLanguage ?? policy.fullText,
      policyJson: {
        assignmentLevels,
        disclosureRequirements: policy.disclosureRequirements,
        consequencesLanguage: policy.consequencesLanguage,
      },
      fromStarterPack: true,
    },
    update: {
      stance,
      policyText: pack.policyLanguage ?? policy.fullText,
      policyJson: {
        assignmentLevels,
        disclosureRequirements: policy.disclosureRequirements,
        consequencesLanguage: policy.consequencesLanguage,
      },
      fromStarterPack: true,
    },
  })

  // Mark pack as adopted
  await prisma.customStarterPack.update({
    where: { id: packId },
    data: { status: 'ADOPTED', adoptedAt: new Date() },
  })

  // Update AILiteracyProfile.policyCoverage
  const userId = auth.user.id
  const totalCourses = await prisma.course.count({ where: { instructorId: userId } })
  const coursesWithPolicy = await prisma.courseAIPolicy.count({
    where: { course: { instructorId: userId } },
  })
  const coverage = totalCourses > 0 ? coursesWithPolicy / totalCourses : 0

  await prisma.aILiteracyProfile.upsert({
    where: { userId },
    create: { userId, policyCoverage: coverage },
    update: { policyCoverage: coverage },
  })

  return NextResponse.json({ success: true, status: 'ADOPTED' })
})
