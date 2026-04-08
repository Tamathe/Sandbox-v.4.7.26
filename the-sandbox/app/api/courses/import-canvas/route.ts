import { NextRequest, NextResponse } from 'next/server'
import { requireEducatorUser, isAuthFailure } from '../../../lib/server-auth'
import { importCanvasCourse } from '../../../lib/canvas-import-service'
import { withErrorHandling } from '../../../lib/api-utils'

// Small files (<2 GB) use JSZip in-memory; large files use Python subprocess
// to extract only metadata. No practical upper limit since Python handles 4GB+.
const MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024 // 10 GB

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  // Validate file type
  const name = file.name.toLowerCase()
  if (!name.endsWith('.imscc') && !name.endsWith('.zip')) {
    return NextResponse.json(
      { error: 'Invalid file type. Please upload a Canvas export (.imscc) file.' },
      { status: 400 },
    )
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: 'File too large. Maximum size is 10 GB.' },
      { status: 400 },
    )
  }

  // Optional overrides from form data
  const courseCode = formData.get('courseCode') as string | null
  const title = formData.get('title') as string | null
  const semester = formData.get('semester') as string | null

  try {
    const buffer = await file.arrayBuffer()
    const result = await importCanvasCourse(buffer, auth.user, {
      courseCode: courseCode || undefined,
      title: title || undefined,
      semester: semester || undefined,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Import failed'
    // Duplicate course code
    if (message.includes('Unique constraint') && message.includes('courseCode')) {
      return NextResponse.json(
        { error: 'A course with this code already exists. Please choose a different code.' },
        { status: 409 },
      )
    }
    console.error('[import-canvas] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
})
