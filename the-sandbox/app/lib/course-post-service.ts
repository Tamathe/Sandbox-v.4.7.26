/**
 * Course Communication & Announcements — Service Layer
 *
 * CRUD for course posts, student feed with audience filtering,
 * read tracking, and Sandy nudge suggestion generation.
 */

import { prisma } from './prisma'
import type {
  CoursePostType,
  CoursePostAudience,
} from '../generated/prisma'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CreateCoursePostInput {
  courseId: string
  authorId: string
  title?: string
  body: string
  type: CoursePostType
  audience: CoursePostAudience
  targetStudentIds?: string[]
  channelPlatform?: boolean
  channelEmail?: boolean
  scheduledFor?: string | null
  sandyGenerated?: boolean
  sandyPrompt?: string
}

export interface CoursePostWithMeta {
  id: string
  courseId: string
  courseCode: string
  courseTitle: string
  authorId: string
  authorName: string
  title: string | null
  body: string
  type: CoursePostType
  audience: CoursePostAudience
  targetStudentIds: string[]
  channelPlatform: boolean
  channelEmail: boolean
  scheduledFor: string | null
  publishedAt: string | null
  sandyGenerated: boolean
  createdAt: string
  readCount: number
  totalAudience: number
}

// ─── Create ──────────────────────────────────────────────────────────────────

export async function createCoursePost(input: CreateCoursePostInput) {
  const scheduledFor = input.scheduledFor ? new Date(input.scheduledFor) : null
  const publishNow = !scheduledFor

  const post = await prisma.coursePost.create({
    data: {
      courseId: input.courseId,
      authorId: input.authorId,
      title: input.title ?? null,
      body: input.body,
      type: input.type,
      audience: input.audience,
      targetStudentIds: input.targetStudentIds ?? [],
      channelPlatform: input.channelPlatform ?? true,
      channelEmail: input.channelEmail ?? false,
      scheduledFor,
      publishedAt: publishNow ? new Date() : null,
      sandyGenerated: input.sandyGenerated ?? false,
      sandyPrompt: input.sandyPrompt ?? null,
    },
    include: {
      course: { select: { courseCode: true, title: true } },
      author: { select: { name: true } },
    },
  })

  // Send notifications to enrolled students (if published now)
  if (publishNow && post.channelPlatform) {
    notifyCourseStudents(post.id, post.courseId, post.audience, post.targetStudentIds, post.course.courseCode, post.title ?? post.body.slice(0, 60)).catch(() => {})
  }

  // Send email channel (if enabled and published now)
  if (publishNow && post.channelEmail) {
    sendCoursePostEmail(post.id, post.courseId, post.audience, post.targetStudentIds, post.course.courseCode, post.title, post.body, post.author.name).catch(() => {})
  }

  return post
}

// ─── Get posts for a course (faculty view) ───────────────────────────────────

export async function getCoursePostsByCourse(courseId: string, limit = 20, offset = 0) {
  const [posts, total] = await Promise.all([
    prisma.coursePost.findMany({
      where: { courseId },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
      include: {
        course: { select: { courseCode: true, title: true } },
        author: { select: { name: true } },
        _count: { select: { reads: true } },
      },
    }),
    prisma.coursePost.count({ where: { courseId } }),
  ])

  // Get enrollment count for audience size
  const enrollmentCount = await prisma.courseEnrollment.count({ where: { courseId } })

  const items: CoursePostWithMeta[] = posts.map(p => ({
    id: p.id,
    courseId: p.courseId,
    courseCode: p.course.courseCode,
    courseTitle: p.course.title,
    authorId: p.authorId,
    authorName: p.author.name,
    title: p.title,
    body: p.body,
    type: p.type,
    audience: p.audience,
    targetStudentIds: p.targetStudentIds,
    channelPlatform: p.channelPlatform,
    channelEmail: p.channelEmail,
    scheduledFor: p.scheduledFor?.toISOString() ?? null,
    publishedAt: p.publishedAt?.toISOString() ?? null,
    sandyGenerated: p.sandyGenerated,
    createdAt: p.createdAt.toISOString(),
    readCount: p._count.reads,
    totalAudience: p.audience === 'ALL' ? enrollmentCount : p.targetStudentIds.length,
  }))

  return { posts: items, total }
}

// ─── Student feed — all visible posts across enrolled courses ─────────────────

export async function getStudentCourseFeed(studentId: string, limit = 20) {
  // Get enrolled course IDs (CourseEnrollment uses studentId)
  const enrollments = await prisma.courseEnrollment.findMany({
    where: { studentId },
    select: { courseId: true },
  })
  const courseIds = enrollments.map(e => e.courseId)
  if (courseIds.length === 0) return { posts: [], readIds: [] }

  // Fetch published posts for enrolled courses
  const posts = await prisma.coursePost.findMany({
    where: {
      courseId: { in: courseIds },
      publishedAt: { not: null },
    },
    orderBy: { publishedAt: 'desc' },
    take: limit,
    include: {
      course: { select: { courseCode: true, title: true } },
      author: { select: { name: true } },
    },
  })

  // Filter by audience visibility
  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId: studentId },
    select: { riskScore: true },
  })
  const riskScore = studentProfile?.riskScore ?? 0

  const visiblePosts = posts.filter(p => {
    if (p.audience === 'ALL') return true
    if (p.audience === 'AT_RISK') return riskScore > 0.6
    if (p.audience === 'SPECIFIC') return p.targetStudentIds.includes(studentId)
    return false
  })

  // Get read status
  const readRecords = await prisma.coursePostRead.findMany({
    where: {
      userId: studentId,
      postId: { in: visiblePosts.map(p => p.id) },
    },
    select: { postId: true },
  })
  const readIds = readRecords.map(r => r.postId)

  return {
    posts: visiblePosts.map(p => ({
      id: p.id,
      courseId: p.courseId,
      courseCode: p.course.courseCode,
      courseTitle: p.course.title,
      authorName: p.author.name,
      title: p.title,
      body: p.body,
      type: p.type,
      publishedAt: p.publishedAt!.toISOString(),
      isRead: readIds.includes(p.id),
    })),
    readIds,
  }
}

// ─── Mark post as read ───────────────────────────────────────────────────────

export async function markPostAsRead(postId: string, userId: string) {
  return prisma.coursePostRead.upsert({
    where: { postId_userId: { postId, userId } },
    create: { postId, userId },
    update: {},
  })
}

// ─── Publish scheduled posts (called by cron) ────────────────────────────────

export async function publishScheduledPosts() {
  const now = new Date()
  const duePosts = await prisma.coursePost.findMany({
    where: {
      scheduledFor: { lte: now },
      publishedAt: null,
    },
    include: {
      course: { select: { courseCode: true } },
      author: { select: { name: true } },
    },
  })

  if (duePosts.length === 0) return { published: 0, posts: [] }

  // Batch-publish all due posts in a single query
  const dueIds = duePosts.map(p => p.id)
  await prisma.coursePost.updateMany({
    where: { id: { in: dueIds } },
    data: { publishedAt: now },
  })

  // Fire notifications per post (non-blocking)
  for (const post of duePosts) {
    if (post.channelPlatform) {
      notifyCourseStudents(post.id, post.courseId, post.audience, post.targetStudentIds, post.course.courseCode, post.title ?? post.body.slice(0, 60)).catch(() => {})
    }
    if (post.channelEmail) {
      sendCoursePostEmail(post.id, post.courseId, post.audience, post.targetStudentIds, post.course.courseCode, post.title, post.body, post.author.name).catch(() => {})
    }
  }

  const results = duePosts.map(p => ({ id: p.id, courseCode: p.course.courseCode, title: p.title }))
  return { published: results.length, posts: results }
}

// ─── Get at-risk students for a course ───────────────────────────────────────

export async function getAtRiskStudentsForCourse(courseId: string) {
  const enrollments = await prisma.courseEnrollment.findMany({
    where: { courseId },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          email: true,
          studentProfile: { select: { riskScore: true } },
        },
      },
    },
  })

  return enrollments
    .filter(e => (e.student.studentProfile?.riskScore ?? 0) > 0.6)
    .map(e => ({
      id: e.student.id,
      name: e.student.name,
      email: e.student.email,
      riskScore: e.student.studentProfile?.riskScore ?? 0,
    }))
}

// ─── Get enrolled students for picker ────────────────────────────────────────

export async function getEnrolledStudents(courseId: string) {
  const enrollments = await prisma.courseEnrollment.findMany({
    where: { courseId },
    include: {
      student: {
        select: { id: true, name: true, email: true },
      },
    },
  })
  return enrollments.map(e => e.student)
}

// ─── Sandy nudge suggestions ────────────────────────────────────────────────

export interface NudgeSuggestion {
  courseId: string
  courseCode: string
  type: CoursePostType
  audience: CoursePostAudience
  suggestedTitle: string
  suggestedBody: string
  reason: string
  targetStudentIds?: string[]
}

export async function getSuggestedNudges(educatorId: string): Promise<NudgeSuggestion[]> {
  const suggestions: NudgeSuggestion[] = []

  // Get educator's courses with enrollments
  const courses = await prisma.course.findMany({
    where: { instructorId: educatorId },
    select: {
      id: true,
      courseCode: true,
      title: true,
    },
  })

  for (const course of courses) {
    // Get enrollments with student data
    const enrollments = await prisma.courseEnrollment.findMany({
      where: { courseId: course.id },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            studentProfile: { select: { riskScore: true } },
            lastSeenAt: true,
          },
        },
      },
    })

    if (enrollments.length === 0) continue

    // Check for at-risk cluster (3+ at-risk students)
    const atRisk = enrollments.filter(
      e => (e.student.studentProfile?.riskScore ?? 0) > 0.6
    )
    if (atRisk.length >= 3) {
      suggestions.push({
        courseId: course.id,
        courseCode: course.courseCode,
        type: 'ANNOUNCEMENT',
        audience: 'ALL',
        suggestedTitle: `Extra Review Sessions Available — ${course.courseCode}`,
        suggestedBody: `I'm hosting extra review sessions this week. Topics will cover recent material where I've seen the most questions. Check your email for sign-up details.`,
        reason: `${atRisk.length} students flagged as at-risk in ${course.courseCode}`,
      })
    }

    // Check for inactive students (>10 days)
    const tenDaysAgo = new Date()
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10)
    const inactive = enrollments.filter(
      e => e.student.lastSeenAt < tenDaysAgo
    )
    for (const enrollment of inactive.slice(0, 3)) {
      suggestions.push({
        courseId: course.id,
        courseCode: course.courseCode,
        type: 'NUDGE',
        audience: 'SPECIFIC',
        suggestedTitle: undefined as unknown as string,
        suggestedBody: `Hey ${enrollment.student.name.split(' ')[0]}, I haven't seen you in ${course.courseCode} for a while. Everything okay? Let me know if you need anything — I'm happy to help you catch up.`,
        reason: `${enrollment.student.name} inactive for 10+ days`,
        targetStudentIds: [enrollment.studentId],
      })
    }
  }

  return suggestions.slice(0, 10)
}

// ─── Internal helpers ────────────────────────────────────────────────────────

async function getAudienceStudentIds(
  courseId: string,
  audience: CoursePostAudience,
  targetStudentIds: string[],
): Promise<string[]> {
  if (audience === 'SPECIFIC') return targetStudentIds

  const enrollments = await prisma.courseEnrollment.findMany({
    where: { courseId },
    include: {
      student: {
        select: {
          studentProfile: { select: { riskScore: true } },
        },
      },
    },
  })

  if (audience === 'ALL') return enrollments.map(e => e.studentId)

  // AT_RISK
  return enrollments
    .filter(e => (e.student.studentProfile?.riskScore ?? 0) > 0.6)
    .map(e => e.studentId)
}

async function notifyCourseStudents(
  postId: string,
  courseId: string,
  audience: CoursePostAudience,
  targetStudentIds: string[],
  courseCode: string,
  titleOrSnippet: string,
) {
  const { createNotification } = await import('./notifications')
  const userIds = await getAudienceStudentIds(courseId, audience, targetStudentIds)

  await Promise.allSettled(
    userIds.map(userId =>
      createNotification({
        userId,
        type: 'COURSE_POST_NEW',
        title: `New post in ${courseCode}`,
        body: titleOrSnippet,
        href: `/courses/${courseId}?tab=posts`,
      })
    )
  )
}

async function sendCoursePostEmail(
  _postId: string,
  courseId: string,
  audience: CoursePostAudience,
  targetStudentIds: string[],
  courseCode: string,
  title: string | null,
  body: string,
  authorName: string,
) {
  try {
    const { Resend } = await import('resend')
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      console.log(`[CoursePost Email] No RESEND_API_KEY — skipping email`)
      return
    }

    const resend = new Resend(apiKey)
    const userIds = await getAudienceStudentIds(courseId, audience, targetStudentIds)

    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { email: true, name: true },
    })

    const subject = title || `New post from ${authorName} in ${courseCode}`

    await Promise.allSettled(
      users.map(u =>
        resend.emails.send({
          from: `University of Kentucky <noreply@sandboxuk.edu>`,
          to: u.email,
          subject,
          text: `${authorName} posted in ${courseCode}:\n\n${body}\n\n— View on the University of Kentucky platform`,
        })
      )
    )
  } catch (err) {
    console.error('[CoursePost Email] Error:', err)
  }
}
