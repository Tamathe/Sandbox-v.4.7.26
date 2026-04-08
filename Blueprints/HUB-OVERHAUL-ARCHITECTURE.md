# Hub Overhaul — Technical Architecture

> **Status:** Phase 2 — Approved Spec → Architecture
> **Goal:** Make `/hub` the most compelling first impression for a university stakeholder demo.
> **Scope:** Hub page restructure, hero curation, redundancy removal, Tier 2 polish, search fix, Workshop update.
> **Primary file:** `app/hub/page.tsx` (868 lines)

---

## Table of Contents

1. [Current State Summary](#1-current-state-summary)
2. [Change 1: Hero Section Expansion (4 → 8)](#2-change-1-hero-section-expansion)
3. [Change 2: Redundancy Removal (3 Portal CTAs)](#3-change-2-redundancy-removal)
4. [Change 3: Search Index Fix](#4-change-3-search-index-fix)
5. [Change 4: Tier 2 De-emphasis + Quick Polish](#5-change-4-tier-2-de-emphasis)
6. [Change 5: Workshop Tab Update](#6-change-5-workshop-tab-update)
7. [Change 6: Detail Page Polish](#7-change-6-detail-page-polish)
8. [Files Affected](#8-files-affected)
9. [Data Model Changes](#9-data-model-changes)
10. [Execution Phases](#10-execution-phases)

---

## 1. Current State Summary

### Hub Page Structure (`app/hub/page.tsx`)

```
Tab Strip: [Campus Resources] [Tools] [Workshop]

Tab 1 — Campus Resources:
├── Featured Experience (4 cards: Bracket, Debate, Quiz Bowl, Case Pitch)
├── Search bar
├── Accordion sections (6 role-gated):
│   ├── Student Support Services (6 tools) — STUDENT only
│   ├── Academic Planning (5 tools) — everyone
│   ├── Registrar & Records (3-6 tools) — role-gated
│   ├── Research Support (4 tools) — non-STUDENT
│   ├── University Services (2 tools) — everyone
│   └── Community & Resources (3 tools) — everyone
├── Campus Navigator CTA (redundant)
├── Research Hub CTA (redundant, non-STUDENT)
└── Try a Template CTA (redundant)

Tab 2 — Tools:
├── ToolsBrowser component (DB-driven marketplace)
└── Most Requested section

Tab 3 — Workshop:
└── 11 Coming Soon cards (read-only, no interactivity)
```

### Key Issues Identified
1. **Hero only shows 4 items** — misses Playground Templates, Ask Wil, UKNow
2. **3 portal CTAs duplicate accordion content** (Campus Nav = Academic Planning, Research Hub = Research Support)
3. **Search doesn't index Featured Experience cards** — searching "bracket" finds nothing
4. **Thin Tier 2 tools shown at same prominence** as polished ones
5. **Workshop shows 11 locked items** — makes platform feel incomplete
6. **Featured cards are horizontally listed** — not hero-grade visual treatment

---

## 2. Change 1: Hero Section Expansion

### Current (lines 589-654)
4 cards in a `grid-cols-2` layout, each a horizontal `flex items-center` row card.

### Target
8 cards in a visually compelling hero grid. Two visual tiers:

**Tier A — "Headline Experiences" (top row, 2 large cards):**
1. The Bracket (`/bracket`)
2. Cardiac Arrest Simulator (`/playground-templates` with `?template=cardiac-arrest`)

**Tier B — "Featured Tools" (bottom row, 6 smaller cards):**
3. Debate Arena (`/debate`)
4. Quiz Bowl Blitz (`/quiz-bowl`)
5. Case Pitch (`/pitch`)
6. Moot Court (`/playground-templates` with `?template=moot-court`)
7. Ask Wil (`/student-services/academic-advisor`)
8. UKNow (`/uknow`)

### Layout Architecture

```
┌──────────────────────┬──────────────────────┐
│                      │                      │
│   THE BRACKET        │   CARDIAC ARREST     │
│   (large hero card)  │   (large hero card)  │
│                      │                      │
├───────┬───────┬──────┼───────┬───────┬──────┤
│Debate │Quiz   │Case  │Moot   │Ask    │UKNow │
│Arena  │Bowl   │Pitch │Court  │Wil    │      │
└───────┴───────┴──────┴───────┴───────┴──────┘
```

### Data Structure

```typescript
interface HeroItem {
  href: string
  label: string
  tagline: string
  icon: React.ComponentType<{ className?: string }>
  iconBg: string      // e.g., 'bg-amber-50'
  iconColor: string   // e.g., 'text-amber-500'
  borderColor: string // e.g., 'border-amber-100'
  cta: string         // e.g., 'Join now', 'Launch', 'Try it'
  tier: 'headline' | 'featured'
}

const HERO_ITEMS: HeroItem[] = [
  {
    href: '/bracket',
    label: 'The Bracket',
    tagline: 'NCAA March Madness · Pick your winners · Live leaderboard',
    icon: Trophy,
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-500',
    borderColor: 'border-amber-200',
    cta: 'Join now',
    tier: 'headline',
  },
  {
    href: '/playground-templates?template=cardiac-arrest',
    label: 'Cardiac Arrest Simulator',
    tagline: 'Clinical decision-making simulation with real-time AI coaching',
    icon: Heart, // or Activity
    iconBg: 'bg-red-50',
    iconColor: 'text-red-500',
    borderColor: 'border-red-200',
    cta: 'Launch sim',
    tier: 'headline',
  },
  {
    href: '/debate',
    label: 'Debate Arena',
    tagline: 'Structured debates with AI verdicts',
    icon: Gavel,
    iconBg: 'bg-blue-50',
    iconColor: 'text-[#0033A0]',
    borderColor: 'border-blue-200',
    cta: 'Start',
    tier: 'featured',
  },
  {
    href: '/quiz-bowl',
    label: 'Quiz Bowl Blitz',
    tagline: 'AI-generated live quizzes',
    icon: Zap,
    iconBg: 'bg-yellow-50',
    iconColor: 'text-yellow-500',
    borderColor: 'border-yellow-200',
    cta: 'Play',
    tier: 'featured',
  },
  {
    href: '/pitch',
    label: 'Case Pitch',
    tagline: 'Business pitch + AI judge feedback',
    icon: Briefcase,
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    borderColor: 'border-emerald-200',
    cta: 'Compete',
    tier: 'featured',
  },
  {
    href: '/playground-templates?template=moot-court',
    label: 'Moot Court',
    tagline: 'Appellate oral argument practice',
    icon: Gavel, // or Scale
    iconBg: 'bg-indigo-50',
    iconColor: 'text-indigo-600',
    borderColor: 'border-indigo-200',
    cta: 'Argue',
    tier: 'featured',
  },
  {
    href: '/student-services/academic-advisor',
    label: 'Ask Wil',
    tagline: 'AI advisor matched to your college',
    icon: GraduationCap,
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-600',
    borderColor: 'border-purple-200',
    cta: 'Ask',
    tier: 'featured',
  },
  {
    href: '/uknow',
    label: 'UKNow',
    tagline: '14K+ articles · AI-powered search',
    icon: Newspaper,
    iconBg: 'bg-sky-50',
    iconColor: 'text-sky-600',
    borderColor: 'border-sky-200',
    cta: 'Explore',
    tier: 'featured',
  },
]
```

### Headline Card Component (Tier A)

```tsx
// Large card with background gradient, larger icon, and prominent CTA
<Link href={item.href}
  className={`group relative rounded-2xl border-2 ${item.borderColor} bg-white p-8
    transition-all hover:shadow-lg hover:-translate-y-1 overflow-hidden`}
>
  <div className="flex items-center gap-6">
    <div className={`size-16 rounded-2xl ${item.iconBg} flex items-center justify-center flex-shrink-0`}>
      <Icon className={`size-8 ${item.iconColor}`} />
    </div>
    <div className="flex-1">
      <p className="text-lg font-extrabold text-gray-900 group-hover:text-[#0033A0]">{item.label}</p>
      <p className="text-sm text-gray-500 mt-1">{item.tagline}</p>
    </div>
    <div className="flex items-center gap-1.5 text-sm font-bold text-[#0033A0] flex-shrink-0">
      {item.cta} <ArrowRight className="size-4" />
    </div>
  </div>
</Link>
```

### Featured Card Component (Tier B)

```tsx
// Compact vertical card
<Link href={item.href}
  className={`group flex flex-col gap-3 rounded-2xl border-2 ${item.borderColor} bg-white p-5
    transition-all hover:shadow-md hover:-translate-y-0.5`}
>
  <div className={`size-10 rounded-xl ${item.iconBg} flex items-center justify-center`}>
    <Icon className={`size-5 ${item.iconColor}`} />
  </div>
  <div>
    <p className="text-sm font-bold text-gray-900 group-hover:text-[#0033A0]">{item.label}</p>
    <p className="text-xs text-gray-500 mt-0.5">{item.tagline}</p>
  </div>
  <div className="mt-auto flex items-center gap-1 text-xs font-semibold text-[#0033A0]">
    {item.cta} <ArrowRight className="size-3" />
  </div>
</Link>
```

### JSX Structure

```tsx
<section>
  <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">
    Featured Experiences
  </h2>
  {/* Headline row: 2 large cards */}
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
    {HERO_ITEMS.filter(h => h.tier === 'headline').map(item => (
      <HeadlineCard key={item.href} item={item} />
    ))}
  </div>
  {/* Featured row: 6 smaller cards */}
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
    {HERO_ITEMS.filter(h => h.tier === 'featured').map(item => (
      <FeaturedCard key={item.href} item={item} />
    ))}
  </div>
</section>
```

### Template Deep-Link Handling

The Playground Templates page (`/playground-templates`) needs to support a `?template=cardiac-arrest` query param that auto-selects and launches the template. This requires a small change to the templates page:

**File:** `app/playground-templates/page.tsx` (or wherever the templates page lives)
- Read `searchParams.template` on mount
- If present, auto-scroll to and highlight the matching template
- Optionally auto-launch it

---

## 3. Change 2: Redundancy Removal

### What to Remove

**Lines 768-825** — Three portal CTAs at the bottom of Campus Resources tab:

1. **Campus Navigator CTA** (lines 768-785) — duplicates "Academic Planning" accordion section which links to the same 4 Campus Navigator tools
2. **Research Hub CTA** (lines 787-805) — duplicates "Research Support" accordion section which links to the same 4 Research Hub tools
3. **Try a Template CTA** (lines 808-825) — now redundant because Moot Court and Cardiac Arrest are in the hero section

### Implementation

Simply delete lines 768-825 from `app/hub/page.tsx`. No other files affected.

### Alternative: Transform into "Quick Portals"

Instead of removing entirely, we could replace the 3 large CTAs with a compact "Quick Links" bar:

```tsx
<div className="flex gap-3">
  <Link href="/campus-navigator" className="text-xs font-semibold text-[#0033A0] hover:underline">
    Campus Navigator →
  </Link>
  <Link href="/research-hub" className="text-xs font-semibold text-green-700 hover:underline">
    Research Hub →
  </Link>
  <Link href="/playground-templates" className="text-xs font-semibold text-violet-600 hover:underline">
    Templates →
  </Link>
</div>
```

**Recommendation:** Full removal. The hero + accordion sections provide all the navigation needed.

---

## 4. Change 3: Search Index Fix

### Current Bug (lines 452-465)

The `filteredCards` memo only searches `sections` (accordion tools). The 8 `HERO_ITEMS` are not included.

### Fix

Add HERO_ITEMS to the search pool:

```typescript
const filteredCards = useMemo(() => {
  if (!debouncedQuery.trim()) return null
  const q = debouncedQuery.toLowerCase()
  const results: HubTool[] = []

  // Search hero items first
  for (const item of HERO_ITEMS) {
    if (item.label.toLowerCase().includes(q) || item.tagline.toLowerCase().includes(q)) {
      results.push({
        href: item.href,
        label: item.label,
        description: item.tagline,
        icon: item.icon,
        iconColor: item.iconColor,
      })
    }
  }

  // Then search accordion sections
  for (const section of sections) {
    for (const tool of section.tools) {
      // Avoid duplicates (hero items that also appear in accordion)
      if (!results.find(r => r.href === tool.href)) {
        if (tool.label.toLowerCase().includes(q) || tool.description.toLowerCase().includes(q)) {
          results.push(tool)
        }
      }
    }
  }
  return results
}, [debouncedQuery, sections])
```

**Files:** `app/hub/page.tsx` only.

---

## 5. Change 4: Tier 2 De-emphasis + Quick Polish

### Tools to De-emphasize

These are functional but not demo-impressive. They should be moved to the bottom of their accordion sections and given smaller visual treatment.

| Tool | Current Section | Action |
|------|-----------------|--------|
| Degree Planner | Academic Planning | Move to bottom, add AI suggestion |
| Petitions (Submit) | Registrar & Records | Move to bottom |
| Bounty Board | Community & Resources | Move to bottom, add AI trending |
| Community Datasets | Community & Resources | Move to bottom, add inline preview |
| Public App Gallery | Community & Resources | Move to bottom, add Staff Pick badge |

### De-emphasis Strategy

Reorder the `tools` arrays so polished items appear first. No visual change to the cards themselves — the accordion naturally shows top items first when collapsed.

### Quick Polish — Specific Changes

#### A. Degree Planner → AI Course Suggestions

**Current:** Pure CRUD form at `/degree-plan`
**Enhancement:** Add an AI suggestion banner at the top of the page

**New component:** `DegreePlanAISuggestion.tsx`
- On page load, call `/api/degree-plan/suggestions` (new endpoint)
- Pass student's major, completed courses, current plan
- AI returns 2-3 course suggestions with reasoning
- Render as a dismissible blue banner: "Based on your Mechanical Engineering major, consider adding ME 330 next semester — it's a prerequisite for your senior capstone."

**New API route:** `app/api/degree-plan/suggestions/route.ts`
- Auth: `requireRequestUser`
- Fetches student's DegreePlan + enrollment context
- Calls Haiku with system prompt focused on UK course prerequisites
- Returns `{ suggestions: Array<{ course: string; reason: string }> }`

#### B. Bounties → AI Trending Summary

**Current:** List view with filters
**Enhancement:** Add a "Trending This Week" AI-generated summary at the top

**New component:** Add to existing `bounties/page.tsx`
- Fetch top 5 open bounties
- Call a new `/api/bounties/trending` endpoint
- AI summarizes: "Faculty are looking for tools in X, Y, and Z areas this week."
- Render as a gradient card above the list

#### C. Datasets → Inline Preview

**Current:** Static catalog cards
**Enhancement:** Add expandable preview section to each dataset card

- Each dataset card gets a "Preview" toggle
- Shows 3-5 sample rows of the dataset in a mini table
- Data comes from the existing dataset definitions (static, no API needed)

#### D. Apps Gallery → Staff Pick Badges

**Current:** Search + tag filter grid
**Enhancement:** Add "Staff Pick" badge to curated apps

- Add a `staffPick: boolean` field to the Playground app query
- Hardcode 3-5 app IDs as staff picks (or add a DB field later)
- Render a small blue badge: "⭐ Staff Pick" on selected cards
- Sort staff picks to top of default view

---

## 6. Change 5: Workshop Tab Update

### Current (lines 830-865)

11 `COMING_SOON_TOOLS` shown as locked gray cards.

### New Strategy

Replace the 11 items with a curated list:
- **4 new tools** (Grant Finder, Space Optimizer, Faculty Command Center, Grant Writing Assistant) — these get "In Development" badges and brief descriptions
- **3-4 best of the old list** — keep: Policy Navigator, Collaboration Finder, Lab Notebook, Internship Matching
- **Remove the rest** — Committee Automator, Syllabus Compliance, Accreditation Collector, Student Gov Feedback, Alumni Mentor

### Updated `COMING_SOON_TOOLS` Array

```typescript
const COMING_SOON_TOOLS: ComingSoonTool[] = [
  // New tools (being built)
  {
    label: 'Grant Finder',
    description: 'Semantic matching of your research profile to grant databases. Personalized scoring, deadline tracking, and logistical support.',
    icon: Search, // or Target
    audience: 'Faculty',
    status: 'building', // new field
  },
  {
    label: 'Faculty Command Center',
    description: 'Your AI chief of staff — aggregated deadlines, student performance summaries, email drafting. Outlook & SharePoint integration.',
    icon: LayoutGrid,
    audience: 'Faculty',
    status: 'building',
  },
  {
    label: 'Space Utilization Optimizer',
    description: 'AI scheduling that accounts for room capacity, equipment, pedagogy needs, and time preferences. Find and book the right space instantly.',
    icon: LayoutGrid, // or Building
    audience: 'Admin',
    status: 'building',
  },
  {
    label: 'Grant Writing Assistant',
    description: 'Upload your CV and the grant RFP. AI generates first-draft narrative sections — specific aims, significance, approach, budget justification.',
    icon: PenLine,
    audience: 'Faculty',
    status: 'building',
  },
  // Retained from original (most compelling)
  {
    label: 'Policy Navigator',
    description: '"I got an academic integrity charge — what are my actual rights and timelines?" Navigate the 400-page student handbook instantly.',
    icon: ShieldCheck,
    audience: 'Students',
    status: 'planned',
  },
  {
    label: 'Collaboration Finder',
    description: '"Who else at UK is working on X?" Cross-department discovery based on publications, courses, and tool usage.',
    icon: Handshake,
    audience: 'Everyone',
    status: 'planned',
  },
  {
    label: 'Lab Notebook',
    description: 'AI-assisted experiment logging that auto-links methodology, suggests related papers, and flags reproducibility issues.',
    icon: FlaskRound,
    audience: 'Research',
    status: 'planned',
  },
  {
    label: 'Internship & Co-op Matching',
    description: 'Connects your transcript, skills from tool usage, and employer partnerships. Career services, accelerated.',
    icon: BriefcaseBusiness,
    audience: 'Students',
    status: 'planned',
  },
]
```

### Visual Treatment Update

Add visual distinction between "building" and "planned" status:

```tsx
{tool.status === 'building' ? (
  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
    <Wrench className="size-3" /> In Development
  </span>
) : (
  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
    <Lock className="size-3" /> Planned
  </span>
)}
```

---

## 7. Change 6: Detail Page Polish

> Full detail page architecture is in a **separate document**: `DETAIL-PAGE-POLISH-ARCHITECTURE.md`

### Summary of Changes

1. **Fix duplicate overview JSX** — Lines 935-1044 of `/tools/[id]/page.tsx` have near-identical student vs. non-student blocks. Extract to shared component.
2. **Ensure every hero-linked page has polished first impression** — Verify Playground Templates deep-link works for Cardiac Arrest and Moot Court.
3. **Add loading/empty states** to any page that might show a blank screen on first render.

---

## 8. Files Affected

### Primary Changes

| File | Change | Lines Affected |
|------|--------|---------------|
| `app/hub/page.tsx` | Hero expansion, CTA removal, search fix, workshop update | ~200 lines modified |
| `app/hub/page.tsx` | Tier 2 reorder in section arrays | ~10 lines |

### New Files

| File | Purpose |
|------|---------|
| `app/api/degree-plan/suggestions/route.ts` | AI course suggestion endpoint |
| `app/api/bounties/trending/route.ts` | AI trending summary endpoint |

### Modified Files (Quick Polish)

| File | Change |
|------|--------|
| `app/degree-plan/page.tsx` | Add AI suggestion banner |
| `app/bounties/page.tsx` | Add trending summary card |
| `app/datasets/page.tsx` | Add inline preview toggles |
| `app/apps/page.tsx` | Add Staff Pick badges |
| `app/playground-templates/page.tsx` | Support `?template=` deep-link |

### No Schema Changes Required

All Hub overhaul changes are UI-only. The quick polish items use existing data + new AI endpoints.

---

## 9. Data Model Changes

**None.** This entire workstream requires zero Prisma schema changes.

The only "data" changes are:
- Hardcoded `HERO_ITEMS` array replacing hardcoded Featured Experience cards
- Hardcoded `COMING_SOON_TOOLS` array update
- Reordered tool arrays within accordion sections

---

## 10. Execution Phases

| Phase | Tasks | Est. Complexity |
|-------|-------|-----------------|
| **P1** | Hero section expansion (4→8) + template deep-link | Medium |
| **P2** | Redundancy removal (3 CTAs) + search index fix | Low |
| **P3** | Tier 2 reorder + Degree Plan AI suggestions | Medium |
| **P4** | Bounties trending + Datasets preview + Apps Staff Pick | Medium |
| **P5** | Workshop tab update (new tools + visual status) | Low |
| **P6** | Detail page polish (separate doc) | Medium |

Each phase contains ≤2 tasks per the handoff prompt constraint.

---

## Appendix: Playground Template Deep-Link

The `/playground-templates` page needs to handle `?template=cardiac-arrest` and `?template=moot-court` query params.

### Current Template Slugs (from `lib/playground-templates/index.ts`):

Need to verify exact slugs. Expected:
- `cardiac-arrest` or `cardiac-arrest-simulator`
- `moot-court`
- `sepsis-simulator`
- `lab-safety`
- `budget-allocation`
- `ear-training`

### Implementation:

```typescript
// In playground-templates/page.tsx
const searchParams = useSearchParams()
const autoTemplate = searchParams.get('template')

useEffect(() => {
  if (autoTemplate) {
    // Find matching template, scroll to it, highlight it
    const el = document.getElementById(`template-${autoTemplate}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('ring-2', 'ring-[#0033A0]')
    }
  }
}, [autoTemplate])
```
