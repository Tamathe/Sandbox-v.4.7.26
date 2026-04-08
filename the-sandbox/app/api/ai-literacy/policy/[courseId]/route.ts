import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { getCourseAIPolicy } from '../../../../lib/policy-builder-service'

// GET — existing AI policy for a course
export const GET = withErrorHandling(async (req: NextRequest, context: { params: Promise<{ courseId: string }> }) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { courseId } = await context.params
  const policy = await getCourseAIPolicy(courseId)

  if (!policy) {
    return NextResponse.json({ exists: false }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
    })
  }

  return NextResponse.json({
    exists: true,
    policy: {
      id: policy.id,
      stance: policy.stance,
      policyText: policy.policyText,
      policyJson: policy.policyJson,
      publishedToStudents: policy.publishedToStudents,
      publishedAt: policy.publishedAt,
      courseCode: policy.course.courseCode,
      courseTitle: policy.course.title,
      updatedAt: policy.updatedAt,
    },
  })
})
