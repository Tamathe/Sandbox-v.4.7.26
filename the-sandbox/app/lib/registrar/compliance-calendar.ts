// ── Compliance Calendar Service ──────────────────────────────────────────────
// Simulated but realistic federal/state/institutional reporting deadlines.
// All data is deterministic — no database queries, no LLM calls.

export interface ComplianceDeadline {
  id: string
  name: string
  agency: string
  dueDate: string
  category: 'federal' | 'accreditation' | 'state' | 'compliance' | 'operations'
  status: 'upcoming' | 'due_soon' | 'overdue' | 'completed'
  daysUntil: number
  urgency: 'critical' | 'warning' | 'normal' | 'safe'
  sandyNote: string
  recurrence: string
}

export interface ComplianceCalendarData {
  upcoming: ComplianceDeadline[]
  later: ComplianceDeadline[]
  completed: ComplianceDeadline[]
  nextCritical: ComplianceDeadline | null
}

// ── Raw deadline definitions ─────────────────────────────────────────────────

interface RawDeadline {
  id: string
  name: string
  agency: string
  month: number
  day: number
  category: ComplianceDeadline['category']
  recurrence: string
  sandyTemplates: {
    farOut: string
    approaching: string
    urgent: string
    completed: string
  }
}

const DEADLINES: RawDeadline[] = [
  {
    id: 'ipeds-fall-enrollment',
    name: 'IPEDS Fall Enrollment',
    agency: 'NCES / U.S. Department of Education',
    month: 10, day: 15,
    category: 'federal',
    recurrence: 'Annual',
    sandyTemplates: {
      farOut: 'Fall enrollment data collection opens in the fall. Ensure headcount records are accurate.',
      approaching: 'IPEDS Fall Enrollment is approaching. 3 discrepancies in enrollment data need resolution before submission.',
      urgent: 'IPEDS Fall Enrollment deadline is imminent. Verify final headcount and submit through the IPEDS portal.',
      completed: 'IPEDS Fall Enrollment submitted on time. Data verified by registrar staff.',
    },
  },
  {
    id: 'ipeds-graduation-rates',
    name: 'IPEDS Graduation Rates',
    agency: 'NCES / U.S. Department of Education',
    month: 2, day: 15,
    category: 'federal',
    recurrence: 'Annual',
    sandyTemplates: {
      farOut: 'Graduation rate data will be due in the spring. Cohort tracking is on schedule.',
      approaching: 'Graduation rate survey opens soon. 150% completion rate cohort data is ready for review.',
      urgent: 'IPEDS Graduation Rates deadline is this week. Final cohort numbers need sign-off.',
      completed: 'IPEDS Graduation Rates survey submitted. 6-year cohort completion rate: 67%.',
    },
  },
  {
    id: 'ipeds-spring-collection',
    name: 'IPEDS Spring Collection',
    agency: 'NCES / U.S. Department of Education',
    month: 4, day: 15,
    category: 'federal',
    recurrence: 'Annual',
    sandyTemplates: {
      farOut: 'Spring collection window opens in April. Finance, HR, and enrollment components included.',
      approaching: 'IPEDS Spring Collection is approaching. Enrollment data has 3 discrepancies to resolve before submission.',
      urgent: 'IPEDS Spring Collection deadline is critical. 2 data components still need institutional sign-off.',
      completed: 'IPEDS Spring Collection submitted. All 4 survey components verified.',
    },
  },
  {
    id: 'ipeds-finance',
    name: 'IPEDS Finance Survey',
    agency: 'NCES / U.S. Department of Education',
    month: 6, day: 15,
    category: 'federal',
    recurrence: 'Annual',
    sandyTemplates: {
      farOut: 'Finance survey due in June. Coordinate with VP Finance for expenditure data.',
      approaching: 'IPEDS Finance Survey approaching. Revenue and expenditure data needs reconciliation with CFO office.',
      urgent: 'IPEDS Finance Survey due this week. Final figures require provost signature.',
      completed: 'IPEDS Finance Survey submitted. Expenditure data aligned with audited financials.',
    },
  },
  {
    id: 'sacscoc-compliance',
    name: 'SACSCOC Compliance Report',
    agency: 'Southern Association of Colleges and Schools',
    month: 3, day: 1,
    category: 'accreditation',
    recurrence: 'Annual',
    sandyTemplates: {
      farOut: 'Annual compliance certification due in March. 14 core requirements to verify.',
      approaching: 'SACSCOC compliance report approaching. 3 of 14 core requirement narratives need updating.',
      urgent: 'SACSCOC compliance certification is due this week. All narratives and documentation must be finalized.',
      completed: 'SACSCOC annual compliance certification submitted. All 14 core requirements documented.',
    },
  },
  {
    id: 'sacscoc-fifth-year',
    name: 'SACSCOC Fifth-Year Review',
    agency: 'Southern Association of Colleges and Schools',
    month: 9, day: 1,
    category: 'accreditation',
    recurrence: 'Every 5 years',
    sandyTemplates: {
      farOut: 'Fifth-year interim report preparation should begin 18 months in advance.',
      approaching: 'SACSCOC Fifth-Year Review documents are due soon. QEP impact report needs completion.',
      urgent: 'SACSCOC Fifth-Year Review submission is imminent. Off-site review committee has been assigned.',
      completed: 'SACSCOC Fifth-Year Review submitted. Off-site review scheduled for November.',
    },
  },
  {
    id: 'state-enrollment-cert',
    name: 'State Enrollment Certification',
    agency: 'Kentucky Council on Postsecondary Education',
    month: 9, day: 30,
    category: 'state',
    recurrence: 'Annual',
    sandyTemplates: {
      farOut: 'Kentucky CPE enrollment certification due end of September. Census data feeds this.',
      approaching: 'State enrollment certification approaching. Census date data must be finalized first.',
      urgent: 'State enrollment certification due this week. Verify headcount matches census snapshot.',
      completed: 'State enrollment certification submitted to KY CPE. Headcount: 31,472.',
    },
  },
  {
    id: 'state-degree-production',
    name: 'State Degree Production Report',
    agency: 'Kentucky Council on Postsecondary Education',
    month: 7, day: 31,
    category: 'state',
    recurrence: 'Annual',
    sandyTemplates: {
      farOut: 'Degree production report due end of July. Track conferred degrees by CIP code.',
      approaching: 'State degree production report approaching. 2,847 degrees conferred this cycle — verify CIP code mapping.',
      urgent: 'KY CPE degree production report is due this week. Final degree counts need department sign-off.',
      completed: 'State degree production report submitted. 2,847 degrees across 142 CIP codes.',
    },
  },
  {
    id: 'ferpa-audit',
    name: 'FERPA Compliance Audit',
    agency: 'Internal — Office of Legal Counsel',
    month: 11, day: 1,
    category: 'compliance',
    recurrence: 'Annual',
    sandyTemplates: {
      farOut: 'Annual FERPA audit scheduled for November. Ensure training records are current.',
      approaching: 'FERPA compliance audit approaching. Last audit found 4 items — verify all have been remediated.',
      urgent: 'FERPA audit is this week. 12 staff training certifications expire before audit date.',
      completed: 'FERPA compliance audit completed. Zero findings — all training current.',
    },
  },
  {
    id: 'graduation-clearance',
    name: 'Graduation Clearance Deadline',
    agency: 'Internal — Registrar\'s Office',
    month: 4, day: 30,
    category: 'operations',
    recurrence: 'Per-term (Spring)',
    sandyTemplates: {
      farOut: 'Spring graduation clearance pipeline is active. Monitor student progress in the pipeline.',
      approaching: 'Graduation clearance deadline approaching. 14 students still in holds check stage.',
      urgent: 'Graduation clearance deadline is this week. 6 students have unresolved blockers.',
      completed: 'All Spring 2026 graduation candidates have been cleared or deferred.',
    },
  },
  {
    id: 'commencement-cert',
    name: 'Commencement Certification',
    agency: 'Internal — Registrar\'s Office',
    month: 5, day: 1,
    category: 'operations',
    recurrence: 'Per-term (Spring)',
    sandyTemplates: {
      farOut: 'Commencement ceremony roster due May 1. Degree conferral list must match clearance.',
      approaching: 'Commencement certification approaching. Verify ceremony roster matches approved graduation list.',
      urgent: 'Commencement certification due tomorrow. 3 students added to clearance since last roster pull.',
      completed: 'Commencement roster certified. 1,247 candidates confirmed for May ceremony.',
    },
  },
  {
    id: 'fall-registration',
    name: 'Fall Registration Opens',
    agency: 'Internal — Registrar\'s Office',
    month: 3, day: 15,
    category: 'operations',
    recurrence: 'Annual',
    sandyTemplates: {
      farOut: 'Fall registration window opens in March. Course schedule must be published 2 weeks prior.',
      approaching: 'Fall registration opens soon. 12 departments have not finalized section counts.',
      urgent: 'Fall registration opens this week. 4 departments still adding sections. Waitlists will be heavy.',
      completed: 'Fall 2026 registration is open. First-day enrollment: 89% of projected capacity.',
    },
  },
  {
    id: 'census-fall',
    name: 'Census Date (Fall)',
    agency: 'Internal — Registrar\'s Office',
    month: 9, day: 10,
    category: 'operations',
    recurrence: 'Per-term (Fall)',
    sandyTemplates: {
      farOut: 'Fall census date is September 10. All enrollment changes must be processed by then.',
      approaching: 'Census date approaching. 142 pending add/drop requests need processing.',
      urgent: 'Census date is this week. Freeze enrollment snapshot for official reporting.',
      completed: 'Fall census snapshot captured. Official enrollment: 31,472 headcount.',
    },
  },
  {
    id: 'census-spring',
    name: 'Census Date (Spring)',
    agency: 'Internal — Registrar\'s Office',
    month: 1, day: 25,
    category: 'operations',
    recurrence: 'Per-term (Spring)',
    sandyTemplates: {
      farOut: 'Spring census date is January 25. Monitor late registration activity.',
      approaching: 'Spring census date approaching. 89 pending enrollment changes to process.',
      urgent: 'Spring census is this week. Finalize enrollment snapshot for spring reporting.',
      completed: 'Spring census snapshot captured. Official enrollment: 30,918 headcount.',
    },
  },
]

// ── Service ──────────────────────────────────────────────────────────────────

function getDeadlineDateForCurrentCycle(raw: RawDeadline, now: Date): Date {
  const year = now.getFullYear()
  const candidate = new Date(year, raw.month - 1, raw.day)

  // If the deadline is more than 6 months in the past, use next year's date
  const sixMonthsAgo = new Date(now)
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  if (candidate < sixMonthsAgo) {
    return new Date(year + 1, raw.month - 1, raw.day)
  }
  return candidate
}

function computeUrgency(daysUntil: number): ComplianceDeadline['urgency'] {
  if (daysUntil < 0) return 'critical'
  if (daysUntil <= 14) return 'critical'
  if (daysUntil <= 30) return 'warning'
  if (daysUntil <= 60) return 'normal'
  return 'safe'
}

function computeStatus(daysUntil: number): ComplianceDeadline['status'] {
  if (daysUntil < -30) return 'completed' // More than 30 days past → assume completed
  if (daysUntil < 0) return 'overdue'
  if (daysUntil <= 30) return 'due_soon'
  return 'upcoming'
}

function getSandyNote(raw: RawDeadline, daysUntil: number, status: ComplianceDeadline['status']): string {
  if (status === 'completed') return raw.sandyTemplates.completed
  if (daysUntil <= 7) return raw.sandyTemplates.urgent
  if (daysUntil <= 30) return raw.sandyTemplates.approaching
  return raw.sandyTemplates.farOut
}

export async function getComplianceCalendar(): Promise<ComplianceCalendarData> {
  const now = new Date()

  const deadlines: ComplianceDeadline[] = DEADLINES.map((raw) => {
    const dueDate = getDeadlineDateForCurrentCycle(raw, now)
    const daysUntil = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    const status = computeStatus(daysUntil)
    const urgency = computeUrgency(daysUntil)

    return {
      id: raw.id,
      name: raw.name,
      agency: raw.agency,
      dueDate: dueDate.toISOString(),
      category: raw.category,
      status,
      daysUntil,
      urgency,
      sandyNote: getSandyNote(raw, daysUntil, status),
      recurrence: raw.recurrence,
    }
  })

  // Sort by daysUntil ascending (most urgent first)
  deadlines.sort((a, b) => a.daysUntil - b.daysUntil)

  const completed = deadlines.filter((d) => d.status === 'completed')
  const active = deadlines.filter((d) => d.status !== 'completed')
  const upcoming = active.filter((d) => d.daysUntil <= 90)
  const later = active.filter((d) => d.daysUntil > 90)

  const nextCritical = active.find((d) => d.urgency === 'critical' || d.urgency === 'warning') ?? null

  return { upcoming, later, completed, nextCritical }
}
