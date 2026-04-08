import type { TimelineEvent, StakeItem } from '../student-home-data'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ScheduleGap {
  startTime: string          // "10:15" — end of previous event
  endTime: string            // "13:00" — start of next event
  durationMinutes: number
  previousEvent: TimelineEvent | null
  nextEvent: TimelineEvent
  walkingMinutesToNext: number
}

export interface GapActivity {
  type: 'study' | 'meal' | 'walk' | 'review' | 'break'
  label: string
  sublabel: string
  durationMinutes: number
  icon: string               // lucide-react icon name
  actionHref?: string        // Optional link
  actionType?: 'flashcard-review' | 'sandy-message'
}

export interface GapPlan {
  gap: ScheduleGap
  activities: GapActivity[]
  bufferMinutes: number
}

// ─── Meal Windows ───────────────────────────────────────────────────────────

interface MealWindow {
  name: string
  start: number  // minutes from midnight
  end: number
  label: string
}

const MEAL_WINDOWS: MealWindow[] = [
  { name: 'breakfast', start: 7 * 60, end: 10 * 60, label: 'Quick breakfast' },
  { name: 'lunch', start: 11 * 60, end: 14 * 60, label: 'Grab lunch' },
  { name: 'dinner', start: 17 * 60, end: 20 * 60, label: 'Grab dinner' },
]

// ─── Nearby Dining (heuristic) ──────────────────────────────────────────────

function getNearestDining(location?: string): string {
  if (!location) return 'Nearby dining'
  const loc = location.toLowerCase()
  if (loc.includes('white hall') || loc.includes('student center')) return 'Blazer Dining nearby'
  if (loc.includes('law') || loc.includes('grehan')) return 'Champions Kitchen nearby'
  if (loc.includes('funkhouser') || loc.includes('library')) return 'Ovid\'s Cafe nearby'
  return 'Nearby dining'
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function overlapsWindow(gapStart: number, gapEnd: number, window: MealWindow): boolean {
  return gapStart < window.end && gapEnd > window.start
}

// ─── Gap Detection ──────────────────────────────────────────────────────────

export function detectGaps(timeline: TimelineEvent[]): ScheduleGap[] {
  if (timeline.length < 2) return []

  const gaps: ScheduleGap[] = []

  for (let i = 0; i < timeline.length - 1; i++) {
    const current = timeline[i]
    const next = timeline[i + 1]

    const currentEnd = timeToMinutes(current.endTime)
    const nextStart = timeToMinutes(next.startTime)
    const durationMinutes = nextStart - currentEnd

    if (durationMinutes >= 30) {
      gaps.push({
        startTime: current.endTime,
        endTime: next.startTime,
        durationMinutes,
        previousEvent: current,
        nextEvent: next,
        walkingMinutesToNext: next.walkingMinutes ?? 10,
      })
    }
  }

  return gaps
}

// ─── Plan Generation ────────────────────────────────────────────────────────

export interface WeakConcept {
  courseCode: string
  concept: string
  mastery: number  // 0-100
}

export function generateGapPlan(
  gap: ScheduleGap,
  stakes: StakeItem[],
  srDueCount: number,
  weakConcepts: WeakConcept[],
): GapPlan {
  const activities: GapActivity[] = []
  let remaining = gap.durationMinutes

  // 1. Reserve walking time to next class (non-negotiable)
  const walkTime = gap.walkingMinutesToNext + 5 // +5 min buffer to settle in
  remaining -= walkTime

  // 2. Check if gap overlaps a meal window
  const gapStartMin = timeToMinutes(gap.startTime)
  const gapEndMin = timeToMinutes(gap.endTime)
  const mealWindow = MEAL_WINDOWS.find(w => overlapsWindow(gapStartMin, gapEndMin, w))

  if (mealWindow && remaining >= 30) {
    activities.push({
      type: 'meal',
      label: mealWindow.label,
      sublabel: getNearestDining(gap.previousEvent?.location),
      durationMinutes: 30,
      icon: 'utensils',
    })
    remaining -= 30
  }

  // 3. SR flashcard review (quick, high-value)
  if (remaining >= 5 && srDueCount >= 3) {
    const reviewTime = Math.min(remaining, 10)
    activities.push({
      type: 'review',
      label: `Review ${srDueCount} flashcards`,
      sublabel: 'Quick spaced-repetition review',
      durationMinutes: reviewTime,
      icon: 'rotate-ccw',
      actionType: 'flashcard-review',
    })
    remaining -= reviewTime
  }

  // 4. Study activity (fill remaining time)
  if (remaining >= 15) {
    const nextClassCourse = gap.nextEvent.courseCode
    const studyTime = Math.min(remaining, 30)

    // Priority: weak concept in next class → urgent stake → weakest overall
    const conceptForNextClass = weakConcepts.find(c => c.courseCode === nextClassCourse)
    const urgentStake = stakes.find(s => s.daysLeft <= 5 && s.daysLeft >= 0)
    const conceptForStake = urgentStake ? weakConcepts.find(c => c.courseCode === urgentStake.courseCode) : null
    const weakest = weakConcepts.length > 0 ? [...weakConcepts].sort((a, b) => a.mastery - b.mastery)[0] : null

    const target = conceptForNextClass || conceptForStake || weakest

    if (target) {
      activities.push({
        type: 'study',
        label: `Study ${target.concept}`,
        sublabel: `${target.courseCode} — mastery ${target.mastery}%`,
        durationMinutes: studyTime,
        icon: 'book-open',
        actionType: 'sandy-message',
        actionHref: `Help me study "${target.concept}" in ${target.courseCode}. I have ${studyTime} minutes before my next class.`,
      })
      remaining -= studyTime
    } else if (urgentStake) {
      activities.push({
        type: 'study',
        label: `Work on ${urgentStake.title}`,
        sublabel: `${urgentStake.courseCode} — ${urgentStake.dueLabel}`,
        durationMinutes: studyTime,
        icon: 'pencil',
        actionType: 'sandy-message',
        actionHref: `Help me work on my ${urgentStake.title} for ${urgentStake.courseCode}. I have ${studyTime} minutes.`,
      })
      remaining -= studyTime
    }
  }

  // 5. Add walking time at the end
  activities.push({
    type: 'walk',
    label: `Walk to ${gap.nextEvent.location || gap.nextEvent.courseCode || 'next class'}`,
    sublabel: `${gap.walkingMinutesToNext} min`,
    durationMinutes: walkTime,
    icon: 'footprints',
  })

  return {
    gap,
    activities,
    bufferMinutes: Math.max(0, remaining),
  }
}

// ─── Convenience: detect + plan all gaps ────────────────────────────────────

export function buildGapPlans(
  timeline: TimelineEvent[],
  stakes: StakeItem[],
  srDueCount: number,
  weakConcepts: WeakConcept[],
): GapPlan[] {
  const gaps = detectGaps(timeline)
  return gaps.map(gap => generateGapPlan(gap, stakes, srDueCount, weakConcepts))
}
