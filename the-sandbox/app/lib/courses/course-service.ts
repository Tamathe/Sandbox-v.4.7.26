// Course authoring service — owns Course/Module/Lesson CRUD plus publish gating.
// See docs/COURSE_PLATFORM_ARCHITECTURE.md §3, §6, §9.

import { prisma } from '../prisma'
import type { Course, CourseModule, Lesson, LessonType, User } from '../../generated/prisma'

export class CoursePermissionError extends Error {
  status = 403
  constructor(message = 'Forbidden') {
    super(message)
  }
}

export class CourseValidationError extends Error {
  status = 400
  constructor(message: string) {
    super(message)
  }
}

function isOwnerOrAdmin(course: { instructorId: string }, user: User) {
  return user.role === 'ADMIN' || course.instructorId === user.id
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80)
}

export const CourseService = {
  async createDraft(user: User, data: { title: string; description?: string; courseCode: string }) {
    if (user.role === 'STUDENT') throw new CoursePermissionError('Students cannot create courses')
    const baseSlug = slugify(data.title) || `course-${Date.now()}`
    let slug = baseSlug
    let n = 1
    // Resolve slug collision deterministically.
    while (await prisma.course.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${++n}`
    }
    return prisma.course.create({
      data: {
        title: data.title,
        description: data.description,
        courseCode: data.courseCode,
        slug,
        status: 'DRAFT',
        visibility: 'PRIVATE',
        instructorId: user.id,
      },
    })
  },

  async updateMetadata(
    user: User,
    courseId: string,
    patch: Partial<Pick<Course, 'title' | 'description' | 'category' | 'difficulty' | 'estimatedHours' | 'visibility'>>,
  ) {
    const course = await prisma.course.findUnique({ where: { id: courseId } })
    if (!course) throw new CourseValidationError('Course not found')
    if (!isOwnerOrAdmin(course, user)) throw new CoursePermissionError()
    return prisma.course.update({ where: { id: courseId }, data: patch })
  },

  async publish(user: User, courseId: string) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        modules: { include: { lessons: { include: { assessments: true } } } },
      },
    })
    if (!course) throw new CourseValidationError('Course not found')
    if (!isOwnerOrAdmin(course, user)) throw new CoursePermissionError()

    // Publish gates from §6.
    if (course.modules.length === 0) throw new CourseValidationError('Course needs at least one module')
    const lessons = course.modules.flatMap((m) => m.lessons)
    if (lessons.length === 0) throw new CourseValidationError('Course needs at least one lesson')
    const assessmentLessons = lessons.filter((l) => l.type === 'ASSESSMENT')
    for (const l of assessmentLessons) {
      if (l.assessments.length === 0) throw new CourseValidationError(`Lesson "${l.title}" is missing an assessment`)
    }

    return prisma.course.update({
      where: { id: courseId },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    })
  },

  async listPublic(opts: { search?: string; category?: string } = {}) {
    return prisma.course.findMany({
      where: {
        status: 'PUBLISHED',
        visibility: { in: ['PUBLIC', 'UNLISTED'] },
        ...(opts.category ? { category: opts.category } : {}),
        ...(opts.search
          ? {
              OR: [
                { title: { contains: opts.search, mode: 'insensitive' } },
                { description: { contains: opts.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { publishedAt: 'desc' },
      include: { instructor: { select: { id: true, name: true } }, _count: { select: { enrollments: true } } },
    })
  },

  async getBySlug(slug: string) {
    return prisma.course.findUnique({
      where: { slug },
      include: {
        instructor: { select: { id: true, name: true } },
        modules: { orderBy: { order: 'asc' }, include: { lessons: { orderBy: { order: 'asc' } } } },
      },
    })
  },

  // ── Modules ────────────────────────────────────────────────────────────────
  async addModule(user: User, courseId: string, data: { title: string; summary?: string }) {
    const course = await prisma.course.findUnique({ where: { id: courseId } })
    if (!course) throw new CourseValidationError('Course not found')
    if (!isOwnerOrAdmin(course, user)) throw new CoursePermissionError()
    const last = await prisma.courseModule.findFirst({ where: { courseId }, orderBy: { order: 'desc' } })
    return prisma.courseModule.create({
      data: { courseId, title: data.title, summary: data.summary, order: (last?.order ?? -1) + 1 },
    })
  },

  // ── Lessons ────────────────────────────────────────────────────────────────
  async addLesson(
    user: User,
    moduleId: string,
    data: { title: string; type: LessonType; contentRef: Lesson['contentRef'] },
  ) {
    const mod = await prisma.courseModule.findUnique({ where: { id: moduleId }, include: { course: true } })
    if (!mod) throw new CourseValidationError('Module not found')
    if (!isOwnerOrAdmin(mod.course, user)) throw new CoursePermissionError()
    const last = await prisma.lesson.findFirst({ where: { moduleId }, orderBy: { order: 'desc' } })
    return prisma.lesson.create({
      data: {
        moduleId,
        title: data.title,
        type: data.type,
        contentRef: data.contentRef ?? {},
        order: (last?.order ?? -1) + 1,
      },
    })
  },

  async reorderLesson(user: User, lessonId: string, newOrder: number) {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: { include: { course: true } } },
    })
    if (!lesson) throw new CourseValidationError('Lesson not found')
    if (!isOwnerOrAdmin(lesson.module.course, user)) throw new CoursePermissionError()
    return prisma.lesson.update({ where: { id: lessonId }, data: { order: newOrder } })
  },

  isOwnerOrAdmin,
}
