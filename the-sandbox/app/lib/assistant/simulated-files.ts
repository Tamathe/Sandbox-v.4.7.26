// ─── Simulated File Provider ─────────────────────────────────
// Searches across CourseMaterial and ServiceDocument tables for
// simulated SharePoint/OneDrive documents.
// Swap for GraphFileProvider when Azure arrives.

import { prisma } from '../prisma'
import type { FileProvider, FileSearchResult } from './providers'

export class SimulatedFileProvider implements FileProvider {
  async searchDocuments(
    userId: string,
    query: string,
    topK = 5
  ): Promise<FileSearchResult[]> {
    const queryLower = query.toLowerCase()
    const words = queryLower.split(/\s+/).filter(w => w.length > 2)

    // Search course materials the user has access to
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        courses: {
          select: {
            id: true,
            facultyAiRetrievalApproved: true,
          },
        },
        courseEnrollments: {
          select: {
            course: {
              select: {
                id: true,
                facultyAiRetrievalApproved: true,
              },
            },
          },
        },
      },
    })
    if (!user) return []

    const educatorCourseIds = user.courses
      .filter((course) => course.facultyAiRetrievalApproved)
      .map((course) => course.id)
    const enrolledCourseIds = user.courseEnrollments
      .filter((enrollment) => enrollment.course.facultyAiRetrievalApproved)
      .map((enrollment) => enrollment.course.id)

    // For educators: search their own course materials
    // For admins: search all materials
    // For students: search enrolled course materials
    const courseFilter =
      user.role === 'ADMIN'
        ? {}
        : {
            courseId: {
              in: user.role === 'STUDENT' ? enrolledCourseIds : educatorCourseIds,
            },
          }

    const materials = await prisma.courseMaterial.findMany({
      where: {
        ...courseFilter,
        ...(user.role === 'STUDENT' ? { isVisible: true } : {}),
        course: {
          facultyAiRetrievalApproved: true,
        },
        OR: words.map(w => ({
          OR: [
            { title: { contains: w, mode: 'insensitive' as const } },
            { content: { contains: w, mode: 'insensitive' as const } },
          ],
        })),
      },
      take: topK,
      include: { course: { select: { courseCode: true, title: true } } },
    })

    const materialResults: FileSearchResult[] = materials.map(m => ({
      id: m.id,
      title: m.title,
      content: (m.content ?? '').slice(0, 500),
      source: `course:${m.course?.courseCode ?? 'unknown'}`,
      sourceLabel: `${m.course?.courseCode ?? 'Course'}: ${m.title}`,
      relevance: scoreRelevance(m.title + ' ' + (m.content ?? ''), words),
    }))

    // Also search service documents (simulated SharePoint policy docs)
    const serviceDocs = await prisma.serviceDocument.findMany({
      where: {
        OR: words.map(w => ({
          OR: [
            { title: { contains: w, mode: 'insensitive' as const } },
            { content: { contains: w, mode: 'insensitive' as const } },
          ],
        })),
      },
      take: topK,
    })

    const serviceResults: FileSearchResult[] = serviceDocs.map(d => ({
      id: d.id,
      title: d.title,
      content: d.content.slice(0, 500),
      source: `sharepoint:${d.serviceArea}`,
      sourceLabel: `SharePoint: ${d.title}`,
      relevance: scoreRelevance(d.title + ' ' + d.content, words),
    }))

    return [...materialResults, ...serviceResults]
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, topK)
  }
}

function scoreRelevance(text: string, words: string[]): number {
  const lower = text.toLowerCase()
  let hits = 0
  for (const w of words) {
    if (lower.includes(w)) hits++
  }
  return words.length > 0 ? hits / words.length : 0
}
