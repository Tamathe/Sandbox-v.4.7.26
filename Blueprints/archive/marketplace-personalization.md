# Blueprint: Personalized Tools Marketplace
### Feature: Redesign `/tools` from a generic catalog into a relevance-first discovery experience
### Target file: `the-sandbox/app/tools/page.tsx` (full rewrite)
### Also modifies: `app/components/ToolCard.tsx`, `app/api/tools/route.ts`
### Status: Ready for implementation

---

## 1. Context & Goal

The current marketplace is a static catalog — every user sees the same "Featured" section (just the 4 most upvoted tools) and the same filter grid. A 1L law student and an English literature junior see the identical page. There is no personalization, no "continue where you left off," and no signal about which tools are new, trending, or linked to the user's actual courses.

**The redesign goal:** Answer *"what's useful for me right now"* before the user has to ask.

**Principle:** The top half of the page is personal and contextual. The bottom half is the full filterable catalog (keep what works). The smart sections at the top replace "Featured Tools" entirely.

---

## 2. No Schema Changes Required

All changes are frontend + one small API update. The schema already has everything needed:
- `Tool.createdAt` → detect "new this week"
- `Tool._count.sessions` → detect "trending" (needs to be added to API include)
- `CourseToolLink` → find tools linked to courses (already implemented from courses blueprint)
- `User.department` / `User.college` → department-based personalization

---

## 3. API Change — Add session count to tools response

**File:** `app/api/tools/route.ts`

**Find this block** (around line 61):
```typescript
_count: {
  select: { upvotes: true, favorites: true, comments: true },
},
```

**Replace with** (add sessions):
```typescript
_count: {
  select: { upvotes: true, favorites: true, comments: true, sessions: true },
},
```

This is a one-line addition. `sessions` is already a relation on `Tool` (`ToolSession[]`), so Prisma will count it automatically.

Also add `since` query param support. **Find** the where-clause building section (around line 44) and add after `if (difficulty) where.difficultyLevel = difficulty`:

```typescript
const since = searchParams.get('since') || ''
if (since) {
  where.createdAt = { gte: new Date(since) }
}
```

---

## 4. Type Changes

**File:** `app/lib/types.ts`

Find the `ToolWithDetails` type definition and add `sessions` to `_count`. The type likely looks like:
```typescript
_count: { upvotes: number; favorites: number; comments: number }
```

**Update to:**
```typescript
_count: { upvotes: number; favorites: number; comments: number; sessions: number }
```

---

## 5. ToolCard Enhancement — Signal Badges

**File:** `app/components/ToolCard.tsx`

Add an optional `signals` prop that renders small overlay badges on the thumbnail's **bottom-left corner**. These communicate relevance without altering the card's visual weight.

**Step 1 — Update the component signature:**

Find:
```typescript
interface ToolCardProps {
  tool: ToolWithDetails
}
```

Replace with:
```typescript
interface ToolCardProps {
  tool: ToolWithDetails
  signals?: { label: string; color: string }[]  // e.g. [{label:'New', color:'bg-blue-500'}]
}
```

**Step 2 — Update the function signature:**

Find:
```typescript
export default function ToolCard({ tool }: ToolCardProps) {
```

Replace with:
```typescript
export default function ToolCard({ tool, signals }: ToolCardProps) {
```

**Step 3 — Add signals rendering inside the thumbnail div.**

Find the thumbnail section that ends with the toolType badge (the `right-3` positioned div). After that closing `</div>`, **before the outer thumbnail `</div>` closes**, add:

```tsx
{signals && signals.length > 0 && (
  <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
    {signals.map((s, i) => (
      <span key={i} className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white shadow-sm ${s.color}`}>
        {s.label}
      </span>
    ))}
  </div>
)}
```

The thumbnail `div` structure for reference:
```tsx
<div className={`relative h-36 ${bgClass} flex items-center justify-center`}>
  {/* ...image or icon... */}
  {/* featured badge - top-left */}
  {/* toolType badge - top-right */}
  {/* ADD signals here — bottom-left */}
</div>
```

---

## 6. Department → Category Mapping

This mapping is used throughout the page to determine which category is "relevant" to the current user. Define it as a constant near the top of `app/tools/page.tsx`:

```typescript
// Maps fragments of User.department or User.college to a Tool.category
const DEPT_TO_CATEGORY: { match: string; category: string }[] = [
  { match: 'law',         category: 'Law' },
  { match: 'legal',       category: 'Law' },
  { match: 'engineer',    category: 'STEM' },
  { match: 'science',     category: 'STEM' },
  { match: 'math',        category: 'STEM' },
  { match: 'medicine',    category: 'Medicine' },
  { match: 'medical',     category: 'Medicine' },
  { match: 'nursing',     category: 'Medicine' },
  { match: 'business',    category: 'Business' },
  { match: 'management',  category: 'Business' },
  { match: 'english',     category: 'Arts' },
  { match: 'arts',        category: 'Arts' },
  { match: 'humanities',  category: 'Arts' },
  { match: 'history',     category: 'History' },
  { match: 'provost',     category: 'University' },
  { match: 'cats',        category: 'University' },
]

function getDeptCategory(user: { department?: string; college?: string }): string | null {
  const haystack = `${user.department ?? ''} ${user.college ?? ''}`.toLowerCase()
  for (const { match, category } of DEPT_TO_CATEGORY) {
    if (haystack.includes(match)) return category
  }
  return null
}
```

---

## 7. Full Page Rewrite — `app/tools/page.tsx`

This is a complete replacement of the file. Preserve ALL existing imports and constants; add new ones.

### 7a. Imports

```typescript
'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Search, SlidersHorizontal, X, ArrowRight, Flame, Sparkles, GraduationCap, BookOpen } from 'lucide-react'
import ToolCard from '../components/ToolCard'
import { ToolWithDetails } from '../lib/types'
import { useAuth } from '../lib/auth-context'
```

### 7b. Constants — expand TOOL_TYPES to match all ToolType enum values

```typescript
const CATEGORIES = ['All', 'Law', 'History', 'STEM', 'Medicine', 'Business', 'Arts', 'University', 'General']

const TOOL_TYPES = ['All', 'Chatbot', 'External', 'Simulation', 'Quiz', 'AI Interview', 'Debate', 'Study Buddy']

// Maps display label to Prisma enum value
const TOOL_TYPE_VALUES: Record<string, string> = {
  'Chatbot':      'CHATBOT',
  'External':     'EXTERNAL',
  'Simulation':   'SIMULATION',
  'Quiz':         'QUIZ',
  'AI Interview': 'AI_INTERVIEW',
  'Debate':       'DEBATE',
  'Study Buddy':  'STUDY_BUDDY',
}

const DIFFICULTIES = ['All', 'Introductory', 'Intermediate', 'Advanced']
const SORTS = [
  { value: 'newest',    label: 'Newest' },
  { value: 'upvotes',   label: 'Most Upvoted' },
  { value: 'favorites', label: 'Most Favorited' },
  { value: 'sessions',  label: 'Most Used' },
]
```

### 7c. SkeletonCard — keep exactly as-is (no changes)

### 7d. Main component

```typescript
export default function ToolsPage() {
  const { currentUser } = useAuth()
  const browseRef = useRef<HTMLDivElement>(null)

  // ── All published tools (fetched once, used for smart sections) ──
  const [allTools, setAllTools] = useState<ToolWithDetails[]>([])
  const [allLoading, setAllLoading] = useState(true)

  // ── Browse / filter state ──
  const [tools, setTools] = useState<ToolWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [toolType, setToolType] = useState('All')
  const [difficulty, setDifficulty] = useState('All')
  const [sort, setSort] = useState('newest')
  const [total, setTotal] = useState(0)

  const isStudent  = currentUser.role === 'STUDENT'
  const isEducator = currentUser.role === 'EDUCATOR' || currentUser.role === 'ADMIN'
  const deptCategory = getDeptCategory(currentUser)
```

### 7e. Fetch all tools once (for smart sections)

```typescript
  // Fetch all published tools once — used to build smart sections client-side
  useEffect(() => {
    setAllLoading(true)
    fetch(`/api/tools?limit=100&sort=newest`, {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then(r => r.json())
      .then(d => setAllTools(d.tools ?? []))
      .catch(() => {})
      .finally(() => setAllLoading(false))
  }, [currentUser.email])
```

### 7f. Compute smart sections from allTools using useMemo

```typescript
  const smartSections = useMemo(() => {
    if (allTools.length === 0) return null

    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // "New this week" — created in last 7 days
    const newThisWeek = allTools
      .filter(t => new Date(t.createdAt) >= sevenDaysAgo)
      .slice(0, 4)

    // "Trending" — sorted by session count descending, top 4
    const trending = [...allTools]
      .sort((a, b) => (b._count.sessions ?? 0) - (a._count.sessions ?? 0))
      .slice(0, 4)

    // "For Your Department" — filtered by matching category
    const forDept = deptCategory
      ? allTools.filter(t => t.category === deptCategory).slice(0, 4)
      : []

    // "My Tools" (educator view) — tools created by current user
    const myTools = isEducator
      ? allTools.filter(t => t.creator.email === currentUser.email).slice(0, 4)
      : []

    return { newThisWeek, trending, forDept, myTools }
  }, [allTools, deptCategory, isEducator, currentUser.email])
```

### 7g. Debounced search — replaces manual form submit

```typescript
  // Debounced search — fires 300ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])
```

### 7h. Fetch filtered tools (for Browse All section)

```typescript
  const fetchTools = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (category !== 'All') params.set('category', category)
      if (toolType !== 'All') params.set('toolType', TOOL_TYPE_VALUES[toolType] || toolType.toUpperCase())
      if (difficulty !== 'All') params.set('difficulty', difficulty)
      // "Most Used" sort: fetch by sessions count — API doesn't support sessions sort yet,
      // so fall back to fetching all and sorting client-side
      params.set('sort', sort === 'sessions' ? 'newest' : sort)
      params.set('limit', '48')
      const res = await fetch(`/api/tools?${params.toString()}`, {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (res.ok) {
        const data = await res.json()
        let result: ToolWithDetails[] = data.tools
        if (sort === 'sessions') {
          result = [...result].sort((a, b) => (b._count.sessions ?? 0) - (a._count.sessions ?? 0))
        }
        setTools(result)
        setTotal(data.total)
      }
    } catch (err) {
      console.error('Failed to fetch tools:', err)
    } finally {
      setLoading(false)
    }
  }, [search, category, toolType, difficulty, sort, currentUser.email])

  useEffect(() => { fetchTools() }, [fetchTools])

  const clearSearch = () => setSearchInput('')
  const hasActiveFilters = category !== 'All' || toolType !== 'All' || difficulty !== 'All' || search !== ''
  const clearAllFilters = () => {
    setCategory('All'); setToolType('All'); setDifficulty('All')
    setSearchInput(''); setSearch('')
  }
```

### 7i. Signal computation helper

```typescript
  // Compute signal badges for a tool card based on context
  function getSignals(tool: ToolWithDetails): { label: string; color: string }[] {
    const signals: { label: string; color: string }[] = []
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    if (new Date(tool.createdAt) >= sevenDaysAgo) {
      signals.push({ label: 'New', color: 'bg-blue-500' })
    }
    if ((tool._count.sessions ?? 0) >= 50) {
      signals.push({ label: 'Hot', color: 'bg-orange-500' })
    }
    return signals
  }
```

### 7j. SmartSection sub-component (define inside the same file)

```typescript
function SmartSection({
  title,
  subtitle,
  icon: Icon,
  tools,
  loading,
  emptyMessage,
  getSignals,
}: {
  title: string
  subtitle: string
  icon: React.ComponentType<{ className?: string }>
  tools: ToolWithDetails[]
  loading: boolean
  emptyMessage?: string
  getSignals: (tool: ToolWithDetails) => { label: string; color: string }[]
}) {
  if (!loading && tools.length === 0) {
    if (!emptyMessage) return null  // Hide section entirely if no tools and no empty message
    return null
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-[#0033A0]" />
          <div>
            <h2 className="text-base font-extrabold text-gray-900 leading-tight">{title}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
          </div>
        </div>
      </div>
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {tools.map(tool => (
            <ToolCard key={tool.id} tool={tool} signals={getSignals(tool)} />
          ))}
        </div>
      )}
    </div>
  )
}
```

### 7k. JSX return — full page layout

```tsx
  return (
    <div>

      {/* ── PAGE HEADER ── */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">Tools</h1>
              <p className="text-gray-500 text-sm mt-1">
                AI-powered learning tools built by educators, for every subject.
              </p>
            </div>
            {isEducator && (
              <a
                href="/publish"
                className="flex items-center gap-2 bg-[#0033A0] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#002580] transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Publish a Tool
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ── SMART SECTIONS ── */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">

          {/* For Your Department — only show if we found a matching category */}
          {deptCategory && (
            <SmartSection
              title={`For ${deptCategory} Students`}
              subtitle={`Tools matched to your department — ${currentUser.department}`}
              icon={GraduationCap}
              tools={smartSections?.forDept ?? []}
              loading={allLoading}
              getSignals={getSignals}
            />
          )}

          {/* My Tools — educator view */}
          {isEducator && (smartSections?.myTools?.length ?? 0) > 0 && (
            <SmartSection
              title="Your Published Tools"
              subtitle="Tools you've built and published"
              icon={Sparkles}
              tools={smartSections?.myTools ?? []}
              loading={allLoading}
              getSignals={getSignals}
            />
          )}

          {/* Trending — most sessions */}
          <SmartSection
            title="Trending"
            subtitle="Most-used tools across the platform right now"
            icon={Flame}
            tools={smartSections?.trending ?? []}
            loading={allLoading}
            getSignals={getSignals}
          />

          {/* New this week — only if there are new tools */}
          {(allLoading || (smartSections?.newThisWeek?.length ?? 0) > 0) && (
            <SmartSection
              title="New This Week"
              subtitle="Just published — fresh tools from the community"
              icon={BookOpen}
              tools={smartSections?.newThisWeek ?? []}
              loading={allLoading}
              getSignals={getSignals}
            />
          )}

        </div>
      </div>

      {/* ── BROWSE ALL ── */}
      <div ref={browseRef}>

        {/* Search bar */}
        <div className="bg-white border-b border-gray-200 py-5">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 mb-1">
              <Search className="w-4 h-4 text-gray-400" />
              <h2 className="text-gray-900 font-bold text-base">Browse All Tools</h2>
            </div>
            {/* Live search — no submit button needed */}
            <div className="flex items-center gap-2 mt-3">
              <div className="flex-1 flex items-center bg-gray-50 border border-gray-200 rounded-xl overflow-hidden focus-within:border-[#0033A0] focus-within:ring-1 focus-within:ring-[#0033A0]">
                <Search className="w-4 h-4 text-gray-400 ml-3 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Search tools, topics, categories..."
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  className="flex-1 px-3 py-2.5 text-sm text-gray-800 outline-none placeholder-gray-400 bg-transparent"
                />
                {searchInput && (
                  <button type="button" onClick={clearSearch} className="p-2 text-gray-400 hover:text-gray-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {/* Ask Sandy shortcut */}
              <button
                type="button"
                onClick={() => {
                  // Pre-fill the Sandy concierge with a tool search query
                  // ConciergePanel listens for custom event 'sandy-prefill'
                  if (searchInput.trim()) {
                    window.dispatchEvent(new CustomEvent('sandy-prefill', {
                      detail: { message: `Help me find a tool for: ${searchInput}` }
                    }))
                  } else {
                    window.dispatchEvent(new CustomEvent('sandy-prefill', {
                      detail: { message: `What tools do you recommend for someone studying ${currentUser.department}?` }
                    }))
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-2.5 border border-[#0033A0]/30 text-[#0033A0] rounded-xl text-xs font-semibold hover:bg-blue-50 transition-colors whitespace-nowrap"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Ask Sandy
              </button>
            </div>
          </div>
        </div>

        {/* Filter bar — sticky */}
        <div className="bg-white border-b border-gray-200 sticky top-16 z-40 shadow-sm">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex flex-wrap items-center gap-3">
              <SlidersHorizontal className="w-4 h-4 text-gray-400 flex-shrink-0" />

              {/* Category pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      category === cat
                        ? 'bg-[#0033A0] text-white'
                        : cat === deptCategory
                          ? 'bg-[#0033A0]/10 text-[#0033A0] border border-[#0033A0]/20 hover:bg-[#0033A0]/15'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    title={cat === deptCategory ? 'Matches your department' : undefined}
                  >
                    {cat}
                    {cat === deptCategory && cat !== 'All' && (
                      <span className="ml-1 text-[9px] opacity-70">★</span>
                    )}
                  </button>
                ))}
              </div>

              <div className="w-px h-5 bg-gray-200 hidden sm:block" />

              {/* Type dropdown */}
              <select
                value={toolType}
                onChange={e => setToolType(e.target.value)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 border-0 outline-none cursor-pointer hover:bg-gray-200 transition-colors"
              >
                {TOOL_TYPES.map(t => (
                  <option key={t} value={t}>{t === 'All' ? 'All Types' : t}</option>
                ))}
              </select>

              {/* Difficulty dropdown */}
              <select
                value={difficulty}
                onChange={e => setDifficulty(e.target.value)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 border-0 outline-none cursor-pointer hover:bg-gray-200 transition-colors"
              >
                {DIFFICULTIES.map(d => (
                  <option key={d} value={d}>{d === 'All' ? 'All Levels' : d}</option>
                ))}
              </select>

              {/* Sort dropdown */}
              <select
                value={sort}
                onChange={e => setSort(e.target.value)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 border-0 outline-none cursor-pointer hover:bg-gray-200 transition-colors ml-auto"
              >
                {SORTS.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>

              {/* Result count + Clear */}
              <div className="flex items-center gap-2 ml-auto sm:ml-0">
                {!loading && (
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {total} result{total !== 1 ? 's' : ''}
                  </span>
                )}
                {hasActiveFilters && (
                  <button
                    onClick={clearAllFilters}
                    className="flex items-center gap-1 text-xs text-[#0033A0] font-medium hover:underline"
                  >
                    <X className="w-3 h-3" />
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tools grid */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : tools.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-50 text-[#0033A0] flex items-center justify-center">
                <Search className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No tools found</h3>
              <p className="text-gray-500 mb-4 text-sm">
                {search
                  ? `No tools match "${search}" with your current filters.`
                  : 'No tools match your current filters.'}
              </p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <button
                  onClick={clearAllFilters}
                  className="px-5 py-2.5 bg-[#0033A0] text-white rounded-xl font-medium text-sm hover:bg-[#002580] transition-colors"
                >
                  Clear all filters
                </button>
                {isEducator && (
                  <a
                    href={search ? `/builder?idea=${encodeURIComponent(search)}` : '/builder'}
                    className="px-5 py-2.5 border border-[#0033A0] text-[#0033A0] rounded-xl font-medium text-sm hover:bg-blue-50 transition-colors"
                  >
                    Build this tool →
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {tools.map(tool => (
                <ToolCard key={tool.id} tool={tool} signals={getSignals(tool)} />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
```

---

## 8. Sandy Prefill Integration

The "Ask Sandy" button dispatches a `sandy-prefill` custom event. **Add a listener to `ConciergePanel.tsx`** to receive it.

**File:** `app/components/ConciergePanel.tsx`

Find the `useEffect` hooks near the top of the component. Add this new effect:

```typescript
// Listen for sandy-prefill events from other pages (e.g. marketplace "Ask Sandy" button)
useEffect(() => {
  const handler = (e: Event) => {
    const detail = (e as CustomEvent<{ message: string }>).detail
    if (detail?.message) {
      setInput(detail.message)  // pre-fill the text input
      setOpen(true)             // open the panel if closed
      setMobileOpen(true)       // open on mobile too
    }
  }
  window.addEventListener('sandy-prefill', handler)
  return () => window.removeEventListener('sandy-prefill', handler)
}, [])
```

**Note:** The state setter names (`setInput`, `setOpen`, `setMobileOpen`) must match whatever they're actually called in `ConciergePanel.tsx`. Check the file and use the correct names. The input state is likely `inputValue` or `input` — find `useState('')` for the chat input and use that setter.

---

## 9. Files to Create / Modify

| Action | File | Change |
|---|---|---|
| **MODIFY** | `app/tools/page.tsx` | Full rewrite per section 7 |
| **MODIFY** | `app/components/ToolCard.tsx` | Add `signals` prop + badge rendering (section 5) |
| **MODIFY** | `app/api/tools/route.ts` | Add `sessions` to `_count` include (section 3) |
| **MODIFY** | `app/lib/types.ts` | Add `sessions` to `_count` type (section 4) |
| **MODIFY** | `app/components/ConciergePanel.tsx` | Add `sandy-prefill` event listener (section 8) |

---

## 10. Verification Checklist

**As Ian McClure (Law student):**
- [ ] Page header shows "Tools" with no "Publish a Tool" button
- [ ] First smart section is "For Law Students" — shows tools in the Law category
- [ ] "Trending" section shows top 4 tools by session count (not upvotes)
- [ ] "New This Week" section appears if any tools were created in the last 7 days; hidden if none
- [ ] "Law" category pill in Browse All has a subtle blue highlight and ★ indicator (dept match)
- [ ] Typing in the search box triggers results after 300ms with no button press needed
- [ ] "Ask Sandy" button dispatches event → Sandy panel opens with pre-filled text
- [ ] Tool cards in smart sections show "New" badge (blue) if < 7 days old
- [ ] Tool cards show "Hot" badge (orange) if sessions ≥ 50
- [ ] Educator-only "Publish a Tool" button is NOT visible

**As Heath Price (Educator):**
- [ ] "Publish a Tool" button visible in page header
- [ ] "Your Published Tools" section appears (shows tools he created)
- [ ] "For Engineering Students" section shows STEM category tools (matched from his dept)
- [ ] Empty state in Browse All (when no results) shows "Build this tool →" link
- [ ] All 7 tool types appear in the Type dropdown: Chatbot, External, Simulation, Quiz, AI Interview, Debate, Study Buddy

**Filter behavior:**
- [ ] Selecting a category in Browse All shows only tools in that category
- [ ] "All Types" dropdown correctly maps display label to Prisma enum (e.g. "AI Interview" → `AI_INTERVIEW`)
- [ ] "Most Used" sort orders by session count descending
- [ ] "Clear" button appears when any filter is active; clears all at once
- [ ] Result count updates to reflect filtered total

**ToolCard signals:**
- [ ] "New" badge (blue) appears on thumbnail bottom-left for tools < 7 days old
- [ ] "Hot" badge (orange) appears for tools with ≥ 50 sessions
- [ ] Both badges can appear simultaneously on the same card
- [ ] Cards without signals show no badge area (no empty space)

---

## 11. What NOT to change

- The `SkeletonCard` component — keep exactly as-is
- The sticky filter bar position (`top-16 z-40`) — important for scroll behavior
- The `ToolCard` layout and hover states — only add the `signals` prop, change nothing else
- The `/api/tools` route POST handler — only add to GET handler
- The existing filter logic and state — just extend, don't replace
