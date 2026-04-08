'use client'

import { useAuth } from '../../lib/auth-context'
import { format } from 'date-fns'

// ─── Types ──────────────────────────────────────────────────

export interface AdminKPI {
  activeUsersToday: { value: number; trend: 'up' | 'down' | 'flat' }
  pendingActions: { value: number; breakdown: { approvals: number; flags: number; compliance: number } }
  platformHealth: { value: number; label: string }
  complianceStatus: { daysUntil: number; label: string; urgency: 'green' | 'amber' | 'red' }
}

export interface AdminAction {
  id: string
  type: 'approval' | 'moderation' | 'compliance'
  priority: 'P0' | 'P1' | 'P2' | 'P3'
  title: string
  description: string
  source: string
  timestamp: string
  href: string
  quickAction?: { label: string; action: 'approve' | 'review' | 'acknowledge' }
}

export interface ComplianceDeadline {
  id: string
  title: string
  dueDate: string
  daysRemaining: number
  category: string
  urgency: 'green' | 'amber' | 'red'
}

export interface DailyMetric {
  date: string
  activeUsers: number
  sessions: number
}

export interface ToolUsage {
  name: string
  sessions: number
  category: string
}

export interface QuickLink {
  title: string
  description: string
  href: string
  icon: string
}

export interface AdminHomeData {
  greeting: string
  dateLabel: string
  narrative: string
  kpi: AdminKPI
  actions: AdminAction[]
  deadlines: ComplianceDeadline[]
  usageTrend: DailyMetric[]
  topTools: ToolUsage[]
  quickLinks: QuickLink[]
  isLoading: boolean
}

// ─── Greeting ───────────────────────────────────────────────

function getTimeGreeting(name: string): string {
  const hour = new Date().getHours()
  if (hour < 12) return `Good morning, ${name}`
  if (hour < 17) return `Good afternoon, ${name}`
  return `Good evening, ${name}`
}

// ─── Synthetic Data ─────────────────────────────────────────

const SYNTHETIC_KPI: AdminKPI = {
  activeUsersToday: { value: 142, trend: 'up' },
  pendingActions: { value: 7, breakdown: { approvals: 3, flags: 2, compliance: 2 } },
  platformHealth: { value: 96.2, label: 'Healthy' },
  complianceStatus: { daysUntil: 12, label: 'FERPA Annual Review', urgency: 'red' },
}

const SYNTHETIC_ACTIONS: AdminAction[] = [
  {
    id: 'act-1',
    type: 'moderation',
    priority: 'P0',
    title: 'Flagged AI session — possible academic integrity violation',
    description: 'Study Buddy session in BIO 301 triggered integrity heuristics. Student submitted near-identical AI output as lab report.',
    source: 'Sandy Intelligence',
    timestamp: '2 hours ago',
    href: '/admin/flagged',
    quickAction: { label: 'Review', action: 'review' },
  },
  {
    id: 'act-2',
    type: 'approval',
    priority: 'P1',
    title: 'New community tool pending approval — Organic Chemistry Tutor',
    description: 'Submitted by Dr. Patel (CHE dept). Interactive mechanism drawer with AI feedback.',
    source: 'Tool Builder',
    timestamp: '5 hours ago',
    href: '/admin?tab=tools',
    quickAction: { label: 'Approve', action: 'approve' },
  },
  {
    id: 'act-3',
    type: 'compliance',
    priority: 'P1',
    title: 'FERPA annual review — documentation due in 12 days',
    description: 'Annual FERPA compliance review requires updated data handling documentation and staff training records.',
    source: 'Compliance Portal',
    timestamp: '1 day ago',
    href: '/admin/compliance-portal',
    quickAction: { label: 'Acknowledge', action: 'acknowledge' },
  },
  {
    id: 'act-4',
    type: 'approval',
    priority: 'P2',
    title: 'Course template request — MBA 620 Case Analysis',
    description: 'Prof. Williams requested a new course template with custom rubric dimensions.',
    source: 'Course Builder',
    timestamp: '1 day ago',
    href: '/admin?tab=courses',
    quickAction: { label: 'Approve', action: 'approve' },
  },
  {
    id: 'act-5',
    type: 'moderation',
    priority: 'P2',
    title: 'Content flag — inappropriate prompt in Debate Simulator',
    description: 'Automated filter flagged a student prompt in the Debate Simulator for review.',
    source: 'Content Moderation',
    timestamp: '1 day ago',
    href: '/admin/flagged',
    quickAction: { label: 'Review', action: 'review' },
  },
  {
    id: 'act-6',
    type: 'compliance',
    priority: 'P2',
    title: 'Data retention policy — 47 sessions approaching 90-day limit',
    description: 'Sessions from January need archival or deletion per university data retention policy.',
    source: 'Data Governance',
    timestamp: '2 days ago',
    href: '/admin/compliance-portal',
  },
  {
    id: 'act-7',
    type: 'approval',
    priority: 'P3',
    title: 'Department storefront update — English Department',
    description: 'English Dept submitted updated collection descriptions and tool ordering.',
    source: 'Storefronts',
    timestamp: '3 days ago',
    href: '/admin?tab=departments',
  },
  {
    id: 'act-8',
    type: 'moderation',
    priority: 'P3',
    title: 'Low-priority flag — unusual session length (4.2 hours)',
    description: 'Single Study Buddy session in PSY 100 ran for 4.2 hours. May indicate idle tab.',
    source: 'Analytics',
    timestamp: '3 days ago',
    href: '/analytics/faculty',
  },
]

const SYNTHETIC_DEADLINES: ComplianceDeadline[] = [
  { id: 'dl-1', title: 'FERPA Annual Review', dueDate: '2026-04-07', daysRemaining: 12, category: 'Federal', urgency: 'red' },
  { id: 'dl-2', title: 'SACSCOC Data Submission', dueDate: '2026-04-23', daysRemaining: 28, category: 'Accreditation', urgency: 'amber' },
  { id: 'dl-3', title: 'IPEDS Spring Collection', dueDate: '2026-05-10', daysRemaining: 45, category: 'Federal', urgency: 'green' },
  { id: 'dl-4', title: 'KY CPE Performance Report', dueDate: '2026-05-27', daysRemaining: 62, category: 'State', urgency: 'green' },
  { id: 'dl-5', title: 'Data Retention Audit', dueDate: '2026-06-24', daysRemaining: 90, category: 'Institutional', urgency: 'green' },
]

const SYNTHETIC_USAGE_TREND: DailyMetric[] = [
  { date: 'Mon', activeUsers: 98, sessions: 312 },
  { date: 'Tue', activeUsers: 142, sessions: 487 },
  { date: 'Wed', activeUsers: 156, sessions: 521 },
  { date: 'Thu', activeUsers: 138, sessions: 445 },
  { date: 'Fri', activeUsers: 147, sessions: 462 },
  { date: 'Sat', activeUsers: 72, sessions: 189 },
  { date: 'Sun', activeUsers: 65, sessions: 145 },
]

const SYNTHETIC_TOP_TOOLS: ToolUsage[] = [
  { name: 'Hallucination Detective', sessions: 87, category: 'AI Literacy' },
  { name: 'Cross-Examination Simulator', sessions: 64, category: 'Law' },
  { name: 'Organic Chemistry Tutor', sessions: 52, category: 'STEM' },
  { name: 'Business Case Analyzer', sessions: 41, category: 'Business' },
  { name: 'Primary Source Analyzer', sessions: 38, category: 'History' },
]

const SYNTHETIC_QUICK_LINKS: QuickLink[] = [
  { title: 'Control Tower', description: 'Full admin dashboard', href: '/admin', icon: 'LayoutDashboard' },
  { title: 'User Management', description: 'Manage users and roles', href: '/admin/users', icon: 'Users' },
  { title: 'Compliance Portal', description: 'Deadlines and audits', href: '/admin/compliance-portal', icon: 'ShieldCheck' },
  { title: 'Sandy Traces', description: 'AI transparency logs', href: '/admin/sandy-traces', icon: 'Bot' },
  { title: 'News Sources', description: 'UKNow RSS management', href: '/admin/news-sources', icon: 'Newspaper' },
  { title: 'Analytics', description: 'Platform-wide analytics', href: '/analytics/faculty', icon: 'BarChart3' },
]

// ─── Narrative Builder ──────────────────────────────────────

function buildNarrative(kpi: AdminKPI, deadlines: ComplianceDeadline[], actions: AdminAction[]): string {
  const p0Count = actions.filter(a => a.priority === 'P0').length
  const nextDeadline = deadlines[0]
  const flagNote = p0Count > 0 ? `${p0Count} critical flag${p0Count > 1 ? 's' : ''}` : 'no critical flags'
  return `${kpi.pendingActions.value} pending actions including ${flagNote}. Platform health at ${kpi.platformHealth.value}%. ${nextDeadline.title} due in ${nextDeadline.daysRemaining} days.`
}

// ─── Hook ───────────────────────────────────────────────────

export function useAdminHome(): AdminHomeData {
  const { currentUser } = useAuth()
  const firstName = currentUser?.name?.split(' ')[0] ?? 'Admin'

  const greeting = getTimeGreeting(firstName)
  const dateLabel = format(new Date(), 'EEEE, MMMM d')
  const narrative = buildNarrative(SYNTHETIC_KPI, SYNTHETIC_DEADLINES, SYNTHETIC_ACTIONS)

  return {
    greeting,
    dateLabel,
    narrative,
    kpi: SYNTHETIC_KPI,
    actions: SYNTHETIC_ACTIONS,
    deadlines: SYNTHETIC_DEADLINES,
    usageTrend: SYNTHETIC_USAGE_TREND,
    topTools: SYNTHETIC_TOP_TOOLS,
    quickLinks: SYNTHETIC_QUICK_LINKS,
    isLoading: false,
  }
}
