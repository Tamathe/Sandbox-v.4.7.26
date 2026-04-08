import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { validateBody } from '../../../lib/validate'
import { z } from 'zod'
import { addArtifact } from '../../../lib/portfolio-service'
import { withErrorHandling } from '../../../lib/api-utils'

const AddSchema = z.object({
  portfolioId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  sourceType: z.string().min(1),
  sourceId: z.string().optional(),
  courseId: z.string().optional(),
  content: z.string().optional(),
})

export const POST = withErrorHandling(async (req: NextRequest) => {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response

    const parsed = await parseRequestBody(req)
    if ('error' in parsed) return parsed.error
    const v = validateBody(AddSchema, parsed.data)
    if ('error' in v) return v.error

    const { portfolioId, ...data } = v.value
    const artifact = await addArtifact(portfolioId, auth.user.id, data)
    return NextResponse.json(artifact)
  })
