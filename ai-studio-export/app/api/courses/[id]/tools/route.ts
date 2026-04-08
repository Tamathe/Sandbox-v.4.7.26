import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { parseReference } from '../../../../lib/datasets'

async function getUser(req: NextRequest) {
  const email = req.headers.get('x-demo-user-email')
  if (!email) return null
  return prisma.user.findUnique({ where: { email } })
}

function canAccessCourse(
  course: { instructorId: string; isPublic: boolean },
  user: { id: string; role: string } | null
) {
  if (user?.role === 'ADMIN') return true
  if (course.isPublic) return true
  return user?.id === course.instructorId
}

function canManageCourse(
  course: { instructorId: string },
  user: { id: string; role: string } | null
) {
  if (!user) return false
  if (user.role === 'ADMIN') return true
  return user.role === 'EDUCATOR' && user.id === course.instructorId
}

async function getAccessibleCourse(id: string, req: NextRequest) {
  const user = await getUser(req)
  const course = await prisma.course.findUnique({
    where: { id },
    select: { id: true, courseCode: true, instructorId: true, isPublic: true },
  })

  if (!course) return { user, course: null, error: NextResponse.json({ error: 'Course not found' }, { status: 404 }) }
  if (!canAccessCourse(course, user)) {
    return { user, course: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { user, course, error: null }
}

async function backfillCourseLinks(courseId: string, courseCode: string) {
  const tools = await prisma.tool.findMany({
    where: {
      published: true,
      NOT: { referenceDocUrls: { isEmpty: true } },
    },
    select: {
      id: true,
      referenceDocUrls: true,
    },
  })

  const matchingToolIds = tools
    .filter((tool) =>
      tool.referenceDocUrls.some((reference) => {
        const parsed = parseReference(reference)
        return parsed.type === 'course' && parsed.courseCode === courseCode
      })
    )
    .map((tool) => ({ courseId, toolId: tool.id }))

  if (matchingToolIds.length === 0) return

  await prisma.courseToolLink.createMany({
    data: matchingToolIds,
    skipDuplicates: true,
  })
}

async function fetchLinkedTools(courseId: string) {
  const links = await prisma.courseToolLink.findMany({
    where: {
      courseId,
      tool: { published: true },
    },
    include: {
      tool: {
        select: {
          id: true,
          name: true,
          shortDescription: true,
          category: true,
          toolType: true,
          thumbnailUrl: true,
          estimatedMinutes: true,
          _count: { select: { sessions: true } },
        },
      },
    },
    orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
  })

  const topScores = await prisma.leaderboardEntry.groupBy({
    by: ['toolId'],
    where: {
      courseId,
    },
    _max: {
      score: true,
    },
  }).catch(() => [])

  const scoreMap = new Map(topScores.map((entry) => [entry.toolId, entry._max.score ?? null]))

  return links.map((link) => ({
    ...link.tool,
    syllabusContext: link.syllabusContext,
    weekLabel: link.weekLabel,
    displayOrder: link.displayOrder,
    topScore: scoreMap.get(link.tool.id) ?? null,
  }))
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { course, error } = await getAccessibleCourse(id, req)
  if (error || !course) return error!

  await backfillCourseLinks(course.id, course.courseCode)
  const tools = await fetchLinkedTools(course.id)
  return NextResponse.json(tools)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user, course, error } = await getAccessibleCourse(id, req)
  if (error || !course) return error!
  if (!canManageCourse(course, user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { toolId } = await req.json()
  if (!toolId) return NextResponse.json({ error: 'toolId required' }, { status: 400 })

  const tool = await prisma.tool.findUnique({
    where: { id: String(toolId) },
    select: { id: true, published: true },
  })
  if (!tool || !tool.published) {
    return NextResponse.json({ error: 'Published tool not found' }, { status: 404 })
  }

  try {
    await prisma.courseToolLink.create({
      data: { courseId: course.id, toolId: tool.id },
    })
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Already linked' }, { status: 409 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user, course, error } = await getAccessibleCourse(id, req)
  if (error || !course) return error!
  if (!canManageCourse(course, user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const toolId = req.nextUrl.searchParams.get('toolId')
  if (!toolId) return NextResponse.json({ error: 'toolId required' }, { status: 400 })

  await prisma.courseToolLink.deleteMany({
    where: { courseId: course.id, toolId },
  })

  return NextResponse.json({ ok: true })
}
