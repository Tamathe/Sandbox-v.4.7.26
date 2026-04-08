import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { previewDocument } from '../../../../lib/document-service'

export const GET = withErrorHandling(async (req: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { id } = await context.params

  const result = await previewDocument(id, auth.user.id, auth.user.department ?? undefined)

  if (!result.buffer) {
    return NextResponse.json({ error: 'File content not available' }, { status: 404 })
  }

  return new NextResponse(result.buffer, {
    status: 200,
    headers: {
      'Content-Type': result.mimeType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(result.fileName)}"`,
      'Content-Length': String(result.fileSize),
      'Cache-Control': 'private, max-age=300',
    },
  })
})
