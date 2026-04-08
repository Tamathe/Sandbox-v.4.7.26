import { PrismaClient } from '../app/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import * as dotenv from 'dotenv'
dotenv.config()

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

/**
 * Seeds 14 days of wellness entries for tiana.the.student@uky.edu
 * with realistic patterns:
 * - Mood dips Tuesday/Wednesday (heavy class load)
 * - Sleep < 6 hours twice (pre-midterm)
 * - Habit streaks break on weekends
 * - Symptom journal: stress + headache correlation
 */
export async function seedWellnessData() {
  const student = await prisma.user.findUnique({
    where: { email: 'tiana.the.student@uky.edu' },
  })
  if (!student) {
    console.log('Student user not found — skipping wellness seed')
    return
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Generate 14 days of dates (today minus 13 days to today)
  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (13 - i))
    return d
  })

  const dayInsights: Record<number, string> = {
    6: 'Your mood tends to dip mid-week, correlating with your heaviest class days. Consider scheduling a 10-minute break between your Tuesday classes.',
    13: 'Over the past two weeks, headaches appeared 3 times — each time after nights with less than 6 hours of sleep. Prioritizing sleep before heavy class days may help.',
  }

  for (let i = 0; i < 14; i++) {
    const date = dates[i]
    const dayOfWeek = date.getDay() // 0=Sun, 1=Mon, ...
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    const isMidweek = dayOfWeek === 2 || dayOfWeek === 3 // Tue/Wed
    const isPreMidterm = i === 4 || i === 9 // Two specific days

    // ── Mindfulness ─────────────────────────────────────────────────────
    const mood = isMidweek ? 4 + Math.floor(Math.random() * 2) : isWeekend ? 7 + Math.floor(Math.random() * 2) : 6 + Math.floor(Math.random() * 2)
    const energy = isMidweek ? 3 + Math.floor(Math.random() * 2) : isWeekend ? 7 + Math.floor(Math.random() * 2) : 5 + Math.floor(Math.random() * 2)
    const exerciseOptions = ['None', 'Light walk', 'Moderate', 'Intense workout']
    const exercise = isWeekend ? exerciseOptions[2 + Math.floor(Math.random() * 2)] : isMidweek ? exerciseOptions[0] : exerciseOptions[1]

    await prisma.wellnessEntry.upsert({
      where: { userId_toolSlug_date: { userId: student.id, toolSlug: 'mindfulness', date } },
      update: { data: { mood, energy, exercise, notes: '' } },
      create: {
        userId: student.id,
        toolSlug: 'mindfulness',
        date,
        data: { mood, energy, exercise, notes: '' },
        aiInsight: dayInsights[i] && i <= 6 ? dayInsights[i] : null,
      },
    })

    // ── Habits ───────────────────────────────────────────────────────────
    const habitNames = ['Exercise', 'Read 30 min', 'Drink 8 glasses water', 'Review notes', 'Meditate']
    const habits = habitNames.map(name => ({
      name,
      completed: isWeekend
        ? Math.random() > 0.6 // Break streaks on weekends
        : Math.random() > 0.2, // Generally good on weekdays
    }))

    await prisma.wellnessEntry.upsert({
      where: { userId_toolSlug_date: { userId: student.id, toolSlug: 'habits', date } },
      update: { data: { habits, notes: '' } },
      create: {
        userId: student.id,
        toolSlug: 'habits',
        date,
        data: { habits, notes: '' },
      },
    })

    // ── Sleep ────────────────────────────────────────────────────────────
    const hoursSlept = isPreMidterm ? 4.5 + Math.random() : isWeekend ? 8 + Math.random() * 1.5 : 6.5 + Math.random() * 1.5
    const qualityMap: Record<string, string> = {}
    const quality = hoursSlept < 6 ? 'Poor' : hoursSlept < 7 ? 'Fair' : hoursSlept < 8 ? 'Good' : 'Great'
    void qualityMap // unused, quality derived directly

    await prisma.wellnessEntry.upsert({
      where: { userId_toolSlug_date: { userId: student.id, toolSlug: 'sleep', date } },
      update: { data: { hoursSlept: Math.round(hoursSlept * 2) / 2, quality, bedtime: isPreMidterm ? '02:00' : '23:30', wakeTime: '07:30', notes: '' } },
      create: {
        userId: student.id,
        toolSlug: 'sleep',
        date,
        data: {
          hoursSlept: Math.round(hoursSlept * 2) / 2,
          quality,
          bedtime: isPreMidterm ? '02:00' : isWeekend ? '00:30' : '23:30',
          wakeTime: isWeekend ? '09:00' : '07:30',
          notes: isPreMidterm ? 'Studying for midterm' : '',
        },
      },
    })

    // ── Symptom Journal ──────────────────────────────────────────────────
    const hasSymptoms = isMidweek || isPreMidterm
    if (hasSymptoms) {
      const symptoms = isPreMidterm ? ['Headache', 'Fatigue', 'Anxiety'] : ['Fatigue', 'Brain fog']
      const triggers = isPreMidterm ? ['Stress', 'Poor sleep'] : ['Stress', 'Screen time']
      const severity = isPreMidterm ? 7 + Math.floor(Math.random() * 2) : 4 + Math.floor(Math.random() * 2)

      await prisma.wellnessEntry.upsert({
        where: { userId_toolSlug_date: { userId: student.id, toolSlug: 'journal', date } },
        update: { data: { symptoms, severity, triggers, notes: '' } },
        create: {
          userId: student.id,
          toolSlug: 'journal',
          date,
          data: { symptoms, severity, triggers, notes: '' },
          aiInsight: i === 13 ? dayInsights[13] : null,
        },
      })
    }
  }

  console.log('✅ Seeded 14 days of wellness entries for tiana.the.student@uky.edu')
}

// Allow direct execution
if (require.main === module) {
  seedWellnessData()
    .then(() => prisma.$disconnect())
    .catch(e => { console.error(e); prisma.$disconnect(); process.exit(1) })
}
