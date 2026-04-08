import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'

export const runtime = 'nodejs'

async function getUser(req: NextRequest) {
  const email = req.headers.get('x-demo-user-email')
  if (!email) return null
  return prisma.user.findUnique({ where: { email } })
}

function canManageCourse(
  course: { instructorId: string },
  user: { id: string; role: string } | null
) {
  if (!user) return false
  if (user.role === 'ADMIN') return true
  return user.role === 'EDUCATOR' && user.id === course.instructorId
}

function titleFromFilename(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, '') // strip extension
    .replace(/[-_]+/g, ' ')  // hyphens/underscores → spaces
    .replace(/\b\w/g, (c) => c.toUpperCase()) // title case
    .trim()
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const course = await prisma.course.findUnique({
      where: { id },
      select: { id: true, instructorId: true },
    })
    if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    if (!canManageCourse(course, user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 })
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 413 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    let extractedText = ''
    let pageCount = 0

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string; numpages: number }>
      const data = await pdfParse(buffer)
      extractedText = data.text?.trim() || ''
      pageCount = data.numpages || 0
    } catch {
      extractedText = `[PDF content from ${file.name} — ${Math.round(file.size / 1024)} KB]`
    }

    return NextResponse.json({
      suggestedTitle: titleFromFilename(file.name),
      content: extractedText,
      pageCount,
    })
  } catch (err) {
    console.error('POST /api/courses/[id]/materials/upload error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
