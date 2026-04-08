/**
 * Seed script: Course Communication & Announcements
 *
 * Creates 5 sample course posts for TEK-100 (owned by Katie Thompson)
 * with various types, audiences, and read states.
 *
 * Usage: npx tsx scripts/seed-course-posts.ts
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config()
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../app/generated/prisma'

const connectionString = process.env.DATABASE_URL!
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Seeding course posts...')

  // Look up Katie (educator) and Tiana (student)
  const katie = await prisma.user.findUnique({ where: { email: 'katie.thompson@uky.edu' } })
  const tiana = await prisma.user.findUnique({ where: { email: 'tiana.the.student@uky.edu' } })

  if (!katie) {
    console.error('Katie Thompson not found — run main seed first')
    process.exit(1)
  }

  // Find Katie's course
  const course = await prisma.course.findFirst({
    where: { instructorId: katie.id },
    select: { id: true, courseCode: true },
  })

  if (!course) {
    console.error('No course found for Katie — run main seed first')
    process.exit(1)
  }

  console.log(`Found course ${course.courseCode} (${course.id})`)

  // Clean up existing course posts for this course
  await prisma.coursePostRead.deleteMany({
    where: { post: { courseId: course.id } },
  })
  await prisma.coursePost.deleteMany({
    where: { courseId: course.id },
  })

  const now = new Date()
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000)

  // Create 5 sample posts
  const posts = await Promise.all([
    prisma.coursePost.create({
      data: {
        courseId: course.id,
        authorId: katie.id,
        title: 'Module 5 Review Resources Posted',
        body: 'I\'ve uploaded additional resources for Module 5 including practice problems and a concept summary sheet. These should help with the upcoming quiz. Check the Materials tab for the full list.',
        type: 'RESOURCE',
        audience: 'ALL',
        channelPlatform: true,
        publishedAt: hoursAgo(2),
        createdAt: hoursAgo(2),
      },
    }),
    prisma.coursePost.create({
      data: {
        courseId: course.id,
        authorId: katie.id,
        title: 'Assignment 6.2 Due Friday',
        body: 'Reminder: Assignment 6.2 (Technology Ethics Case Study) is due this Friday at 11:59 PM. Make sure to cite at least 3 sources. Late submissions will lose 10% per day.',
        type: 'REMINDER',
        audience: 'ALL',
        channelPlatform: true,
        channelEmail: true,
        publishedAt: hoursAgo(18),
        createdAt: hoursAgo(18),
      },
    }),
    prisma.coursePost.create({
      data: {
        courseId: course.id,
        authorId: katie.id,
        title: 'Extra Office Hours This Week',
        body: 'I\'m adding extra office hours on Wednesday 3:00-4:30 PM and Thursday 10:00-11:00 AM this week. Several of you have had questions about the case study format — happy to walk through examples.',
        type: 'ANNOUNCEMENT',
        audience: 'ALL',
        channelPlatform: true,
        publishedAt: hoursAgo(48),
        createdAt: hoursAgo(48),
      },
    }),
    prisma.coursePost.create({
      data: {
        courseId: course.id,
        authorId: katie.id,
        body: 'Hey, I noticed your recent quiz scores in Module 5 have dipped. I\'d love to help — can you come by office hours today (2:00-3:30 PM)? We can work through the case study together.',
        type: 'NUDGE',
        audience: 'SPECIFIC',
        targetStudentIds: tiana ? [tiana.id] : [],
        channelPlatform: true,
        sandyGenerated: true,
        sandyPrompt: 'Send nudge to student with grade drop in Module 5',
        publishedAt: hoursAgo(6),
        createdAt: hoursAgo(6),
      },
    }),
    prisma.coursePost.create({
      data: {
        courseId: course.id,
        authorId: katie.id,
        body: 'I see Module 5 was challenging for several of you. I\'ve posted additional review materials and will cover the key concepts again in Thursday\'s class. Don\'t hesitate to reach out if you need help.',
        type: 'ANNOUNCEMENT',
        audience: 'AT_RISK',
        channelPlatform: true,
        publishedAt: hoursAgo(24),
        createdAt: hoursAgo(24),
      },
    }),
  ])

  console.log(`Created ${posts.length} course posts`)

  // Mark some as read by Tiana
  if (tiana) {
    await prisma.coursePostRead.createMany({
      data: [
        { postId: posts[2].id, userId: tiana.id }, // Extra office hours — read
        { postId: posts[1].id, userId: tiana.id }, // Assignment reminder — read
      ],
    })
    console.log('Marked 2 posts as read by Tiana')
  }

  console.log('Course posts seeded successfully!')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
