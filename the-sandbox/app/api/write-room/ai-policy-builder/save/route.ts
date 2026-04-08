import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { withErrorHandling } from '../../../../lib/api-utils'
import { savePolicyBuilderDraft } from '../../../../lib/faculty/ai-policy-builder'
import { POLICY_BUILDER_POLICY_TYPES } from '../../../../lib/faculty/policy-builder-types'
import {
  requireCourseOwner,
  parseRequestBody,
  isAuthFailure,
} from '../../../../lib/server-auth'
import { validateBody } from '../../../../lib/validate'

const SavePolicyBuilderSchema = z.object({
  courseId: z.string().min(1),
  saveMode: z.enum(['append', 'replace']),
  replacePolicyId: z.string().optional().nullable(),
  policy: z.object({
    title: z.string().min(1).max(120),
    policyType: z.enum(POLICY_BUILDER_POLICY_TYPES),
    content: z.string().min(1).max(4000),
  }),
})

export const POST = withErrorHandling(async (req: NextRequest) => {
  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error

  const validation = validateBody(SavePolicyBuilderSchema, parsed.data)
  if ('error' in validation) return validation.error

  const auth = await requireCourseOwner(req, validation.value.courseId)
  if (isAuthFailure(auth)) return auth.response

  const response = await savePolicyBuilderDraft(auth.user.id, validation.value)
  return NextResponse.json(response)
})
