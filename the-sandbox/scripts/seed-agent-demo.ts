/**
 * seed-agent-demo.ts — Demo data seed for Sandy Universal Agent beats.
 *
 * Ensures all 5 demo beats have the data they need to work perfectly.
 * Idempotent: deletes existing assistant data for demo users, then recreates.
 *
 * Usage:
 *   npx tsx scripts/seed-agent-demo.ts
 *   npm run seed:agent-demo
 */

import 'dotenv/config'
import { PrismaClient } from '../app/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

// ─── Helpers ─────────────────────────────────────────────────

function today(hour: number, minute = 0): Date {
  const d = new Date()
  d.setHours(hour, minute, 0, 0)
  return d
}

function daysFromNow(days: number, hour = 17, minute = 0): Date {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(hour, minute, 0, 0)
  return d
}

function hoursAgo(h: number): Date {
  return new Date(Date.now() - h * 3_600_000)
}

// ─── Main ─────────────────────────────────────────────────────

async function main() {
  console.log('🔧 Seeding agent demo data...\n')

  // Lookup demo users
  const katie = await prisma.user.findUnique({ where: { email: 'katie.thompson@uky.edu' } })
  const tiana = await prisma.user.findUnique({ where: { email: 'tiana.the.student@uky.edu' } })
  const morgan = await prisma.user.findUnique({ where: { email: 'morgan.rivera@uky.edu' } })

  if (!katie || !tiana || !morgan) {
    console.error('❌ Demo users not found. Run main seed first.')
    process.exit(1)
  }

  const userIds = [katie.id, tiana.id, morgan.id]

  // Clear existing assistant data for idempotency
  console.log('  Clearing existing assistant data...')
  await Promise.all([
    prisma.assistantCalendarEvent.deleteMany({ where: { userId: { in: userIds } } }),
    prisma.assistantEmail.deleteMany({ where: { userId: { in: userIds } } }),
    prisma.assistantTask.deleteMany({ where: { userId: { in: userIds } } }),
  ])

  // Seed all demo beat data — at-risk students first, then Tiana (she's in TEK-100)
  await Promise.all([
    seedKatieCalendar(katie.id),
    seedKatieEmails(katie.id),
    seedKatieTasks(katie.id),
    seedKatieAtRiskStudents(katie.id, tiana.id),
    seedMorganCalendar(morgan.id),
    seedMorganTasks(morgan.id),
    seedMorganEmails(morgan.id),
    seedCampusNews(),
  ])
  // Tiana after at-risk so her profile isn't overwritten
  await seedTianaCourseData(tiana.id)

  console.log('\n✅ Agent demo data seeded successfully!')
  console.log('   Katie: 3 calendar events today, 7 emails (1 urgent), 5 tasks (2 overdue), 2 at-risk students')
  console.log('   Tiana: Constitutional Law enrollment, exam next Thursday, concept mastery data')
  console.log('   Morgan: 10am committee meeting, enrollment census deadline Friday, campus news')
}

// ─── Beat 1 & 2: Katie Calendar (3 events today) ────────────

async function seedKatieCalendar(userId: string) {
  const events = [
    // Today's events — the three that matter for Beat 1
    {
      title: 'Department Check-in',
      startTime: today(9, 0),
      endTime: today(9, 30),
      category: 'meeting',
      attendees: ['carol.chen@uky.edu'],
      location: 'Whitehall 210',
    },
    {
      title: 'TEK-100 Lecture — Module 7: Multi-Modal AI',
      startTime: today(14, 0),
      endTime: today(14, 50),
      category: 'lecture',
      attendees: [],
      location: 'Classroom Building 120',
    },
    {
      title: 'Curriculum Committee',
      startTime: today(15, 30),
      endTime: today(16, 30),
      category: 'admin',
      attendees: ['provost@uky.edu', 'carol.chen@uky.edu', 'morgan.rivera@uky.edu'],
      location: 'Main Building 305',
    },
    // Tomorrow — context for briefing
    {
      title: 'Office Hours',
      startTime: daysFromNow(1, 14, 0),
      endTime: daysFromNow(1, 15, 30),
      category: 'office-hours',
      attendees: [],
    },
    {
      title: '1:1 with TA (Jamie)',
      startTime: daysFromNow(1, 11, 0),
      endTime: daysFromNow(1, 11, 30),
      category: 'meeting',
      attendees: ['jamie.ortiz@uky.edu'],
    },
  ]

  await prisma.assistantCalendarEvent.createMany({
    data: events.map(e => ({
      userId,
      title: e.title,
      startTime: e.startTime,
      endTime: e.endTime,
      category: e.category,
      attendees: e.attendees,
      location: e.location ?? null,
      source: 'simulated',
      isAllDay: false,
    })),
  })
  console.log('  ✓ Katie: 3 calendar events today + 2 tomorrow')
}

// ─── Beat 1 & 2: Katie Emails (7 unread, 1 urgent/decision) ─

async function seedKatieEmails(userId: string) {
  const emails = [
    // URGENT: Dean email about curriculum proposal — Beat 2 trigger
    {
      fromAddress: 'dean@uky.edu',
      fromName: 'Dean Wilson',
      subject: 'Curriculum Proposal — Need Your Input by EOD',
      body: "Katie,\n\nI'm finalizing the curriculum proposal for the new AI Ethics minor. Before I submit to the Provost, I need your input on the credit hour structure -- specifically whether the capstone should be 3 or 4 credits.\n\nThe proposal includes your TEK-100 as a required prerequisite. Can you review Section 3 (attached) and send me your recommendation today? The Provost's office closes submissions Friday.\n\nThanks,\nDean Wilson",
      snippet: "I'm finalizing the curriculum proposal for the new AI Ethics minor...",
      category: 'decision',
      receivedAt: hoursAgo(1),
      isRead: false,
      isStarred: true,
    },
    // Student emails
    {
      fromAddress: 'tiana.the.student@uky.edu',
      fromName: 'Tiana The',
      subject: 'Module 4 Assignment — Extension Request',
      body: "Dear Dr. Thompson,\n\nI'm reaching out about the Module 4 Hallucination Hunt assignment due Friday. I've been working through the fact-checking exercises but finding the source verification challenging. Could I have a couple extra days?\n\nBest,\nTiana",
      snippet: "I'm reaching out about the Module 4 Hallucination Hunt assignment...",
      category: 'student',
      receivedAt: hoursAgo(3),
      isRead: false,
    },
    {
      fromAddress: 'marcus.johnson@uky.edu',
      fromName: 'Marcus Johnson',
      subject: 'Missed Class Today — Can I Get Notes?',
      body: "Dr. Thompson,\n\nI missed class today due to a family situation. Can I get the lecture notes or recording? I'll catch up before Thursday.\n\nThanks,\nMarcus",
      snippet: 'I missed class today due to a family situation...',
      category: 'student',
      receivedAt: hoursAgo(5),
      isRead: false,
    },
    // TA
    {
      fromAddress: 'jamie.ortiz@uky.edu',
      fromName: 'Jamie Ortiz',
      subject: 'Grading Rubric Question — Assignment 4',
      body: 'Hey Dr. Thompson,\n\nSeveral students used a different methodology than prescribed but got valid results. Full credit or dock points? Want to be consistent.\n\nThanks,\nJamie',
      snippet: 'Several students used a different methodology than prescribed...',
      category: 'department',
      receivedAt: hoursAgo(7),
      isRead: false,
    },
    // Department
    {
      fromAddress: 'carol.chen@uky.edu',
      fromName: 'Carol Chen',
      subject: 'Budget Request Deadline — March 28',
      body: 'Hi Katie,\n\nReminder that departmental budget requests for next fiscal year are due March 28. Submit through the portal if you need equipment, software licenses, or conference travel.\n\nBest,\nCarol',
      snippet: 'Budget requests for next fiscal year are due March 28...',
      category: 'admin',
      receivedAt: hoursAgo(20),
      isRead: false,
    },
    // External collaborator
    {
      fromAddress: 'dr.martinez@stanford.edu',
      fromName: 'Dr. Elena Martinez',
      subject: 'RE: Guest Lecture — AI Ethics in Education',
      body: 'Katie,\n\nApril 10th at 2pm via Zoom works. Could you send me a brief on your students\' background so I can calibrate the content?\n\nBest,\nElena',
      snippet: 'April 10th at 2pm via Zoom works...',
      category: 'external',
      receivedAt: hoursAgo(10),
      isRead: false,
    },
    // Newsletter (read)
    {
      fromAddress: 'newsletter@chronicle.com',
      fromName: 'Chronicle of Higher Education',
      subject: 'This Week: AI Reshaping Faculty Workloads',
      body: 'Top stories: AI reshaping workloads, student mental health crisis data, rethinking gen-ed requirements.',
      snippet: 'AI reshaping workloads, student mental health crisis...',
      category: 'newsletter',
      receivedAt: hoursAgo(26),
      isRead: false,
    },
  ]

  await prisma.assistantEmail.createMany({
    data: emails.map(e => ({
      userId,
      fromAddress: e.fromAddress,
      fromName: e.fromName,
      toAddresses: ['katie.thompson@uky.edu'],
      subject: e.subject,
      body: e.body,
      snippet: e.snippet,
      category: e.category,
      receivedAt: e.receivedAt,
      isRead: e.isRead ?? false,
      isStarred: e.isStarred ?? false,
      source: 'simulated',
    })),
  })
  console.log('  ✓ Katie: 7 emails (1 urgent/decision from Dean)')
}

// ─── Beat 1: Katie Tasks (5 total, 2 overdue) ───────────────

async function seedKatieTasks(userId: string) {
  const tasks = [
    // Overdue
    { title: 'Grade Module 3 submissions (8 pending)', dueAt: daysFromNow(-2), status: 'pending' },
    { title: 'Submit TEK-100 learning outcomes to assessment office', dueAt: daysFromNow(-1), status: 'pending' },
    // Upcoming
    { title: 'Review accreditation self-study materials', dueAt: daysFromNow(3), status: 'pending' },
    { title: 'Send Zoom link to Dr. Martinez for guest lecture', dueAt: daysFromNow(5), status: 'pending' },
    { title: 'Respond to curriculum committee nomination', dueAt: daysFromNow(12), status: 'pending' },
  ]

  await prisma.assistantTask.createMany({
    data: tasks.map(t => ({
      userId,
      title: t.title,
      dueAt: t.dueAt,
      status: t.status,
      source: 'sandy',
    })),
  })
  console.log('  ✓ Katie: 5 tasks (2 overdue)')
}

// ─── Beat 1 & 3: At-Risk Students in TEK-100 ────────────────

async function seedKatieAtRiskStudents(katieId: string, tianaId: string) {
  // Find Katie's TEK-100 course
  const tek100 = await prisma.course.findFirst({
    where: { instructorId: katieId, courseCode: { contains: 'TEK' } },
  })
  if (!tek100) {
    console.log('  ⚠ TEK-100 course not found — skipping at-risk student seeding')
    return
  }

  // Find enrolled students (skip Tiana — her profile is set separately)
  const enrollments = await prisma.courseEnrollment.findMany({
    where: { courseId: tek100.id, studentId: { not: tianaId } },
    include: { student: { select: { id: true, name: true, email: true } } },
    take: 10,
  })

  if (enrollments.length < 2) {
    console.log('  ⚠ Not enough enrolled students in TEK-100 — skipping at-risk seeding')
    return
  }

  // Student 1: 5+ days inactive (Marcus pattern)
  const student1 = enrollments[0].student
  await prisma.studentProfile.upsert({
    where: { userId: student1.id },
    update: {
      riskScore: 0.78,
      lastSessionAt: daysFromNow(-6, 10, 0),
      learningVelocity: -0.3,
      dominantBloomLevel: 1, // remember
      topConceptsThisWeek: [],
    },
    create: {
      userId: student1.id,
      riskScore: 0.78,
      lastSessionAt: daysFromNow(-6, 10, 0),
      learningVelocity: -0.3,
      dominantBloomLevel: 1, // remember
      topConceptsThisWeek: [],
      totalSessionCount: 4,
    },
  })

  // Student 2: Declining scores (Aisha pattern)
  const student2 = enrollments[1].student
  await prisma.studentProfile.upsert({
    where: { userId: student2.id },
    update: {
      riskScore: 0.65,
      lastSessionAt: daysFromNow(-1, 15, 0),
      learningVelocity: -0.15,
      dominantBloomLevel: 2, // understand
      topConceptsThisWeek: ['hallucination detection'],
    },
    create: {
      userId: student2.id,
      riskScore: 0.65,
      lastSessionAt: daysFromNow(-1, 15, 0),
      learningVelocity: -0.15,
      dominantBloomLevel: 2, // understand
      topConceptsThisWeek: ['hallucination detection'],
      totalSessionCount: 12,
    },
  })

  console.log(`  ✓ Katie: 2 at-risk students in TEK-100 (${student1.name}, ${student2.name})`)
}

// ─── Beat 4: Tiana — Constitutional Law, exam next Thursday ──

async function seedTianaCourseData(tianaId: string) {
  // Check if Tiana is enrolled in any law course; if not, find/create one
  const existingEnrollment = await prisma.courseEnrollment.findFirst({
    where: { studentId: tianaId },
    include: { course: true },
  })

  let courseId: string

  if (existingEnrollment) {
    courseId = existingEnrollment.courseId
  } else {
    // Find a law-related course or use any existing course
    const lawCourse = await prisma.course.findFirst({
      where: {
        OR: [
          { title: { contains: 'Law', mode: 'insensitive' } },
          { title: { contains: 'Constitutional', mode: 'insensitive' } },
          { courseCode: { contains: 'LAW', mode: 'insensitive' } },
        ],
      },
    })

    if (lawCourse) {
      courseId = lawCourse.id
      // Enroll Tiana
      await prisma.courseEnrollment.upsert({
        where: { studentId_courseId: { studentId: tianaId, courseId } },
        update: {},
        create: { courseId, studentId: tianaId },
      })
    } else {
      console.log('  ⚠ No law course found — skipping Tiana course data')
      return
    }
  }

  // Ensure Tiana has a student profile with clear strengths/weaknesses
  await prisma.studentProfile.upsert({
    where: { userId: tianaId },
    update: {
      riskScore: 0.2,
      learningVelocity: 0.4,
      dominantBloomLevel: 4, // analyze
      topConceptsThisWeek: ['due process', 'equal protection', 'judicial review'],
      lastSessionAt: daysFromNow(-1, 14, 0),
      totalSessionCount: 28,
    },
    create: {
      userId: tianaId,
      riskScore: 0.2,
      learningVelocity: 0.4,
      dominantBloomLevel: 4, // analyze
      topConceptsThisWeek: ['due process', 'equal protection', 'judicial review'],
      lastSessionAt: daysFromNow(-1, 14, 0),
      totalSessionCount: 28,
    },
  })

  // Seed Tiana's calendar with exam next Thursday
  await prisma.assistantCalendarEvent.createMany({
    data: [
      {
        userId: tianaId,
        title: 'Constitutional Law — Midterm Exam',
        startTime: daysFromNow(getNextThursday(), 10, 0),
        endTime: daysFromNow(getNextThursday(), 12, 0),
        category: 'exam',
        location: 'Law Building 201',
        attendees: [],
        source: 'simulated',
        isAllDay: false,
      },
      {
        userId: tianaId,
        title: 'Study Group — Con Law Review',
        startTime: daysFromNow(getNextThursday() - 1, 18, 0),
        endTime: daysFromNow(getNextThursday() - 1, 20, 0),
        category: 'personal',
        attendees: ['alex.chen@uky.edu', 'jordan.lee@uky.edu'],
        source: 'simulated',
        isAllDay: false,
      },
    ],
  })

  // Seed Tiana's tasks
  await prisma.assistantTask.createMany({
    data: [
      {
        userId: tianaId,
        title: 'Complete Con Law practice problems — Ch. 7-9',
        dueAt: daysFromNow(getNextThursday() - 2),
        status: 'pending',
        source: 'sandy',
      },
      {
        userId: tianaId,
        title: 'Review case briefs for midterm',
        dueAt: daysFromNow(getNextThursday() - 1),
        status: 'pending',
        source: 'sandy',
      },
    ],
  })

  console.log(`  ✓ Tiana: enrolled in course, exam next Thursday, concept mastery data`)
}

function getNextThursday(): number {
  const now = new Date()
  const day = now.getDay()
  // 4 = Thursday. Find days until next Thursday (minimum 4 days out)
  const daysUntil = ((4 - day + 7) % 7) || 7
  return daysUntil < 4 ? daysUntil + 7 : daysUntil
}

// ─── Beat 5: Morgan Calendar ─────────────────────────────────

async function seedMorganCalendar(userId: string) {
  const events = [
    {
      title: 'Curriculum Committee',
      startTime: today(10, 0),
      endTime: today(11, 0),
      category: 'admin',
      attendees: ['katie.thompson@uky.edu', 'provost@uky.edu', 'carol.chen@uky.edu'],
      location: 'Main Building 305',
    },
    {
      title: 'Budget Review — Q2 Actuals',
      startTime: today(13, 0),
      endTime: today(14, 0),
      category: 'meeting',
      attendees: ['finance.office@uky.edu'],
      location: 'Admin Building 210',
    },
    {
      title: "Director's Weekly Stand-up",
      startTime: today(15, 0),
      endTime: today(15, 30),
      category: 'meeting',
      attendees: ['associate.provost@uky.edu'],
    },
  ]

  await prisma.assistantCalendarEvent.createMany({
    data: events.map(e => ({
      userId,
      title: e.title,
      startTime: e.startTime,
      endTime: e.endTime,
      category: e.category,
      attendees: e.attendees,
      location: e.location ?? null,
      source: 'simulated',
      isAllDay: false,
    })),
  })
  console.log('  ✓ Morgan: 3 calendar events today (10am Curriculum Committee)')
}

// ─── Beat 5: Morgan Tasks ────────────────────────────────────

async function seedMorganTasks(userId: string) {
  const tasks = [
    { title: 'Submit enrollment census data — 3 departments outstanding', dueAt: daysFromNow(getDaysUntilFriday()), status: 'pending' },
    { title: 'Review committee minutes from last meeting', dueAt: daysFromNow(1), status: 'pending' },
    { title: 'Finalize spring commencement speaker list', dueAt: daysFromNow(7), status: 'pending' },
    { title: 'Send budget reconciliation to finance office', dueAt: daysFromNow(-1), status: 'pending' },
  ]

  await prisma.assistantTask.createMany({
    data: tasks.map(t => ({
      userId,
      title: t.title,
      dueAt: t.dueAt,
      status: t.status,
      source: 'sandy',
    })),
  })
  console.log('  ✓ Morgan: 4 tasks (enrollment census deadline Friday)')
}

function getDaysUntilFriday(): number {
  const day = new Date().getDay()
  const daysUntil = ((5 - day + 7) % 7) || 7
  return daysUntil
}

// ─── Beat 5: Morgan Emails ───────────────────────────────────

async function seedMorganEmails(userId: string) {
  const emails = [
    {
      fromAddress: 'associate.provost@uky.edu',
      fromName: 'Dr. James Barrett',
      subject: 'Enrollment Census Reminder — Friday Deadline',
      body: "Morgan,\n\nJust a reminder that the enrollment census data is due Friday. I show 3 departments haven't submitted yet (Engineering, Arts & Sciences, Education). Can you follow up?\n\nThanks,\nJames",
      snippet: 'Enrollment census data is due Friday. 3 departments outstanding...',
      category: 'urgent',
      receivedAt: hoursAgo(2),
      isRead: false,
    },
    {
      fromAddress: 'katie.thompson@uky.edu',
      fromName: 'Katie Thompson',
      subject: 'Curriculum Committee Agenda — Today',
      body: "Hi Morgan,\n\nHere are the items I'd like to add to today's agenda:\n1. AI Ethics minor proposal (Dean Wilson's initiative)\n2. Credit hour policy review for online courses\n3. TEK-100 prerequisite discussion\n\nSee you at 10.\n\nKatie",
      snippet: "Items for today's agenda: AI Ethics minor, credit hour policy...",
      category: 'department',
      receivedAt: hoursAgo(4),
      isRead: false,
    },
    {
      fromAddress: 'registrar@uky.edu',
      fromName: 'Office of the Registrar',
      subject: 'Spring Enrollment Summary — Preliminary',
      body: 'The preliminary spring enrollment numbers are in:\n- Total enrollment: 31,247 (+2.1% YoY)\n- First-time students: 4,892\n- Online enrollment: 8,341 (+15% YoY)\n\nFull report attached.',
      snippet: 'Preliminary spring enrollment: 31,247 (+2.1% YoY)...',
      category: 'admin',
      receivedAt: hoursAgo(8),
      isRead: false,
    },
  ]

  await prisma.assistantEmail.createMany({
    data: emails.map(e => ({
      userId,
      fromAddress: e.fromAddress,
      fromName: e.fromName,
      toAddresses: ['morgan.rivera@uky.edu'],
      subject: e.subject,
      body: e.body,
      snippet: e.snippet,
      category: e.category,
      receivedAt: e.receivedAt,
      isRead: e.isRead ?? false,
      source: 'simulated',
    })),
  })
  console.log('  ✓ Morgan: 3 emails (1 urgent about enrollment census)')
}

// ─── Campus News (UKNow articles for Beat 5) ─────────────────

async function seedCampusNews() {
  // Only seed if these specific demo articles don't exist yet
  const existing = await prisma.uKNowArticle.findFirst({
    where: { slug: 'spring-enrollment-record-2026' },
  })
  if (existing) {
    const count = await prisma.uKNowArticle.count()
    console.log(`  ✓ Campus news: ${count} articles already exist`)
    return
  }

  const articles = [
    {
      slug: 'spring-enrollment-record-2026',
      section: 'campus-news',
      sectionLabel: 'Campus News',
      url: 'https://uknow.uky.edu/campus-news/spring-enrollment-record-2026',
      title: 'UK Sets Spring Enrollment Record with 31,247 Students',
      author: 'UK Public Relations',
      publishedAt: daysFromNow(-2, 9, 0),
      summary: 'The University of Kentucky set a spring enrollment record with 31,247 students, a 2.1% increase year-over-year. Online enrollment grew 15%.',
    },
    {
      slug: 'ai-ethics-minor-proposal-2026',
      section: 'campus-news',
      sectionLabel: 'Campus News',
      url: 'https://uknow.uky.edu/campus-news/ai-ethics-minor-proposal-2026',
      title: 'Faculty Senate Considers New AI Ethics Minor',
      author: 'Academic Affairs',
      publishedAt: daysFromNow(-5, 10, 0),
      summary: 'A proposal for a new AI Ethics minor is under review by the Faculty Senate Curriculum Committee, with TEK-100 as a required prerequisite.',
    },
    {
      slug: 'commencement-speaker-announced-2026',
      section: 'campus-news',
      sectionLabel: 'Campus News',
      url: 'https://uknow.uky.edu/campus-news/commencement-speaker-2026',
      title: 'Spring 2026 Commencement Speaker Announced',
      author: 'UK Public Relations',
      publishedAt: daysFromNow(-7, 8, 0),
      summary: 'The University has announced the keynote speaker for the Spring 2026 commencement ceremony, scheduled for May 10.',
    },
  ]

  for (const a of articles) {
    await prisma.uKNowArticle.upsert({
      where: { slug: a.slug },
      update: {},
      create: {
        slug: a.slug,
        section: a.section,
        sectionLabel: a.sectionLabel,
        url: a.url,
        title: a.title,
        author: a.author,
        publishedAt: a.publishedAt,
        summary: a.summary,
        wordCount: 300,
      },
    })
  }
  console.log('  ✓ Campus news: 3 articles seeded')
}

// ─── Run ──────────────────────────────────────────────────────

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
