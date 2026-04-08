// ── Academic Standing Processor ──────────────────────────────────────────────
// Simulates an end-of-term batch processor that evaluates every student's GPA
// and computes their new academic standing.  All data is deterministic — no DB
// queries, no randomness — so the output is identical on every call.

// ── Types ────────────────────────────────────────────────────────────────────

export interface StandingStudent {
  id: string
  name: string
  email: string
  program: string
  termGPA: number
  cumulativeGPA: number
  termCredits: number
  previousStanding: string
  newStanding: string
  changed: boolean
}

export interface StandingSummary {
  term: string
  totalReviewed: number
  totalChanged: number
  breakdown: { standing: string; count: number; changed: number }[]
  sandySummary: string
}

export interface AcademicStandingData {
  summary: StandingSummary
  students: StandingStudent[]
}

// ── Seed data ────────────────────────────────────────────────────────────────

const STUDENT_NAMES = [
  'Marcus Johnson',
  'Aaliyah Chen',
  'Devon Williams',
  'Sophia Patel',
  'Tyler Rodriguez',
  'Emma Washington',
  'Jordan Kim',
  'Olivia Martinez',
  'Ethan Thompson',
  'Mia Garcia',
  'Noah Anderson',
  'Isabella Lewis',
  'Liam Robinson',
  'Ava Jackson',
  'Mason White',
  'Charlotte Harris',
  'Benjamin Clark',
  'Amelia Young',
  'Lucas King',
  'Harper Scott',
  'Alexander Wright',
  'Evelyn Green',
  'James Baker',
  'Abigail Adams',
  'Daniel Nelson',
  'Emily Hill',
  'William Moore',
  'Grace Taylor',
  'Owen Campbell',
  'Chloe Mitchell',
]

const PROGRAMS = ['CS-BS', 'BIO-BS', 'ENG-BA', 'PSY-BA', 'LAW-JD', 'CHE-BS', 'ME-BS', 'MATH-BS']

const STANDINGS = ['DEANS_LIST', 'GOOD', 'PROBATION', 'SUSPENSION', 'DISMISSED'] as const

// ── Deterministic helpers ────────────────────────────────────────────────────

function hashName(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) & 0x7fffffff
  }
  return h
}

/** Map a hash into a float in [min, max) with two-decimal precision */
function hashFloat(h: number, min: number, max: number): number {
  const raw = min + (h % 1000) / 1000 * (max - min)
  return Math.round(raw * 100) / 100
}

/** Map a hash into an int in [min, max] */
function hashInt(h: number, min: number, max: number): number {
  return min + (h % (max - min + 1))
}

function emailFromName(name: string): string {
  const [first, last] = name.toLowerCase().split(' ')
  return `${first}.${last}@uky.edu`
}

// ── Standing computation ─────────────────────────────────────────────────────

function computeStanding(
  termGPA: number,
  termCredits: number,
  previousStanding: string,
): string {
  // Dean's List: GPA >= 3.6 AND >= 12 credits
  if (termGPA >= 3.6 && termCredits >= 12) return 'DEANS_LIST'

  // Good standing: GPA >= 2.0
  if (termGPA >= 2.0) return 'GOOD'

  // Below 2.0 — check severity
  if (termGPA < 1.5) {
    // Third consecutive term below 2.0 → dismissed
    if (previousStanding === 'SUSPENSION') return 'DISMISSED'
    // Second consecutive or very low → suspension
    if (previousStanding === 'PROBATION') return 'SUSPENSION'
    return 'PROBATION'
  }

  // GPA 1.5–1.99
  if (previousStanding === 'SUSPENSION') return 'DISMISSED'
  if (previousStanding === 'PROBATION') return 'SUSPENSION'
  return 'PROBATION'
}

// ── Generate student records ─────────────────────────────────────────────────

function generateStudents(): StandingStudent[] {
  return STUDENT_NAMES.map((name, idx) => {
    const h = hashName(name)

    // Derive GPA — use different hash offsets for term vs cumulative
    const termGPA = hashFloat(h, 1.0, 4.0)
    const cumulativeGPA = hashFloat(h + 7919, 1.5, 4.0) // slightly higher floor for cumulative
    const termCredits = hashInt(h + 1471, 3, 18)
    const program = PROGRAMS[h % PROGRAMS.length]

    // Previous standing — derived from a secondary hash
    const prevIdx = (h + 3571) % 10
    let previousStanding: string
    if (prevIdx <= 4) previousStanding = 'GOOD'
    else if (prevIdx <= 6) previousStanding = 'DEANS_LIST'
    else if (prevIdx <= 8) previousStanding = 'PROBATION'
    else previousStanding = 'SUSPENSION'

    const newStanding = computeStanding(termGPA, termCredits, previousStanding)

    return {
      id: `stu-standing-${idx.toString().padStart(3, '0')}`,
      name,
      email: emailFromName(name),
      program,
      termGPA,
      cumulativeGPA,
      termCredits,
      previousStanding,
      newStanding,
      changed: newStanding !== previousStanding,
    }
  })
}

// ── Build summary ────────────────────────────────────────────────────────────

function buildSummary(students: StandingStudent[]): StandingSummary {
  const totalChanged = students.filter(s => s.changed).length

  const breakdownMap = new Map<string, { count: number; changed: number }>()
  for (const standing of STANDINGS) {
    breakdownMap.set(standing, { count: 0, changed: 0 })
  }
  for (const s of students) {
    const entry = breakdownMap.get(s.newStanding)
    if (entry) {
      entry.count++
      if (s.changed) entry.changed++
    }
  }

  const breakdown = STANDINGS.map(standing => ({
    standing,
    count: breakdownMap.get(standing)!.count,
    changed: breakdownMap.get(standing)!.changed,
  }))

  // Build Sandy summary
  const deansCount = breakdownMap.get('DEANS_LIST')!.count
  const probationCount = breakdownMap.get('PROBATION')!.count
  const suspensionCount = breakdownMap.get('SUSPENSION')!.count
  const dismissedCount = breakdownMap.get('DISMISSED')!.count

  const parts: string[] = [
    `Term standing review complete. ${students.length} students reviewed`,
  ]

  if (deansCount > 0) parts.push(`${deansCount} earned Dean's List`)
  if (probationCount > 0) parts.push(`${probationCount} moved to probation`)
  if (suspensionCount > 0) parts.push(`${suspensionCount} suspended`)
  if (dismissedCount > 0) parts.push(`${dismissedCount} dismissed`)

  const sandySummary =
    parts.join(' — ') + `. ${totalChanged} student${totalChanged !== 1 ? 's' : ''} saw a standing change this term.`

  return {
    term: 'Spring 2026',
    totalReviewed: students.length,
    totalChanged,
    breakdown,
    sandySummary,
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function getAcademicStanding(): Promise<AcademicStandingData> {
  const students = generateStudents()
  const summary = buildSummary(students)
  return { summary, students }
}
