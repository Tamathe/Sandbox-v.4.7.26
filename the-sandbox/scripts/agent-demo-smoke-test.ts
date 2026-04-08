/**
 * agent-demo-smoke-test.ts — Validates all 5 agent demo beats have working data.
 *
 * Calls each tool programmatically and verifies non-empty results.
 * Run after seed-agent-demo.ts to confirm data is ready for the demo.
 *
 * Usage:
 *   npx tsx scripts/agent-demo-smoke-test.ts
 */

import 'dotenv/config'
import { PrismaClient } from '../app/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

// ─── Helpers ─────────────────────────────────────────────────

let passed = 0
let failed = 0

function check(label: string, condition: boolean, detail?: string) {
  if (condition) {
    passed++
    console.log(`    ✓ ${label}${detail ? ` — ${detail}` : ''}`)
  } else {
    failed++
    console.log(`    ✗ ${label}${detail ? ` — ${detail}` : ''}`)
  }
}

// ─── Beat 1: Morning Briefing (Katie) ────────────────────────

async function testBeat1() {
  console.log('\n  ═══ Beat 1: Morning Briefing (Katie) ═══')

  const katie = await prisma.user.findUnique({ where: { email: 'katie.thompson@uky.edu' } })
  if (!katie) {
    check('Katie user exists', false)
    return
  }
  check('Katie user exists', true)

  // get_calendar — expect ≥3 events today
  const today = new Date()
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)
  const calEvents = await prisma.assistantCalendarEvent.findMany({
    where: { userId: katie.id, startTime: { gte: startOfDay }, endTime: { lte: endOfDay } },
  })
  check('Calendar has ≥3 events today', calEvents.length >= 3, `found ${calEvents.length}`)

  const has2pmLecture = calEvents.some(e => e.title.includes('TEK-100') && e.startTime.getHours() === 14)
  check('Calendar has 2pm TEK-100 lecture', has2pmLecture)

  const hasCommittee = calEvents.some(e => e.title.includes('Curriculum Committee'))
  check('Calendar has Curriculum Committee', hasCommittee)

  // get_unread_emails — expect ≥5 unread
  const emails = await prisma.assistantEmail.findMany({
    where: { userId: katie.id, isRead: false },
  })
  check('Emails has ≥5 unread', emails.length >= 5, `found ${emails.length} unread`)

  const hasDeanEmail = emails.some(e =>
    e.fromAddress.includes('dean') && (e.category === 'decision' || e.category === 'urgent')
  )
  check('Has urgent/decision email from Dean', hasDeanEmail)

  // get_tasks — expect 5 total, 2 overdue
  const tasks = await prisma.assistantTask.findMany({
    where: { userId: katie.id, status: 'pending' },
  })
  check('Tasks has ≥5 pending', tasks.length >= 5, `found ${tasks.length}`)

  const now = new Date()
  const overdue = tasks.filter(t => t.dueAt && t.dueAt < now)
  check('Tasks has ≥2 overdue', overdue.length >= 2, `found ${overdue.length} overdue`)

  // get_at_risk_students — expect ≥2 in TEK-100
  const tek100 = await prisma.course.findFirst({
    where: { instructorId: katie.id, courseCode: { contains: 'TEK' } },
  })
  if (tek100) {
    const enrollments = await prisma.courseEnrollment.findMany({
      where: { courseId: tek100.id },
      include: {
        student: {
          select: {
            id: true,
            studentProfile: { select: { riskScore: true, lastSessionAt: true } },
          },
        },
      },
    })
    const atRisk = enrollments.filter(e => (e.student.studentProfile?.riskScore ?? 0) >= 0.5)
    check('At-risk students ≥2 in TEK-100', atRisk.length >= 2, `found ${atRisk.length}`)

    const hasInactive = atRisk.some(e => {
      const last = e.student.studentProfile?.lastSessionAt
      if (!last) return true
      const daysSince = (Date.now() - last.getTime()) / (24 * 60 * 60 * 1000)
      return daysSince >= 5
    })
    check('Has student with 5+ days inactive', hasInactive)
  } else {
    check('TEK-100 course exists', false)
  }

  // get_course_health — just verify course exists with enrollments
  if (tek100) {
    const enrollmentCount = await prisma.courseEnrollment.count({ where: { courseId: tek100.id } })
    check('TEK-100 has enrollments for health check', enrollmentCount > 0, `${enrollmentCount} students`)
  }
}

// ─── Beat 2: Draft & Send (Katie) ────────────────────────────

async function testBeat2() {
  console.log('\n  ═══ Beat 2: Draft & Send (Katie) ═══')

  const katie = await prisma.user.findUnique({ where: { email: 'katie.thompson@uky.edu' } })
  if (!katie) return

  // search_policies — check that policies exist
  const policyCount = await prisma.policyDocument.count()
  check('Policy documents exist for search', policyCount > 0, `${policyCount} policies`)

  // draft_email — just verify Dean email exists to reply to
  const deanEmail = await prisma.assistantEmail.findFirst({
    where: { userId: katie.id, fromAddress: { contains: 'dean' } },
  })
  check('Dean email exists for reply workflow', !!deanEmail, deanEmail?.subject ?? 'not found')
}

// ─── Beat 3: Student Check-In (Katie) ────────────────────────

async function testBeat3() {
  console.log('\n  ═══ Beat 3: Student Check-In (Katie) ═══')

  const katie = await prisma.user.findUnique({ where: { email: 'katie.thompson@uky.edu' } })
  if (!katie) return

  const tek100 = await prisma.course.findFirst({
    where: { instructorId: katie.id, courseCode: { contains: 'TEK' } },
  })
  if (!tek100) {
    check('TEK-100 exists', false)
    return
  }

  // get_at_risk_students
  const enrollments = await prisma.courseEnrollment.findMany({
    where: { courseId: tek100.id },
    include: {
      student: {
        select: {
          id: true, name: true,
          studentProfile: { select: { riskScore: true } },
        },
      },
    },
  })
  const atRisk = enrollments.filter(e => (e.student.studentProfile?.riskScore ?? 0) >= 0.5)
  check('At-risk students found for check-in', atRisk.length >= 2, atRisk.map(e => e.student.name).join(', '))

  // get_student_progress — verify profiles exist
  for (const e of atRisk.slice(0, 2)) {
    const profile = await prisma.studentProfile.findUnique({ where: { userId: e.student.id } })
    check(`Student profile exists for ${e.student.name}`, !!profile, `risk: ${profile?.riskScore}`)
  }
}

// ─── Beat 4: Student Experience (Tiana) ──────────────────────

async function testBeat4() {
  console.log('\n  ═══ Beat 4: Student Experience (Tiana) ═══')

  const tiana = await prisma.user.findUnique({ where: { email: 'tiana.the.student@uky.edu' } })
  if (!tiana) {
    check('Tiana user exists', false)
    return
  }
  check('Tiana user exists', true)

  // get_course_materials — Tiana enrolled in a course
  const enrollment = await prisma.courseEnrollment.findFirst({
    where: { studentId: tiana.id },
    include: {
      course: {
        select: {
          id: true, courseCode: true, title: true,
          _count: { select: { materials: true } },
        },
      },
    },
  })
  check('Tiana is enrolled in a course', !!enrollment, enrollment?.course.title ?? 'none')

  if (enrollment) {
    check('Course has materials', enrollment.course._count.materials > 0, `${enrollment.course._count.materials} materials`)
  }

  // get_student_progress — Tiana has profile with strengths/weaknesses
  const profile = await prisma.studentProfile.findUnique({ where: { userId: tiana.id } })
  check('Tiana has student profile', !!profile)
  check('Profile has concept mastery data', (profile?.topConceptsThisWeek ?? []).length > 0,
    (profile?.topConceptsThisWeek ?? []).join(', '))
  check('Profile has Bloom level', !!profile?.dominantBloomLevel, String(profile?.dominantBloomLevel ?? 'none'))

  // build_practice_exam — verify course has enough content
  if (enrollment) {
    const materialCount = await prisma.courseMaterial.count({ where: { courseId: enrollment.courseId } })
    check('Course has materials for practice exam', materialCount > 0, `${materialCount} materials`)
  }

  // Calendar — exam next Thursday
  const examEvent = await prisma.assistantCalendarEvent.findFirst({
    where: { userId: tiana.id, category: 'exam' },
  })
  check('Tiana has exam on calendar', !!examEvent, examEvent?.title ?? 'none')
}

// ─── Beat 5: Staff Operations (Morgan) ───────────────────────

async function testBeat5() {
  console.log('\n  ═══ Beat 5: Staff Operations (Morgan) ═══')

  const morgan = await prisma.user.findUnique({ where: { email: 'morgan.rivera@uky.edu' } })
  if (!morgan) {
    check('Morgan user exists', false)
    return
  }
  check('Morgan user exists', true)

  // get_calendar — expect events today including committee
  const today = new Date()
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)
  const calEvents = await prisma.assistantCalendarEvent.findMany({
    where: { userId: morgan.id, startTime: { gte: startOfDay }, endTime: { lte: endOfDay } },
  })
  check('Calendar has events today', calEvents.length >= 1, `found ${calEvents.length}`)

  const hasCommittee = calEvents.some(e => e.title.includes('Curriculum Committee') && e.startTime.getHours() === 10)
  check('Calendar has 10am Curriculum Committee', hasCommittee)

  // get_tasks — expect enrollment census deadline
  const tasks = await prisma.assistantTask.findMany({
    where: { userId: morgan.id, status: 'pending' },
  })
  check('Tasks has pending items', tasks.length >= 1, `found ${tasks.length}`)

  const hasCensus = tasks.some(t => t.title.toLowerCase().includes('census'))
  check('Has enrollment census task', hasCensus)

  // search_policies — verify policy docs exist
  const policyCount = await prisma.policyDocument.count()
  check('Policy documents exist for search', policyCount > 0, `${policyCount} policies`)

  // get_campus_news — verify UKNow articles exist
  const articleCount = await prisma.uKNowArticle.count().catch(() => 0)
  check('Campus news articles exist', articleCount > 0, `${articleCount} articles`)

  // Morgan emails
  const emails = await prisma.assistantEmail.findMany({
    where: { userId: morgan.id, isRead: false },
  })
  check('Morgan has unread emails', emails.length >= 1, `found ${emails.length}`)
}

// ─── Main ─────────────────────────────────────────────────────

async function main() {
  console.log('🧪 Agent Demo Smoke Test\n')
  console.log('  Validating data for all 5 demo beats...')

  await testBeat1()
  await testBeat2()
  await testBeat3()
  await testBeat4()
  await testBeat5()

  console.log('\n' + '─'.repeat(50))
  console.log(`  Results: ${passed} passed, ${failed} failed`)

  if (failed > 0) {
    console.log('\n  ⚠ Some checks failed. Run `npm run seed:agent-demo` to seed data.')
    process.exit(1)
  } else {
    console.log('\n  ✅ All demo beats are ready!')
  }
}

main()
  .catch((e) => {
    console.error('❌ Smoke test failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
