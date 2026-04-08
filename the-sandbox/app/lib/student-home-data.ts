// student-home-data.ts
// Types and simulated campus data for the AGI University student homepage.
// In production, this data comes from SIS (Banner), financial aid, dining, parking integrations.
// For the demo, all campus data is simulated client-side.

import { addDays, format, differenceInDays } from 'date-fns'

// ─── Types ───────────────────────────────────────────────────────────────────

export type BeaconType = 'scholarship' | 'class' | 'deadline' | 'financial' | 'celebration' | 'rest' | 'morning-briefing' | 'all-clear' | 'grade-posted' | 'virtual-clinic-first-visit'

export interface BeaconItem {
  id: string
  type: BeaconType
  title: string
  subtitle: string
  body?: string
  urgency: 'critical' | 'warning' | 'info' | 'celebration'
  action?: { label: string; href: string }
  secondaryAction?: { label: string; href: string }
  sandyAction?: { label: string; message: string }
  assignmentUrl?: string
  assignmentId?: string
  courseCode?: string
  studiedPct?: number
  hoursUntilDue?: number
  meta?: Record<string, unknown>
}

export interface TimelineEvent {
  id: string
  type: 'class' | 'deadline' | 'office-hours' | 'event'
  title: string
  subtitle?: string
  location?: string
  startTime: string // HH:mm
  endTime: string   // HH:mm
  courseCode?: string
  color?: string
  walkingMinutes?: number  // walking time FROM previous location
  walkingNote?: string     // e.g. "12-min walk from White Hall"
}

export interface StakeItem {
  id: string
  title: string
  courseCode: string
  dueLabel: string
  daysLeft: number
  gradeWeight: number
  type: string
  urgency: 'overdue' | 'today' | 'this-week' | 'next-week' | 'later'
}

export interface SandyInsight {
  id: string
  category: 'academic' | 'financial' | 'study' | 'career' | 'wellness' | 'study-action' | 'email-action'
  title: string
  body: string
  action?: { label: string; href: string }
  actionType?: 'link' | 'sandy-message' | 'flashcard-review'
}

export interface PulseData {
  gpa: { current: number; semester: number; trend: 'up' | 'down' | 'flat'; delta: string }
  degree: { completed: number; total: number; percent: number; standing: string }
  mealPlan: { remaining: number; total: number; resetsDay: string }
  wildcatCard: number
  parking: { status: 'valid' | 'expiring' | 'expired'; daysLeft: number; lot: string }
  studyStreak?: { current: number; longest: number; sessions: number }
}

export interface CampusLifeItem {
  id: string
  type: 'event' | 'dining' | 'athletics' | 'career'
  title: string
  subtitle: string
  time?: string
  location?: string
  badge?: string
  badgeColor?: string
  href?: string
}

export interface WeatherData {
  temp: number
  condition: string
  high: number
  low: number
  icon: 'sun' | 'cloud' | 'rain' | 'snow' | 'partly-cloudy'
}

export interface QuickAction {
  id: string
  label: string
  href: string
  iconName: 'book-open' | 'sparkles' | 'graduation-cap' | 'users' | 'target' | 'compass' | 'calendar' | 'briefcase' | 'map-pin'
  badge?: string
  badgeColor?: string
}

// ─── Smart Study Launcher Types ──────────────────────────────────────────────

export interface SmartStudyTarget {
  label: string           // "Study Evidence" or "Review Flashcards"
  sublabel: string        // "Exam in 2 days" or "5 cards due"
  action: SmartStudyAction
  urgency: 'critical' | 'high' | 'normal'
}

export type SmartStudyAction =
  | { type: 'flashcard-quick-review' }
  | { type: 'exam-prep'; courseId: string; courseName: string }
  | { type: 'tutor'; courseId: string; courseName: string; concept: string }
  | { type: 'quiz'; courseId: string; courseName: string }
  | { type: 'general-study' }

export interface EnrolledCourseForStudy {
  id: string
  courseCode: string
}

export interface WeakConceptForStudy {
  courseCode: string
  concept: string
  mastery: number
}

export function computeSmartStudyTarget(
  stakes: StakeItem[],
  srDueCount: number,
  enrollments: EnrolledCourseForStudy[],
  weakConcepts: WeakConceptForStudy[]
): SmartStudyTarget | null {

  // Priority 1: SR flashcards due (≥3 cards) → Quick Review
  if (srDueCount >= 3) {
    return {
      label: 'Review Flashcards',
      sublabel: `${srDueCount} cards due`,
      action: { type: 'flashcard-quick-review' },
      urgency: 'normal',
    }
  }

  // Priority 2: Exam within 3 days → Exam Prep mode
  const urgentExam = stakes.find(s =>
    s.daysLeft <= 3 && s.daysLeft >= 0 &&
    s.title?.toLowerCase().match(/exam|midterm|final|quiz/)
  )
  if (urgentExam) {
    const enrollment = enrollments.find(e => e.courseCode === urgentExam.courseCode)
    return {
      label: `Study ${urgentExam.courseCode}`,
      sublabel: `Exam ${urgentExam.dueLabel}`,
      action: { type: 'exam-prep', courseId: enrollment?.id || '', courseName: urgentExam.courseCode },
      urgency: 'critical',
    }
  }

  // Priority 3: Assignment due within 3 days → Tutor on weakest concept or Quiz
  const urgentAssignment = stakes.find(s => s.daysLeft <= 3 && s.daysLeft >= 0)
  if (urgentAssignment) {
    const enrollment = enrollments.find(e => e.courseCode === urgentAssignment.courseCode)
    const weakInCourse = weakConcepts.find(c => c.courseCode === urgentAssignment.courseCode)
    return {
      label: `Study ${urgentAssignment.courseCode}`,
      sublabel: `${urgentAssignment.title} — ${urgentAssignment.dueLabel}`,
      action: weakInCourse
        ? { type: 'tutor', courseId: enrollment?.id || '', courseName: urgentAssignment.courseCode, concept: weakInCourse.concept }
        : { type: 'quiz', courseId: enrollment?.id || '', courseName: urgentAssignment.courseCode },
      urgency: 'high',
    }
  }

  // Priority 4: Course with weakest mastery → Tutor on weakest concept
  if (weakConcepts.length > 0) {
    const weakest = [...weakConcepts].sort((a, b) => a.mastery - b.mastery)[0]
    const enrollment = enrollments.find(e => e.courseCode === weakest.courseCode)
    return {
      label: `Study ${weakest.courseCode}`,
      sublabel: `${weakest.concept} needs work`,
      action: { type: 'tutor', courseId: enrollment?.id || '', courseName: weakest.courseCode, concept: weakest.concept },
      urgency: 'normal',
    }
  }

  // Priority 5: Any enrolled course → Quiz mode on first course
  if (enrollments.length > 0) {
    return {
      label: `Study ${enrollments[0].courseCode}`,
      sublabel: 'General review',
      action: { type: 'quiz', courseId: enrollments[0].id, courseName: enrollments[0].courseCode },
      urgency: 'normal',
    }
  }

  // No courses → null (don't show chip)
  return null
}

// ─── Finals Calculator Types ─────────────────────────────────────────────────

export interface CourseGradeScenario {
  courseCode: string
  courseTitle: string
  currentGrade: number        // current weighted average (0-100)
  currentLetter: string       // A, B+, B, etc.
  remainingWeight: number     // % of final grade not yet determined
  remainingItems: Array<{ title: string; weight: number; type: string }>
  scenarios: Array<{
    targetLetter: string
    targetMin: number         // minimum overall score needed
    neededOnRemaining: number // what you need to average on remaining work
    feasibility: 'easy' | 'doable' | 'stretch' | 'unlikely'
  }>
}

// ─── Study Allocator Types ──────────────────────────────────────────────────

export interface StudyAllocation {
  courseCode: string
  courseTitle: string
  hoursRecommended: number
  priority: 'critical' | 'high' | 'medium' | 'low'
  reason: string              // why this many hours
  nextDeadline: string        // "Evidence Exam in 10d"
  gradeWeight: number         // weight of next upcoming item
  currentStanding: string     // "B+" etc.
}

// ─── Grade Impact Preview Types ─────────────────────────────────────────────

export interface GradeImpactItem {
  id: string
  courseCode: string
  assignmentTitle: string
  score: number
  maxScore: number
  letterGrade: string
  impact: {
    courseGradeBefore: string
    courseGradeAfter: string
    semesterGpaBefore: number
    semesterGpaAfter: number
    cumulativeGpaBefore: number
    cumulativeGpaAfter: number
  }
  postedAt: string  // relative, e.g. "2 hours ago"
  isPositive: boolean
}

export interface RightNowData {
  nextClass: {
    courseCode: string
    title: string
    time: string        // "9:00 AM"
    location: string    // "Grehan 201"
    minutesUntil: number
    isNow: boolean
  } | null
  urgentEmail: {
    sender: string
    subject: string
    urgency: 'respond-today' | 'this-week'
  } | null
  topDeadline: {
    courseCode: string
    title: string
    dueLabel: string    // "due in 3 days", "due today", "overdue"
    urgency: 'critical' | 'warning' | 'info'
  } | null
}

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night'

export interface StudentHomeSimData {
  beacon: BeaconItem
  timeline: TimelineEvent[]
  stakes: StakeItem[]
  sandyInsights: SandyInsight[]
  pulse: PulseData
  campusLife: CampusLifeItem[]
  weather: WeatherData
  quickActions: QuickAction[]
  greeting: string
  firstName: string
  studentInfo: { year: string; major: string }
  finalsCalculator: CourseGradeScenario[]
  studyPlan: StudyAllocation[]
  recentGrades: GradeImpactItem[]
  rightNow: RightNowData
  tomorrowPreview: TomorrowPreviewData | null
  timeOfDay: TimeOfDay
  isLateNight: boolean
}

// ─── Campus Walking Times (minutes between buildings) ────────────────────────

function getBuildingName(location: string): string {
  if (location.startsWith('White Hall')) return 'White Hall'
  if (location.startsWith('College of Law')) return 'College of Law'
  if (location.startsWith('Student Center')) return 'Student Center'
  if (location.startsWith('Young Library')) return 'Young Library'
  if (location.startsWith('Rupp')) return 'Rupp Arena'
  return location
}

const WALKING_TIMES: Record<string, Record<string, number>> = {
  'White Hall':      { 'College of Law': 12, 'Student Center': 8, 'Young Library': 5, 'Rupp Arena': 15 },
  'College of Law':  { 'White Hall': 12, 'Student Center': 10, 'Young Library': 8, 'Rupp Arena': 18 },
  'Student Center':  { 'White Hall': 8, 'College of Law': 10, 'Young Library': 6, 'Rupp Arena': 10 },
  'Young Library':   { 'White Hall': 5, 'College of Law': 8, 'Student Center': 6, 'Rupp Arena': 12 },
}

function getWalkingTime(fromLocation: string, toLocation: string): number | null {
  const from = getBuildingName(fromLocation)
  const to = getBuildingName(toLocation)
  if (from === to) return 1 // Same building, ~1 min
  return WALKING_TIMES[from]?.[to] ?? null
}

// ─── Class Schedule (Tiana The — 1L Law Student) ─────────────────────────────

interface ClassTemplate {
  title: string
  subtitle: string
  location: string
  startTime: string
  endTime: string
  courseCode: string
  color: string
  type: 'class' | 'office-hours'
}

const MONDAY_CLASSES: ClassTemplate[] = [
  { type: 'class', title: 'TEK-100: AI Literacy', subtitle: 'Prof. Thompson', location: 'White Hall 212', startTime: '10:00', endTime: '11:15', courseCode: 'TEK-100', color: '#0033A0' },
  { type: 'class', title: 'LAW 601: Constitutional Law', subtitle: 'Prof. Rodriguez', location: 'College of Law 175', startTime: '13:00', endTime: '14:00', courseCode: 'LAW 601', color: '#1a5276' },
  { type: 'office-hours', title: 'Office Hours: Prof. Martinez', subtitle: 'Evidence exam prep', location: 'College of Law 205', startTime: '15:00', endTime: '16:00', courseCode: 'LAW 756', color: '#7d3c98' },
]

const TUESDAY_CLASSES: ClassTemplate[] = [
  { type: 'class', title: 'LAW 756: Evidence', subtitle: 'Prof. Martinez', location: 'College of Law 102', startTime: '09:00', endTime: '10:30', courseCode: 'LAW 756', color: '#7d3c98' },
  { type: 'class', title: 'LAW 502: Torts', subtitle: 'Prof. Chen', location: 'College of Law 160', startTime: '14:00', endTime: '15:30', courseCode: 'LAW 502', color: '#c0392b' },
  { type: 'office-hours', title: 'Office Hours: Prof. Thompson', subtitle: 'TEK-100 questions', location: 'White Hall 310', startTime: '15:45', endTime: '17:00', courseCode: 'TEK-100', color: '#0033A0' },
]

const WEDNESDAY_CLASSES: ClassTemplate[] = [
  { type: 'class', title: 'TEK-100: AI Literacy', subtitle: 'Prof. Thompson', location: 'White Hall 212', startTime: '10:00', endTime: '11:15', courseCode: 'TEK-100', color: '#0033A0' },
  { type: 'class', title: 'LAW 601: Constitutional Law', subtitle: 'Prof. Rodriguez', location: 'College of Law 175', startTime: '13:00', endTime: '14:00', courseCode: 'LAW 601', color: '#1a5276' },
]

const THURSDAY_CLASSES: ClassTemplate[] = [
  { type: 'class', title: 'LAW 756: Evidence', subtitle: 'Prof. Martinez', location: 'College of Law 102', startTime: '09:00', endTime: '10:30', courseCode: 'LAW 756', color: '#7d3c98' },
  { type: 'class', title: 'LAW 502: Torts', subtitle: 'Prof. Chen', location: 'College of Law 160', startTime: '14:00', endTime: '15:30', courseCode: 'LAW 502', color: '#c0392b' },
]

const FRIDAY_CLASSES: ClassTemplate[] = [
  { type: 'class', title: 'LAW 601: Constitutional Law', subtitle: 'Prof. Rodriguez', location: 'College of Law 175', startTime: '13:00', endTime: '14:00', courseCode: 'LAW 601', color: '#1a5276' },
]

const SCHEDULE: Record<number, ClassTemplate[]> = {
  0: [], 1: MONDAY_CLASSES, 2: TUESDAY_CLASSES, 3: WEDNESDAY_CLASSES,
  4: THURSDAY_CLASSES, 5: FRIDAY_CLASSES, 6: [],
}

// ─── Tomorrow Preview Types ─────────────────────────────────────────────────

export interface TomorrowPreviewData {
  dayLabel: string
  classes: Array<{
    time: string
    courseCode: string
    title: string
    location: string
    walkingMinutes?: number
  }>
  suggestedDeparture: string | null
  deadlines: Array<{
    courseCode: string
    title: string
    dueLabel: string
    urgency: 'critical' | 'warning' | 'info'
  }>
  prepHints: Array<{
    courseCode: string
    hint: string
  }>
}

function computeSuggestedDeparture(firstClassTime: string, walkingMinutes: number): string | null {
  const [h, m] = firstClassTime.split(':').map(Number)
  const totalMinutes = h * 60 + m - walkingMinutes - 5 // 5 min buffer
  if (totalMinutes < 360) return null // Before 6 AM — unreasonable
  const depH = Math.floor(totalMinutes / 60)
  const depM = totalMinutes % 60
  return formatTimeLabel(`${depH}:${depM.toString().padStart(2, '0')}`)
}

export function computeTomorrowPreview(
  dayOfWeek: number,
  hour: number,
  stakes: StakeItem[]
): TomorrowPreviewData | null {
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
  const showPreview = isWeekend || hour >= 18

  if (!showPreview) return null

  // Determine the "tomorrow" day: on Friday evening → Monday, on weekends → Monday
  let targetOffset = 1
  const targetDow = (dayOfWeek + targetOffset) % 7
  // If tomorrow is Saturday or Sunday, skip to Monday
  if (targetDow === 0) targetOffset = 2 // Sunday → skip to Monday (+2 from Sat)
  if (targetDow === 6) targetOffset = 2 // Saturday → skip to Monday (+2 from Fri)
  const effectiveDow = (dayOfWeek + targetOffset) % 7

  const templates = SCHEDULE[effectiveDow] ?? []
  const classTemplates = templates.filter(t => t.type === 'class')

  // Build date label
  const targetDate = new Date()
  targetDate.setDate(targetDate.getDate() + targetOffset)
  const dayLabel = targetDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  // Build classes
  const classes = classTemplates.map(t => ({
    time: formatTimeLabel(t.startTime),
    courseCode: t.courseCode || '',
    title: t.title.replace(/^[A-Z]+-?\d+:\s*/, ''), // Strip code prefix from title
    location: t.location || 'TBD',
    walkingMinutes: undefined as number | undefined,
  }))

  // Add walking times between classes
  for (let i = 1; i < classTemplates.length; i++) {
    const prevLoc = classTemplates[i - 1].location
    const currLoc = classTemplates[i].location
    if (prevLoc && currLoc) {
      const walkTime = getWalkingTime(prevLoc, currLoc)
      if (walkTime && walkTime > 5) {
        classes[i].walkingMinutes = walkTime
      }
    }
  }

  // Suggested departure: first class time minus default 15 min walk + 5 min buffer
  const firstClass = classTemplates[0]
  const suggestedDeparture = firstClass && parseInt(firstClass.startTime.split(':')[0]) < 12
    ? computeSuggestedDeparture(firstClass.startTime, 15)
    : null

  // Deadlines due within 3 days
  const deadlines = stakes
    .filter(s => s.daysLeft >= 0 && s.daysLeft <= 3)
    .map(s => ({
      courseCode: s.courseCode,
      title: s.title,
      dueLabel: s.daysLeft === 0 ? 'due today' : s.daysLeft === 1 ? 'due tomorrow' : `due in ${s.daysLeft} days`,
      urgency: (s.daysLeft <= 1 ? 'critical' : s.daysLeft <= 2 ? 'warning' : 'info') as 'critical' | 'warning' | 'info',
    }))

  // Prep hints: cross-reference tomorrow's classes with deadlines
  const prepHints: TomorrowPreviewData['prepHints'] = []
  for (const cls of classTemplates) {
    const matchingStake = stakes.find(s =>
      s.courseCode === cls.courseCode && s.daysLeft >= 0 && s.daysLeft <= 3
    )
    if (matchingStake) {
      const hint = matchingStake.title.toLowerCase().includes('exam')
        ? `${matchingStake.title} this week — review tonight`
        : `${matchingStake.title} ${matchingStake.daysLeft <= 1 ? 'due before class' : 'due soon'}`
      prepHints.push({ courseCode: cls.courseCode || '', hint })
    }
  }

  // Don't render if nothing to show
  if (classes.length === 0 && deadlines.length === 0) return null

  return { dayLabel, classes, suggestedDeparture, deadlines, prepHints }
}

// ─── Beacon Engine (priority-ranked, time-aware) ─────────────────────────────

function computeBeacon(hour: number, todayClasses: TimelineEvent[], dayOfWeek: number, weather: WeatherData, stakes: StakeItem[] = []): BeaconItem {
  const now = new Date()
  const nowMinutes = hour * 60 + now.getMinutes()
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' })
  const classCount = todayClasses.filter(c => c.type === 'class').length

  // Late night: rest mode
  if (hour >= 22 || hour < 6) {
    // Show tomorrow's first class
    const tomorrowDay = (dayOfWeek + 1) % 7
    const tomorrowClasses = SCHEDULE[tomorrowDay] ?? []
    const firstClass = tomorrowClasses.find(c => c.type === 'class')
    return {
      id: 'rest',
      type: 'rest',
      title: firstClass ? `Your first class tomorrow is at ${formatTimeLabel(firstClass.startTime)}` : 'No classes tomorrow',
      subtitle: firstClass ? `${firstClass.title} · ${firstClass.location}` : 'Enjoy your day off',
      body: 'Get some rest. Sandy will have your morning briefing ready.',
      urgency: 'info',
      meta: { crisisResources: true },
    }
  }

  // Early morning (6-8 AM): morning briefing summary
  if (hour >= 6 && hour < 8) {
    const assignmentsDueThisWeek = 1 // Hallucination Hunt
    const urgentStake = stakes.find(s => s.daysLeft <= 3 && s.daysLeft > 0)
    return {
      id: 'morning-briefing',
      type: 'morning-briefing',
      title: `Here's your ${dayName}`,
      subtitle: `${classCount} class${classCount !== 1 ? 'es' : ''} today · ${assignmentsDueThisWeek} due this week · ${weather.temp}°F, ${weather.condition}`,
      body: classCount > 0
        ? `First up: ${todayClasses[0]?.title} at ${formatTimeLabel(todayClasses[0]?.startTime ?? '09:00')} in ${todayClasses[0]?.location}. ${weather.temp < 45 ? 'Grab a jacket.' : ''}`
        : 'Light day ahead. Good time to work on your Hallucination Hunt assignment (due in 3 days, worth 8% of TEK-100).',
      urgency: 'info',
      action: { label: 'See Full Briefing', href: '#top-strip' },
      ...(urgentStake && {
        sandyAction: {
          label: urgentStake.daysLeft <= 1 ? 'Start Working' : 'Start Studying',
          message: `Help me prepare for my ${urgentStake.title} in ${urgentStake.courseCode}. It's due in ${urgentStake.daysLeft} day${urgentStake.daysLeft !== 1 ? 's' : ''} and worth ${urgentStake.gradeWeight}% of my grade.`,
        },
        courseCode: urgentStake.courseCode,
        hoursUntilDue: urgentStake.daysLeft * 24,
      }),
      meta: { classCount, weather: weather.temp, assignmentsDueThisWeek },
    }
  }

  // Morning/midday: check if a class starts within 45 min
  if (hour >= 8 && hour < 17) {
    const upcomingClass = todayClasses.find(c => {
      if (c.type !== 'class') return false
      const [h, m] = c.startTime.split(':').map(Number)
      const classMinutes = h * 60 + m
      return classMinutes > nowMinutes && classMinutes - nowMinutes <= 45
    })

    if (upcomingClass) {
      const [h, m] = upcomingClass.startTime.split(':').map(Number)
      const minutesUntil = (h * 60 + m) - nowMinutes
      const walkTime = upcomingClass.walkingMinutes ?? 12
      return {
        id: 'class-soon',
        type: 'class',
        title: `${upcomingClass.title} in ${minutesUntil} minutes`,
        subtitle: `${upcomingClass.location} · ${formatTimeLabel(upcomingClass.startTime)}`,
        body: minutesUntil > walkTime + 5
          ? `${walkTime}-minute walk. It's ${weather.temp}°F${weather.temp < 45 ? ' — grab a jacket' : ''}.`
          : minutesUntil > walkTime
          ? 'Head out soon to make it comfortably.'
          : 'Head out now!',
        urgency: minutesUntil <= walkTime ? 'warning' : 'info',
        action: { label: 'View Course', href: '/courses' },
      }
    }
  }

  // Evening (after 17): all-clear or tomorrow preview
  if (hour >= 17 && hour < 22) {
    const tomorrowDay = (dayOfWeek + 1) % 7
    const tomorrowClasses = SCHEDULE[tomorrowDay] ?? []
    const tomorrowClassCount = tomorrowClasses.filter(c => c.type === 'class').length
    const firstTomorrow = tomorrowClasses.find(c => c.type === 'class')
    const urgentStake = stakes.find(s => s.daysLeft <= 3 && s.daysLeft > 0)

    // Context-aware CTA: if there's an urgent stake, focus on it; otherwise explore
    const hasUrgent = !!urgentStake
    return {
      id: 'all-clear',
      type: 'all-clear',
      title: 'Classes done for today',
      subtitle: firstTomorrow
        ? `Tomorrow: ${tomorrowClassCount} class${tomorrowClassCount !== 1 ? 'es' : ''}, starting at ${formatTimeLabel(firstTomorrow.startTime)}`
        : 'No classes tomorrow — enjoy your evening',
      body: 'Your Hallucination Hunt is due in 3 days (worth 8% of TEK-100). Good evening to knock it out.',
      urgency: 'celebration',
      action: hasUrgent
        ? { label: 'View Assignment', href: '/courses' }
        : { label: 'Explore Something New', href: '/hub' },
      secondaryAction: { label: 'Relax — I\'ll remind you', href: '#sandy' },
      ...(urgentStake && {
        sandyAction: {
          label: 'Start Studying',
          message: `Help me prepare for my ${urgentStake.title} in ${urgentStake.courseCode}. It's due in ${urgentStake.daysLeft} day${urgentStake.daysLeft !== 1 ? 's' : ''} and worth ${urgentStake.gradeWeight}% of my grade.`,
        },
        courseCode: urgentStake.courseCode,
        hoursUntilDue: urgentStake.daysLeft * 24,
      }),
    }
  }

  // Default fallback: scholarship alert (most compelling demo moment)
  const urgentStake = stakes.find(s => s.daysLeft <= 3 && s.daysLeft > 0)
  return {
    id: 'scholarship',
    type: 'scholarship',
    title: 'Your Dean\'s Scholarship requires a 3.20 GPA',
    subtitle: 'You\'re at 3.18 — but you can close the gap',
    body: 'Score B+ or better on your remaining TEK-100 assignments (worth 23% of your grade) and your projected GPA rises to 3.24. You\'ve got this.',
    urgency: 'warning',
    action: { label: 'View Study Plan', href: '/courses' },
    secondaryAction: { label: 'Talk to Sandy', href: '#sandy' },
    ...(urgentStake && {
      sandyAction: {
        label: urgentStake.type === 'Exam' ? 'Start Studying' : 'Start Working',
        message: `Help me prepare for my ${urgentStake.title} in ${urgentStake.courseCode}. It's due in ${urgentStake.daysLeft} day${urgentStake.daysLeft !== 1 ? 's' : ''} and worth ${urgentStake.gradeWeight}% of my grade. I need to get my GPA from 3.18 to 3.20 for my Dean's Scholarship.`,
      },
      courseCode: urgentStake.courseCode,
      hoursUntilDue: urgentStake.daysLeft * 24,
    }),
    meta: { currentGpa: 3.18, requiredGpa: 3.20, projectedGpa: 3.24, scholarship: 'Dean\'s Scholarship', amount: 4200 },
  }
}

// ─── Timeline Generator (with walking directions) ───────────────────────────

export function getTimelineForDay(dayOfWeek: number): TimelineEvent[] {
  return buildTimeline(dayOfWeek)
}

function buildTimeline(dayOfWeek: number): TimelineEvent[] {
  const templates = SCHEDULE[dayOfWeek] ?? []
  const effectiveTemplates = templates.length > 0 ? templates : SCHEDULE[1]!

  return effectiveTemplates.map((t, i) => {
    // Calculate walking time from previous event
    let walkingMinutes: number | undefined
    let walkingNote: string | undefined
    if (i > 0) {
      const prev = effectiveTemplates[i - 1]
      const walkTime = getWalkingTime(prev.location, t.location)
      if (walkTime !== null && walkTime > 1) {
        walkingMinutes = walkTime
        walkingNote = `${walkTime}-min walk from ${getBuildingName(prev.location)}`
      }
    }

    return {
      id: `event-${i}`,
      type: t.type,
      title: t.title,
      subtitle: t.subtitle,
      location: t.location,
      startTime: t.startTime,
      endTime: t.endTime,
      courseCode: t.courseCode,
      color: t.color,
      walkingMinutes,
      walkingNote,
    }
  })
}

// ─── Stakes (Assignments with Grade Weights) ─────────────────────────────────

function buildStakes(): StakeItem[] {
  const now = new Date()
  const items: Array<{ title: string; courseCode: string; daysFromNow: number; gradeWeight: number; type: string }> = [
    { title: 'Hallucination Hunt', courseCode: 'TEK-100', daysFromNow: 3, gradeWeight: 8, type: 'Assignment' },
    { title: 'AI Ethics Statement', courseCode: 'TEK-100', daysFromNow: 7, gradeWeight: 15, type: 'Essay' },
    { title: 'Evidence Rules Exam', courseCode: 'LAW 756', daysFromNow: 10, gradeWeight: 30, type: 'Exam' },
    { title: 'Constitutional Law Memo', courseCode: 'LAW 601', daysFromNow: 14, gradeWeight: 20, type: 'Memo' },
    { title: 'Torts Final Exam', courseCode: 'LAW 502', daysFromNow: 21, gradeWeight: 40, type: 'Exam' },
  ]

  return items.map((item, i) => {
    const dueDate = addDays(now, item.daysFromNow)
    const daysLeft = differenceInDays(dueDate, now)
    let urgency: StakeItem['urgency'] = 'later'
    if (daysLeft <= 0) urgency = 'overdue'
    else if (daysLeft <= 1) urgency = 'today'
    else if (daysLeft <= 7) urgency = 'this-week'
    else if (daysLeft <= 14) urgency = 'next-week'

    return {
      id: `stake-${i}`,
      title: item.title,
      courseCode: item.courseCode,
      dueLabel: format(dueDate, 'MMM d'),
      daysLeft,
      gradeWeight: item.gradeWeight,
      type: item.type,
      urgency,
    }
  })
}

// ─── Sandy Insights (time-of-day aware, deeper intelligence) ─────────────────

function buildSandyInsights(hour: number, timeOfDay: TimeOfDay): SandyInsight[] {
  const insights: SandyInsight[] = []

  // Always present: Scholarship + GPA insight
  insights.push({
    id: 'sandy-scholarship',
    category: 'academic',
    title: 'GPA 3.18 → need 3.20 for Dean\'s Scholarship',
    body: 'Your Dean\'s Scholarship needs a 3.20. You\'re at 3.18. Your TEK-100 Hallucination Hunt (due in 3 days, worth 8%) is the quickest way to move the needle. Aim for 85%+.',
    action: { label: 'Start Studying', href: '/courses' },
  })

  // Study focus: replaces the dedicated StudyAllocator section
  insights.push({
    id: 'sandy-study-focus',
    category: 'study',
    title: 'Evidence brief due in 3 days — worth 25%',
    body: 'Your LAW 756 brief is due in 3 days and worth 25% of your grade. That\'s your highest-leverage study time this week. Second priority: 2h on Civil Procedure reading.',
    action: { label: 'Open Study Plan', href: '/courses' },
  })

  // Always present: FAFSA deadline
  insights.push({
    id: 'sandy-fafsa',
    category: 'financial',
    title: 'FAFSA renewal in 18 days — $4,200 at stake',
    body: 'Missing the deadline costs you $4,200 in federal aid next year. It takes about 30 minutes — Sandy can walk you through each section.',
    action: { label: 'Start FAFSA', href: '#sandy' },
  })

  // Time-of-day rotation (3rd insight)
  if (timeOfDay === 'morning') {
    insights.push({
      id: 'sandy-morning',
      category: 'study',
      title: 'Evidence exam in 10 days — 30% of grade',
      body: 'The LAW 756 Evidence Rules Exam is worth 30% of your grade. Students who started prep 10+ days out scored 12% higher on average. Prof. Martinez has office hours today at 3 PM.',
      action: { label: 'View Exam Prep', href: '/courses' },
    })
  } else if (timeOfDay === 'afternoon') {
    insights.push({
      id: 'sandy-afternoon',
      category: 'study',
      title: 'Best study window: 7-10 PM tonight',
      body: 'Your highest-scoring sessions happen between 7-10 PM on weekday evenings. Young Library 3rd floor is usually 40% full around then — your preferred quiet zone.',
      action: { label: 'Plan Tonight\'s Study', href: '/courses' },
    })
  } else if (timeOfDay === 'evening') {
    insights.push({
      id: 'sandy-evening',
      category: 'wellness',
      title: 'Classes done — UK Basketball at 7 PM',
      body: 'You attended both classes and completed your reading for LAW 601. Take a break — the UK Basketball game starts at 7 PM. Your ticket is in Section 14.',
      action: { label: 'See Tonight\'s Events', href: '/hub' },
    })
  } else {
    insights.push({
      id: 'sandy-night',
      category: 'wellness',
      title: '2 classes tomorrow starting at 9 AM',
      body: 'You have 2 classes tomorrow starting at 9 AM. Students who sleep 7+ hours before Evidence class score 15% higher on cold calls. You\'ve earned the rest.',
    })
  }

  // 4th insight: Career (if morning/afternoon)
  if (timeOfDay === 'morning' || timeOfDay === 'afternoon') {
    insights.push({
      id: 'sandy-career',
      category: 'career',
      title: 'Career Fair Thursday — Baker McKenzie recruiting',
      body: 'Baker McKenzie and Frost Brown Todd are recruiting 1L summer associates. Students who attended last year\'s fair received 3x more callback interviews. Bring 10 copies of your resume.',
      action: { label: 'RSVP Now', href: '/hub' },
    })
  }

  // 5th insight: Study match (always)
  insights.push({
    id: 'sandy-study-match',
    category: 'academic',
    title: '3 classmates forming Evidence study groups',
    body: 'Three classmates in your LAW 756 section are forming study groups for the exam. One is in your residence hall. Study groups for Evidence have a +8% average score boost.',
    action: { label: 'View Matches', href: '/hub' },
  })

  return insights
}

// ─── Quick Actions (contextual, time-aware) ──────────────────────────────────

function buildQuickActions(timeOfDay: TimeOfDay, stakes: StakeItem[]): QuickAction[] {
  const actions: QuickAction[] = []
  const nextDue = stakes[0]

  // Always: View courses
  actions.push({
    id: 'qa-courses',
    label: 'My Courses',
    href: '/courses',
    iconName: 'book-open',
  })

  // (Smart Study chip is now computed separately via computeSmartStudyTarget)

  // Talk to Sandy
  actions.push({
    id: 'qa-sandy',
    label: 'Ask Sandy',
    href: '#sandy',
    iconName: 'sparkles',
  })

  // Time-aware
  if (timeOfDay === 'morning' || timeOfDay === 'afternoon') {
    actions.push({
      id: 'qa-tools',
      label: 'Browse Tools',
      href: '/hub?tab=tools',
      iconName: 'compass',
    })
  } else {
    actions.push({
      id: 'qa-degree',
      label: 'Degree Progress',
      href: '/registrar',
      iconName: 'graduation-cap',
    })
  }

  // Campus Map — always available
  actions.push({
    id: 'qa-campus-map',
    label: 'Campus Map',
    href: '/campus-map',
    iconName: 'map-pin',
  })

  return actions
}

// ─── Pulse Data ──────────────────────────────────────────────────────────────

function buildPulse(): PulseData {
  return {
    gpa: { current: 3.18, semester: 3.24, trend: 'up', delta: '+0.06' },
    degree: { completed: 28, total: 90, percent: 31, standing: '1L' },
    mealPlan: { remaining: 8, total: 14, resetsDay: 'Sunday' },
    wildcatCard: 142.30,
    parking: { status: 'valid', daysLeft: 23, lot: 'C2 General' },
  }
}

// ─── Campus Life ─────────────────────────────────────────────────────────────

function buildCampusLife(timeOfDay: TimeOfDay): CampusLifeItem[] {
  const items: CampusLifeItem[] = []

  // Athletics — always compelling
  items.push({
    id: 'cl-basketball',
    type: 'athletics',
    title: 'UK Basketball vs. Tennessee',
    subtitle: 'Rupp Arena · Your student ticket is in Section 14',
    time: 'Tonight, 7:00 PM',
    location: 'Rupp Arena',
    badge: 'SEC',
    badgeColor: 'bg-blue-100 text-blue-700',
    href: '/community',
  })

  // Dining — time-aware
  if (timeOfDay === 'morning' || timeOfDay === 'afternoon') {
    items.push({
      id: 'cl-dining',
      type: 'dining',
      title: 'Champions Kitchen',
      subtitle: 'Open now · 23% capacity — least crowded today',
      time: 'Closes 8:00 PM',
      location: 'Champions Court',
      badge: 'Low crowd',
      badgeColor: 'bg-emerald-100 text-emerald-700',
      href: '/hub',
    })
  } else {
    items.push({
      id: 'cl-dining',
      type: 'dining',
      title: 'The 90 is still open',
      subtitle: 'Late-night menu until 11 PM · 15% capacity',
      time: 'Closes 11:00 PM',
      location: 'Blazer Dining',
      badge: 'Open late',
      badgeColor: 'bg-emerald-100 text-emerald-700',
      href: '/hub',
    })
  }

  // Career Fair
  items.push({
    id: 'cl-career',
    type: 'career',
    title: 'Spring Career Fair',
    subtitle: '40+ employers · 6 law firms recruiting 1Ls',
    time: 'Thursday, 10 AM – 3 PM',
    location: 'Student Center Grand Ballroom',
    badge: 'RSVP',
    badgeColor: 'bg-amber-100 text-amber-700',
    href: '/hub',
  })

  // Law Mixer
  items.push({
    id: 'cl-law-mixer',
    type: 'event',
    title: 'Law School Spring Mixer',
    subtitle: 'Free food · Meet 2L and 3L mentors',
    time: 'Friday, 5:00 PM',
    location: 'College of Law Courtyard',
    badge: 'Social',
    badgeColor: 'bg-purple-100 text-purple-700',
    href: '/community',
  })

  return items
}

// ─── Weather ─────────────────────────────────────────────────────────────────

function buildWeather(): WeatherData {
  return { temp: 42, condition: 'Partly Cloudy', high: 51, low: 34, icon: 'partly-cloudy' }
}

// ─── Greeting ────────────────────────────────────────────────────────────────

function buildGreeting(hour: number, firstName: string): string {
  if (hour >= 5 && hour < 12) return `Good morning, ${firstName}`
  if (hour >= 12 && hour < 17) return `Good afternoon, ${firstName}`
  if (hour >= 17 && hour < 21) return `Good evening, ${firstName}`
  return `Good night, ${firstName}`
}

// ─── Time Phase (for homepage section ordering) ─────────────────────────────

export type TimePhase = 'morning' | 'afternoon' | 'evening' | 'night'

export function getTimePhase(hour?: number): TimePhase {
  const h = hour ?? new Date().getHours()
  if (h >= 6 && h < 11) return 'morning'
  if (h >= 11 && h < 17) return 'afternoon'
  if (h >= 17 && h < 22) return 'evening'
  return 'night' // 10 PM – 6 AM
}

// Phase-specific insight priority ordering
export const INSIGHT_PRIORITY: Record<TimePhase, SandyInsight['category'][]> = {
  morning: ['academic', 'email-action', 'financial', 'study-action', 'career', 'wellness', 'study'],
  afternoon: ['study-action', 'academic', 'email-action', 'career', 'financial', 'wellness', 'study'],
  evening: ['study-action', 'academic', 'wellness', 'email-action', 'career', 'financial', 'study'],
  night: ['wellness', 'study-action', 'academic', 'email-action', 'career', 'financial', 'study'],
}

// Phase-specific quick action chip sets
export function getPhaseQuickActions(phase: TimePhase, stakes: StakeItem[]): QuickAction[] {
  switch (phase) {
    case 'morning':
      return [
        { id: 'qa-courses', label: 'My Courses', href: '/courses', iconName: 'book-open' },
        { id: 'qa-schedule', label: 'My Schedule', href: '#timeline', iconName: 'calendar' },
        { id: 'qa-sandy', label: 'Sandy', href: '#sandy', iconName: 'sparkles' },
        { id: 'qa-tools', label: 'Browse Tools', href: '/hub?tab=tools', iconName: 'compass' },
      ]
    case 'afternoon':
      return [
        { id: 'qa-courses', label: 'My Courses', href: '/courses', iconName: 'book-open' },
        { id: 'qa-community', label: 'The Commons', href: '/community', iconName: 'users' },
        { id: 'qa-sandy', label: 'Sandy', href: '#sandy', iconName: 'sparkles' },
        { id: 'qa-tools', label: 'Browse Tools', href: '/hub?tab=tools', iconName: 'compass' },
      ]
    case 'evening':
      return [
        { id: 'qa-courses', label: 'My Courses', href: '/courses', iconName: 'book-open' },
        { id: 'qa-sandy', label: 'Sandy', href: '#sandy', iconName: 'sparkles' },
        { id: 'qa-degree', label: 'Degree Progress', href: '/registrar', iconName: 'graduation-cap' },
        { id: 'qa-tools', label: 'Browse Tools', href: '/hub?tab=tools', iconName: 'compass' },
      ]
    case 'night':
      return [
        { id: 'qa-sandy', label: 'Sandy', href: '#sandy', iconName: 'sparkles' },
        { id: 'qa-degree', label: 'Degree Progress', href: '/registrar', iconName: 'graduation-cap' },
      ]
  }
}

// Wind-down data for night phase
export interface WindDownData {
  daySummary: {
    studySessions: number
    studyMinutes: number
    flashcardsReviewed: number
    classesAttended: number
  }
  sleepSuggestion: {
    firstClassTomorrow: string
    suggestedBedtime: string
    targetHours: number
  } | null
}

export function computeWindDownData(
  dayOfWeek: number,
  todayClassCount: number
): WindDownData {
  // Simulated day summary (in production, pulled from session telemetry)
  const daySummary = {
    studySessions: 2,
    studyMinutes: 45,
    flashcardsReviewed: 3,
    classesAttended: todayClassCount,
  }

  // Sleep suggestion from tomorrow's first class
  const tomorrowDow = (dayOfWeek + 1) % 7
  // Skip weekends to Monday
  const effectiveDow = tomorrowDow === 0 ? 1 : tomorrowDow === 6 ? 1 : tomorrowDow
  const tomorrowTemplates = SCHEDULE[effectiveDow] ?? []
  const firstClass = tomorrowTemplates.find(t => t.type === 'class')

  let sleepSuggestion: WindDownData['sleepSuggestion'] = null
  if (firstClass) {
    const [h] = firstClass.startTime.split(':').map(Number)
    if (h < 14) { // Only suggest bedtime for morning/early afternoon classes
      const targetHours = 8
      const wakeUpMinutes = h * 60 - 45 // 45 min before class for getting ready
      const bedMinutes = wakeUpMinutes - targetHours * 60
      // Clamp to reasonable range (9 PM – 2 AM)
      const clampedBed = Math.max(bedMinutes, 21 * 60)
      const bedH = Math.floor(clampedBed / 60) % 24
      const bedM = clampedBed % 60
      sleepSuggestion = {
        firstClassTomorrow: formatTimeLabel(firstClass.startTime),
        suggestedBedtime: formatTimeLabel(`${bedH}:${bedM.toString().padStart(2, '0')}`),
        targetHours,
      }
    }
  }

  return { daySummary, sleepSuggestion }
}

function getTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 22) return 'evening'
  return 'night'
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTimeLabel(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h
  return m === 0 ? `${hour12} ${suffix}` : `${hour12}:${m.toString().padStart(2, '0')} ${suffix}`
}

// ─── Finals Calculator (per-course grade scenarios) ─────────────────────────

function buildFinalsCalculator(): CourseGradeScenario[] {
  function letterFor(score: number): string {
    if (score >= 93) return 'A'
    if (score >= 90) return 'A-'
    if (score >= 87) return 'B+'
    if (score >= 83) return 'B'
    if (score >= 80) return 'B-'
    if (score >= 77) return 'C+'
    if (score >= 73) return 'C'
    if (score >= 70) return 'C-'
    if (score >= 67) return 'D+'
    if (score >= 60) return 'D'
    return 'F'
  }

  function feasibility(needed: number): CourseGradeScenario['scenarios'][0]['feasibility'] {
    if (needed <= 70) return 'easy'
    if (needed <= 85) return 'doable'
    if (needed <= 95) return 'stretch'
    return 'unlikely'
  }

  function makeScenarios(current: number, remainingWeight: number): CourseGradeScenario['scenarios'] {
    const earnedWeight = 100 - remainingWeight
    const targets = [
      { letter: 'A', min: 93 },
      { letter: 'B+', min: 87 },
      { letter: 'B', min: 83 },
      { letter: 'C+', min: 77 },
      { letter: 'C', min: 73 },
    ]
    return targets.map(t => {
      // current * earnedWeight/100 + needed * remainingWeight/100 >= t.min
      const neededOnRemaining = ((t.min - current * (earnedWeight / 100)) / (remainingWeight / 100))
      const clamped = Math.max(0, Math.min(100, Math.round(neededOnRemaining)))
      return {
        targetLetter: t.letter,
        targetMin: t.min,
        neededOnRemaining: clamped,
        feasibility: feasibility(clamped),
      }
    }).filter(s => s.neededOnRemaining <= 100) // only show achievable scenarios
  }

  return [
    {
      courseCode: 'TEK-100',
      courseTitle: 'AI Literacy',
      currentGrade: 72,
      currentLetter: letterFor(72),
      remainingWeight: 23,
      remainingItems: [
        { title: 'Hallucination Hunt', weight: 8, type: 'Assignment' },
        { title: 'AI Ethics Statement', weight: 15, type: 'Essay' },
      ],
      scenarios: makeScenarios(72, 23),
    },
    {
      courseCode: 'LAW 756',
      courseTitle: 'Evidence',
      currentGrade: 84,
      currentLetter: letterFor(84),
      remainingWeight: 45,
      remainingItems: [
        { title: 'Evidence Rules Exam', weight: 30, type: 'Exam' },
        { title: 'Final Brief', weight: 15, type: 'Paper' },
      ],
      scenarios: makeScenarios(84, 45),
    },
    {
      courseCode: 'LAW 601',
      courseTitle: 'Constitutional Law',
      currentGrade: 88,
      currentLetter: letterFor(88),
      remainingWeight: 35,
      remainingItems: [
        { title: 'Constitutional Law Memo', weight: 20, type: 'Memo' },
        { title: 'Participation', weight: 15, type: 'Participation' },
      ],
      scenarios: makeScenarios(88, 35),
    },
    {
      courseCode: 'LAW 502',
      courseTitle: 'Torts',
      currentGrade: 79,
      currentLetter: letterFor(79),
      remainingWeight: 55,
      remainingItems: [
        { title: 'Torts Final Exam', weight: 40, type: 'Exam' },
        { title: 'Case Brief Portfolio', weight: 15, type: 'Portfolio' },
      ],
      scenarios: makeScenarios(79, 55),
    },
  ]
}

// ─── Study Time Allocator ───────────────────────────────────────────────────

function buildStudyPlan(): StudyAllocation[] {
  // Weighted formula: hours ∝ (gradeWeight × urgencyMultiplier) / currentStanding
  // Higher grade weight + sooner deadline + lower current grade = more hours
  const courses = [
    { code: 'LAW 756', title: 'Evidence', nextDeadline: 'Evidence Exam in 10d', gradeWeight: 30, daysUntil: 10, current: 84, currentLetter: 'B' },
    { code: 'TEK-100', title: 'AI Literacy', nextDeadline: 'Hallucination Hunt in 3d', gradeWeight: 8, daysUntil: 3, current: 72, currentLetter: 'C-' },
    { code: 'LAW 601', title: 'Con Law', nextDeadline: 'Con Law Memo in 14d', gradeWeight: 20, daysUntil: 14, current: 88, currentLetter: 'B+' },
    { code: 'LAW 502', title: 'Torts', nextDeadline: 'Torts Final in 21d', gradeWeight: 40, daysUntil: 21, current: 79, currentLetter: 'C+' },
  ]

  // Calculate raw priority score
  const scored = courses.map(c => {
    const urgencyMultiplier = Math.max(1, 10 / Math.max(1, c.daysUntil)) // closer deadline = higher urgency
    const gradeNeed = Math.max(0, (85 - c.current) / 15) // how far below B+ target
    const rawScore = c.gradeWeight * urgencyMultiplier * (1 + gradeNeed)
    return { ...c, rawScore }
  })

  // Normalize to total ~14 hours/week
  const totalRaw = scored.reduce((sum, c) => sum + c.rawScore, 0)
  const totalHours = 14

  return scored.map(c => {
    const hours = Math.round((c.rawScore / totalRaw) * totalHours * 2) / 2 // round to 0.5
    const priority: StudyAllocation['priority'] =
      hours >= 5 ? 'critical' :
      hours >= 3.5 ? 'high' :
      hours >= 2 ? 'medium' : 'low'

    let reason: string
    if (c.daysUntil <= 5) {
      reason = `Due in ${c.daysUntil} days · ${c.gradeWeight}% of grade · Currently ${c.currentLetter}`
    } else if (c.gradeWeight >= 30) {
      reason = `Worth ${c.gradeWeight}% of grade · ${c.daysUntil} days to prep · Currently ${c.currentLetter}`
    } else {
      reason = `${c.gradeWeight}% of grade · Currently ${c.currentLetter} · ${c.daysUntil} days out`
    }

    return {
      courseCode: c.code,
      courseTitle: c.title,
      hoursRecommended: Math.max(0.5, hours),
      priority,
      reason,
      nextDeadline: c.nextDeadline,
      gradeWeight: c.gradeWeight,
      currentStanding: c.currentLetter,
    }
  }).sort((a, b) => b.hoursRecommended - a.hoursRecommended)
}

// ─── Grade Impact Preview (recent grade postings) ───────────────────────────

function buildRecentGrades(): GradeImpactItem[] {
  // Simulated: two recent grades posted
  return [
    {
      id: 'grade-1',
      courseCode: 'LAW 756',
      assignmentTitle: 'Hearsay Analysis Brief',
      score: 87,
      maxScore: 100,
      letterGrade: 'B+',
      impact: {
        courseGradeBefore: 'B',
        courseGradeAfter: 'B',
        semesterGpaBefore: 3.21,
        semesterGpaAfter: 3.24,
        cumulativeGpaBefore: 3.16,
        cumulativeGpaAfter: 3.18,
      },
      postedAt: '2 hours ago',
      isPositive: true,
    },
    {
      id: 'grade-2',
      courseCode: 'TEK-100',
      assignmentTitle: 'Module 4: Source Verification Quiz',
      score: 58,
      maxScore: 100,
      letterGrade: 'D+',
      impact: {
        courseGradeBefore: 'C+',
        courseGradeAfter: 'C-',
        semesterGpaBefore: 3.26,
        semesterGpaAfter: 3.24,
        cumulativeGpaBefore: 3.19,
        cumulativeGpaAfter: 3.18,
      },
      postedAt: 'Yesterday',
      isPositive: false,
    },
  ]
}

// ─── Right Now Priority Card ────────────────────────────────────────────────

function computeRightNow(
  timeline: TimelineEvent[],
  stakes: StakeItem[],
  isLateNight: boolean,
  dayOfWeek: number,
): RightNowData {
  const now = new Date()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()

  // ── Next class ──
  let nextClass: RightNowData['nextClass'] = null

  if (isLateNight) {
    // Night mode: show first class tomorrow
    const tomorrowDay = (dayOfWeek + 1) % 7
    const tomorrowClasses = (SCHEDULE[tomorrowDay] ?? []).filter(c => c.type === 'class')
    if (tomorrowClasses.length > 0) {
      const first = tomorrowClasses[0]
      nextClass = {
        courseCode: first.courseCode,
        title: first.title.replace(/^[^:]+:\s*/, ''), // strip "LAW 756: " prefix
        time: formatTimeLabel(first.startTime),
        location: first.location,
        minutesUntil: -1, // tomorrow
        isNow: false,
      }
    }
  } else {
    for (const ev of timeline) {
      if (ev.type !== 'class') continue
      const [h, m] = ev.startTime.split(':').map(Number)
      const [eh, em] = ev.endTime.split(':').map(Number)
      const startMin = h * 60 + m
      const endMin = eh * 60 + em

      // Currently in class
      if (nowMinutes >= startMin && nowMinutes < endMin) {
        nextClass = {
          courseCode: ev.courseCode ?? '',
          title: ev.title.replace(/^[^:]+:\s*/, ''),
          time: 'NOW',
          location: ev.location ?? '',
          minutesUntil: 0,
          isNow: true,
        }
        break
      }

      // Next upcoming class
      if (startMin > nowMinutes) {
        nextClass = {
          courseCode: ev.courseCode ?? '',
          title: ev.title.replace(/^[^:]+:\s*/, ''),
          time: formatTimeLabel(ev.startTime),
          location: ev.location ?? '',
          minutesUntil: startMin - nowMinutes,
          isNow: false,
        }
        break
      }
    }
  }

  // ── Urgent email (synthetic — matches InboxPreview's getSyntheticEmails) ──
  // In production this would come from the email API; for now we pick the demo urgent email
  let urgentEmail: RightNowData['urgentEmail'] = null
  const syntheticEmails = [
    { sender: 'UK Financial Aid', subject: 'FAFSA Renewal Reminder — Deadline April 15', urgency: 'respond-today' as const },
    { sender: 'Prof. Rodriguez', subject: 'Re: Con Law office hours Thursday', urgency: 'this-week' as const },
  ]
  urgentEmail = syntheticEmails.find(e => e.urgency === 'respond-today')
    ?? syntheticEmails.find(e => e.urgency === 'this-week')
    ?? null

  // ── Top deadline ──
  let topDeadline: RightNowData['topDeadline'] = null
  // Sort by daysLeft ascending (overdue first), only show items within 7 days
  const relevantStakes = stakes
    .filter(s => s.daysLeft <= 7)
    .sort((a, b) => a.daysLeft - b.daysLeft)

  if (relevantStakes.length > 0) {
    const top = relevantStakes[0]
    let dueLabel: string
    let urgency: 'critical' | 'warning' | 'info'

    if (top.daysLeft < 0 || top.urgency === 'overdue') {
      dueLabel = 'OVERDUE'
      urgency = 'critical'
    } else if (top.daysLeft === 0 || top.urgency === 'today') {
      dueLabel = 'due today'
      urgency = 'critical'
    } else if (top.daysLeft === 1) {
      dueLabel = 'due tomorrow'
      urgency = 'warning'
    } else {
      dueLabel = `due in ${top.daysLeft} days`
      urgency = top.daysLeft <= 3 ? 'warning' : 'info'
    }

    topDeadline = {
      courseCode: top.courseCode,
      title: top.title,
      dueLabel,
      urgency,
    }
  }

  return { nextClass, urgentEmail, topDeadline }
}

// ─── Main Generator ─────────────────────────────────────────────────────────

export function getStudentHomeData(userName: string): StudentHomeSimData {
  const now = new Date()
  const hour = now.getHours()
  const dayOfWeek = now.getDay()
  const firstName = userName.split(' ')[0] || 'Student'
  const timeOfDay = getTimeOfDay(hour)

  const weather = buildWeather()
  const timeline = buildTimeline(dayOfWeek)
  const stakes = buildStakes()
  const beacon = computeBeacon(hour, timeline, dayOfWeek, weather, stakes)
  const sandyInsights = buildSandyInsights(hour, timeOfDay)
  const pulse = buildPulse()
  const campusLife = buildCampusLife(timeOfDay)
  const quickActions = buildQuickActions(timeOfDay, stakes)
  const greeting = buildGreeting(hour, firstName)
  const isLateNight = hour >= 22 || hour < 6
  const rightNow = computeRightNow(timeline, stakes, isLateNight, dayOfWeek)
  const tomorrowPreview = computeTomorrowPreview(dayOfWeek, hour, stakes)

  return {
    beacon,
    timeline,
    stakes,
    sandyInsights,
    pulse,
    campusLife,
    weather,
    quickActions,
    finalsCalculator: buildFinalsCalculator(),
    studyPlan: buildStudyPlan(),
    recentGrades: buildRecentGrades(),
    greeting,
    firstName,
    studentInfo: { year: '1L', major: 'Juris Doctor' },
    rightNow,
    tomorrowPreview,
    timeOfDay,
    isLateNight,
  }
}

export { formatTimeLabel }
