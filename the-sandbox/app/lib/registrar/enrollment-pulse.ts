import { prisma } from '../prisma'

// ── Types ────────────────────────────────────────────────────────────────────

export interface SectionDetail {
  courseCode: string
  courseName: string
  section: string
  enrolled: number
  capacity: number
  waitlist: number
  instructor: string
}

export interface DepartmentEnrollment {
  department: string
  totalSections: number
  fullSections: number
  waitlistedStudents: number
  openSeats: number
  capacityPercent: number
  sections: SectionDetail[]
}

export interface EnrollmentPulseData {
  term: string
  departments: DepartmentEnrollment[]
  summary: {
    totalCapacityPercent: number
    totalWaitlisted: number
    sectionsAtCapacity: number
    totalSections: number
  }
}

// ── Deterministic helpers ────────────────────────────────────────────────────

function hashDepartment(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) {
    h += name.charCodeAt(i)
  }
  return h
}

const FALLBACK_DEPARTMENTS = [
  'Computer Science',
  'Biology',
  'English',
  'Mathematics',
  'Law',
  'Chemistry',
  'Psychology',
  'Mechanical Engineering',
]

const INSTRUCTOR_POOL = [
  'Dr. Smith',
  'Dr. Chen',
  'Dr. Williams',
  'Prof. Martinez',
  'Dr. Patel',
  'Dr. Johnson',
  'Prof. Garcia',
  'Dr. Kim',
  'Dr. Brown',
  'Prof. Davis',
  'Dr. Taylor',
  'Dr. Anderson',
  'Prof. Wilson',
  'Dr. Thomas',
  'Dr. Lee',
  'Prof. Robinson',
  'Dr. Clark',
  'Dr. Hall',
  'Prof. Young',
  'Dr. Wright',
]

// Department → course prefix mapping
const DEPT_COURSE_MAP: Record<string, { prefix: string; courses: { code: string; name: string }[] }> = {
  'Computer Science': {
    prefix: 'CS',
    courses: [
      { code: '101', name: 'Intro to Computer Science' },
      { code: '215', name: 'Data Structures' },
      { code: '315', name: 'Algorithms' },
      { code: '405', name: 'Operating Systems' },
      { code: '460', name: 'Machine Learning' },
    ],
  },
  'Biology': {
    prefix: 'BIO',
    courses: [
      { code: '148', name: 'Introductory Biology I' },
      { code: '152', name: 'Introductory Biology II' },
      { code: '301', name: 'Genetics' },
      { code: '350', name: 'Ecology' },
      { code: '425', name: 'Molecular Biology' },
    ],
  },
  'English': {
    prefix: 'ENG',
    courses: [
      { code: '104', name: 'Writing I' },
      { code: '200', name: 'American Literature' },
      { code: '261', name: 'British Literature' },
      { code: '330', name: 'Creative Writing' },
      { code: '410', name: 'Advanced Composition' },
    ],
  },
  'Mathematics': {
    prefix: 'MA',
    courses: [
      { code: '109', name: 'College Algebra' },
      { code: '113', name: 'Calculus I' },
      { code: '114', name: 'Calculus II' },
      { code: '322', name: 'Linear Algebra' },
      { code: '471', name: 'Real Analysis' },
    ],
  },
  'Law': {
    prefix: 'LAW',
    courses: [
      { code: '801', name: 'Civil Procedure' },
      { code: '805', name: 'Constitutional Law' },
      { code: '810', name: 'Contracts' },
      { code: '820', name: 'Criminal Law' },
      { code: '830', name: 'Property' },
    ],
  },
  'Chemistry': {
    prefix: 'CHE',
    courses: [
      { code: '105', name: 'General Chemistry I' },
      { code: '107', name: 'General Chemistry II' },
      { code: '230', name: 'Organic Chemistry I' },
      { code: '232', name: 'Organic Chemistry II' },
      { code: '550', name: 'Physical Chemistry' },
    ],
  },
  'Psychology': {
    prefix: 'PSY',
    courses: [
      { code: '100', name: 'Intro to Psychology' },
      { code: '215', name: 'Abnormal Psychology' },
      { code: '310', name: 'Cognitive Psychology' },
      { code: '350', name: 'Social Psychology' },
      { code: '430', name: 'Behavioral Neuroscience' },
    ],
  },
  'Mechanical Engineering': {
    prefix: 'ME',
    courses: [
      { code: '201', name: 'Statics' },
      { code: '220', name: 'Thermodynamics' },
      { code: '330', name: 'Fluid Mechanics' },
      { code: '340', name: 'Machine Design' },
      { code: '450', name: 'Heat Transfer' },
    ],
  },
}

// Generic fallback for departments not in the map
function getCoursesForDept(department: string): { prefix: string; courses: { code: string; name: string }[] } {
  if (DEPT_COURSE_MAP[department]) return DEPT_COURSE_MAP[department]

  // Generate a reasonable prefix from the department name
  const words = department.split(/\s+/)
  const prefix = words.length > 1
    ? words.map(w => w[0]).join('').toUpperCase().slice(0, 3)
    : department.slice(0, 3).toUpperCase()

  return {
    prefix,
    courses: [
      { code: '101', name: `Intro to ${department}` },
      { code: '201', name: `Intermediate ${department}` },
      { code: '301', name: `Advanced ${department}` },
      { code: '401', name: `${department} Seminar` },
      { code: '450', name: `${department} Capstone` },
    ],
  }
}

function buildDepartmentData(department: string): DepartmentEnrollment {
  const h = hashDepartment(department)

  const totalSections = (h % 26) + 10
  const capacityPercent = (h % 41) + 55
  const fullSections = Math.round(totalSections * (capacityPercent / 100))
  const waitlistedStudents = capacityPercent > 80
    ? (h % 150) + 10
    : (h % 40)
  const openSeats = Math.round(totalSections * 30 * (1 - capacityPercent / 100))

  // Generate 3-5 sample sections
  const numSections = (h % 3) + 3
  const { prefix, courses } = getCoursesForDept(department)
  const sections: SectionDetail[] = []

  for (let i = 0; i < numSections; i++) {
    const course = courses[i % courses.length]
    const sectionCap = 25 + ((h + i * 7) % 16) // 25-40
    const sectionEnrolled = Math.round(sectionCap * (capacityPercent / 100) + ((h + i) % 5) - 2)
    const clampedEnrolled = Math.max(0, Math.min(sectionCap, sectionEnrolled))
    const sectionWaitlist = clampedEnrolled >= sectionCap
      ? (h + i * 3) % 12
      : 0

    sections.push({
      courseCode: `${prefix} ${course.code}`,
      courseName: course.name,
      section: `00${(i + 1)}`.slice(-3),
      enrolled: clampedEnrolled,
      capacity: sectionCap,
      waitlist: sectionWaitlist,
      instructor: INSTRUCTOR_POOL[(h + i * 3) % INSTRUCTOR_POOL.length],
    })
  }

  return {
    department,
    totalSections,
    fullSections,
    waitlistedStudents,
    openSeats,
    capacityPercent,
    sections,
  }
}

// ── Main service function ────────────────────────────────────────────────────

export async function getEnrollmentPulse(): Promise<EnrollmentPulseData> {
  // Try to fetch actual departments from the database
  let departments: string[] = []

  try {
    const programs = await prisma.degreeProgram.findMany({
      select: { department: true },
    })
    const unique = [...new Set(programs.map(p => p.department))]
    if (unique.length > 0) departments = unique
  } catch {
    // DB unavailable or model doesn't exist — fall through to fallback
  }

  if (departments.length === 0) {
    departments = FALLBACK_DEPARTMENTS
  }

  const deptData = departments.map(buildDepartmentData)

  // Compute summary using weighted average for capacity
  const totalSections = deptData.reduce((s, d) => s + d.totalSections, 0)
  const weightedCapacity = deptData.reduce((s, d) => s + d.capacityPercent * d.totalSections, 0)
  const totalCapacityPercent = totalSections > 0
    ? Math.round(weightedCapacity / totalSections)
    : 0
  const totalWaitlisted = deptData.reduce((s, d) => s + d.waitlistedStudents, 0)
  const sectionsAtCapacity = deptData.reduce((s, d) => s + d.fullSections, 0)

  return {
    term: 'Spring 2026',
    departments: deptData,
    summary: {
      totalCapacityPercent,
      totalWaitlisted,
      sectionsAtCapacity,
      totalSections,
    },
  }
}
