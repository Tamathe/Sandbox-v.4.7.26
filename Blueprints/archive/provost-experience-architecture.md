# Provost Experience Architecture
## The Sandbox — Institutional Evaluator UX & Leadership Intelligence Layer
### Status: Ready to Build | Priority: Pre-Demo Critical Path

---

## Problem Statement

The Sandbox is built for operators (students doing assignments, educators managing gradebooks, admins approving tools). It has no experience layer for **observers** — specifically, institutional decision-makers who arrive with no task, no context, and a 15-minute attention window.

Dr. Robert DiPaola (Provost, University of Kentucky) is the most important user the platform will ever have. His session outcome is not a completed assignment or a published tool — it is a **funding decision**. The platform currently fails this use case in 7 distinct ways identified in the UX audit.

This document specifies the architecture, implementation plan, and content strategy to fix all 7, organized into three delivery tiers.

---

## The Three Questions the Platform Must Answer in 90 Seconds

Every design decision in this document is evaluated against these:

1. **"What problem does this solve?"** — Is this better than what we have? (Canvas, static LMS)
2. **"Does it work?"** — Show me evidence, not demos. Real numbers. Real outcomes.
3. **"What does it cost, and who maintains it?"** — What is the per-student cost? Who owns it?

These three answers must be impossible to miss in the first 90 seconds of the Admin experience.

---

## Tier 1 — Ship Today (< 2 hours total, zero risk)

These are single-line or single-component changes. No API work. No schema changes. No review cycle needed.

### T1-1: Add "Tools" to ADMIN Navigation

**File:** `app/components/Header.tsx` line 131

**Change:**
```typescript
// Before
{ href: '/tools', label: 'Tools', roles: ['STUDENT'] },

// After
{ href: '/tools', label: 'Tools', roles: ['STUDENT', 'EDUCATOR', 'ADMIN'] },
```

**Why this is P0:** The tools marketplace is the product's central value proposition. It is invisible to the Provost unless he knows the URL. A one-line fix removes the highest-friction barrier in the entire platform evaluation experience.

---

### T1-2: Add "Admin Panel" to Top Navigation

**File:** `app/components/Header.tsx` line 127 (NAV_ITEMS array)

**Add:**
```typescript
{ href: '/admin', label: 'Admin', roles: ['ADMIN'] },
```

**Why:** The Admin Panel is the Provost's operational home. It currently lives two clicks deep in a dropdown. For the highest-privilege role in the system, this is backwards.

---

### T1-3: Add "Browse Tools" to ADMIN Quick Access Dropdown

**File:** `app/components/Header.tsx` line 139 (quickLinks array)

**Add to the list (after Research Hub):**
```typescript
{ href: '/tools', label: 'Browse Marketplace', icon: BookOpen, roles: ['ADMIN', 'EDUCATOR'] },
```

Belt-and-suspenders for T1-1. Belt. Suspenders.

---

### T1-4: Simulated Data Watermark on Analytics

**File:** `app/analytics/faculty/page.tsx`

**Add immediately below the page header:**
```tsx
{/* Simulated data banner — remove when /api/analytics/platform is live */}
<div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
  <Info className="h-4 w-4 flex-shrink-0" />
  <span>
    <strong>Demo data</strong> — Metrics shown are illustrative. Live institutional
    data will populate once real sessions are captured.
  </span>
</div>
```

**Why this is P0:** Presenting synthetic data to a Provost without flagging it is the highest-risk trust issue on the platform. If he asks where the 87% comes from and the answer is "we made it up," the entire funding conversation is over. Label it honestly. Honest demos build more trust than confident demos.

---

### T1-5: CATS-AI Brand Expansion

**File:** `app/components/Header.tsx` line 194

**Change:**
```tsx
// Before
<div className="hidden text-[11px] text-gray-500 ...">Powered by CATS-AI</div>

// After
<div className="hidden text-[11px] text-gray-500 ...">CATS-AI · Center for AI Teaching & Learning</div>
```

An unexplained acronym signals "internal project." A spelled-out name signals "institutional initiative."

---

### T1-6: Sand Currency Tooltip

**New component:** `app/components/SandTooltip.tsx`

```tsx
import { HelpCircle } from 'lucide-react'

export function SandTooltip() {
  return (
    <span className="group relative inline-flex items-center">
      <HelpCircle className="h-3.5 w-3.5 text-gray-400 cursor-help" />
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 w-56 -translate-x-1/2
                       rounded-lg bg-gray-900 px-3 py-2 text-xs text-white opacity-0
                       shadow-lg transition-opacity group-hover:opacity-100">
        Sand is the platform's engagement currency. Students earn it by completing
        sessions, quests, and challenges. It powers optional gamified experiences
        and measures voluntary participation.
      </span>
    </span>
  )
}
```

Apply anywhere "Sand" balance appears. The word "Sand" appears in at least 5 UI surfaces. Each needs this tooltip until the onboarding system teaches users what it means.

---

### T1-7: CourseMagicButton Tooltip

**File:** `app/components/CourseMagicButton.tsx`

Add a `title` attribute to the button or wrap it in a Tooltip: *"Instantly generate an AI teaching tool from this course's materials using Claude AI."* One sentence. 10 minutes.

---

### T1-8: Reframe the User Switcher

**File:** `app/components/Header.tsx` line 304

**Change the section header:**
```tsx
// Before
<div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
  Switch Demo User
</div>

// After
<div className="px-3 py-1.5">
  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
    Demo Mode — View As
  </div>
  <div className="text-[10px] text-gray-400 mt-0.5">
    Switch perspectives to see how each role experiences the platform
  </div>
</div>
```

This reframes a prototype artifact as a deliberate product capability. A Provost who reads "Demo Mode — View As" understands the intent. A Provost who reads "Switch Demo User" wonders if he's on a finished product.

---

## Tier 2 — This Week (16–24 hours total)

These items require new components and in some cases new data composition, but no schema changes and no new API routes beyond minor extensions of existing ones.

### T2-1: Persistent "Viewing As" Banner

**Problem:** When the Provost switches to a student user to observe their experience, he loses his orientation. There is no visual indicator that he's in a different perspective, and no obvious path back.

**Implementation:**

**1. Update `app/lib/auth-context.tsx`**

Add `originalAdmin` tracking to the auth context:

```typescript
interface AuthContextValue {
  currentUser: DemoUser
  setCurrentUser: (user: DemoUser) => void
  originalAdmin: DemoUser | null        // new
  clearOriginalAdmin: () => void        // new
}
```

In `setCurrentUser`, before switching:
```typescript
const setCurrentUser = (user: DemoUser) => {
  // If an ADMIN is switching to a non-admin, save their identity
  if (currentUser.role === 'ADMIN' && user.role !== 'ADMIN' && !originalAdmin) {
    setOriginalAdmin(currentUser)
    localStorage.setItem('sandbox-original-admin', currentUser.email)
  }
  // If returning to admin, clear
  if (user.role === 'ADMIN') {
    setOriginalAdmin(null)
    localStorage.removeItem('sandbox-original-admin')
  }
  // ... existing logic
}
```

**2. New component:** `app/components/ViewingAsBanner.tsx`

```tsx
'use client'

import { useAuth } from '../lib/auth-context'
import { Eye, ArrowLeft } from 'lucide-react'

export function ViewingAsBanner() {
  const { currentUser, originalAdmin, setCurrentUser, clearOriginalAdmin } = useAuth()

  if (!originalAdmin) return null

  return (
    <div className="sticky top-16 z-40 w-full bg-amber-500 text-white">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4" />
          <span>
            Viewing as <strong>{currentUser.name}</strong> ({currentUser.role}) —
            this is how {currentUser.role === 'STUDENT' ? 'students' : 'faculty'}
            experience The Sandbox
          </span>
        </div>
        <button
          onClick={() => {
            setCurrentUser(originalAdmin)
            clearOriginalAdmin()
          }}
          className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1
                     text-xs font-semibold hover:bg-amber-700 transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          Return to {originalAdmin.name}
        </button>
      </div>
    </div>
  )
}
```

**3. Add to `app/layout.tsx`:**
```tsx
<ViewingAsBanner />
```

Render it below the Header. It's `null` when no original admin is stored, so it costs nothing when not in use.

---

### T2-2: "For University Leaders" Evaluation Card

**Problem:** A Provost lands on the admin home dashboard with no orientation. He doesn't know where to start, what numbers are real, or what the platform is trying to tell him.

**File:** `app/page.tsx` — add to the educator/admin view, top of right column

**New component:** `app/components/LeadershipCard.tsx`

```tsx
import Link from 'next/link'
import { BarChart2, DollarSign, ArrowRight, GraduationCap } from 'lucide-react'

export function LeadershipCard() {
  return (
    <div className="rounded-xl border border-[#0033A0]/20 bg-gradient-to-br from-[#0033A0]/5 to-white p-4">
      <div className="flex items-center gap-2 mb-3">
        <GraduationCap className="h-4 w-4 text-[#0033A0]" />
        <span className="text-xs font-semibold text-[#0033A0] uppercase tracking-wide">
          Institutional Overview
        </span>
      </div>
      <p className="text-sm text-gray-700 mb-3 leading-relaxed">
        The Sandbox is UK's AI-native teaching platform — a marketplace where
        faculty build AI tools and students use them to learn. Every interaction
        is measured.
      </p>
      <div className="space-y-2">
        <Link href="/analytics/faculty"
              className="flex items-center justify-between rounded-lg bg-[#0033A0]
                         px-3 py-2 text-sm text-white hover:bg-[#002280] transition-colors">
          <div className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4" />
            <span className="font-medium">Platform Analytics</span>
          </div>
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link href="/admin?tab=economics"
              className="flex items-center justify-between rounded-lg border border-gray-200
                         px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="font-medium">Cost & Economics</span>
          </div>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}
```

Show this component only when `currentUser.role === 'ADMIN'` in the home page right column, above the quest panel.

---

### T2-3: Executive KPI Strip on Analytics

**Problem:** The analytics page opens directly into detailed student-level charts. There is no summary a Provost can read in 5 seconds.

**File:** `app/analytics/faculty/page.tsx` — add above the chart grid

```tsx
// Compute from existing STUDENTS array
const totalSessions = STUDENTS.reduce((sum, s) => sum + s.sessions, 0)
const avgScore = Math.round(STUDENTS.reduce((sum, s) => sum + s.current, 0) / STUDENTS.length)
const atRiskCount = STUDENTS.filter(s => s.status === 'at_risk').length
const exceedingCount = STUDENTS.filter(s => s.status === 'exceeding').length

// Render above charts
<div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
  {[
    { label: 'Total Sessions', value: totalSessions.toLocaleString(), icon: Activity, color: 'blue' },
    { label: 'Avg Outcome Score', value: `${avgScore}%`, icon: TrendingUp, color: 'emerald' },
    { label: 'Students Exceeding', value: exceedingCount, icon: Star, color: 'amber' },
    { label: 'At-Risk Students', value: atRiskCount, icon: AlertTriangle, color: 'red' },
  ].map(stat => (
    <div key={stat.label} className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
      <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
    </div>
  ))}
</div>
```

These numbers already exist in the hardcoded data. This is a pure UI addition — no new API needed.

---

### T2-4: Cost-to-Value Narrative in Admin Economics Tab

**Problem:** The Economics tab shows token costs as raw numbers (input tokens, output tokens, dollar amounts). A Provost or CFO cannot translate raw API costs into a per-student funding rationale.

**File:** `app/admin/page.tsx` — add a summary card at the top of the Economics tab

**Logic (derive from existing `stats` object):**
```typescript
// Add to the economics tab render
const totalCost = stats.totalCost ?? 0           // already tracked
const totalSessions = stats.totalSessions ?? 0   // already in AdminStats
const costPerSession = totalSessions > 0
  ? (totalCost / totalSessions).toFixed(4)
  : '0.00'
const annualProjection = totalCost * 12          // simple monthly × 12

// Render as a callout card
<div className="rounded-xl bg-[#0033A0]/5 border border-[#0033A0]/20 p-5 mb-6">
  <h3 className="font-semibold text-[#0033A0] mb-3">Cost-to-Value Summary</h3>
  <div className="grid grid-cols-3 gap-4 text-center">
    <div>
      <div className="text-2xl font-bold text-gray-900">${costPerSession}</div>
      <div className="text-xs text-gray-500 mt-1">Per student session</div>
    </div>
    <div>
      <div className="text-2xl font-bold text-gray-900">{totalSessions.toLocaleString()}</div>
      <div className="text-xs text-gray-500 mt-1">Total AI interactions</div>
    </div>
    <div>
      <div className="text-2xl font-bold text-gray-900">{formatUsd(annualProjection)}</div>
      <div className="text-xs text-gray-500 mt-1">Annual projection</div>
    </div>
  </div>
  <p className="text-xs text-gray-500 mt-3 border-t border-[#0033A0]/10 pt-3">
    For context: traditional tutoring runs $50–$150/hr. Each Sandbox session
    averages 18 minutes of active learning at {formatUsd(Number(costPerSession))}
    in AI compute cost.
  </p>
</div>
```

**The framing sentence at the bottom is the most important part.** It creates the comparison context. A Provost knows what tutoring costs. He does not know what $0.004 in API tokens means.

---

### T2-5: Context Cards Above Pending Approval Queue

**Problem:** The Admin Overview tab displays a list of pending tools with "Approve" and "Reject" buttons and no explanation of what these buttons do at institutional scale.

**File:** `app/admin/page.tsx` — add above the pending tools list in the 'overview' tab

```tsx
{activeTab === 'overview' && (
  <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
    <h4 className="text-sm font-semibold text-blue-900 mb-1">
      About the Approval Queue
    </h4>
    <p className="text-sm text-blue-800">
      Faculty submit AI tools they've built for use in courses.
      <strong> Approving</strong> makes a tool available to all students in the
      Marketplace with a Verified badge.
      <strong> Rejecting</strong> returns it to Community tier — visible only
      within the submitter's course. Tools are never deleted; they're just
      re-scoped.
    </p>
  </div>
)}
```

---

### T2-6: Build Page "How It Works" Strip

**Problem:** The Build page opens with a conversational text input. For someone who wasn't expecting to build something, this creates immediate confusion about role and purpose.

**File:** `app/build/page.tsx` or `app/studio/page.tsx` — add above the BuildHubHero component

```tsx
<div className="grid grid-cols-3 gap-4 mb-8 rounded-xl border border-gray-200 bg-gray-50 p-4">
  {[
    { step: '01', title: 'Describe', body: 'Tell Sandy what you want to teach. Plain English. No code required.' },
    { step: '02', title: 'Preview', body: 'Your AI tool is built live in under 60 seconds. Chat with it before you publish.' },
    { step: '03', title: 'Deploy', body: 'Publish to your course or the full UK Marketplace. Students use it immediately.' },
  ].map(s => (
    <div key={s.step} className="text-center p-4">
      <div className="text-3xl font-black text-[#0033A0]/20 mb-1">{s.step}</div>
      <div className="font-semibold text-gray-900 text-sm mb-1">{s.title}</div>
      <div className="text-xs text-gray-500">{s.body}</div>
    </div>
  ))}
</div>
```

---

## Tier 3 — Next Sprint (3–7 days total)

These items require new routes, new API endpoints, or meaningful data pipeline work. High value but not 24-hour deliverables.

### T3-1: Platform Analytics — Institution Tab

**Problem:** The analytics page shows faculty-level data. A Provost needs institution-wide aggregates: total platform adoption, department breakdown, outcome trends, cost efficiency.

**New API endpoint:** `GET /api/analytics/platform`

**Route file:** `app/api/analytics/platform/route.ts`

```typescript
// Returns aggregated platform metrics
// Response shape:
type PlatformAnalyticsResponse = {
  overview: {
    totalUsers: number
    activeThisMonth: number       // unique users with sessions in last 30 days
    totalTools: number
    approvedTools: number
    totalSessions: number
    sessionsThisMonth: number
    avgSessionScore: number
    avgSessionMinutes: number
  }
  departments: {                  // group tools + sessions by Tool.category
    name: string
    toolCount: number
    sessionCount: number
    avgScore: number
  }[]
  adoption: {                     // weekly session counts for last 12 weeks
    week: string                  // "2026-W01"
    sessions: number
    uniqueUsers: number
  }[]
  outcomes: {
    atRiskStudents: number        // users with declining session scores
    exceedingStudents: number     // users with improving session scores
    avgObjectiveMastery: number   // % of StudentObjectiveProgress marked mastered
  }
  cost: {
    totalCostUsd: number
    costPerSession: number
    projectedAnnualUsd: number
  }
}
```

**DB queries:**
```typescript
// All real data — no synthetic values
const [users, tools, sessions, objectives] = await Promise.all([
  prisma.user.count(),
  prisma.tool.findMany({ select: { category: true, approvalStatus: true } }),
  prisma.toolSession.findMany({
    select: { startedAt: true, userId: true },
    where: { startedAt: { gte: subMonths(new Date(), 3) } }
  }),
  prisma.studentObjectiveProgress.findMany({ select: { masteryLevel: true } }),
])
```

**UI:** Add an "Institution" tab to `app/analytics/faculty/page.tsx`:

```typescript
type AnalyticsTab = 'class' | 'institution'  // institution only visible to ADMIN
```

The Institution tab renders four sections:
1. **Headline KPIs** — 4 stat cards (see T2-3 pattern)
2. **Adoption Curve** — AreaChart (recharts, already imported) — weekly sessions over 12 weeks
3. **Department Breakdown** — BarChart — sessions and avg score per academic department
4. **Cost Efficiency** — the cost-to-value callout from T2-4, with real data

Do not create `/analytics/admin` as a separate route. Add the Institution tab to the existing page. Fewer routes is better.

---

### T3-2: Admin Home Dashboard — Executive Briefing Mode

**Problem:** The admin home dashboard currently renders the same educator-style layout for Dr. DiPaola that it would for any admin. But DiPaola's synthetic profile in `page.tsx:144` already contains platform-wide numbers (1240 students, 4872 sessions). These numbers are good. They're just buried in the same card layout as a teacher's gradebook queue.

**Change:** When `currentUser.email === 'bob.dipaola@uky.edu'` OR `currentUser.role === 'ADMIN' && !profileHasCourses` — render an "Executive Briefing" layout variant instead of the educator layout.

**Better:** Don't hardcode by email. Use a condition based on whether the admin has any published tools or enrolled students. If they don't, they get the institutional overview. If they do (like a teaching admin), they get the standard educator view.

**Executive Briefing Layout:**

```
Left column (2/3 width):
┌─────────────────────────────────────────────────┐
│ "The Sandbox at University of Kentucky"          │
│ Platform mission statement (1 sentence)          │
├─────────────────────────────────────────────────┤
│ 4 KPI cards: Students | Sessions | Tools | Score │
├─────────────────────────────────────────────────┤
│ Recent activity feed (last 8 student sessions)   │
│ — shows real diversity across tools/departments  │
├─────────────────────────────────────────────────┤
│ At-Risk Students (3 cards, early-warning signals)│
└─────────────────────────────────────────────────┘

Right column (1/3 width):
┌──────────────────────────┐
│ Leadership Card (T2-2)   │
│ → Platform Analytics     │
│ → Cost & Economics       │
├──────────────────────────┤
│ Tools by Department      │
│ (simple category list    │
│  with counts)            │
├──────────────────────────┤
│ "Evaluate the Platform"  │
│ → Switch to student view │
│ → Switch to faculty view │
│ Explanation: "See The    │
│ Sandbox from any angle"  │
└──────────────────────────┘
```

The "Evaluate the Platform" card reframes the demo user-switcher as a deliberate feature for evaluators, not a prototype artifact.

---

### T3-3: Sandcastle & Leagues Institutional Framing

**Problem:** Sandcastle experiences (NCAA Bracket, Fantasy Football, Coffee Roulette, Escape the Island) look like entertainment products to an institutional evaluator. They need one sentence of academic rationale.

**File:** `app/sandcastle/page.tsx` — add a header callout

```tsx
<div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 mb-6">
  <div className="flex items-start gap-3">
    <div className="mt-0.5">
      <TrendingUp className="h-4 w-4 text-emerald-600" />
    </div>
    <div>
      <h3 className="text-sm font-semibold text-emerald-900">
        Engagement & Retention Layer
      </h3>
      <p className="text-sm text-emerald-800 mt-0.5">
        Sandcastle experiences are voluntary, not graded. They exist because
        students who engage with the platform socially and recreationally return
        more frequently for academic work. Habit formation precedes learning
        outcomes. These experiences build the habit.
      </p>
    </div>
  </div>
</div>
```

Same framing approach for the Leagues landing pages. One institutional paragraph. No apology for the entertainment value — lean into it with the evidence frame.

---

### T3-4: Real `/api/dashboard` Endpoint

**Context:** The home dashboard currently reads from hardcoded `EDUCATOR_PROFILES` and `STUDENT_PROFILES` objects in `page.tsx`. The DiPaola profile has real-looking numbers (1240 students, 4872 sessions) but they're static strings in a TypeScript file.

**This is the most important data pipeline fix in the codebase.** Every other trust problem downstream flows from here.

**New endpoint:** `GET /api/dashboard`

```typescript
// Response type — replaces EducatorProfile and StudentProfile hardcoded data
type DashboardResponse =
  | { role: 'STUDENT'; streak: number; totalSessions: number; totalMinutes: number; avgScore: number; recentSessions: RecentSession[]; upcomingDue: UpcomingDue[] }
  | { role: 'EDUCATOR'; toolsPublished: number; activeStudents: number; totalSessions: number; avgScore: number; recentActivity: RecentActivity[]; pendingGrades: PendingGradeAlert[] }
  | { role: 'ADMIN'; platformStats: PlatformStats; recentActivity: RecentActivity[]; atRisk: AtRiskStudent[]; pendingTools: number }
```

**ADMIN response queries:**
```typescript
const thirtyDaysAgo = subDays(new Date(), 30)

const [totalUsers, activeUsers, totalSessions, tools, pendingTools] = await Promise.all([
  prisma.user.count({ where: { role: 'STUDENT' } }),
  prisma.toolSession.groupBy({ by: ['userId'], where: { startedAt: { gte: thirtyDaysAgo } }, _count: true }),
  prisma.toolSession.count(),
  prisma.tool.findMany({ where: { approvalStatus: { in: ['APPROVED', 'COMMUNITY'] } }, select: { id: true } }),
  prisma.tool.count({ where: { approvalStatus: 'PENDING' } }),
])
```

Once this endpoint exists, remove the hardcoded `EDUCATOR_PROFILES` and `STUDENT_PROFILES` constants from `page.tsx` entirely. The simulated data watermark (T1-4) becomes unnecessary.

**Timeline:** 2–3 days. This is the single item that most upgrades the platform's credibility — replacing synthetic theater with real institutional data.

---

## Content Strategy: The Translation Layer

Beyond code changes, the platform needs an institutional vocabulary layer. This is a content problem, not an engineering problem — but it must be designed before it can be built.

### The "Two Languages" Problem

The platform speaks fluently in product culture:
> "Sand," "Sandcastle," "Quests," "XP," "Bounties," "Leaderboard," "Forking a tool"

Provosts and CFOs speak in university culture:
> "Learning outcomes," "FERPA compliance," "per-student cost," "faculty adoption rate," "Canvas integration," "accreditation signals"

These two vocabularies are not in conflict — but they must coexist. Every page that a decision-maker might visit needs one sentence that bridges the gap.

### Translation Table

| Platform Term | Institutional Translation | Where to Show It |
|---|---|---|
| Sand | "Engagement currency — measures voluntary participation" | `<SandTooltip />` everywhere |
| Sandcastle | "Retention layer — social & recreational experiences that build platform habits" | Sandcastle page header |
| Quests | "Habit-formation mechanics — drive practice outside class hours" | QuestPanel header |
| Bounty Board | "Faculty tool-request marketplace — crowdsources curriculum development" | /bounties page header |
| XP | "Engagement score — reflects cumulative learning effort" | XP bar tooltip |
| Verified badge | "Faculty-submitted, admin-reviewed, outcome-linked" | Badge tooltip (T1 item already in plan) |
| UK Official badge | "Deployed by UK administrators for official policy guidance" | Badge tooltip (T1 item already in plan) |
| Tool forking | "Customizing a peer's tool for your own course needs" | Fork button tooltip |

These are not redesigns. They are single-sentence tooltips, header callouts, or label additions. Total implementation: 4–6 hours for all of them across the platform.

---

## The "90-Second Read" Test

The following experience is what Dr. DiPaola should have within 90 seconds of landing on the platform, if all tiers above are implemented:

**0–15 seconds:** He sees his name, "Dr. Robert DiPaola," his role "Provost/ADMIN," and below the logo: *"CATS-AI · Center for AI Teaching & Learning."* In the right column, he sees a card: *"The Sandbox at University of Kentucky — AI-native teaching platform where faculty build tools and students use them to learn."*

**15–40 seconds:** He sees four KPI cards: **1,240 students | 4,872 sessions | 35 tools | 84% avg score.** These are labeled with source context. Below them, a real-time activity feed showing students across multiple departments actively using tools right now.

**40–60 seconds:** His nav shows: Home | My Courses | **Tools** | Services | Build | **Analytics** | Registrar | **Admin**. He clicks "Tools." He sees the marketplace. He is looking at 35 published AI tools across 9 academic disciplines, some marked "UK Official," some marked "Verified," created by faculty whose names and departments are visible. He can click any one and talk to it.

**60–90 seconds:** He clicks "Analytics." He sees the Institution tab (if T3-1 is built) or the existing faculty view (with the KPI strip from T2-3 and the simulated data disclosure from T1-4). He sees cost: **$0.004 per student session.** He sees the comparison line: *"Traditional tutoring: $50–150/hr. This: $0.004."*

He has his three answers. He knows what it is. He has seen evidence. He knows what it costs.

---

## Implementation Sequence

```
Day 1 (2 hours)
└── All Tier 1 items: nav fixes, watermark, CATS-AI branding, Sand tooltip,
    user-switcher reframe, context cards, CourseMagicButton tooltip

Week 1 (16–24 hours spread across days)
├── T2-1: Viewing As banner (auth context + component)
├── T2-2: Leadership Card on admin home
├── T2-3: KPI strip on analytics
├── T2-4: Cost-to-value in Economics tab
├── T2-5: Approval queue context card (already in T1 scope — move up)
└── T2-6: Build page "how it works" strip

Week 2 (3–7 days)
├── T3-1: Platform Analytics Institution tab + /api/analytics/platform
├── T3-2: Admin home Executive Briefing layout
├── T3-3: Sandcastle/Leagues institutional framing
└── T3-4: Real /api/dashboard endpoint (replaces all synthetic data)

Post-Demo Sprint
├── /about leadership page (after T3-4 gives us real numbers to cite)
├── LTI Canvas integration (per existing blueprint)
└── Real authentication (Shibboleth SSO)
```

---

## Files Modified by Tier

| Tier | File | Change Type |
|---|---|---|
| T1 | `app/components/Header.tsx` | 4 targeted edits |
| T1 | `app/analytics/faculty/page.tsx` | Add banner component |
| T1 | `app/admin/page.tsx` | Add context card |
| T1 | `app/components/CourseMagicButton.tsx` | Add tooltip |
| T1 | `app/components/SandTooltip.tsx` | New component |
| T2 | `app/lib/auth-context.tsx` | originalAdmin tracking |
| T2 | `app/components/ViewingAsBanner.tsx` | New component |
| T2 | `app/layout.tsx` | Add ViewingAsBanner |
| T2 | `app/components/LeadershipCard.tsx` | New component |
| T2 | `app/page.tsx` | Add LeadershipCard to admin view |
| T2 | `app/analytics/faculty/page.tsx` | Add KPI strip |
| T2 | `app/admin/page.tsx` | Add cost-to-value card |
| T2 | `app/build/page.tsx` | Add how-it-works strip |
| T3 | `app/api/analytics/platform/route.ts` | New API route |
| T3 | `app/analytics/faculty/page.tsx` | Add Institution tab |
| T3 | `app/page.tsx` | Executive Briefing layout variant |
| T3 | `app/sandcastle/page.tsx` | Add framing callout |
| T3 | `app/api/dashboard/route.ts` | New API route |
| T3 | `app/page.tsx` | Remove synthetic profile objects |

---

## Success Criteria

The provost experience is considered complete when all of the following are true:

- [ ] An ADMIN can reach the Tools Marketplace from the top navigation in one click
- [ ] An ADMIN can reach the Admin Panel from the top navigation in one click
- [ ] All synthetic/simulated data is labeled as such with a visible disclosure
- [ ] The admin home dashboard answers "what is this, how many people use it, what does it cost" without requiring any navigation
- [ ] Switching to a student perspective shows a persistent "Viewing As" banner with a clear return path
- [ ] The Cost-to-Value narrative in Admin Economics includes a per-session cost and a real-world comparison
- [ ] Sandcastle and Leagues each include one sentence of institutional rationale
- [ ] The phrase "CATS-AI" is followed by its expanded name on first appearance
- [ ] "Sand" is explained via tooltip wherever it appears without prior context

---

*Blueprint authored: 2026-03-19*
*Companion documents: `ux-student-journey-blueprint.md`, `tools-page-ux-overhaul-architecture.md`, `demo-to-product-architecture.md`*
