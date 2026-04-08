/**
 * seed-demo.ts — Synthetic data seed for the University of Kentucky platform demo mode.
 *
 * Generates 100 realistic students across 5 colleges, enrolls them in existing
 * courses, creates 28 days of ToolSession history with at-risk/star/average
 * distributions, computes StudentProfiles, and seeds MetricEvents.
 *
 * All synthetic users use @sandbox.demo emails for easy identification & cleanup.
 *
 * Usage:
 *   npx tsx prisma/seed-demo.ts          # standalone
 *   npm run seed:demo                    # via package.json script
 */

import { PrismaClient, UserRole } from '../app/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import * as dotenv from 'dotenv'

dotenv.config()

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

// ─── Name pools ────────────────────────────────────────────────────────────
const FIRST_NAMES = [
  'Aiden', 'Amara', 'Benjamin', 'Brianna', 'Carlos', 'Chloe', 'Daniel', 'Diana',
  'Elijah', 'Elena', 'Fatima', 'Felix', 'Grace', 'Gabriel', 'Hannah', 'Hassan',
  'Isabella', 'Isaac', 'Jade', 'James', 'Kayla', 'Kevin', 'Layla', 'Liam',
  'Maria', 'Mason', 'Nadia', 'Nathan', 'Olivia', 'Omar', 'Priya', 'Patrick',
  'Quinn', 'Rafael', 'Riley', 'Rosa', 'Samuel', 'Sofia', 'Tara', 'Thomas',
  'Uma', 'Victor', 'Wendy', 'Xavier', 'Yuki', 'Zara', 'Andre', 'Bianca',
  'Cameron', 'Destiny', 'Ethan', 'Fiona', 'George', 'Hailey', 'Ivan', 'Jasmine',
  'Kai', 'Luna', 'Marcus', 'Nina', 'Oscar', 'Paige', 'Quincy', 'Rachel',
  'Sean', 'Tanya', 'Ulrich', 'Valentina', 'Wesley', 'Xena', 'Yolanda', 'Zeke',
  'Aaliyah', 'Blake', 'Celeste', 'Derek', 'Emery', 'Freya', 'Gavin', 'Heather',
  'Iris', 'Jordan', 'Kenji', 'Lily', 'Miles', 'Noelle', 'Owen', 'Penelope',
  'Reed', 'Simone', 'Tyler', 'Ursula', 'Vivian', 'Warren', 'Xiomara', 'Yara',
  'Zion', 'Aria', 'Bryce', 'Daphne',
]

const LAST_NAMES = [
  'Anderson', 'Bautista', 'Chen', 'Diaz', 'Evans', 'Fernandez', 'Gutierrez',
  'Hayashi', 'Ibrahim', 'Jackson', 'Kim', 'Lopez', 'Martinez', 'Nguyen',
  'Okafor', 'Patel', 'Quinn', 'Robinson', 'Singh', 'Thompson', 'Uribe',
  'Vargas', 'Williams', 'Xiong', 'Yamamoto', 'Zhang', 'Alvarez', 'Brown',
  'Campbell', 'Davis', 'Edwards', 'Foster', 'Garcia', 'Harris', 'Ivanov',
  'Johnson', 'Khan', 'Lee', 'Moore', 'Nelson', 'Ortiz', 'Park', 'Ramirez',
  'Smith', 'Taylor', 'Ueda', 'Vega', 'Walker', 'Xu', 'Young', 'Zhao',
  'Adams', 'Bell', 'Chang', 'Doyle', 'Espinoza', 'Fischer', 'Gonzalez',
  'Herrera', 'Ito', 'Jones', 'Klein', 'Liu', 'Murphy', 'Nakamura', 'Owens',
  'Phillips', 'Reyes', 'Santos', 'Turner', 'Uddin', 'Vasquez', 'White',
  'Yang', 'Zimmerman', 'Archer', 'Burke', 'Cruz', 'Dunn', 'Ellis', 'Franklin',
  'Gomez', 'Howard', 'Iqbal', 'James', 'King', 'Lambert', 'Mitchell', 'Noble',
  'Palmer', 'Reed', 'Shah', 'Thomas', 'Valdez', 'Wang', 'Yates', 'Zamora',
  'Bennett', 'Clark', 'Dolan', 'Flynn',
]

// ─── College definitions ───────────────────────────────────────────────────
interface CollegeDef {
  name: string
  department: string
  count: number
  program: string
  concepts: string[]
}

const COLLEGES: CollegeDef[] = [
  {
    name: 'College of Engineering',
    department: 'Electrical & Computer Engineering',
    count: 25,
    program: 'ECE-BS',
    concepts: ['circuit analysis', 'signal processing', 'embedded systems', 'VHDL', 'control theory',
      'digital logic', 'microcontrollers', 'power systems', 'PCB design', 'electromagnetics'],
  },
  {
    name: 'J. David Rosenberg College of Law',
    department: 'J. David Rosenberg College of Law',
    count: 20,
    program: 'LAW-JD',
    concepts: ['civil procedure', 'constitutional law', 'contracts', 'torts', 'evidence',
      'legal writing', 'professional responsibility', 'criminal law', 'property law', 'statutory interpretation'],
  },
  {
    name: 'College of Nursing',
    department: 'College of Nursing',
    count: 20,
    program: 'NUR-BSN',
    concepts: ['patient assessment', 'pharmacology', 'pathophysiology', 'clinical judgment', 'vital signs',
      'medication administration', 'care planning', 'infection control', 'wound management', 'patient education'],
  },
  {
    name: 'Gatton College of Business and Economics',
    department: 'Finance',
    count: 20,
    program: 'FIN-BS',
    concepts: ['financial analysis', 'valuation', 'portfolio theory', 'risk management', 'derivatives',
      'corporate finance', 'market microstructure', 'behavioral finance', 'accounting principles', 'econometrics'],
  },
  {
    name: 'College of Education',
    department: 'Educational Technology',
    count: 15,
    program: 'EDT-MS',
    concepts: ['instructional design', 'learning theory', 'assessment design', 'curriculum mapping',
      'educational technology', 'differentiated instruction', 'formative assessment', 'Bloom taxonomy',
      'universal design', 'rubric development'],
  },
]

// ─── Course-college affinity map ───────────────────────────────────────────
// Maps college names to course codes that make sense for those students
const COLLEGE_COURSE_AFFINITY: Record<string, string[]> = {
  'College of Engineering': ['TEK-100', 'CS-215'],
  'J. David Rosenberg College of Law': ['TEK-100'],
  'College of Nursing': ['TEK-100', 'BIO-201'],
  'Gatton College of Business and Economics': ['TEK-100', 'CS-215'],
  'College of Education': ['TEK-100'],
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Normal distribution via Box-Muller transform */
function normalRandom(mean: number, stddev: number): number {
  const u1 = Math.random()
  const u2 = Math.random()
  const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2)
  return mean + z * stddev
}

/** Clamp a number between min and max */
function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

/** Pick N random items from an array */
function pickRandom<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, n)
}

/** Map a score to a quality signal string */
function scoreToQuality(score: number): string {
  if (score >= 0.80) return 'strong'
  if (score >= 0.60) return 'partial'
  if (score >= 0.40) return 'minimal'
  return 'incomplete'
}

/** Generate a relative timestamp N days ago with random hour */
function daysAgo(days: number, hourRange?: [number, number]): Date {
  const [minH, maxH] = hourRange ?? [8, 22]
  const hour = Math.floor(Math.random() * (maxH - minH)) + minH
  const minute = Math.floor(Math.random() * 60)
  return new Date(Date.now() - days * 86400000 + hour * 3600000 + minute * 60000)
}

// ─── Main seed function ────────────────────────────────────────────────────

export async function seedDemoData(): Promise<void> {
  console.log('🎭 Starting demo data seed...\n')

  // ── Step 1: Fetch existing courses and tools ──────────────────────────
  console.log('  Fetching existing courses and tools...')
  const courses = await prisma.course.findMany({ select: { id: true, courseCode: true } })
  const tools = await prisma.tool.findMany({
    where: { published: true },
    select: { id: true, name: true },
  })

  if (courses.length === 0) {
    console.error('  ❌ No courses found. Run `npm run db:seed` first.')
    return
  }
  if (tools.length === 0) {
    console.error('  ❌ No tools found. Run `npm run db:seed` first.')
    return
  }

  console.log(`  Found ${courses.length} courses, ${tools.length} tools.\n`)

  const courseMap = new Map(courses.map(c => [c.courseCode, c.id]))
  const toolIds = tools.map(t => t.id)

  // ── Step 2: Create 100 synthetic students ─────────────────────────────
  console.log('  Creating 100 demo students...')

  interface DemoStudent {
    id: string
    email: string
    college: string
    concepts: string[]
    archetype: 'at-risk' | 'star' | 'average'
  }

  const demoStudents: DemoStudent[] = []
  let studentIdx = 0

  for (const college of COLLEGES) {
    for (let i = 0; i < college.count; i++) {
      studentIdx++
      const email = `demo.student.${studentIdx}@sandbox.demo`
      const firstName = FIRST_NAMES[(studentIdx - 1) % FIRST_NAMES.length]
      const lastName = LAST_NAMES[(studentIdx - 1) % LAST_NAMES.length]

      const user = await prisma.user.upsert({
        where: { email },
        update: {
          name: `${firstName} ${lastName}`,
          role: UserRole.STUDENT,
          college: college.name,
          department: college.department,
          personalContext: `${college.program} student in ${college.department}. Interested in ${pickRandom(college.concepts, 3).join(', ')}.`,
        },
        create: {
          name: `${firstName} ${lastName}`,
          email,
          role: UserRole.STUDENT,
          college: college.name,
          department: college.department,
          personalContext: `${college.program} student in ${college.department}. Interested in ${pickRandom(college.concepts, 3).join(', ')}.`,
          sisStudentId: `S${String(900 + studentIdx).padStart(6, '0')}`,
          program: college.program,
          catalogYear: '2025-2026',
          studyGroup: Math.random() < 0.5 ? 'treatment' : 'control',
        },
      })

      // Determine archetype — we'll assign after collecting all students
      demoStudents.push({
        id: user.id,
        email,
        college: college.name,
        concepts: college.concepts,
        archetype: 'average', // placeholder, assigned below
      })
    }
  }

  // Assign archetypes: ~12 star students, ~30 at-risk (5-8 per course), rest average
  const starIndices = new Set(pickRandom([...Array(100).keys()], 12))
  const atRiskIndices = new Set<number>()
  // Distribute at-risk across colleges (roughly 5-8 per course)
  let offset = 0
  for (const college of COLLEGES) {
    const atRiskCount = Math.floor(Math.random() * 4) + 5 // 5-8
    const collegeIndices = Array.from({ length: college.count }, (_, i) => offset + i)
      .filter(i => !starIndices.has(i))
    const chosen = pickRandom(collegeIndices, Math.min(atRiskCount, collegeIndices.length))
    chosen.forEach(i => atRiskIndices.add(i))
    offset += college.count
  }

  demoStudents.forEach((s, i) => {
    if (starIndices.has(i)) s.archetype = 'star'
    else if (atRiskIndices.has(i)) s.archetype = 'at-risk'
  })

  console.log(`  ✅ 100 students created (${starIndices.size} star, ${atRiskIndices.size} at-risk, ${100 - starIndices.size - atRiskIndices.size} average)\n`)

  // ── Step 3: Enroll students in courses ────────────────────────────────
  console.log('  Enrolling students in courses...')

  const enrollmentData: { studentId: string; courseId: string }[] = []

  for (const student of demoStudents) {
    const affinityCodes = COLLEGE_COURSE_AFFINITY[student.college] ?? ['TEK-100']
    for (const code of affinityCodes) {
      const cid = courseMap.get(code)
      if (cid) {
        enrollmentData.push({ studentId: student.id, courseId: cid })
      }
    }
  }

  // Upsert enrollments (idempotent)
  let enrollCount = 0
  for (const e of enrollmentData) {
    await prisma.courseEnrollment.upsert({
      where: {
        studentId_courseId: { studentId: e.studentId, courseId: e.courseId },
      },
      update: {},
      create: {
        studentId: e.studentId,
        courseId: e.courseId,
      },
    })
    enrollCount++
  }

  console.log(`  ✅ ${enrollCount} enrollments created\n`)

  // ── Step 4: Generate ToolSessions ─────────────────────────────────────
  console.log('  Generating tool sessions (this may take a moment)...')

  interface SessionRow {
    toolId: string
    userId: string
    courseId: string | null
    startedAt: Date
    endedAt: Date
    messageCount: number
    score: number
    qualitySignal: string
    durationSeconds: number
    exitReason: string
    conceptsTouched: string[]
    bloomLevel: number
    cognitiveLoad: number
    frustrationScore: number
    hintCount: number
    status: string
  }

  const allSessions: SessionRow[] = []
  let totalSessionCount = 0

  for (const student of demoStudents) {
    // Determine session count based on archetype
    let sessionCount: number
    switch (student.archetype) {
      case 'star':
        sessionCount = Math.floor(Math.random() * 6) + 15 // 15-20
        break
      case 'at-risk':
        sessionCount = Math.floor(Math.random() * 5) + 8 // 8-12
        break
      default:
        sessionCount = Math.floor(Math.random() * 8) + 10 // 10-17
    }

    // Get the student's enrolled courses
    const studentCourseIds = enrollmentData
      .filter(e => e.studentId === student.id)
      .map(e => e.courseId)

    // Distribute sessions across the past 28 days
    for (let s = 0; s < sessionCount; s++) {
      let dayOffset: number
      let score: number
      let exitReason: string
      let bloomLevel: number
      let frustrationScore: number
      let cognitiveLoad: number

      switch (student.archetype) {
        case 'star':
          // Daily engagement, high scores
          dayOffset = Math.floor(s * (28 / sessionCount)) + Math.floor(Math.random() * 2)
          score = clamp(normalRandom(0.88, 0.06), 0.75, 1.0)
          exitReason = 'completed'
          bloomLevel = Math.floor(Math.random() * 3) + 4 // 4-6
          frustrationScore = clamp(normalRandom(0.1, 0.05), 0, 0.3)
          cognitiveLoad = clamp(normalRandom(0.5, 0.15), 0.2, 0.8)
          break

        case 'at-risk':
          // Clustered early with gaps, declining scores
          dayOffset = Math.random() < 0.6
            ? Math.floor(Math.random() * 14) + 14 // older sessions (14-28 days ago)
            : Math.floor(Math.random() * 7) // a few recent
          // Declining: earlier sessions score higher
          const declineFactor = dayOffset / 28
          score = clamp(normalRandom(0.45 + declineFactor * 0.2, 0.12), 0.1, 0.75)
          exitReason = Math.random() < 0.4 ? 'abandoned' : (Math.random() < 0.3 ? 'timeout' : 'completed')
          bloomLevel = Math.floor(Math.random() * 3) + 1 // 1-3
          frustrationScore = clamp(normalRandom(0.6, 0.15), 0.2, 1.0)
          cognitiveLoad = clamp(normalRandom(0.7, 0.15), 0.3, 1.0)
          break

        default: // average
          dayOffset = Math.floor(Math.random() * 28)
          score = clamp(normalRandom(0.72, 0.15), 0.2, 0.95)
          exitReason = Math.random() < 0.1 ? 'abandoned' : 'completed'
          bloomLevel = Math.floor(Math.random() * 4) + 2 // 2-5
          frustrationScore = clamp(normalRandom(0.3, 0.15), 0, 0.7)
          cognitiveLoad = clamp(normalRandom(0.5, 0.2), 0.1, 0.9)
      }

      const startedAt = daysAgo(dayOffset)
      const durationMinutes = Math.floor(Math.random() * 17) + 8 // 8-25 min
      const durationSeconds = durationMinutes * 60 + Math.floor(Math.random() * 60)
      const endedAt = new Date(startedAt.getTime() + durationSeconds * 1000)
      const messageCount = Math.floor(Math.random() * 26) + 5 // 5-30
      const conceptCount = Math.floor(Math.random() * 4) + 2 // 2-5
      const conceptsTouched = pickRandom(student.concepts, conceptCount)
      const hintCount = student.archetype === 'at-risk'
        ? Math.floor(Math.random() * 6) + 2
        : Math.floor(Math.random() * 4)

      const courseId = studentCourseIds.length > 0
        ? studentCourseIds[Math.floor(Math.random() * studentCourseIds.length)]
        : null

      allSessions.push({
        toolId: toolIds[Math.floor(Math.random() * toolIds.length)],
        userId: student.id,
        courseId,
        startedAt,
        endedAt,
        messageCount,
        score: Math.round(score * 100) / 100,
        qualitySignal: scoreToQuality(score),
        durationSeconds,
        exitReason,
        conceptsTouched,
        bloomLevel,
        cognitiveLoad: Math.round(cognitiveLoad * 100) / 100,
        frustrationScore: Math.round(frustrationScore * 100) / 100,
        hintCount,
        status: 'completed',
      })
      totalSessionCount++
    }
  }

  // Batch create sessions
  const BATCH_SIZE = 200
  const createdSessionIds: string[] = []
  for (let i = 0; i < allSessions.length; i += BATCH_SIZE) {
    const batch = allSessions.slice(i, i + BATCH_SIZE)
    // createMany doesn't return ids, so we use individual creates for id tracking
    // But for performance, use createMany and query back
    await prisma.toolSession.createMany({ data: batch })
  }

  // Query back the IDs of sessions we just created (for MetricEvents)
  const createdSessions = await prisma.toolSession.findMany({
    where: { user: { email: { endsWith: '@sandbox.demo' } } },
    select: { id: true, score: true, durationSeconds: true, toolId: true },
  })

  console.log(`  ✅ ${totalSessionCount} tool sessions created\n`)

  // ── Step 5: Generate StudentProfiles ──────────────────────────────────
  console.log('  Computing student profiles...')

  for (const student of demoStudents) {
    const studentSessions = allSessions.filter(s => s.userId === student.id)
    if (studentSessions.length === 0) continue

    const scores = studentSessions.filter(s => s.score != null).map(s => s.score)
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length
    const durations = studentSessions.filter(s => s.durationSeconds != null).map(s => s.durationSeconds)
    const avgDuration = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)

    // Learning velocity: trend of scores over time
    const sortedByTime = [...studentSessions].sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime())
    const firstHalfScores = sortedByTime.slice(0, Math.ceil(sortedByTime.length / 2)).map(s => s.score)
    const secondHalfScores = sortedByTime.slice(Math.ceil(sortedByTime.length / 2)).map(s => s.score)
    const firstAvg = firstHalfScores.reduce((a, b) => a + b, 0) / firstHalfScores.length
    const secondAvg = secondHalfScores.length > 0
      ? secondHalfScores.reduce((a, b) => a + b, 0) / secondHalfScores.length
      : firstAvg
    const learningVelocity = Math.round((secondAvg - firstAvg) * 100) / 100

    // Risk score
    let riskScore: number
    switch (student.archetype) {
      case 'star':
        riskScore = clamp(normalRandom(0.1, 0.05), 0, 0.2)
        break
      case 'at-risk':
        riskScore = clamp(normalRandom(0.75, 0.1), 0.6, 0.95)
        break
      default:
        riskScore = clamp(normalRandom(0.35, 0.15), 0.1, 0.6)
    }

    // Peak engagement hour
    const hours = studentSessions.map(s => s.startedAt.getHours())
    const hourCounts: Record<number, number> = {}
    hours.forEach(h => { hourCounts[h] = (hourCounts[h] ?? 0) + 1 })
    const peakHour = Number(Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0][0])

    // Top concepts this week (last 7 days)
    const oneWeekAgo = Date.now() - 7 * 86400000
    const recentConcepts = studentSessions
      .filter(s => s.startedAt.getTime() > oneWeekAgo)
      .flatMap(s => s.conceptsTouched)
    const conceptCounts: Record<string, number> = {}
    recentConcepts.forEach(c => { conceptCounts[c] = (conceptCounts[c] ?? 0) + 1 })
    const topConcepts = Object.entries(conceptCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([c]) => c)

    const lastSession = sortedByTime[sortedByTime.length - 1]
    const modalities = ['visual', 'reading', 'kinesthetic', 'auditory']
    const preferredModality = modalities[Math.floor(Math.random() * modalities.length)]

    // Bloom level aggregation
    const bloomLevels = studentSessions.map(s => s.bloomLevel)
    const dominantBloom = Math.round(bloomLevels.reduce((a, b) => a + b, 0) / bloomLevels.length)
    const cogLoads = studentSessions.map(s => s.cognitiveLoad)
    const avgCogLoad = Math.round((cogLoads.reduce((a, b) => a + b, 0) / cogLoads.length) * 100) / 100

    await prisma.studentProfile.upsert({
      where: { userId: student.id },
      update: {
        riskScore: Math.round(riskScore * 100) / 100,
        riskUpdatedAt: new Date(),
        learningVelocity,
        preferredModality,
        avgSessionLength: avgDuration,
        peakEngagementHour: peakHour,
        topConceptsThisWeek: topConcepts,
        totalSessionCount: studentSessions.length,
        lastSessionAt: lastSession.endedAt,
        dominantBloomLevel: dominantBloom,
        avgCognitiveLoad: avgCogLoad,
      },
      create: {
        userId: student.id,
        riskScore: Math.round(riskScore * 100) / 100,
        riskUpdatedAt: new Date(),
        learningVelocity,
        preferredModality,
        avgSessionLength: avgDuration,
        peakEngagementHour: peakHour,
        topConceptsThisWeek: topConcepts,
        totalSessionCount: studentSessions.length,
        lastSessionAt: lastSession.endedAt,
        dominantBloomLevel: dominantBloom,
        avgCognitiveLoad: avgCogLoad,
      },
    })
  }

  console.log('  ✅ 100 student profiles computed\n')

  // ── Step 6: Generate MetricEvents ─────────────────────────────────────
  console.log('  Generating metric events...')

  const metricEvents: { toolId: string; sessionId: string; metricName: string; metricValue: string; createdAt: Date }[] = []

  for (const session of createdSessions) {
    if (session.score != null) {
      metricEvents.push({
        toolId: session.toolId,
        sessionId: session.id,
        metricName: 'score',
        metricValue: String(session.score),
        createdAt: new Date(),
      })
    }
    if (session.durationSeconds != null) {
      metricEvents.push({
        toolId: session.toolId,
        sessionId: session.id,
        metricName: 'engagement_duration',
        metricValue: String(session.durationSeconds),
        createdAt: new Date(),
      })
    }
  }

  for (let i = 0; i < metricEvents.length; i += BATCH_SIZE) {
    await prisma.metricEvent.createMany({ data: metricEvents.slice(i, i + BATCH_SIZE) })
  }

  console.log(`  ✅ ${metricEvents.length} metric events created\n`)

  // ── Step 7: Enrich TEK-100 demo course with weeks, assignments, enrollments ──
  console.log('  Enriching TEK-100 demo course for demo beats...')

  const DEMO_COURSE_ID = 'demo-tek-100-course'

  // Verify TEK-100 exists (created by seed.ts)
  const tek100Course = await prisma.course.findUnique({ where: { id: DEMO_COURSE_ID } })
  if (!tek100Course) {
    console.error('  ❌ TEK-100 course not found. Run seed.ts first.')
  } else {

    // ── Step 7a: Create 12 weeks of content ─────────────────────────
    console.log('  Creating 12 course weeks...')

    const WEEK_TITLES = [
      'Introduction to EdTech',
      'Learning Theory & AI',
      'Instructional Design Fundamentals',
      'AI-Powered Assessment',
      'Student Engagement Analytics',
      'Adaptive Learning Systems',
      'Multimedia & Interactive Content',
      'Data-Driven Instruction',
      'Accessibility & Universal Design',
      'AI Ethics in Education',
      'Capstone Project Workshop',
      'Final Presentations & Reflection',
    ]

    // Delete existing weeks for idempotency, then recreate
    await prisma.courseWeek.deleteMany({ where: { courseId: DEMO_COURSE_ID } })

    const semesterStart = new Date('2026-01-12') // Spring 2026 start
    const weekRecords: { id: string; weekNumber: number }[] = []

    for (let w = 0; w < 12; w++) {
      const weekStart = new Date(semesterStart.getTime() + w * 7 * 86400000)
      const weekEnd = new Date(weekStart.getTime() + 6 * 86400000)
      const week = await prisma.courseWeek.create({
        data: {
          courseId: DEMO_COURSE_ID,
          weekNumber: w + 1,
          title: `Week ${w + 1}: ${WEEK_TITLES[w]}`,
          topic: WEEK_TITLES[w],
          startDate: weekStart,
          endDate: weekEnd,
          orderIndex: w,
        },
      })
      weekRecords.push({ id: week.id, weekNumber: w + 1 })
    }

    console.log('  ✅ 12 course weeks created\n')

    // ── Step 7b: Create 8 assignments across weeks ──────────────────
    console.log('  Creating 8 assignments...')

    // Delete existing assignments for this course for idempotency
    await prisma.assignment.deleteMany({ where: { courseId: DEMO_COURSE_ID } })

    const ASSIGNMENTS = [
      { weekIdx: 0, title: 'EdTech Landscape Analysis', category: 'homework', points: 50, type: 'LEGACY_SUBMISSION' as const },
      { weekIdx: 1, title: 'Learning Theory Reflection', category: 'discussion', points: 25, type: 'LEGACY_SUBMISSION' as const },
      { weekIdx: 2, title: 'Instructional Design Blueprint', category: 'project', points: 100, type: 'LEGACY_SUBMISSION' as const },
      { weekIdx: 3, title: 'AI Assessment Tool Practice', category: 'quiz', points: 40, type: 'AI_EXPERIENCE' as const },
      { weekIdx: 5, title: 'Adaptive Learning Module Review', category: 'homework', points: 60, type: 'AI_EXPERIENCE' as const },
      { weekIdx: 7, title: 'Data-Driven Instruction Report', category: 'paper', points: 80, type: 'LEGACY_SUBMISSION' as const },
      { weekIdx: 9, title: 'AI Ethics Case Study', category: 'discussion', points: 50, type: 'AI_EXPERIENCE' as const },
      { weekIdx: 11, title: 'Capstone Final Presentation', category: 'presentation', points: 150, type: 'LEGACY_SUBMISSION' as const },
    ]

    const assignmentTypeEnum = { LEGACY_SUBMISSION: 'LEGACY_SUBMISSION', AI_EXPERIENCE: 'AI_EXPERIENCE' } as const

    for (const a of ASSIGNMENTS) {
      const week = weekRecords[a.weekIdx]
      const dueDate = new Date(semesterStart.getTime() + (a.weekIdx + 1) * 7 * 86400000 - 86400000) // Friday of that week
      dueDate.setHours(23, 59, 0, 0)

      await prisma.assignment.create({
        data: {
          courseId: DEMO_COURSE_ID,
          weekId: week.id,
          title: a.title,
          description: `Complete the ${a.title.toLowerCase()} for Week ${week.weekNumber}.`,
          type: assignmentTypeEnum[a.type],
          dueAt: dueDate,
          pointsPossible: a.points,
          category: a.category,
          isPublished: true,
          // For AI_EXPERIENCE assignments, link a random tool
          ...(a.type === 'AI_EXPERIENCE' && toolIds.length > 0
            ? { toolId: toolIds[Math.floor(Math.random() * toolIds.length)] }
            : {}),
        },
      })
    }

    console.log('  ✅ 8 assignments created\n')

    // ── Step 7c: Enroll 25 demo students in TEK-100 ────────────────
    console.log('  Enrolling students in TEK-100...')

    // Pick 25 students (first 15 from Education + 10 from other colleges)
    const educationStudents = demoStudents.filter(s => s.college === 'College of Education')
    const otherStudents = demoStudents.filter(s => s.college !== 'College of Education')
    const tek100Students = [
      ...educationStudents,
      ...pickRandom(otherStudents, 10),
    ]

    let tek100EnrollCount = 0
    for (const student of tek100Students) {
      await prisma.courseEnrollment.upsert({
        where: {
          studentId_courseId: { studentId: student.id, courseId: DEMO_COURSE_ID },
        },
        update: {},
        create: {
          studentId: student.id,
          courseId: DEMO_COURSE_ID,
        },
      })
      tek100EnrollCount++
    }

    console.log(`  ✅ ${tek100EnrollCount} students enrolled in TEK-100\n`)

    // ── Step 7d: Generate ToolSessions for TEK-100 students ─────────
    console.log('  Generating TEK-100 tool sessions...')

    const tek100Sessions: SessionRow[] = []

    // Identify at-risk students for TEK-100 (at least 3 with clear declining patterns)
    const tek100AtRisk = tek100Students.filter(s => s.archetype === 'at-risk').slice(0, 5)
    const tek100AtRiskIds = new Set(tek100AtRisk.map(s => s.id))

    // Identify 2 students for rich learning profiles
    const tek100RichProfile = tek100Students.filter(s => s.archetype === 'star').slice(0, 2)
    const tek100RichIds = new Set(tek100RichProfile.map(s => s.id))

    const edtechConcepts = [
      'instructional design', 'learning theory', 'assessment design', 'curriculum mapping',
      'educational technology', 'differentiated instruction', 'formative assessment', 'Bloom taxonomy',
      'universal design', 'rubric development', 'AI in education', 'learning analytics',
    ]

    for (const student of tek100Students) {
      const isAtRisk = tek100AtRiskIds.has(student.id)
      const isRich = tek100RichIds.has(student.id)

      // Session count: rich profile students get more sessions
      let sessionCount: number
      if (isRich) {
        sessionCount = Math.floor(Math.random() * 5) + 20 // 20-24
      } else if (isAtRisk) {
        sessionCount = Math.floor(Math.random() * 4) + 6 // 6-9
      } else {
        sessionCount = Math.floor(Math.random() * 6) + 10 // 10-15
      }

      for (let s = 0; s < sessionCount; s++) {
        let dayOffset: number
        let score: number
        let exitReason: string
        let bloomLevel: number
        let frustrationScore: number
        let cognitiveLoad: number

        if (isAtRisk) {
          // At-risk: declining scores, session gaps (cluster early, gap in middle)
          if (s < sessionCount * 0.6) {
            dayOffset = Math.floor(Math.random() * 10) + 18 // 18-27 days ago
          } else {
            dayOffset = Math.floor(Math.random() * 2) // 0-1 days ago (recent return)
          }
          // Clear declining trend: early sessions ~65%, recent ~30%
          const progress = s / sessionCount
          score = clamp(normalRandom(0.65 - progress * 0.35, 0.08), 0.1, 0.7)
          exitReason = Math.random() < 0.45 ? 'abandoned' : (Math.random() < 0.3 ? 'timeout' : 'completed')
          bloomLevel = Math.floor(Math.random() * 2) + 1 // 1-2
          frustrationScore = clamp(normalRandom(0.65, 0.12), 0.3, 1.0)
          cognitiveLoad = clamp(normalRandom(0.75, 0.1), 0.4, 1.0)
        } else if (isRich) {
          // Rich profile: consistent engagement, improving scores, varied concepts
          dayOffset = Math.floor(s * (28 / sessionCount))
          const progress = s / sessionCount
          score = clamp(normalRandom(0.7 + progress * 0.2, 0.05), 0.65, 1.0)
          exitReason = 'completed'
          bloomLevel = Math.min(6, Math.floor(Math.random() * 2) + 3 + Math.floor(progress * 2)) // 3→6 over time
          frustrationScore = clamp(normalRandom(0.1, 0.05), 0, 0.25)
          cognitiveLoad = clamp(normalRandom(0.45, 0.1), 0.2, 0.7)
        } else {
          // Average student
          dayOffset = Math.floor(Math.random() * 28)
          score = clamp(normalRandom(0.70, 0.12), 0.3, 0.95)
          exitReason = Math.random() < 0.08 ? 'abandoned' : 'completed'
          bloomLevel = Math.floor(Math.random() * 3) + 2 // 2-4
          frustrationScore = clamp(normalRandom(0.25, 0.12), 0, 0.6)
          cognitiveLoad = clamp(normalRandom(0.5, 0.15), 0.15, 0.85)
        }

        const startedAt = daysAgo(dayOffset)
        const durationMinutes = Math.floor(Math.random() * 20) + 8
        const durationSeconds = durationMinutes * 60 + Math.floor(Math.random() * 60)
        const endedAt = new Date(startedAt.getTime() + durationSeconds * 1000)
        const messageCount = Math.floor(Math.random() * 20) + 5
        const conceptCount = isRich ? Math.floor(Math.random() * 3) + 3 : Math.floor(Math.random() * 3) + 2
        const conceptsTouched = pickRandom(edtechConcepts, conceptCount)
        const hintCount = isAtRisk
          ? Math.floor(Math.random() * 5) + 3
          : Math.floor(Math.random() * 3)

        tek100Sessions.push({
          toolId: toolIds[Math.floor(Math.random() * toolIds.length)],
          userId: student.id,
          courseId: DEMO_COURSE_ID,
          startedAt,
          endedAt,
          messageCount,
          score: Math.round(score * 100) / 100,
          qualitySignal: scoreToQuality(score),
          durationSeconds,
          exitReason,
          conceptsTouched,
          bloomLevel,
          cognitiveLoad: Math.round(cognitiveLoad * 100) / 100,
          frustrationScore: Math.round(frustrationScore * 100) / 100,
          hintCount,
          status: 'completed',
        })
      }
    }

    // Batch create TEK-100 sessions
    for (let i = 0; i < tek100Sessions.length; i += BATCH_SIZE) {
      await prisma.toolSession.createMany({ data: tek100Sessions.slice(i, i + BATCH_SIZE) })
    }

    console.log(`  ✅ ${tek100Sessions.length} TEK-100 tool sessions created\n`)

    // ── Step 7e: Create ConceptMastery + DomainModality for rich-profile students ──
    console.log('  Creating concept mastery & domain modality data for rich profiles...')

    for (const student of tek100RichProfile) {
      // ConceptMastery: 6-8 concepts with varying mastery levels
      const masteredConcepts = pickRandom(edtechConcepts, Math.floor(Math.random() * 3) + 6)
      for (let c = 0; c < masteredConcepts.length; c++) {
        const concept = masteredConcepts[c]
        const encounters = Math.floor(Math.random() * 10) + 5
        const successes = Math.floor(encounters * (0.6 + Math.random() * 0.35))
        const fails = encounters - successes
        const mastery = Math.round((successes / encounters) * 100) / 100

        await prisma.studentConceptMastery.upsert({
          where: {
            userId_concept: { userId: student.id, concept },
          },
          update: {
            encounterCount: encounters,
            successCount: successes,
            failCount: fails,
            masteryLevel: mastery,
            coursesEncountered: ['TEK-100'],
          },
          create: {
            userId: student.id,
            concept,
            encounterCount: encounters,
            successCount: successes,
            failCount: fails,
            masteryLevel: mastery,
            coursesEncountered: ['TEK-100'],
            firstCourseId: DEMO_COURSE_ID,
            firstSeenAt: daysAgo(Math.floor(Math.random() * 20) + 7),
          },
        })
      }

      // DomainModality: 3 domain preferences
      const domains = ['educational technology', 'assessment', 'instructional design']
      const modalities = ['visual', 'reading', 'kinesthetic', 'auditory']
      for (const domain of domains) {
        const preferred = modalities[Math.floor(Math.random() * modalities.length)]
        const scores: Record<string, number> = {}
        modalities.forEach(m => {
          scores[m] = m === preferred
            ? Math.round((0.6 + Math.random() * 0.3) * 100) / 100
            : Math.round((Math.random() * 0.4) * 100) / 100
        })

        await prisma.studentDomainModality.upsert({
          where: {
            userId_domain: { userId: student.id, domain },
          },
          update: {
            preferredModality: preferred,
            confidenceScore: Math.round((0.7 + Math.random() * 0.25) * 100) / 100,
            sessionCount: Math.floor(Math.random() * 10) + 8,
            modalityScores: scores,
          },
          create: {
            userId: student.id,
            domain,
            preferredModality: preferred,
            confidenceScore: Math.round((0.7 + Math.random() * 0.25) * 100) / 100,
            sessionCount: Math.floor(Math.random() * 10) + 8,
            modalityScores: scores,
          },
        })
      }
    }

    console.log(`  ✅ Concept mastery & domain modality data created for ${tek100RichProfile.length} students\n`)
  }

  console.log('🎉 Demo data seed complete!')
  console.log(`   ${demoStudents.length} students | ${enrollCount} enrollments | ${totalSessionCount} sessions | ${metricEvents.length} metrics\n`)
}

// ─── Cleanup function ──────────────────────────────────────────────────────

export async function cleanDemoData(): Promise<void> {
  console.log('🧹 Cleaning demo data...\n')

  // Find all demo users
  const demoUsers = await prisma.user.findMany({
    where: { email: { endsWith: '@sandbox.demo' } },
    select: { id: true },
  })
  const userIds = demoUsers.map(u => u.id)

  if (userIds.length === 0) {
    console.log('  No demo data found.\n')
    return
  }

  // Clean TEK-100 demo enrichment data (course itself is owned by seed.ts, not deleted here)
  const DEMO_COURSE_ID = 'demo-tek-100-course'
  const tek100Exists = await prisma.course.findUnique({ where: { id: DEMO_COURSE_ID }, select: { id: true } })
  if (tek100Exists) {
    await prisma.assignment.deleteMany({ where: { courseId: DEMO_COURSE_ID } })
    await prisma.courseWeek.deleteMany({ where: { courseId: DEMO_COURSE_ID } })
    await prisma.courseEnrollment.deleteMany({ where: { courseId: DEMO_COURSE_ID } })
    // TEK-100 sessions are deleted below with all demo user sessions
    console.log('  Deleted TEK-100 demo enrichment data (weeks, assignments, enrollments)')
  }

  // Delete in dependency order (most-dependent first)
  // Get session IDs for demo users to delete their metric events
  const demoSessions = await prisma.toolSession.findMany({
    where: { userId: { in: userIds } },
    select: { id: true },
  })
  const sessionIds = demoSessions.map(s => s.id)

  const metricDel = await prisma.metricEvent.deleteMany({
    where: { sessionId: { in: sessionIds } },
  })
  console.log(`  Deleted ${metricDel.count} metric events`)

  const sessionDel = await prisma.toolSession.deleteMany({
    where: { userId: { in: userIds } },
  })
  console.log(`  Deleted ${sessionDel.count} tool sessions`)

  const profileDel = await prisma.studentProfile.deleteMany({
    where: { userId: { in: userIds } },
  })
  console.log(`  Deleted ${profileDel.count} student profiles`)

  const conceptDel = await prisma.studentConceptMastery.deleteMany({
    where: { userId: { in: userIds } },
  })
  console.log(`  Deleted ${conceptDel.count} concept mastery records`)

  const modalityDel = await prisma.studentDomainModality.deleteMany({
    where: { userId: { in: userIds } },
  })
  console.log(`  Deleted ${modalityDel.count} domain modality records`)

  const enrollDel = await prisma.courseEnrollment.deleteMany({
    where: { studentId: { in: userIds } },
  })
  console.log(`  Deleted ${enrollDel.count} enrollments`)

  // Note: TEK-100 course itself is NOT deleted here — it's owned by seed.ts

  const userDel = await prisma.user.deleteMany({
    where: { id: { in: userIds } },
  })
  console.log(`  Deleted ${userDel.count} demo users`)

  console.log('\n🧹 Demo data cleanup complete!\n')
}

// ─── Standalone runner ─────────────────────────────────────────────────────

if (require.main === module) {
  const arg = process.argv[2]
  const fn = arg === '--clean' ? cleanDemoData : seedDemoData
  fn()
    .catch(e => {
      console.error(e)
      process.exit(1)
    })
    .finally(() => prisma.$disconnect())
}
