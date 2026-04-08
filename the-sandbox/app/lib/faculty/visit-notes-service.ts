import { prisma } from '../prisma'
import type { VisitNoteInput, VisitNoteRecord } from './homepage-types'

/**
 * Creates a visit note. Notes are private to the faculty member who wrote them.
 */
export async function createVisitNote(
  facultyId: string,
  input: VisitNoteInput,
): Promise<VisitNoteRecord> {
  const note = await prisma.officeHoursVisitNote.create({
    data: {
      facultyId,
      studentId: input.studentId,
      courseId: input.courseId ?? null,
      content: input.content,
      followUpDate: input.followUpDate ? new Date(input.followUpDate) : null,
    },
    include: {
      student: { select: { name: true } },
      course: { select: { courseCode: true } },
    },
  })

  return {
    id: note.id,
    facultyId: note.facultyId,
    studentId: note.studentId,
    studentName: note.student.name,
    courseId: note.courseId,
    courseCode: note.course?.courseCode ?? null,
    content: note.content,
    followUpDate: note.followUpDate?.toISOString() ?? null,
    createdAt: note.createdAt.toISOString(),
  }
}

/**
 * Gets all visit notes written by a specific faculty member, optionally filtered by student.
 * Notes are PRIVATE — only the writing faculty can see them.
 */
export async function getVisitNotes(
  facultyId: string,
  studentId?: string,
): Promise<VisitNoteRecord[]> {
  const notes = await prisma.officeHoursVisitNote.findMany({
    where: {
      facultyId,
      ...(studentId ? { studentId } : {}),
    },
    include: {
      student: { select: { name: true } },
      course: { select: { courseCode: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return notes.map((note) => ({
    id: note.id,
    facultyId: note.facultyId,
    studentId: note.studentId,
    studentName: note.student.name,
    courseId: note.courseId,
    courseCode: note.course?.courseCode ?? null,
    content: note.content,
    followUpDate: note.followUpDate?.toISOString() ?? null,
    createdAt: note.createdAt.toISOString(),
  }))
}

/**
 * Deletes a visit note. Only the faculty who wrote it can delete it.
 */
export async function deleteVisitNote(
  facultyId: string,
  noteId: string,
): Promise<boolean> {
  const note = await prisma.officeHoursVisitNote.findFirst({
    where: { id: noteId, facultyId },
  })

  if (!note) return false

  await prisma.officeHoursVisitNote.delete({ where: { id: noteId } })
  return true
}

/**
 * Gets follow-up notes that are due for a faculty member.
 * These generate suggested tasks on the homepage.
 */
export async function getFollowUpsDue(facultyId: string): Promise<VisitNoteRecord[]> {
  const now = new Date()
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

  const notes = await prisma.officeHoursVisitNote.findMany({
    where: {
      facultyId,
      followUpDate: { lte: threeDaysFromNow },
    },
    include: {
      student: { select: { name: true } },
      course: { select: { courseCode: true } },
    },
    orderBy: { followUpDate: 'asc' },
    take: 10,
  })

  return notes.map((note) => ({
    id: note.id,
    facultyId: note.facultyId,
    studentId: note.studentId,
    studentName: note.student.name,
    courseId: note.courseId,
    courseCode: note.course?.courseCode ?? null,
    content: note.content,
    followUpDate: note.followUpDate?.toISOString() ?? null,
    createdAt: note.createdAt.toISOString(),
  }))
}
