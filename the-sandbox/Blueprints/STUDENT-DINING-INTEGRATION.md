# Blueprint 9: Dining Integration — Real Menus, Real Hours, Real Decisions

> **Sprint Scope:** Integrate UK Dining data (menus, hours, locations) into the student homepage, Campus Life, Sandy tools, and the Smart Gap Planner — so students can make dining decisions without leaving the platform.
> **Depends On:** Blueprint 6 (Smart Gap Planner) — dining data enriches gap plans. Can be built independently.
> **Estimated Size:** Medium (1 sprint)
> **Deploy Order:** 9 of 10

---

## Context

Dining is a **daily decision every student makes** 2-3 times. The platform's Campus Life section has a "Dining" tab with dining hall names and descriptions, but this data is simulated. Students currently need to check a separate app or website for:
- What's being served today (menus)
- Which dining halls are open now
- Meal plan balance

This is a high-engagement feature — students would open the app daily just for dining info. The data also enriches the Smart Gap Planner (Blueprint 6) by replacing heuristic meal windows with real dining hours and nearby locations.

### Key Files to Create

| File | Purpose |
|------|---------|
| `app/lib/dining-service.ts` | **New:** dining data service (fetch, cache, transform) |
| `app/components/student-home/DiningWidget.tsx` | **New:** compact dining card for homepage |
| `app/api/dining/route.ts` | **New:** GET — dining halls, hours, status |
| `app/api/dining/menu/route.ts` | **New:** GET — today's menu for a specific location |

### Key Files to Modify

| File | Change |
|------|--------|
| `app/components/student-home/CampusLife.tsx` | Replace simulated dining data with real data |
| `app/components/student-home/StudentHomepage.tsx` | Add DiningWidget to appropriate phase sections |
| `app/lib/student-home/gap-planner.ts` | Use real dining hours + locations (Blueprint 6) |
| `app/lib/agent/tools/campus-tools.ts` | Add `check_dining` Sandy tool |

### Key Files to Read

| File | Why |
|------|-----|
| `app/components/student-home/CampusLife.tsx` | Current dining tab implementation |
| `app/lib/student-home-data.ts` | Simulated campus life data shape |
| `app/lib/agent/tool-registry.ts` | Tool registration pattern |

---

## Data Source Strategy

UK Dining typically uses one of several meal plan / menu vendors. The integration should support multiple approaches with a fallback chain:

### Option A: University Dining API (Preferred)

Many universities expose dining data via:
- **Sodexo / Aramark / Chartwells API** — vendor-specific menu APIs
- **CampusDish API** — common platform for university dining
- **Custom university feed** — some schools have their own API or RSS

```typescript
// dining-service.ts

interface DiningConfig {
  provider: 'campusdish' | 'sodexo' | 'custom' | 'static'
  baseUrl?: string
  apiKey?: string
  locationIds?: Record<string, string>  // Internal name → vendor ID
}

// Default config (can be overridden by env vars)
const DINING_CONFIG: DiningConfig = {
  provider: process.env.DINING_PROVIDER as any || 'static',
  baseUrl: process.env.DINING_API_URL,
  apiKey: process.env.DINING_API_KEY,
}
```

### Option B: Web Scraping (Fallback)

If no API is available, scrape the university's public dining website:
- UK's dining page: `uky.campusdish.com` (CampusDish platform)
- Parse HTML for menu items, hours, locations

### Option C: Static Data with Manual Updates (MVP)

For the MVP / demo, use curated static data that can be manually updated:

```typescript
// Static dining data — replace with API data when available
const UK_DINING_LOCATIONS: DiningLocation[] = [
  {
    id: 'champions-kitchen',
    name: 'Champions Kitchen',
    building: 'Champions Kitchen',
    coordinates: { lat: 38.0285, lng: -84.5045 },
    type: 'all-you-care-to-eat',
    mealPlanAccepted: true,
    hours: {
      monday: { breakfast: '7:00-10:00', lunch: '11:00-14:00', dinner: '17:00-20:00' },
      tuesday: { breakfast: '7:00-10:00', lunch: '11:00-14:00', dinner: '17:00-20:00' },
      // ...
      saturday: { brunch: '10:00-14:00', dinner: '17:00-19:30' },
      sunday: { brunch: '10:00-14:00', dinner: '17:00-19:30' },
    }
  },
  {
    id: 'the-90',
    name: 'The 90',
    building: 'Student Center',
    type: 'retail',
    mealPlanAccepted: true,
    hours: { /* ... */ }
  },
  {
    id: 'ovid-s',
    name: "Ovid's",
    building: 'White Hall',
    type: 'cafe',
    mealPlanAccepted: false,
    hours: { /* ... */ }
  },
  // 8-12 total UK dining locations
]
```

---

## Feature 1: Dining Service

### Core Types

```typescript
export interface DiningLocation {
  id: string
  name: string
  building: string
  type: 'all-you-care-to-eat' | 'retail' | 'cafe' | 'food-truck'
  mealPlanAccepted: boolean
  hours: Record<string, MealPeriodHours>
  coordinates?: { lat: number; lng: number }
}

interface MealPeriodHours {
  breakfast?: string    // "7:00-10:00"
  lunch?: string
  dinner?: string
  brunch?: string       // Weekend
  lateNight?: string
}

export interface DiningStatus {
  location: DiningLocation
  isOpenNow: boolean
  currentMeal: string | null      // "lunch", "dinner", etc.
  closesAt: string | null         // "2:00 PM"
  nextOpens: string | null        // "5:00 PM" (if currently closed)
}

export interface MenuItem {
  name: string
  station: string                 // "Grill", "Deli", "International"
  dietaryTags: string[]           // "vegetarian", "vegan", "gluten-free"
  allergens: string[]
}

export interface DiningMenu {
  locationId: string
  date: string                    // ISO date
  meal: string                    // "lunch", "dinner"
  items: MenuItem[]
}
```

### Service Functions

```typescript
// dining-service.ts

export async function getDiningStatus(): Promise<DiningStatus[]> {
  // For each location, compute isOpenNow based on current time + day
  // Sort: open locations first, then by proximity (if location data available)
}

export async function getDiningMenu(locationId: string, meal?: string): Promise<DiningMenu | null> {
  // If API available: fetch today's menu
  // If static: return null (no menu data in static mode)
  // Cache: 1 hour TTL (menus don't change intraday)
}

export async function getNearestOpenDining(building?: string): Promise<DiningStatus | null> {
  // Given a building name, find the nearest open dining location
  // Uses simple building-to-building distance heuristic
  // Returns null if nothing is open
}
```

### Caching

```typescript
// Cache dining data to avoid repeated API calls
// Menu data: cache for 1 hour (changes daily but not intraday)
// Hours data: cache for 24 hours (rarely changes)
// Status: compute from cached hours + current time (no cache needed)

import { LRUCache } from 'lru-cache'

const menuCache = new LRUCache<string, DiningMenu>({
  max: 50,
  ttl: 1000 * 60 * 60  // 1 hour
})
```

---

## Feature 2: Homepage Dining Widget

### What

A compact dining card that appears in the Campus Life section (or standalone during lunch/dinner hours) showing which dining halls are open now and what's being served.

### UI

```
┌─────────────────────────────────────────────────┐
│  🍴 DINING NOW                                   │
│                                                   │
│  ● Champions Kitchen    Open · Lunch until 2 PM  │
│    Grilled chicken, pasta bar, salad station     │
│                                                   │
│  ● The 90              Open · until 8 PM         │
│    Chick-fil-A, Panda Express, Starbucks        │
│                                                   │
│  ○ Ovid's              Closed · Opens 7 AM       │
│                                                   │
│  [See all dining →]                              │
└─────────────────────────────────────────────────┘
```

### Rendering Rules

```typescript
// Show DiningWidget:
// - During meal-adjacent hours (7-10 AM, 11 AM-2 PM, 5-8 PM)
// - In the CampusLife "Dining" tab (always)
// - In Smart Gap Planner when gap overlaps a meal window (Blueprint 6)

// Sort order:
// 1. Currently open (green dot)
// 2. Opens within 1 hour (amber dot)
// 3. Closed (gray dot)

// Compact mode (for homepage): show top 3 locations
// Full mode (for Campus Life page): show all locations with expandable menus
```

### Menu Display

If menu data is available (API integration), show 1-line summary of stations/items. If not (static mode), show only hours and status.

```typescript
// Menu summary: pick top 3 stations/items, joined by comma
// "Grilled chicken, pasta bar, salad station"
// Truncate with ellipsis if > 60 chars
```

---

## Feature 3: Sandy Dining Tool

### What

Add a `check_dining` tool to Sandy's campus tools so students can ask:
- "What's open for lunch?"
- "Is Champions Kitchen open?"
- "What's being served at The 90?"
- "Where can I eat near Grehan Building?"

### Tool Registration

```typescript
// In campus-tools.ts, add:

{
  name: 'check_dining',
  description: 'Check dining hall hours, menus, and status. Can find open locations and what is being served.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Optional: specific location name or question about dining'
      },
      nearBuilding: {
        type: 'string',
        description: 'Optional: building name to find nearest dining'
      }
    }
  },
  handler: async ({ query, nearBuilding }) => {
    if (nearBuilding) {
      const nearest = await getNearestOpenDining(nearBuilding)
      return nearest
        ? `Nearest open dining to ${nearBuilding}: ${nearest.location.name} (${nearest.currentMeal} until ${nearest.closesAt})`
        : `No dining locations currently open near ${nearBuilding}`
    }

    const allStatus = await getDiningStatus()
    const open = allStatus.filter(s => s.isOpenNow)

    if (query) {
      const match = allStatus.find(s =>
        s.location.name.toLowerCase().includes(query.toLowerCase())
      )
      if (match) {
        const menu = await getDiningMenu(match.location.id)
        return formatDiningDetail(match, menu)
      }
    }

    return formatDiningOverview(open)
  }
}
```

---

## Feature 4: Gap Planner Integration

### What

When Blueprint 6 (Smart Gap Planner) generates meal suggestions for schedule gaps, use real dining data instead of heuristic meal windows.

### Integration Point

In `gap-planner.ts`, replace:
```typescript
// OLD: heuristic meal windows
const mealNeeded = overlapsWindow(gap, DEFAULT_MEAL_WINDOWS) && remaining >= 30

// NEW: real dining data
const openDining = await getNearestOpenDining(gap.previousEvent.location)
const mealNeeded = openDining && remaining >= 25
```

And in the meal activity:
```typescript
// OLD:
activities.push({
  type: 'meal',
  label: 'Grab lunch',
  sublabel: 'Champions Kitchen nearby',
  durationMinutes: 30,
})

// NEW:
activities.push({
  type: 'meal',
  label: `Eat at ${openDining.location.name}`,
  sublabel: `${openDining.currentMeal} until ${openDining.closesAt}`,
  durationMinutes: 25,
  href: `/campus-life?tab=dining&location=${openDining.location.id}`,
  icon: 'utensils'
})
```

---

## Feature 5: Campus Life Dining Tab Enhancement

### What

Replace the simulated dining data in the CampusLife "Dining" tab with real dining statuses.

### How

In `CampusLife.tsx`, when `activeTab === 'Dining'`:

```tsx
// Fetch dining status
const { data: diningStatus } = useSWR('/api/dining', fetcher)

// Render each location with status
{diningStatus?.map(status => (
  <DiningLocationCard
    key={status.location.id}
    location={status.location}
    isOpen={status.isOpenNow}
    currentMeal={status.currentMeal}
    closesAt={status.closesAt}
    nextOpens={status.nextOpens}
  />
))}
```

---

## API Endpoints

### GET /api/dining

Returns all dining locations with current status:

```typescript
export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const statuses = await getDiningStatus()
  return NextResponse.json(statuses)
})
```

### GET /api/dining/menu?location={id}&meal={meal}

Returns today's menu for a specific location:

```typescript
export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const locationId = req.nextUrl.searchParams.get('location')
  const meal = req.nextUrl.searchParams.get('meal') || undefined

  if (!locationId) return NextResponse.json({ error: 'location required' }, { status: 400 })

  const menu = await getDiningMenu(locationId, meal)
  return NextResponse.json(menu || { items: [], note: 'Menu data not available' })
})
```

---

## Environment Variables

```env
# Optional — falls back to static data if not set
DINING_PROVIDER=campusdish     # 'campusdish' | 'sodexo' | 'custom' | 'static'
DINING_API_URL=                # Base URL for dining API
DINING_API_KEY=                # API key if required
```

---

## Migration Path

1. **Sprint 1 (this blueprint)**: Ship with **static data** — curated UK dining locations, hours, no menus. This gives students open/closed status and location info immediately.
2. **Sprint 2 (future)**: Add CampusDish API integration for real menus. Swap `provider: 'static'` → `provider: 'campusdish'` via env var.
3. **Sprint 3 (future)**: Add meal plan balance via SIS integration (per `UNIVERSITY-SYSTEMS-INTEGRATION-HUB.md` blueprint).

---

## What This Does NOT Do

- Does not show meal plan balance (requires SIS integration — separate blueprint)
- Does not show real-time crowd levels (requires sensor/crowdsourcing infrastructure)
- Does not allow ordering or reservations (dining services handle this)
- Does not replace UK's dining website (just mirrors key info into the platform)

---

## Success Criteria

A student can answer "What's open for lunch near me?" from the homepage, the Campus Life tab, or by asking Sandy — **without opening a separate dining app or website.** The answer includes which halls are open, when they close, and (when API is available) what's being served.
