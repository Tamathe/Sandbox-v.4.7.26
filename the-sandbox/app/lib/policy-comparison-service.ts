export interface PolicyConflict {
  type: 'late' | 'attendance'
  courseCodes: string[]
  description: string
}

interface CourseWithPolicies {
  courseCode: string
  policies: { policyType: string; title: string; content: string }[]
  gradingWeights: { category: string; weight: number }[]
}

export interface PolicyComparison {
  conflicts: PolicyConflict[]
  insights: string[]
}

const STRICT_LATE_KEYWORDS = ['no late', 'zero tolerance', 'will not be accepted after', 'no exceptions']
const LENIENT_LATE_KEYWORDS = ['grace period', 'late penalty', 'deduction per day', '24-hour extension', 'excused late']
const MANDATORY_ATTENDANCE_KEYWORDS = ['mandatory attendance', 'attendance is required', 'required to attend', 'attendance policy: required']
const FLEXIBLE_ATTENDANCE_KEYWORDS = ['attendance is encouraged', 'attendance is not mandatory', 'optional attendance', 'not required to attend']

export function comparePoliciesAcrossCourses(courses: CourseWithPolicies[]): PolicyComparison {
  const conflicts: PolicyConflict[] = []
  const insights: string[] = []

  if (courses.length < 2) return { conflicts, insights }

  // ── Late policy conflicts ──────────────────────────────────────────────
  const strictLateCourses: string[] = []
  const lenientLateCourses: string[] = []

  for (const course of courses) {
    const latePolicies = course.policies.filter(p => p.policyType === 'late')
    for (const p of latePolicies) {
      const lower = p.content.toLowerCase()
      if (STRICT_LATE_KEYWORDS.some(k => lower.includes(k))) {
        strictLateCourses.push(course.courseCode)
        break
      }
      if (LENIENT_LATE_KEYWORDS.some(k => lower.includes(k))) {
        lenientLateCourses.push(course.courseCode)
        break
      }
    }
  }

  if (strictLateCourses.length > 0 && lenientLateCourses.length > 0) {
    conflicts.push({
      type: 'late',
      courseCodes: [...strictLateCourses, ...lenientLateCourses],
      description: `${strictLateCourses.join(', ')} ${strictLateCourses.length === 1 ? 'has' : 'have'} strict no-late policies, while ${lenientLateCourses.join(', ')} ${lenientLateCourses.length === 1 ? 'allows' : 'allow'} grace periods.`,
    })
  }

  // ── Attendance conflicts ───────────────────────────────────────────────
  const mandatoryCourses: string[] = []
  const flexibleCourses: string[] = []

  for (const course of courses) {
    const attendancePolicies = course.policies.filter(p => p.policyType === 'attendance')
    for (const p of attendancePolicies) {
      const lower = p.content.toLowerCase()
      if (MANDATORY_ATTENDANCE_KEYWORDS.some(k => lower.includes(k))) {
        mandatoryCourses.push(course.courseCode)
        break
      }
      if (FLEXIBLE_ATTENDANCE_KEYWORDS.some(k => lower.includes(k))) {
        flexibleCourses.push(course.courseCode)
        break
      }
    }
  }

  if (mandatoryCourses.length > 0 && flexibleCourses.length > 0) {
    conflicts.push({
      type: 'attendance',
      courseCodes: [...mandatoryCourses, ...flexibleCourses],
      description: `${mandatoryCourses.join(', ')} ${mandatoryCourses.length === 1 ? 'requires' : 'require'} mandatory attendance, while ${flexibleCourses.join(', ')} ${flexibleCourses.length === 1 ? 'has' : 'have'} flexible attendance.`,
    })
  }

  // ── Insights ───────────────────────────────────────────────────────────
  // Academic integrity coverage
  const aiCourses = courses.filter(c => c.policies.some(p => p.policyType === 'academic_integrity'))
  if (aiCourses.length > 0 && aiCourses.length < courses.length) {
    insights.push(`${aiCourses.length} of ${courses.length} courses require academic integrity acknowledgment`)
  } else if (aiCourses.length === courses.length && courses.length > 1) {
    insights.push(`All ${courses.length} courses require academic integrity acknowledgment`)
  }

  // Participation weight range
  const participationWeights: { courseCode: string; pct: number }[] = []
  for (const course of courses) {
    for (const w of course.gradingWeights) {
      if (w.category.toLowerCase().includes('participation')) {
        participationWeights.push({ courseCode: course.courseCode, pct: Math.round(w.weight * 100) })
      }
    }
  }
  if (participationWeights.length >= 2) {
    const min = Math.min(...participationWeights.map(w => w.pct))
    const max = Math.max(...participationWeights.map(w => w.pct))
    if (min !== max) {
      insights.push(`Participation weights range from ${min}% to ${max}% across your courses`)
    }
  }

  // Exam weight range
  const examWeights: number[] = []
  for (const course of courses) {
    for (const w of course.gradingWeights) {
      const lower = w.category.toLowerCase()
      if (lower.includes('exam') || lower.includes('midterm') || lower.includes('final')) {
        examWeights.push(Math.round(w.weight * 100))
      }
    }
  }
  if (examWeights.length >= 2) {
    const min = Math.min(...examWeights)
    const max = Math.max(...examWeights)
    if (max - min >= 15) {
      insights.push(`Exam weights vary significantly: ${min}%–${max}% across your courses`)
    }
  }

  return { conflicts, insights }
}
