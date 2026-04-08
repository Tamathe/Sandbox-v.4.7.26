import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { withErrorHandling } from '../../../../lib/api-utils'
import { generatePolicyBuilderDraft } from '../../../../lib/faculty/ai-policy-builder'
import {
  POLICY_BUILDER_POLICY_TYPES,
  POLICY_BUILDER_STANCES,
  POLICY_BUILDER_TONES,
} from '../../../../lib/faculty/policy-builder-types'
import {
  requireCourseOwner,
  parseRequestBody,
  isAuthFailure,
} from '../../../../lib/server-auth'
import { validateBody } from '../../../../lib/validate'

const GeneratePolicyBuilderSchema = z.object({
  courseId: z.string().min(1),
  policyType: z.enum(POLICY_BUILDER_POLICY_TYPES),
  stance: z.enum(POLICY_BUILDER_STANCES),
  tone: z.enum(POLICY_BUILDER_TONES),
  title: z.string().max(120).optional().nullable(),
  allowedUses: z.string().max(1200).optional().nullable(),
  restrictedUses: z.string().max(1200).optional().nullable(),
  disclosureRequirements: z.string().max(1200).optional().nullable(),
  courseNotes: z.string().max(1200).optional().nullable(),
})

export const POST = withErrorHandling(async (req: NextRequest) => {
  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error

  const validation = validateBody(GeneratePolicyBuilderSchema, parsed.data)
  if ('error' in validation) return validation.error

  const auth = await requireCourseOwner(req, validation.value.courseId)
  if (isAuthFailure(auth)) return auth.response

  const response = await generatePolicyBuilderDraft(
    {
      id: auth.user.id,
      role: auth.user.role,
    },
    validation.value,
  )

  return NextResponse.json(response)
})
