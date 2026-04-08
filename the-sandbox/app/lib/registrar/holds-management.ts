// ── Holds Management Service ─────────────────────────────────────────────────
// Generates deterministic simulated hold data for the Registrar Command Center.
// No database queries — all data is hardcoded and computed.

// ── Types ────────────────────────────────────────────────────────────────────

export type HoldType = 'FINANCIAL' | 'ADVISING' | 'IMMUNIZATION' | 'DISCIPLINARY' | 'LIBRARY' | 'PARKING'

export interface StudentHold {
  id: string
  studentId: string
  studentName: string
  studentEmail: string
  studentProgram: string
  type: HoldType
  description: string
  placedBy: string
  placedAt: string  // ISO date
  ageDays: number
  bulkReleasable: boolean
  amount?: number  // only for FINANCIAL holds
}

export interface HoldTypeSummary {
  type: string
  label: string
  count: number
  bulkReleasable: number
  icon: string  // lucide icon name hint
}

export interface HoldsManagementData {
  holds: StudentHold[]
  typeSummary: HoldTypeSummary[]
  totalHolds: number
  totalStudentsAffected: number
  totalBulkReleasable: number
  sandyInsights: string[]
}

// ── Hold type metadata ───────────────────────────────────────────────────────

const HOLD_META: Record<HoldType, { label: string; placedBy: string; icon: string }> = {
  FINANCIAL:    { label: 'Financial',    placedBy: 'Bursar\'s Office',          icon: 'DollarSign' },
  ADVISING:     { label: 'Advising',     placedBy: 'Academic Advising',         icon: 'Users' },
  IMMUNIZATION: { label: 'Immunization', placedBy: 'Student Health',            icon: 'Stethoscope' },
  DISCIPLINARY: { label: 'Disciplinary', placedBy: 'Dean of Students',          icon: 'Scale' },
  LIBRARY:      { label: 'Library',      placedBy: 'University Libraries',      icon: 'BookOpen' },
  PARKING:      { label: 'Parking',      placedBy: 'Transportation Services',   icon: 'Car' },
}

// ── Student pool ─────────────────────────────────────────────────────────────

interface StudentInfo {
  id: string
  name: string
  email: string
  program: string
}

const STUDENTS: StudentInfo[] = [
  { id: 'stu-001', name: 'Marcus Williams',    email: 'marcus.williams@uky.edu',    program: 'Computer Science BS' },
  { id: 'stu-002', name: 'Jasmine Carter',     email: 'jasmine.carter@uky.edu',     program: 'Biology BS' },
  { id: 'stu-003', name: 'David Chen',         email: 'david.chen@uky.edu',         program: 'Mechanical Engineering BS' },
  { id: 'stu-004', name: 'Aaliyah Johnson',    email: 'aaliyah.johnson@uky.edu',    program: 'Nursing BSN' },
  { id: 'stu-005', name: 'Tyler Robinson',     email: 'tyler.robinson@uky.edu',     program: 'Finance BBA' },
  { id: 'stu-006', name: 'Maria Gonzalez',     email: 'maria.gonzalez@uky.edu',     program: 'Psychology BA' },
  { id: 'stu-007', name: 'James Thompson',     email: 'james.thompson@uky.edu',     program: 'Law JD' },
  { id: 'stu-008', name: 'Destiny Brown',      email: 'destiny.brown@uky.edu',      program: 'English BA' },
  { id: 'stu-009', name: 'Kevin Patel',        email: 'kevin.patel@uky.edu',        program: 'Chemistry BS' },
  { id: 'stu-010', name: 'Sierra Davis',       email: 'sierra.davis@uky.edu',       program: 'Marketing BBA' },
  { id: 'stu-011', name: 'Brandon Lee',        email: 'brandon.lee@uky.edu',        program: 'Civil Engineering BS' },
  { id: 'stu-012', name: 'Olivia Martinez',    email: 'olivia.martinez@uky.edu',    program: 'Political Science BA' },
  { id: 'stu-013', name: 'Noah Anderson',      email: 'noah.anderson@uky.edu',      program: 'Pharmacy PharmD' },
  { id: 'stu-014', name: 'Chloe Kim',          email: 'chloe.kim@uky.edu',          program: 'Architecture BS' },
  { id: 'stu-015', name: 'Elijah Moore',       email: 'elijah.moore@uky.edu',       program: 'Mathematics BS' },
  { id: 'stu-016', name: 'Sophia Taylor',      email: 'sophia.taylor@uky.edu',      program: 'Social Work MSW' },
  { id: 'stu-017', name: 'Liam Jackson',       email: 'liam.jackson@uky.edu',       program: 'Economics BA' },
  { id: 'stu-018', name: 'Ava White',          email: 'ava.white@uky.edu',          program: 'Communication BA' },
  { id: 'stu-019', name: 'Ethan Harris',       email: 'ethan.harris@uky.edu',       program: 'Electrical Engineering BS' },
  { id: 'stu-020', name: 'Isabella Clark',     email: 'isabella.clark@uky.edu',     program: 'Art Studio BFA' },
  { id: 'stu-021', name: 'Mason Wright',       email: 'mason.wright@uky.edu',       program: 'Kinesiology BS' },
  { id: 'stu-022', name: 'Emma Lewis',         email: 'emma.lewis@uky.edu',         program: 'Education MAT' },
  { id: 'stu-023', name: 'Alexander Young',    email: 'alexander.young@uky.edu',    program: 'Public Health MPH' },
  { id: 'stu-024', name: 'Mia Hall',           email: 'mia.hall@uky.edu',           program: 'History BA' },
  { id: 'stu-025', name: 'Daniel Scott',       email: 'daniel.scott@uky.edu',       program: 'Agricultural Economics BS' },
]

// ── Deterministic hold definitions ───────────────────────────────────────────

interface HoldDef {
  studentIdx: number
  type: HoldType
  description: string
  daysAgo: number
  amount?: number
}

const HOLD_DEFS: HoldDef[] = [
  // Financial holds (8)
  { studentIdx: 0,  type: 'FINANCIAL',    description: 'Outstanding tuition balance — Spring 2026',         daysAgo: 15, amount: 3200 },
  { studentIdx: 3,  type: 'FINANCIAL',    description: 'Unpaid lab fees — CHE 230',                         daysAgo: 8,  amount: 240 },
  { studentIdx: 6,  type: 'FINANCIAL',    description: 'Past-due tuition balance — Fall 2025',              daysAgo: 72, amount: 3800 },
  { studentIdx: 9,  type: 'FINANCIAL',    description: 'Outstanding housing deposit',                       daysAgo: 25, amount: 500 },
  { studentIdx: 12, type: 'FINANCIAL',    description: 'Unpaid tuition balance — Spring 2026',              daysAgo: 12, amount: 1850 },
  { studentIdx: 16, type: 'FINANCIAL',    description: 'Outstanding student health insurance premium',      daysAgo: 33, amount: 1200 },
  { studentIdx: 19, type: 'FINANCIAL',    description: 'Past-due studio materials fee',                     daysAgo: 45, amount: 380 },
  { studentIdx: 22, type: 'FINANCIAL',    description: 'Unpaid international student services fee',         daysAgo: 5,  amount: 750 },

  // Advising holds (7)
  { studentIdx: 1,  type: 'ADVISING',     description: 'Must complete advising appointment before registration', daysAgo: 35 },
  { studentIdx: 4,  type: 'ADVISING',     description: 'Advising hold — degree plan review required',           daysAgo: 42 },
  { studentIdx: 7,  type: 'ADVISING',     description: 'Major declaration advising appointment required',       daysAgo: 18 },
  { studentIdx: 10, type: 'ADVISING',     description: 'Academic probation advising meeting required',          daysAgo: 55 },
  { studentIdx: 14, type: 'ADVISING',     description: 'Must complete advising appointment before registration', daysAgo: 38 },
  { studentIdx: 17, type: 'ADVISING',     description: 'Pre-registration advising hold',                       daysAgo: 31 },
  { studentIdx: 23, type: 'ADVISING',     description: 'Transfer credit evaluation meeting required',           daysAgo: 48 },

  // Immunization holds (5)
  { studentIdx: 2,  type: 'IMMUNIZATION', description: 'Missing MMR vaccination record',                        daysAgo: 60 },
  { studentIdx: 5,  type: 'IMMUNIZATION', description: 'Meningitis vaccination documentation required',         daysAgo: 22 },
  { studentIdx: 11, type: 'IMMUNIZATION', description: 'Missing Tdap booster record',                           daysAgo: 14 },
  { studentIdx: 15, type: 'IMMUNIZATION', description: 'Hepatitis B vaccination series incomplete',              daysAgo: 78 },
  { studentIdx: 20, type: 'IMMUNIZATION', description: 'Missing COVID-19 vaccination documentation',            daysAgo: 9 },

  // Disciplinary holds (3)
  { studentIdx: 8,  type: 'DISCIPLINARY', description: 'Student conduct review — academic integrity violation',  daysAgo: 30 },
  { studentIdx: 13, type: 'DISCIPLINARY', description: 'Residence hall policy violation — pending hearing',      daysAgo: 7 },
  { studentIdx: 24, type: 'DISCIPLINARY', description: 'Student conduct investigation — pending resolution',    daysAgo: 88 },

  // Library holds (6)
  { studentIdx: 1,  type: 'LIBRARY',      description: 'Overdue interlibrary loan materials — 3 items',         daysAgo: 40 },
  { studentIdx: 5,  type: 'LIBRARY',      description: 'Lost library book — replacement charge pending',        daysAgo: 65 },
  { studentIdx: 10, type: 'LIBRARY',      description: 'Unreturned reserve materials — 2 items',                daysAgo: 33 },
  { studentIdx: 18, type: 'LIBRARY',      description: 'Overdue media equipment — camera kit',                  daysAgo: 12 },
  { studentIdx: 21, type: 'LIBRARY',      description: 'Outstanding library fines — $47.50',                    daysAgo: 52 },
  { studentIdx: 24, type: 'LIBRARY',      description: 'Overdue special collections materials',                 daysAgo: 38 },

  // Parking holds (8)
  { studentIdx: 0,  type: 'PARKING',      description: 'Unpaid parking citation #PC-2026-1847',                 daysAgo: 20 },
  { studentIdx: 3,  type: 'PARKING',      description: 'Two unpaid parking citations — $90 total',              daysAgo: 44 },
  { studentIdx: 7,  type: 'PARKING',      description: 'Unpaid parking citation #PC-2026-2103',                 daysAgo: 11 },
  { studentIdx: 11, type: 'PARKING',      description: 'Expired parking permit — vehicle towed',                daysAgo: 35 },
  { studentIdx: 14, type: 'PARKING',      description: 'Unpaid parking citation #PC-2026-1592',                 daysAgo: 62 },
  { studentIdx: 17, type: 'PARKING',      description: 'Three unpaid parking citations — $135 total',           daysAgo: 50 },
  { studentIdx: 20, type: 'PARKING',      description: 'Unpaid parking citation #PC-2026-2341',                 daysAgo: 3 },
  { studentIdx: 23, type: 'PARKING',      description: 'Unpaid parking citation #PC-2026-0988',                 daysAgo: 71 },
]

// ── Helpers ──────────────────────────────────────────────────────────────────

function daysAgoToISO(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().split('T')[0]
}

function isBulkReleasable(type: HoldType, ageDays: number): boolean {
  // Advising, library, and parking holds older than 30 days are bulk-releasable
  if ((type === 'ADVISING' || type === 'LIBRARY' || type === 'PARKING') && ageDays > 30) {
    return true
  }
  return false
}

// ── Main export ──────────────────────────────────────────────────────────────

export async function getHoldsManagement(): Promise<HoldsManagementData> {
  // Build hold records
  const holds: StudentHold[] = HOLD_DEFS.map((def, idx) => {
    const student = STUDENTS[def.studentIdx]
    const meta = HOLD_META[def.type]
    return {
      id: `hold-${String(idx + 1).padStart(3, '0')}`,
      studentId: student.id,
      studentName: student.name,
      studentEmail: student.email,
      studentProgram: student.program,
      type: def.type,
      description: def.description,
      placedBy: meta.placedBy,
      placedAt: daysAgoToISO(def.daysAgo),
      ageDays: def.daysAgo,
      bulkReleasable: isBulkReleasable(def.type, def.daysAgo),
      ...(def.amount !== undefined ? { amount: def.amount } : {}),
    }
  })

  // Type summaries
  const typeOrder: HoldType[] = ['FINANCIAL', 'ADVISING', 'IMMUNIZATION', 'DISCIPLINARY', 'LIBRARY', 'PARKING']
  const typeSummary: HoldTypeSummary[] = typeOrder.map(type => {
    const meta = HOLD_META[type]
    const ofType = holds.filter(h => h.type === type)
    return {
      type,
      label: meta.label,
      count: ofType.length,
      bulkReleasable: ofType.filter(h => h.bulkReleasable).length,
      icon: meta.icon,
    }
  })

  // Unique students affected
  const uniqueStudents = new Set(holds.map(h => h.studentId))

  // Total bulk releasable
  const totalBulkReleasable = holds.filter(h => h.bulkReleasable).length

  // Financial totals
  const financialHolds = holds.filter(h => h.type === 'FINANCIAL')
  const financialTotal = financialHolds.reduce((sum, h) => sum + (h.amount ?? 0), 0)

  // Immunization blocking registration
  const immunizationCount = holds.filter(h => h.type === 'IMMUNIZATION').length

  // Advising holds with completed appointments (simulated — those older than 30 days)
  const advisingReleasable = holds.filter(h => h.type === 'ADVISING' && h.bulkReleasable).length

  // Sandy insights (template-based, not LLM)
  const sandyInsights: string[] = []

  if (advisingReleasable > 0) {
    sandyInsights.push(
      `${advisingReleasable} advising hold${advisingReleasable !== 1 ? 's' : ''} can be released — all students completed advising this week`
    )
  }

  sandyInsights.push(
    `${financialHolds.length} financial hold${financialHolds.length !== 1 ? 's' : ''} total $${financialTotal.toLocaleString()} in outstanding balances`
  )

  if (immunizationCount > 0) {
    sandyInsights.push(
      `${immunizationCount} immunization hold${immunizationCount !== 1 ? 's' : ''} ${immunizationCount === 1 ? 'is' : 'are'} blocking registration for ${immunizationCount} student${immunizationCount !== 1 ? 's' : ''}`
    )
  }

  if (totalBulkReleasable > 0) {
    sandyInsights.push(
      `${totalBulkReleasable} hold${totalBulkReleasable !== 1 ? 's' : ''} across advising, library, and parking are eligible for bulk release`
    )
  }

  return {
    holds,
    typeSummary,
    totalHolds: holds.length,
    totalStudentsAffected: uniqueStudents.size,
    totalBulkReleasable,
    sandyInsights,
  }
}
