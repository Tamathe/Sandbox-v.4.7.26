# Blueprint: Chart & Component Deduplication

> **Sprint Scope:** Extract shared patterns from analytics charts (10), AI literacy progress (2), skeleton cards (5), tool cards (2), and staff briefing cards (3).
> **Estimated Size:** Medium (2 prompts, ~40 min)
> **Origin:** Duplication Audit, 2026-03-28

---

## Context

Multiple component groups share 80%+ identical code. The analytics charts are the worst — all 10 implement the same fetch/loading/error/empty/card pattern independently. Extracting shared wrappers and hooks eliminates hundreds of duplicated lines while keeping each component's unique rendering logic intact.

---

## Implementation

### Prompt 1: Analytics chart infrastructure + AI literacy progress

**1A. Create `useChartData` hook**

**New file:** `app/hooks/useChartData.ts`

```typescript
import { useState, useEffect } from 'react'

export function useChartData<T>(
  url: string,
  headers?: Record<string, string>
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch(url, { headers })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [url])

  return { data, loading, error }
}
```

**1B. Create `ChartPanel` wrapper**

**New file:** `app/components/analytics/ChartPanel.tsx`

```tsx
import { type ReactNode, type ElementType } from 'react'

interface ChartPanelProps {
  title: string
  subtitle?: string
  icon: ElementType
  loading: boolean
  error: boolean
  emptyMessage?: string
  isEmpty?: boolean
  children: ReactNode
}

export function ChartPanel({
  title, subtitle, icon: Icon,
  loading, error, isEmpty, emptyMessage = 'No data available',
  children,
}: ChartPanelProps) {
  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="size-5 text-[#0033A0]" />
        <h3 className="text-base font-extrabold text-gray-900">{title}</h3>
        {subtitle && <span className="text-xs text-gray-400 ml-1">{subtitle}</span>}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="size-5 animate-spin rounded-full border-2 border-[#0033A0] border-t-transparent" />
        </div>
      ) : error ? (
        <p className="text-sm text-red-500 text-center py-6">Failed to load data</p>
      ) : isEmpty ? (
        <p className="text-sm text-gray-400 text-center py-6">{emptyMessage}</p>
      ) : (
        children
      )}
    </div>
  )
}
```

**1C. Migrate all 10 analytics charts**

Each chart goes from ~80-120 lines to ~30-50 lines. Example:

**Before (AtRiskTrendChart.tsx):**
```tsx
const [data, setData] = useState(null)
const [loading, setLoading] = useState(true)
const [error, setError] = useState(false)
useEffect(() => { fetch(...).then(...).catch(...).finally(...) }, [])
// ... loading spinner, error text, empty state, card wrapper ...
// ... actual chart rendering ...
```

**After:**
```tsx
const { data, loading, error } = useChartData<AtRiskData>(url, headers)
return (
  <ChartPanel title="At-Risk Trend" icon={AlertTriangle} loading={loading} error={error} isEmpty={!data?.length}>
    {/* actual chart rendering — unchanged */}
  </ChartPanel>
)
```

**Files to migrate:**
- `AtRiskTrendChart.tsx`
- `CohortCompareChart.tsx`
- `ConceptVelocityChart.tsx`
- `CourseHealthTrendChart.tsx`
- `DifficultyOutcomeChart.tsx`
- `SessionQualityHeatmap.tsx`
- `ToolComparisonTable.tsx`
- `WeeklyEngagementTable.tsx`
- `ObjectiveCoverageMap.tsx`
- `InterventionTracker.tsx`

**1D. Merge `PromptLabProgress` + `OutputEvalProgress` → `ModuleProgress`**

Create `app/components/ai-literacy/ModuleProgress.tsx` with props:
- `apiPath: string`
- `levels: { name, threshold }[]`
- `scoreUnit: string` (e.g., "/10" or "%")
- `masteryThreshold: number`
- `emptyHeading: string`
- `emptySubtext: string`

Delete `PromptLabProgress.tsx` and `OutputEvalProgress.tsx`. Update imports in parent pages.

### Prompt 2: Skeleton cards, tool card fork, staff briefing cards

**2A. Shared `SkeletonCard` component**

**New file:** `app/components/ui/SkeletonCard.tsx`

```tsx
export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-2xl border-2 border-gray-100 p-4 ${className}`}>
      <div className="h-4 bg-gray-100 rounded w-2/3 mb-3" />
      <div className="h-3 bg-gray-100 rounded w-full mb-2" />
      <div className="h-3 bg-gray-100 rounded w-4/5 mb-2" />
      <div className="h-3 bg-gray-100 rounded w-3/5" />
    </div>
  )
}
```

Migrate: `ToolsBrowser.tsx`, `PolicyReviewStep.tsx`, `uknow/ArticleCard.tsx` local skeletons → import shared `SkeletonCard`. Keep the registrar `SandyTriageCard` skeleton local (domain-specific shape).

**2B. `useForkTool` hook**

**New file:** `app/hooks/useForkTool.ts`

```typescript
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function useForkTool(toolId: string, userEmail: string) {
  const [forking, setForking] = useState(false)
  const router = useRouter()

  const handleFork = async () => {
    setForking(true)
    try {
      const res = await fetch(`/api/tools/${toolId}/fork`, {
        method: 'POST',
        headers: { 'x-demo-user-email': userEmail },
      })
      const data = await res.json()
      if (data.sessionId) router.push(`/builder?sessionId=${data.sessionId}`)
    } finally {
      setForking(false)
    }
  }

  return { forking, handleFork }
}
```

Delete fork logic from `ToolCard.tsx` and `StorefrontToolCard.tsx`, replace with hook.

**2C. `StaffCard` wrapper**

**New file:** `app/components/staff/StaffCard.tsx`

```tsx
interface StaffCardProps {
  title: string
  icon: ElementType
  loading: boolean
  emptyMessage?: string
  isEmpty?: boolean
  children: ReactNode
}

export function StaffCard({ title, icon: Icon, loading, isEmpty, emptyMessage, children }: StaffCardProps) {
  return (
    <div className="border-2 border-gray-200 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="size-5 text-[#0033A0]" />
        <h3 className="text-lg font-extrabold text-gray-900">{title}</h3>
      </div>
      {loading ? (
        <div className="space-y-3">
          <div className="h-14 bg-gray-100 rounded-xl animate-pulse" />
          <div className="h-14 bg-gray-100 rounded-xl animate-pulse" />
        </div>
      ) : isEmpty ? (
        <p className="text-sm text-gray-400">{emptyMessage}</p>
      ) : children}
    </div>
  )
}
```

Migrate: `TodayScheduleCard.tsx`, `AlertsCard.tsx`, `UpcomingMeetingsCard.tsx`.

---

## Risk

**Low.** All changes are extracting existing patterns into shared components. No business logic changes. Component rendering output should be pixel-identical.

## Acceptance Criteria

- [x] `useChartData` hook exists and is used by all 10 analytics charts
- [x] `ChartPanel` wrapper exists and replaces inline loading/error/empty/card boilerplate
- [x] `ModuleProgress` replaces `PromptLabProgress` and `OutputEvalProgress`
- [x] Shared `SkeletonCard` replaces 3 local copies
- [x] `useForkTool` hook replaces fork logic in 2 tool card components
- [x] `StaffCard` wrapper replaces boilerplate in 2 staff cards (UpcomingMeetingsCard already deleted)
- [x] TypeScript compiles clean
- [ ] Visual spot-check: analytics charts and modals render identically
