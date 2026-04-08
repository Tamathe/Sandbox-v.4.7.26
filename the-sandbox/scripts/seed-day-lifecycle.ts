// Seed script for Day Lifecycle demo data
// Run: npx tsx scripts/seed-day-lifecycle.ts

import 'dotenv/config'
import { prisma } from '../app/lib/prisma'

async function main() {
  console.log('Seeding Day Lifecycle demo data...')

  // Find Katie Thompson (EDUCATOR)
  const katie = await prisma.user.findUnique({ where: { email: 'katie.thompson@uky.edu' } })
  if (!katie) {
    console.error('Katie Thompson not found — run main seed first')
    process.exit(1)
  }

  // Find her course
  const course = await prisma.course.findFirst({ where: { instructorId: katie.id } })
  if (!course) {
    console.error('No course found for Katie — run main seed first')
    process.exit(1)
  }

  // 1. Seed teaching reflections
  const reflections = [
    {
      facultyId: katie.id,
      courseId: course.id,
      date: new Date('2026-03-24T16:30:00-04:00'),
      content: 'Module 5 discussion went well. Students were engaged with the case study on algorithmic bias. A few struggled with the statistical concepts — might need a review session.',
      tags: ['engagement', 'success'],
      topicsCovered: 'Algorithmic bias, fairness metrics',
    },
    {
      facultyId: katie.id,
      courseId: course.id,
      date: new Date('2026-03-21T16:00:00-04:00'),
      content: 'Quiz 4 results lower than expected (class avg 68%). Need to revisit data normalization before moving to Module 6. Several students confused about z-scores.',
      tags: ['confusion', 'adjustment'],
      topicsCovered: 'Data normalization, z-scores',
      classAttendance: 38,
    },
    {
      facultyId: katie.id,
      courseId: course.id,
      date: new Date('2026-03-19T16:15:00-04:00'),
      content: 'Great energy in class today. James K. asked an excellent question about real-world applications that led to a productive 10-minute tangent. Will incorporate that example into future lectures.',
      tags: ['success', 'student-highlight'],
      topicsCovered: 'Machine learning applications in education',
      classAttendance: 42,
    },
  ]

  for (const reflection of reflections) {
    await prisma.teachingReflection.upsert({
      where: {
        id: `reflection-${reflection.date.toISOString().slice(0, 10)}`,
      },
      create: {
        id: `reflection-${reflection.date.toISOString().slice(0, 10)}`,
        ...reflection,
      },
      update: reflection,
    })
  }
  console.log(`  ✓ ${reflections.length} teaching reflections`)

  // 2. Seed completed Sandy async tasks (overnight results)
  const asyncTasks = [
    {
      id: 'sandy-task-sacscoc-narrative',
      userId: katie.id,
      prompt: 'Draft the SACSCOC outcome narrative from TEK-100 learning objectives',
      status: 'COMPLETED' as const,
      result: `# SACSCOC Outcome Narrative — TEK-100: Technology & Society

## Program Learning Outcome 2: Critical Analysis of Technological Systems

### Narrative

Students in TEK-100 demonstrate competency in critically analyzing technological systems through a scaffolded assignment sequence that moves from identification to evaluation. The course employs three primary assessment instruments:

1. **Case Study Analysis (30%)** — Students analyze real-world technology implementations, identifying stakeholders, power dynamics, and unintended consequences. Mean score: 82.4% (n=47, Fall 2025).

2. **AI Ethics Portfolio (25%)** — A semester-long collection of reflections on AI applications in education, healthcare, and criminal justice. Students demonstrate growth in ethical reasoning as measured by the AAC&U Ethical Reasoning VALUE Rubric. 78% of students achieved "Milestone 3" or above.

3. **Technology Impact Assessment (20%)** — Final project requiring students to evaluate a technology's societal impact using frameworks from the course. Peer review + faculty scoring. Mean: 79.1%.

### Evidence of Student Learning

- Assignment completion rate: 78%
- Tool session engagement: 65% of enrolled students used at least one AI-powered study tool
- 3 students identified as at-risk were successfully supported through office hours interventions

### Continuous Improvement

Based on Fall 2025 data, the following adjustments were made for Spring 2026:
- Added scaffolding for statistical concepts in Module 5 (responding to quiz performance data)
- Introduced peer review for the Technology Impact Assessment
- Increased office hours availability during midterm period`,
      resultType: 'document',
      queuedAt: new Date('2026-03-24T22:00:00-04:00'),
      startedAt: new Date('2026-03-24T22:05:00-04:00'),
      completedAt: new Date('2026-03-24T22:08:00-04:00'),
    },
    {
      id: 'sandy-task-engagement-summary',
      userId: katie.id,
      prompt: 'Summarize this week\'s student engagement across all my courses',
      status: 'COMPLETED' as const,
      result: `# Weekly Engagement Summary — March 18-24, 2026

## TEK-100: Technology & Society

| Metric | This Week | Last Week | Delta |
|--------|-----------|-----------|-------|
| Active students | 38/47 (81%) | 35/47 (74%) | +7% |
| Tool sessions | 24 | 18 | +33% |
| Assignment submissions | 42/47 | 40/47 | +4% |
| Office hours visits | 5 | 3 | +67% |

### Highlights
- **James K.** moved from at-risk to on-track after office hours session on Monday
- Quiz 6 average: 72% (below usual 78% — consider review session)
- Module 6 materials accessed by 28 students within 24 hours of posting

### Concerns
- **Alice Chen** — 14 days inactive, no submissions since Module 4
- **Javier Martinez** — Grade trending down (B+ → C+), missed last 2 classes
- 2 students haven't accessed Module 5 materials yet

### Recommendations
1. Send targeted nudge to Alice Chen and Javier Martinez
2. Schedule review session for Module 5 statistical concepts before Quiz 7
3. Post Module 7 materials early to maintain momentum`,
      resultType: 'summary',
      queuedAt: new Date('2026-03-24T21:30:00-04:00'),
      startedAt: new Date('2026-03-24T21:35:00-04:00'),
      completedAt: new Date('2026-03-24T21:37:00-04:00'),
    },
  ]

  for (const task of asyncTasks) {
    await prisma.sandyAsyncTask.upsert({
      where: { id: task.id },
      create: task,
      update: {
        prompt: task.prompt,
        status: task.status,
        result: task.result,
        resultType: task.resultType,
        completedAt: task.completedAt,
      },
    })
  }
  console.log(`  ✓ ${asyncTasks.length} completed Sandy async tasks`)

  console.log('Done!')
}

main()
  .catch(console.error)
  .finally(() => process.exit(0))
