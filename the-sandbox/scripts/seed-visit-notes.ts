/**
 * Seeds demo visit notes for the faculty homepage.
 * Run: npx tsx scripts/seed-visit-notes.ts
 */

import 'dotenv/config'
import { PrismaClient } from '../app/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString = process.env.DATABASE_URL!
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🗒️  Seeding office hours visit notes...')

  // Find Katie Thompson (EDUCATOR) and some students
  const katie = await prisma.user.findFirst({ where: { email: 'katie.thompson@uky.edu' } })
  if (!katie) {
    console.log('⚠️  Katie Thompson not found — skipping visit notes seed')
    return
  }

  // Find students enrolled in Katie's courses
  const katiesCourses = await prisma.course.findMany({
    where: { instructorId: katie.id },
    select: {
      id: true,
      courseCode: true,
      enrollments: {
        select: {
          student: { select: { id: true, name: true, email: true } },
        },
        take: 5,
      },
    },
  })

  if (katiesCourses.length === 0) {
    console.log('⚠️  No courses found for Katie — skipping')
    return
  }

  const course = katiesCourses[0]
  const students = course.enrollments.map((e) => e.student)

  if (students.length === 0) {
    console.log('⚠️  No students enrolled — skipping')
    return
  }

  // Delete existing visit notes for Katie
  await prisma.officeHoursVisitNote.deleteMany({
    where: { facultyId: katie.id },
  })

  const notes = [
    {
      studentIdx: 0,
      content: 'Discussed Module 4 confusion around API design patterns. Recommended extra practice with Case Study Analyzer tool. Student seemed engaged but frustrated with the pace.',
      daysAgo: 15,
      followUpDays: null,
    },
    {
      studentIdx: 0,
      content: 'Follow-up on Module 4. Student completed extra practice sessions. Grade improving on recent quizzes. Will check in again next week.',
      daysAgo: 8,
      followUpDays: 5,
    },
    {
      studentIdx: 1,
      content: 'Student mentioned difficulty balancing coursework with part-time job. Discussed time management strategies and pointed to Study Buddy for structured study sessions.',
      daysAgo: 10,
      followUpDays: null,
    },
    {
      studentIdx: Math.min(2, students.length - 1),
      content: 'Excellent progress on final project proposal. Strong analytical writing. Recommended for TA role next semester.',
      daysAgo: 5,
      followUpDays: null,
    },
    {
      studentIdx: Math.min(3, students.length - 1),
      content: 'Missed 3 classes due to illness. Provided extension on Assignment 5.1. Need to check if makeup work is completed by end of week.',
      daysAgo: 3,
      followUpDays: 2,
    },
  ]

  for (const note of notes) {
    const student = students[Math.min(note.studentIdx, students.length - 1)]
    const createdAt = new Date(Date.now() - note.daysAgo * 24 * 60 * 60 * 1000)
    const followUpDate = note.followUpDays
      ? new Date(Date.now() + note.followUpDays * 24 * 60 * 60 * 1000)
      : null

    await prisma.officeHoursVisitNote.create({
      data: {
        facultyId: katie.id,
        studentId: student.id,
        courseId: course.id,
        content: note.content,
        followUpDate,
        createdAt,
      },
    })

    console.log(`  ✓ Note for ${student.name} (${note.daysAgo}d ago)`)
  }

  const count = await prisma.officeHoursVisitNote.count({
    where: { facultyId: katie.id },
  })
  console.log(`\n✅ Seeded ${count} visit notes for Katie Thompson`)
}

main()
  .catch((error) => {
    console.error('Seed failed:', error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
