import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const userEmail = req.headers.get('x-demo-user-email')
    if (!userEmail) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const currentUser = await prisma.user.findUnique({ where: { email: userEmail } })
    if (!currentUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    if (currentUser.role === 'STUDENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const courseId = formData.get('courseId') as string | null
    const moduleNumber = formData.get('moduleNumber') as string | null
    const materialType = (formData.get('materialType') as string | null) ?? 'lecture'
    const isVisible = formData.get('isVisible') !== 'false'

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (!courseId) return NextResponse.json({ error: 'courseId required' }, { status: 400 })

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 })
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 413 })
    }

    // Verify course access
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, instructorId: true },
    })
    if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    if (currentUser.role !== 'ADMIN' && course.instructorId !== currentUser.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    let extractedText = ''
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string; numpages: number }>
      const data = await pdfParse(buffer)
      extractedText = data.text || ''
    } catch {
      extractedText = `[PDF content from ${file.name} — ${Math.round(file.size / 1024)}KB]`
    }

    // Clean up the filename for use as title (strip extension)
    const title = file.name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ').trim()

    const material = await prisma.courseMaterial.create({
      data: {
        courseId,
        title,
        content: extractedText,
        materialType,
        moduleNumber: moduleNumber ? parseInt(moduleNumber, 10) : null,
        isVisible,
      },
    })

    return NextResponse.json({
      id: material.id,
      title: material.title,
      materialType: material.materialType,
      moduleNumber: material.moduleNumber,
      isVisible: material.isVisible,
      createdAt: material.createdAt,
      wordCount: extractedText.split(/\s+/).filter(Boolean).length,
    }, { status: 201 })
  } catch (err) {
    console.error('POST /api/upload/course-material error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
