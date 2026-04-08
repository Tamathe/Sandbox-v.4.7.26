import { NextRequest, NextResponse } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { uploadDocument } from '../../../../lib/research-session-service'
import { withErrorHandling } from '../../../../lib/api-utils'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const formData = await req.formData()
  const file = formData.get('file')
  const sessionId = formData.get('sessionId')

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 })
  }
  if (!sessionId || typeof sessionId !== 'string') {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
  }
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  try {
    const document = await uploadDocument(auth.user.id, sessionId, file.name, buffer)
    if (!document) {
      return NextResponse.json({ error: 'Session not found or access denied' }, { status: 404 })
    }
    return NextResponse.json({ document })
  } catch (err) {
    console.error('Research Hub upload error:', err)
    const message = err instanceof Error ? err.message : 'Upload failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
})
