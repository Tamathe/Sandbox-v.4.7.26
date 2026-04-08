import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { updateArtifact, deleteArtifact } from '../../../../lib/portfolio-service'
import { withErrorHandling } from '../../../../lib/api-utils'

export const PATCH = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ artifactId: string }> }
) => {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response

    const { artifactId } = await params
    const parsed = await parseRequestBody(req)
    if ('error' in parsed) return parsed.error

    const { title, description, reflection, featured } = parsed.data as Record<string, unknown>
    const artifact = await updateArtifact(artifactId, auth.user.id, {
      title: title as string | undefined,
      description: description as string | undefined,
      reflection: reflection as string | undefined,
      featured: featured as boolean | undefined,
    })
    return NextResponse.json(artifact)
  })

export const DELETE = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ artifactId: string }> }
) => {
    const auth = await requireRequestUser(req)
    if (isAuthFailure(auth)) return auth.response

    const { artifactId } = await params
    await deleteArtifact(artifactId, auth.user.id)
    return NextResponse.json({ deleted: true })
  })
