# Two-Week Provost Demo Build Plan
## The Sandbox — University of Kentucky
### Target: Dr. Robert DiPaola presentation · T-minus 14 days

---

## Context

The Sandbox has two weeks before its first institutional funding evaluation. Dr. Robert DiPaola (Provost, University of Kentucky) will be the primary decision-maker. He has no assigned task. He will form his opinion in the first 90 seconds.

The platform has already passed a full UX audit. The gaps are documented. This plan turns those gap analyses into shipped code — ordered by impact, front-loaded on risk, with a 4-day buffer before the demo.

**Infrastructure status:**
- Neon PostgreSQL: live and connected
- GitHub repo: `github.com/Tamathe/The-Sandbox`
- Vercel: configured (`vercel.json` present) — verify connection or set up fresh (15 min)
- `NEXT_PUBLIC_DEMO_MODE="true"` is set — Demo Mode label appears in header correctly

**The three questions the platform must answer in 90 seconds:**
1. What problem does this solve?
2. Does it work?
3. What does it cost, and who maintains it?

Every item in this plan moves one of those needles.

---

## The 90-Second Read Test

This is the acceptance criteria for the entire two weeks. Pass this, and DiPaola has his answers.

**0–15s:** Lands on home. Sees his name, his role, CATS-AI expanded name. Sees one-sentence platform description. Sees 4 KPI cards with real (or clearly-labeled) numbers.

**15–40s:** Sees the activity feed — students across multiple disciplines actively using tools. Sees a "Platform Analytics →" card. Sees an "Economics →" card.

**40–60s:** Clicks "Tools" in the nav — it's there for his role. Sees 35 AI tools across 9 disciplines. Clicks one and talks to it.

**60–90s:** Clicks "Analytics." Sees an "Institution" tab. Sees cost: **$X.XX per student session.** Sees the comparison: *"Traditional tutoring: $50–150/hr."* Done.

---

## Week 1 — Build Everything

### Day 1 · All Tier 1 Changes · ~2 hours

These are line-level edits and one tiny new component. No new API routes. No schema changes. Ship all of them in a single session and push to Vercel.

**Goal:** By end of Day 1, the nav works correctly for the Provost and the platform no longer presents synthetic data without disclosure.

---

#### T1-1 · Add "Tools" to ADMIN navigation
**File:** `app/components/Header.tsx` — line 131

The tools marketplace is the product's central value proposition. It is currently invisible to every admin in the navigation bar. One word added to a roles array.

```typescript
// Before
{ href: '/tools', label: 'Tools', roles: ['STUDENT'] },

// After
{ href: '/tools', label: 'Tools', roles: ['STUDENT', 'EDUCATOR', 'ADMIN'] },
```

---

#### T1-2 · Add "Admin Panel" to top navigation
**File:** `app/components/Header.tsx` — NAV_ITEMS array (~line 127)

The highest-privilege user in the system has to dig through a dropdown to find their primary workspace. One line in the nav array.

```typescript
{ href: '/admin', label: 'Admin', roles: ['ADMIN'] },
```

---

#### T1-3 · Add "Browse Marketplace" to ADMIN Quick Access dropdown
**File:** `app/components/Header.tsx` — quickLinks array (~line 139)

Belt-and-suspenders for T1-1. Add after the Research Hub entry:

```typescript
{ href: '/tools', label: 'Browse Marketplace', icon: BookOpen, roles: ['ADMIN', 'EDUCATOR'] },
```

---

#### T1-4 · Simulated data watermark on Analytics
**File:** `app/analytics/faculty/page.tsx`

The most important trust fix in the entire codebase. Presenting synthetic data to a Provost without disclosure is the highest-risk issue on the platform. Add immediately below the page header, before any charts render.

```tsx
<div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
  <Info className="h-4 w-4 flex-shrink-0" />
  <span>
    <strong>Demo data</strong> — Metrics shown are illustrative.
    Live institutional data populates once real sessions are captured.
  </span>
</div>
```

Remove this banner once `/api/dashboard` (Day 8–9) ships real data.

---

#### T1-5 · Expand CATS-AI brand name
**File:** `app/components/Header.tsx` — line ~194

An unexplained acronym signals "internal project." A spelled-out name signals "institutional initiative."

```tsx
// Before
Powered by CATS-AI

// After
CATS-AI · Center for AI Teaching & Learning
```

---

#### T1-6 · Sand currency tooltip
**New file:** `app/components/SandTooltip.tsx`

"Sand" appears in at least 5 UI surfaces without explanation. A Provost who sees "Sand balance" has no idea what he's looking at. Create one reusable component, apply everywhere the word Sand appears.

```tsx
'use client'
import { HelpCircle } from 'lucide-react'

export function SandTooltip() {
  return (
    <span className="group relative inline-flex items-center ml-1">
      <HelpCircle className="h-3.5 w-3.5 text-gray-400 cursor-help" />
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 w-56
                       -translate-x-1/2 rounded-lg bg-gray-900 px-3 py-2 text-xs text-white
                       opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
        Sand is the platform's engagement currency. Students earn it by completing
        sessions, quests, and challenges. It drives voluntary participation beyond
        required coursework.
      </span>
    </span>
  )
}
```

---

#### T1-7 · CourseMagicButton tooltip
**File:** `app/components/CourseMagicButton.tsx`

One of the most impressive features in the platform — one-click AI tool generation from course materials — has no explanation on hover. Add a `title` attribute or a Tooltip wrapper:

*"Instantly generate an AI teaching tool from this course's materials using Claude AI."*

---

#### T1-8 · Reframe the user-switcher
**File:** `app/components/Header.tsx` — line ~304

"Switch Demo User" signals prototype. "Demo Mode — View As" signals deliberate product capability.

```tsx
// Before
<div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
  Switch Demo User
</div>

// After
<div>
  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
    Demo Mode — View As
  </div>
  <div className="text-[10px] text-gray-400 mt-0.5">
    Switch perspectives to see how each role experiences the platform
  </div>
</div>
```

---

**Day 1 Commit:** `feat: provost T1 — nav fixes, data watermark, brand expansion, Sand tooltip`

**Verify on Vercel after push:**
- [ ] Tools appears in nav when logged in as DiPaola
- [ ] Admin appears in nav
- [ ] Amber banner visible on /analytics/faculty
- [ ] CATS-AI expanded in header
- [ ] User-switcher shows "Demo Mode — View As"

---

### Day 2 · ViewingAsBanner · ~4–5 hours

**Goal:** When DiPaola switches to a student to observe their experience, he never loses orientation and can return to himself in one click.

This is the highest-impact single feature for the live demo. Without it, a switched-user demonstration risks DiPaola getting lost and not knowing how to return.

---

#### Step 1 — Update auth context
**File:** `app/lib/auth-context.tsx`

Add `originalAdmin` tracking. When an ADMIN switches to a non-admin user, save their identity. Clear it when they return to an admin account.

```typescript
// Add to AuthContextValue interface
originalAdmin: DemoUser | null
clearOriginalAdmin: () => void

// Add to auth context provider state
const [originalAdmin, setOriginalAdmin] = useState<DemoUser | null>(() => {
  if (typeof window === 'undefined') return null
  const saved = localStorage.getItem('sandbox-original-admin')
  return saved ? DEMO_USERS.find(u => u.email === saved) ?? null : null
})

// Modify setCurrentUser
const setCurrentUser = (user: DemoUser) => {
  // Admin switching to non-admin: save current identity
  if (currentUser.role === 'ADMIN' && user.role !== 'ADMIN' && !originalAdmin) {
    setOriginalAdmin(currentUser)
    localStorage.setItem('sandbox-original-admin', currentUser.email)
  }
  // Returning to admin: clear saved identity
  if (user.role === 'ADMIN') {
    setOriginalAdmin(null)
    localStorage.removeItem('sandbox-original-admin')
  }
  localStorage.setItem('sandbox-current-user', user.email)
  _setCurrentUser(user)
}

const clearOriginalAdmin = () => {
  setOriginalAdmin(null)
  localStorage.removeItem('sandbox-original-admin')
}
```

---

#### Step 2 — Create the banner component
**New file:** `app/components/ViewingAsBanner.tsx`

```tsx
'use client'
import { useAuth } from '../lib/auth-context'
import { Eye, ArrowLeft } from 'lucide-react'

export function ViewingAsBanner() {
  const { currentUser, originalAdmin, setCurrentUser, clearOriginalAdmin } = useAuth()
  if (!originalAdmin) return null

  return (
    <div className="sticky top-16 z-40 w-full bg-amber-500 text-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2
                      flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 flex-shrink-0" />
          <span>
            Viewing as{' '}
            <strong>{currentUser.name}</strong>
            {' '}({currentUser.role.toLowerCase()}) —
            this is how {currentUser.role === 'STUDENT' ? 'students' : 'faculty'}
            {' '}experience The Sandbox
          </span>
        </div>
        <button
          onClick={() => {
            setCurrentUser(originalAdmin)
            clearOriginalAdmin()
          }}
          className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1
                     text-xs font-semibold hover:bg-amber-700 transition-colors
                     flex-shrink-0 ml-4"
        >
          <ArrowLeft className="h-3 w-3" />
          Return to {originalAdmin.name}
        </button>
      </div>
    </div>
  )
}
```

---

#### Step 3 — Mount in layout
**File:** `app/layout.tsx`

Add `<ViewingAsBanner />` immediately below `<Header />`. It returns `null` when no original admin is stored, so it costs nothing when not in use.

---

**Day 2 Commit:** `feat: ViewingAsBanner — persistent perspective indicator for demo mode`

**Verify:**
- [ ] Switch to Ian McClure → amber banner appears
- [ ] Banner shows student's name and role
- [ ] "Return to Dr. DiPaola" button works
- [ ] Banner disappears after return
- [ ] Refreshing the page while switched preserves the banner (localStorage)

---

### Day 3 · Admin Home Executive Briefing · ~4–5 hours

**Goal:** When DiPaola lands on the home dashboard, the first 300px of the page answer all three of his questions without scrolling.

Two new components added to the existing admin home layout.

---

#### Step 1 — LeadershipCard component
**New file:** `app/components/LeadershipCard.tsx`

```tsx
import Link from 'next/link'
import { BarChart2, DollarSign, ArrowRight, GraduationCap } from 'lucide-react'

export function LeadershipCard() {
  return (
    <div className="rounded-xl border border-[#0033A0]/20
                    bg-gradient-to-br from-[#0033A0]/5 to-white p-5">
      <div className="flex items-center gap-2 mb-3">
        <GraduationCap className="h-4 w-4 text-[#0033A0]" />
        <span className="text-xs font-semibold text-[#0033A0] uppercase tracking-wide">
          Institutional Overview
        </span>
      </div>
      <p className="text-sm text-gray-700 mb-4 leading-relaxed">
        The Sandbox is UK's AI-native teaching platform. Faculty build AI tools,
        students use them to learn, and every interaction is measured.
      </p>
      <div className="space-y-2">
        <Link
          href="/analytics/faculty"
          className="flex items-center justify-between rounded-lg bg-[#0033A0]
                     px-3 py-2.5 text-sm text-white hover:bg-[#002280] transition-colors"
        >
          <div className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4" />
            <span className="font-medium">Platform Analytics</span>
          </div>
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href="/admin?tab=economics"
          className="flex items-center justify-between rounded-lg border border-gray-200
                     px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
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

---

#### Step 2 — KPI strip for admin home
**File:** `app/page.tsx`

Add above the existing educator activity feed. Uses the synthetic data that's already present in `EDUCATOR_PROFILES['bob.dipaola@uky.edu']` (1,240 students / 4,872 sessions / 84% avg score). The watermark on the analytics page covers disclosure — the home page numbers don't need a separate disclaimer since they're presented as a summary, not a chart.

```tsx
// Pull from the existing educatorData object that's already rendered
{isEducatorOrAdmin && educatorData && (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
    {[
      { label: 'Active Students', value: educatorData.activeStudents.toLocaleString() },
      { label: 'Total Sessions',  value: educatorData.totalSessions.toLocaleString() },
      { label: 'Avg Score',       value: `${educatorData.avgScore}%` },
      { label: 'Tools Published', value: educatorData.toolsPublished.toString() },
    ].map(stat => (
      <div key={stat.label}
           className="rounded-xl border border-gray-200 bg-white p-4 text-center">
        <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
        <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
      </div>
    ))}
  </div>
)}
```

---

#### Step 3 — Add LeadershipCard to admin home
**File:** `app/page.tsx`

In the right column for `currentUser.role === 'ADMIN'`, add `<LeadershipCard />` as the first item above the existing quest/notebook widgets.

---

**Day 3 Commit:** `feat: admin home executive briefing — KPI strip + LeadershipCard`

---

### Day 4 · Analytics KPI Strip + Admin Economics Narrative · ~4–5 hours

**Goal:** The Analytics page tells the story in the first 5 seconds. The Economics tab gives DiPaola the number his CFO (Eric Monday) will ask about.

---

#### Analytics KPI Strip
**File:** `app/analytics/faculty/page.tsx`

Add 4 stat pills above the existing chart grid. Compute from the existing `STUDENTS` array (already in scope):

```tsx
const totalSessions = STUDENTS.reduce((sum, s) => sum + s.sessions, 0)
const avgScore = Math.round(
  STUDENTS.reduce((sum, s) => sum + s.current, 0) / STUDENTS.length
)
const atRiskCount  = STUDENTS.filter(s => s.status === 'at_risk').length
const exceedingCount = STUDENTS.filter(s => s.status === 'exceeding').length

// Render before the chart section
<div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
  <KpiCard label="Total Sessions"       value={totalSessions} color="blue" />
  <KpiCard label="Avg Outcome Score"    value={`${avgScore}%`} color="emerald" />
  <KpiCard label="Students Exceeding"   value={exceedingCount} color="amber" />
  <KpiCard label="At-Risk (flagged)"    value={atRiskCount} color="red" />
</div>
```

---

#### Cost-to-Value Narrative in Economics Tab
**File:** `app/admin/page.tsx`

Add a summary card at the top of the `economics` tab section. The `stats` object already contains `totalCost` and `totalSessions`. The key addition is the **comparison sentence** — this is the sentence DiPaola will quote to his board.

```tsx
{activeTab === 'economics' && stats && (
  <div className="rounded-xl bg-[#0033A0]/5 border border-[#0033A0]/20 p-5 mb-6">
    <h3 className="font-semibold text-[#0033A0] mb-4">Cost-to-Value Summary</h3>
    <div className="grid grid-cols-3 gap-4 text-center mb-4">
      <div>
        <div className="text-2xl font-bold text-gray-900">
          ${(stats.totalCost / Math.max(stats.totalSessions, 1)).toFixed(4)}
        </div>
        <div className="text-xs text-gray-500 mt-1">Per student session</div>
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900">
          {stats.totalSessions.toLocaleString()}
        </div>
        <div className="text-xs text-gray-500 mt-1">Total AI interactions</div>
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900">
          {formatUsd(stats.totalCost * 12)}
        </div>
        <div className="text-xs text-gray-500 mt-1">Annual projection</div>
      </div>
    </div>
    <p className="text-xs text-gray-600 border-t border-[#0033A0]/10 pt-3">
      For context: traditional 1-on-1 tutoring runs $50–$150/hr.
      Each Sandbox session averages 18 minutes of active, personalized learning
      at a fraction of a cent in AI compute cost.
    </p>
  </div>
)}
```

---

**Day 4 Commit:** `feat: analytics KPI strip + admin economics cost narrative`

---

### Day 5 · Build Page + Framing Copy · ~3–4 hours

**Goal:** Pages that will confuse an observer get one sentence of institutional context. The Build page explains itself without requiring the user to try it.

---

#### Build Page "How It Works" Strip
**File:** `app/build/page.tsx` (or `app/studio/page.tsx`)

Add above the `BuildHubHero` component:

```tsx
<div className="grid grid-cols-3 gap-4 mb-8 rounded-xl
                border border-gray-200 bg-gray-50 p-5">
  {[
    {
      step: '01',
      title: 'Describe',
      body: 'Tell Sandy what you want to teach. Plain English. No code required.',
    },
    {
      step: '02',
      title: 'Preview',
      body: 'Your AI tool is built live in under 60 seconds. Chat with it before publishing.',
    },
    {
      step: '03',
      title: 'Deploy',
      body: 'Publish to your course or the full UK Marketplace. Students use it immediately.',
    },
  ].map(s => (
    <div key={s.step} className="text-center px-2">
      <div className="text-3xl font-black text-[#0033A0]/20 mb-1">{s.step}</div>
      <div className="font-semibold text-gray-900 text-sm mb-1">{s.title}</div>
      <div className="text-xs text-gray-500 leading-relaxed">{s.body}</div>
    </div>
  ))}
</div>
```

---

#### Sandcastle Institutional Framing
**File:** `app/sandcastle/page.tsx`

Add below the page header, above the experience grid:

```tsx
<div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 mb-6">
  <div className="flex items-start gap-3">
    <TrendingUp className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
    <div>
      <h3 className="text-sm font-semibold text-emerald-900 mb-0.5">
        Engagement & Retention Layer
      </h3>
      <p className="text-sm text-emerald-800">
        Sandcastle experiences are voluntary and ungraded. Students who engage
        with the platform socially and recreationally return more frequently for
        academic work. These experiences build the habit of showing up.
      </p>
    </div>
  </div>
</div>
```

---

#### "See an Example" Link on Build Page

Link to the most impressive tool in the marketplace. Add near the `BuildHubHero` input:

```tsx
<p className="text-center text-xs text-gray-400 mt-2">
  Not sure where to start?{' '}
  <Link href="/tools" className="text-[#0033A0] underline underline-offset-2">
    Browse the marketplace
  </Link>
  {' '}to see what faculty have already built.
</p>
```

---

**Day 5 Commit:** `feat: build page how-it-works strip, sandcastle framing, example links`

**End of Week 1 checkpoint:**
- [ ] All Tier 1 nav and disclosure fixes are live
- [ ] Switching users shows the amber ViewingAsBanner
- [ ] DiPaola's home dashboard shows KPI strip and LeadershipCard
- [ ] Analytics page has KPI strip and data disclosure
- [ ] Economics tab has cost-per-session and comparison sentence
- [ ] Build page explains itself in 3 steps
- [ ] Sandcastle explains its purpose in one paragraph

---

## Week 2 — Real Data

### Day 6–7 · Platform Analytics API + Institution Tab · 2 days

**Goal:** The Analytics page has a real "Institution" tab that pulls live data from Neon. DiPaola sees actual numbers, not synthetic placeholders.

---

#### New API endpoint
**New file:** `app/api/analytics/platform/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '../../lib/server-auth'
import { getPrismaClient } from '../../lib/prisma'
import { subWeeks, startOfWeek, format } from 'date-fns'

export async function GET(req: NextRequest) {
  const user = await getServerUser(req)
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const prisma = getPrismaClient()
  const now = new Date()
  const twelveWeeksAgo = subWeeks(now, 12)

  const [
    totalUsers,
    totalTools,
    approvedTools,
    totalSessions,
    recentSessions,
    allTools,
    objectiveProgress,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'STUDENT' } }),
    prisma.tool.count(),
    prisma.tool.count({ where: { approvalStatus: 'APPROVED' } }),
    prisma.toolSession.count(),
    prisma.toolSession.findMany({
      where: { startedAt: { gte: twelveWeeksAgo } },
      select: { startedAt: true, userId: true },
      orderBy: { startedAt: 'asc' },
    }),
    prisma.tool.findMany({
      select: { category: true, approvalStatus: true },
    }),
    prisma.studentObjectiveProgress.findMany({
      select: { masteryLevel: true },
    }),
  ])

  // Weekly session buckets (last 12 weeks)
  const weeklyMap: Record<string, { sessions: number; users: Set<string> }> = {}
  for (let i = 11; i >= 0; i--) {
    const weekStart = startOfWeek(subWeeks(now, i))
    const key = format(weekStart, 'MMM d')
    weeklyMap[key] = { sessions: 0, users: new Set() }
  }
  for (const s of recentSessions) {
    const key = format(startOfWeek(s.startedAt), 'MMM d')
    if (weeklyMap[key]) {
      weeklyMap[key].sessions++
      weeklyMap[key].users.add(s.userId)
    }
  }
  const adoption = Object.entries(weeklyMap).map(([week, d]) => ({
    week,
    sessions: d.sessions,
    uniqueUsers: d.users.size,
  }))

  // Department breakdown by Tool.category
  const deptMap: Record<string, number> = {}
  for (const t of allTools) {
    if (t.category) deptMap[t.category] = (deptMap[t.category] ?? 0) + 1
  }
  const departments = Object.entries(deptMap)
    .map(([name, toolCount]) => ({ name, toolCount }))
    .sort((a, b) => b.toolCount - a.toolCount)

  // Objective mastery
  const mastered = objectiveProgress.filter(p => p.masteryLevel === 'mastered').length
  const masteryPct = objectiveProgress.length > 0
    ? Math.round((mastered / objectiveProgress.length) * 100)
    : 0

  return NextResponse.json({
    overview: {
      totalStudents: totalUsers,
      totalTools,
      approvedTools,
      totalSessions,
      sessionsThisMonth: recentSessions.filter(
        s => s.startedAt >= subWeeks(now, 4)
      ).length,
    },
    adoption,
    departments,
    outcomes: {
      avgObjectiveMastery: masteryPct,
    },
  })
}
```

---

#### Institution tab on Analytics page
**File:** `app/analytics/faculty/page.tsx`

Add an "Institution" tab visible only to `ADMIN` role. The tab renders four sections using `recharts` (already imported):

1. **Headline KPIs** — 4 stat cards from `overview` object
2. **Adoption Curve** — `AreaChart` — weekly sessions over 12 weeks
3. **Department Breakdown** — `BarChart` — tool count per academic category
4. **Outcomes summary** — objective mastery percentage + at-risk count

```tsx
// Tab selector (add before existing chart grid)
{currentUser.role === 'ADMIN' && (
  <div className="flex gap-1 mb-6 border-b border-gray-200">
    {(['class', 'institution'] as const).map(tab => (
      <button
        key={tab}
        onClick={() => setAnalyticsTab(tab)}
        className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
          analyticsTab === tab
            ? 'border-[#0033A0] text-[#0033A0]'
            : 'border-transparent text-gray-500 hover:text-gray-700'
        }`}
      >
        {tab === 'class' ? 'Class View' : 'Institution'}
      </button>
    ))}
  </div>
)}
```

---

**Day 6–7 Commits:**
- `feat: /api/analytics/platform — institution-wide aggregates endpoint`
- `feat: analytics Institution tab for ADMIN role`

---

### Day 8–9 · Real `/api/dashboard` · 2 days

**Goal:** The hardcoded `EDUCATOR_PROFILES` and `STUDENT_PROFILES` objects in `page.tsx` are replaced with real Neon data. The simulated data watermark on Analytics becomes unnecessary and can be removed.

---

#### New endpoint
**New file:** `app/api/dashboard/route.ts`

The endpoint returns role-specific data:

**For ADMIN** (DiPaola's view):
```typescript
{
  role: 'ADMIN',
  stats: {
    activeStudents: number,   // unique users with sessions in last 30 days
    totalSessions: number,    // all-time ToolSession count
    totalTools: number,       // APPROVED + COMMUNITY tool count
    avgScore: number,         // mean of MetricEvent scores, type 'score'
  },
  recentActivity: {           // last 10 ToolSessions with user + tool
    studentName: string,
    toolName: string,
    date: string,             // relative: "2 hours ago"
    score: number | null,
  }[],
  pendingTools: number,       // Tool count where approvalStatus = 'PENDING'
}
```

**For EDUCATOR** (Heath Price's view):
```typescript
{
  role: 'EDUCATOR',
  toolsPublished: number,
  activeStudents: number,
  totalSessions: number,
  avgScore: number,
  recentActivity: RecentActivity[],
  pendingGradebook: { courseId: string; courseName: string; count: number }[],
}
```

**For STUDENT** (Ian, Tiana):
```typescript
{
  role: 'STUDENT',
  streak: number,             // consecutive days with sessions
  totalSessions: number,
  avgScore: number,
  recentSessions: { toolName: string; score: number; date: string }[],
  upcomingDue: { title: string; course: string; date: string; urgent: boolean }[],
}
```

---

#### Wire up to home page
**File:** `app/page.tsx`

Replace the `EDUCATOR_PROFILES[currentUser.email]` and `STUDENT_PROFILES[currentUser.email]` reads with a `useEffect` that calls `GET /api/dashboard` on mount. Keep the hardcoded objects as a fallback skeleton while loading.

Once this endpoint is live and the home page uses it:
- Remove the `EDUCATOR_PROFILES` and `STUDENT_PROFILES` constants from `page.tsx`
- Remove the simulated data banner from `/analytics/faculty/page.tsx`

---

**Day 8–9 Commits:**
- `feat: /api/dashboard — real home dashboard data for all roles`
- `feat: home page uses /api/dashboard, removes synthetic profile constants`
- `fix: remove simulated data watermark (real data now live)`

---

### Day 10 · QA and Rehearsal Run · 1 day

**Goal:** Experience the platform as DiPaola, cold, with fresh eyes. Every confusion is a bug.

---

#### The Cold Walkthrough Script

Log in as `bob.dipaola@uky.edu`. Do not use the keyboard shortcut for any page. Navigate only with visible UI elements.

**Checkpoint 1 — Home (30 seconds)**
- [ ] Header shows "CATS-AI · Center for AI Teaching & Learning"
- [ ] KPI strip shows real numbers (or clearly labeled illustrative)
- [ ] LeadershipCard is visible without scrolling on a standard laptop screen
- [ ] Activity feed shows recent student sessions across multiple disciplines

**Checkpoint 2 — Navigation (15 seconds)**
- [ ] "Tools" is visible in the top nav
- [ ] "Admin" is visible in the top nav
- [ ] All nav items are labeled in plain language (no jargon)

**Checkpoint 3 — Tools Marketplace (60 seconds)**
- [ ] Clicking "Tools" shows the marketplace immediately (no interstitial)
- [ ] Tools are visible from multiple academic disciplines
- [ ] Clicking a tool opens its detail page
- [ ] Clicking "Start" or the chat input starts a conversation with the AI tool

**Checkpoint 4 — Switch to Student (30 seconds)**
- [ ] Opening avatar dropdown shows "Demo Mode — View As" with explanatory text
- [ ] Clicking Ian McClure switches views
- [ ] Amber banner appears: "Viewing as Ian McClure (student)"
- [ ] Student nav looks visually different (Tools visible, Community visible)
- [ ] "Return to Dr. DiPaola" button works

**Checkpoint 5 — Analytics (60 seconds)**
- [ ] Clicking Analytics opens the page
- [ ] KPI strip is visible immediately
- [ ] "Institution" tab is visible (ADMIN only)
- [ ] Institution tab shows adoption curve chart
- [ ] No unmanaged exceptions in console

**Checkpoint 6 — Admin Panel → Economics (30 seconds)**
- [ ] Clicking "Admin" in nav goes to `/admin`
- [ ] Clicking the "Economics" tab shows the cost-to-value card
- [ ] The comparison sentence is readable: *"Traditional tutoring: $50–150/hr…"*
- [ ] No `window.prompt()` appears accidentally

**Total rehearsal time target: under 5 minutes.**

If anything takes more than 10 seconds to find, that's a fix that needs to happen before Day 14.

---

**Day 10 Commit:** `fix: QA pass — [list specific items fixed during walkthrough]`

---

## Days 11–14 · Buffer

Four days before the presentation. Use for:

- **Any blockers** that came up during Day 10 QA
- **Vercel environment verification** — confirm live URL works, env vars are set, crons are active
- **Second cold walkthrough** — ideally by someone who has not seen the platform before. Their first confusion is your last fix.
- **Demo script preparation** — decide in advance whether DiPaola is handed the laptop (unguided) or shown a guided tour. The platform is built for unguided, but a 2-minute orientation speech still helps.
- **Content polish** — review all framing copy added during the sprint for tone. It should sound like the university, not like a pitch deck.

---

## One Question That Changes Week 2

**Run this to check real data volume:**

```bash
cd "c:\AA Code\Educator marketplace\the-sandbox"
npx ts-node -e "
import { PrismaClient } from './app/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import * as dotenv from 'dotenv'
dotenv.config()
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! })
})
Promise.all([
  prisma.toolSession.count(),
  prisma.user.count(),
  prisma.tool.count(),
  prisma.metricEvent.count(),
]).then(([sessions, users, tools, metrics]) => {
  console.log({ sessions, users, tools, metrics })
  process.exit(0)
})
"
```

**If sessions > 500:** The Platform Analytics tab will show compelling adoption curves. Lead with it.

**If sessions < 100 (seed data only):** The charts will show honest-but-sparse data. This is fine. A platform that's been live for 2 weeks with real seed data showing organic usage patterns is more credible than synthetic charts. Label accordingly and lean into the "this is what week two looks like" framing.

---

## Full File Change Index

| Day | File | Type |
|---|---|---|
| 1 | `app/components/Header.tsx` | 4 targeted edits |
| 1 | `app/analytics/faculty/page.tsx` | Add simulated data banner |
| 1 | `app/components/SandTooltip.tsx` | **New component** |
| 1 | `app/components/CourseMagicButton.tsx` | Add tooltip |
| 2 | `app/lib/auth-context.tsx` | originalAdmin tracking |
| 2 | `app/components/ViewingAsBanner.tsx` | **New component** |
| 2 | `app/layout.tsx` | Mount ViewingAsBanner |
| 3 | `app/components/LeadershipCard.tsx` | **New component** |
| 3 | `app/page.tsx` | KPI strip + LeadershipCard in admin view |
| 4 | `app/analytics/faculty/page.tsx` | KPI strip above charts |
| 4 | `app/admin/page.tsx` | Cost-to-value card in Economics tab |
| 5 | `app/build/page.tsx` | How-it-works strip + example link |
| 5 | `app/sandcastle/page.tsx` | Institutional framing callout |
| 6–7 | `app/api/analytics/platform/route.ts` | **New API route** |
| 6–7 | `app/analytics/faculty/page.tsx` | Institution tab + charts |
| 8–9 | `app/api/dashboard/route.ts` | **New API route** |
| 8–9 | `app/page.tsx` | Replace synthetic constants with API call |
| 8–9 | `app/analytics/faculty/page.tsx` | Remove simulated data banner |
| 10 | Various | QA fixes |

**New files created:** 4 (`SandTooltip.tsx`, `ViewingAsBanner.tsx`, `LeadershipCard.tsx`, `api/analytics/platform/route.ts`, `api/dashboard/route.ts`)

**Existing files modified:** 7

**Schema changes:** None

**New dependencies:** None

---

## Success Criteria

The build is complete when all of the following are true:

**Navigation**
- [ ] An ADMIN can reach the Tools Marketplace from the top nav in one click
- [ ] An ADMIN can reach the Admin Panel from the top nav in one click

**Trust & Transparency**
- [ ] All synthetic/simulated data is labeled as such, or replaced with real data
- [ ] The Economics tab contains a per-session cost and a real-world comparison sentence

**Orientation**
- [ ] The admin home dashboard answers "what is this, how many people use it, what does it cost" without any navigation
- [ ] "CATS-AI" is followed by its full name on every first appearance

**Demo Mode**
- [ ] Switching to a student perspective shows a persistent amber banner
- [ ] The return button on that banner works correctly after page navigation
- [ ] The user-switcher reads "Demo Mode — View As" with an explanatory subtitle

**Engagement Framing**
- [ ] Sandcastle page includes one paragraph of institutional rationale
- [ ] Build page explains itself in three steps before the text input

**Analytics**
- [ ] The Analytics page has a KPI strip visible without scrolling
- [ ] The Institution tab (ADMIN only) shows real Neon data
- [ ] The home dashboard shows real data from `/api/dashboard` (or is clearly labeled illustrative if real data is sparse)

---

*Plan authored: 2026-03-19*
*Full technical spec: `Blueprints/provost-experience-architecture.md`*
*UX audit source: Provost walkthrough analysis, 2026-03-19*
