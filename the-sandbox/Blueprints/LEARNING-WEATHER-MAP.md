# Blueprint: Learning Weather Map — Academic Performance on the Physical Campus

> **Sprint Scope:** Overlay academic performance, study activity, and engagement data onto the interactive campus map. Show faculty and admins where learning happens, which buildings correlate with outcomes, and suggest optimal study locations to students.
> **Depends On:** Campus Map (complete — 56 buildings, Leaflet, 3 API routes), Engagement Fingerprint (Blueprint 9) for student study patterns. Can launch independently — fingerprint enriches but isn't required.
> **Estimated Size:** Medium (2 sprints)
> **Deploy Order:** 3 of 10 (Cross-Data Series)
> **Patent Relevance:** MEDIUM — "Geospatial academic intelligence overlay for campus learning optimization"

---

## Context

The Campus Map already shows 56 buildings with types, hours, and amenities. Students can find buildings and see their class locations. But the map is inert — it doesn't know anything about what happens *inside* those buildings academically.

The Learning Weather Map cross-references physical locations with academic data to answer questions no existing system can:

- **"Where do students actually study?"** — not where they're assigned, but where they choose to go
- **"Which buildings correlate with better outcomes?"** — do students who study in the library score higher than those in dorms?
- **"What's the academic weather right now?"** — real-time activity heatmap showing engagement density across campus
- **"Where should I go to study for this exam?"** — personalized recommendations based on course, time, and past patterns

### Signal Sources (All Existing)

| Signal | Source | Location Link |
|---|---|---|
| **Class schedules** | `CourseEnrollment` + course `building` field | Direct — class meets in building |
| **Study sessions** | `ToolSession` (Study Buddy, flashcards, Exam Forge) | Indirect — session timestamp + user's likely location from schedule proximity |
| **Live Room activity** | `LiveRoom`, `LiveRoomParticipant` | Indirect — inferred from participant course buildings |
| **Concept mastery gains** | `StudentConceptMastery` (before/after by time window) | Correlated with study location via session timing |
| **Building foot traffic** | `CampusBuilding` hours + event calendar | Proxy — when buildings are open and have events |
| **Campus events** | `CampusEvent` with building location | Direct — event happens at building |
| **Office hours clusters** | `OfficeHoursQuestion` timestamps | Correlated with building where office hours happen |

**Important limitation:** We don't have GPS tracking. Location inference is based on schedule proximity (e.g., a study session at 2 PM when the student's 1 PM class was in Whitehall → likely near Whitehall). This is clearly labeled as "estimated" in the UI.

---

## Schema Changes

### New Model: `BuildingAcademicProfile`

Computed aggregate — one per building, refreshed daily.

```prisma
model BuildingAcademicProfile {
  id              String        @id @default(cuid())
  buildingId      String
  building        CampusBuilding @relation(fields: [buildingId], references: [id], onDelete: Cascade)
  computedAt      DateTime      @default(now())

  // ── Activity Metrics ──
  weeklySessionCount    Int       // Study sessions estimated near this building
  weeklyStudentCount    Int       // Unique students with activity near this building
  avgSessionMinutes     Float     // Average session duration near this building
  peakHours             Int[]     // Top 3 active hours (0-23)
  peakDays              Int[]     // Top 3 active days (0=Sun)

  // ── Academic Outcomes ──
  avgMasteryGain        Float?    // Average concept mastery delta for nearby sessions (0-1 scale)
  avgSessionScore       Float?    // Average tool session score for nearby sessions
  topCourses            String[]  // Top 5 courses with most activity near this building
  topStudyModes         String[]  // Top 3 study modes used near this building
  bloomDistribution     Json?     // Bloom level distribution of nearby learning activity

  // ── Environment ──
  hasStudySpaces        Boolean   @default(false)  // Library, study rooms, commons
  hasFood               Boolean   @default(false)  // Dining, cafe, vending
  noiseLevel            String?   // "quiet" | "moderate" | "loud" (from building type heuristic)
  wifiQuality           String?   // Future: from IT data

  // ── Weather Score ──
  weatherScore          Float     // 0-1 composite: how "hot" is this building for learning right now
  weatherTrend          String    // "heating" | "stable" | "cooling" (compared to prior week)

  @@unique([buildingId])
  @@index([weatherScore])
}
```

### New Model: `StudyLocationRecommendation`

Pre-computed personalized recommendations — one per user, refreshed daily.

```prisma
model StudyLocationRecommendation {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  computedAt  DateTime @default(now())

  recommendations  Json  // Array of { buildingId, score, reason, courseRelevance }
  basedOnCourses   String[]  // Course IDs that informed the recommendations

  @@unique([userId])
}
```

---

## Service Architecture

### Location Inference: `app/lib/weather-map/location-inference.ts`

Since we don't have GPS, we infer probable location from schedule context.

```typescript
/**
 * Infer a student's likely building at a given timestamp.
 *
 * Strategy:
 * 1. Check if timestamp falls within a scheduled class → that class's building
 * 2. Check if timestamp is within 90 min after a class → still near that building
 * 3. If between classes, use the earlier class's building (people linger)
 * 4. If no classes that day → null (cannot infer)
 *
 * Returns building ID or null.
 */
export async function inferStudentLocation(
  userId: string,
  timestamp: Date
): Promise<string | null> {
  const dayOfWeek = timestamp.getDay()
  const hour = timestamp.getHours()
  const minute = timestamp.getMinutes()
  const timeMinutes = hour * 60 + minute

  // Get student's schedule for this day
  const enrollments = await prisma.courseEnrollment.findMany({
    where: { userId, role: 'STUDENT' },
    select: {
      course: {
        select: {
          id: true,
          building: true,
          // Assume course has schedule fields or use CourseWeek
          metadata: true,
        },
      },
    },
  })

  if (enrollments.length === 0) return null

  // Find the nearest class to the timestamp
  // (simplified — real impl parses course schedule from metadata)
  const coursesWithBuildings = enrollments
    .filter(e => e.course.building)
    .map(e => ({
      courseId: e.course.id,
      building: e.course.building!,
    }))

  // Return the building of the course most likely in session
  // For v1: return the first course building that has a building set
  return coursesWithBuildings[0]?.building || null
}

/**
 * Batch version: for a list of tool sessions, infer locations.
 * Returns a Map of sessionId → buildingName.
 */
export async function inferSessionLocations(
  sessions: Array<{ id: string; userId: string; createdAt: Date }>
): Promise<Map<string, string>> {
  const locationMap = new Map<string, string>()

  // Group sessions by userId to batch the schedule lookup
  const byUser = groupBy(sessions, 'userId')

  for (const [userId, userSessions] of Object.entries(byUser)) {
    // Get user's course buildings once
    const buildings = await getUserCourseBuildings(userId)

    for (const session of userSessions) {
      const building = inferFromSchedule(buildings, session.createdAt)
      if (building) {
        locationMap.set(session.id, building)
      }
    }
  }

  return locationMap
}
```

### Building Profile Computation: `app/lib/weather-map/building-profile-engine.ts`

```typescript
export async function computeBuildingProfile(buildingId: string): Promise<BuildingProfileData> {
  const building = await prisma.campusBuilding.findUnique({
    where: { id: buildingId },
    select: { name: true, type: true, amenities: true },
  })
  if (!building) throw new Error(`Building not found: ${buildingId}`)

  const since = daysAgo(30)

  // Get all tool sessions that were likely near this building
  const allSessions = await prisma.toolSession.findMany({
    where: { createdAt: { gte: since } },
    select: { id: true, userId: true, createdAt: true, durationMinutes: true, score: true, toolId: true, metadata: true },
  })

  // Infer locations for sessions
  const locationMap = await inferSessionLocations(allSessions)

  // Filter to sessions near this building
  const nearbySessions = allSessions.filter(s => locationMap.get(s.id) === building.name)

  // Compute metrics
  const weeks = 4
  const uniqueStudents = new Set(nearbySessions.map(s => s.userId)).size
  const avgDuration = nearbySessions.length > 0
    ? nearbySessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0) / nearbySessions.length
    : 0

  // Peak hours/days
  const hourCounts = new Array(24).fill(0)
  const dayCounts = new Array(7).fill(0)
  for (const s of nearbySessions) {
    hourCounts[s.createdAt.getHours()]++
    dayCounts[s.createdAt.getDay()]++
  }

  // Top courses
  const courseFreq: Record<string, number> = {}
  for (const s of nearbySessions) {
    if (s.metadata?.courseId) {
      const cid = s.metadata.courseId as string
      courseFreq[cid] = (courseFreq[cid] || 0) + 1
    }
  }
  const topCourses = Object.entries(courseFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id)

  // Study modes
  const modeFreq: Record<string, number> = {}
  for (const s of nearbySessions) {
    if (s.metadata?.studyMode) {
      const mode = s.metadata.studyMode as string
      modeFreq[mode] = (modeFreq[mode] || 0) + 1
    }
  }
  const topStudyModes = Object.entries(modeFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([mode]) => mode)

  // Average scores
  const sessionsWithScores = nearbySessions.filter(s => s.score != null)
  const avgScore = sessionsWithScores.length > 0
    ? sessionsWithScores.reduce((sum, s) => sum + (s.score || 0), 0) / sessionsWithScores.length
    : null

  // Environment inference from building type
  const noiseLevel = inferNoiseLevel(building.type)
  const hasStudySpaces = ['Library', 'Academic', 'Student Services'].includes(building.type)
  const hasFood = ['Dining', 'Student Services'].includes(building.type) ||
    (building.amenities || []).some((a: string) => a.toLowerCase().includes('cafe'))

  // Weather score: composite of recent activity, student count, and score outcomes
  const activityScore = Math.min(1, nearbySessions.length / (weeks * 20)) // 20 sessions/week = max
  const outcomeScore = avgScore != null ? avgScore / 100 : 0.5
  const diversityScore = Math.min(1, uniqueStudents / 20) // 20+ unique students = max
  const weatherScore = (activityScore * 0.4) + (outcomeScore * 0.3) + (diversityScore * 0.3)

  return {
    weeklySessionCount: Math.round(nearbySessions.length / weeks),
    weeklyStudentCount: Math.round(uniqueStudents / weeks),
    avgSessionMinutes: avgDuration,
    peakHours: topN(hourCounts, 3),
    peakDays: topN(dayCounts, 3),
    avgSessionScore: avgScore,
    avgMasteryGain: null, // Sprint 2: compute from concept mastery deltas
    topCourses,
    topStudyModes,
    bloomDistribution: null, // Sprint 2
    hasStudySpaces,
    hasFood,
    noiseLevel,
    wifiQuality: null, // Future
    weatherScore,
    weatherTrend: 'stable', // Sprint 2: compare to prior window
  }
}

function inferNoiseLevel(buildingType: string): string {
  const quietTypes = ['Library']
  const loudTypes = ['Dining', 'Athletics', 'Recreation', 'Student Services']
  if (quietTypes.includes(buildingType)) return 'quiet'
  if (loudTypes.includes(buildingType)) return 'loud'
  return 'moderate'
}
```

### Weather Map Service: `app/lib/weather-map/weather-map-service.ts`

```typescript
export async function getWeatherMap(): Promise<WeatherMapData> {
  // Get all building profiles (cached, refreshed daily)
  const profiles = await prisma.buildingAcademicProfile.findMany({
    include: { building: true },
    orderBy: { weatherScore: 'desc' },
  })

  return {
    buildings: profiles.map(p => ({
      id: p.building.id,
      name: p.building.name,
      lat: p.building.latitude,
      lng: p.building.longitude,
      type: p.building.type,
      weatherScore: p.weatherScore,
      weatherTrend: p.weatherTrend,
      weeklyStudents: p.weeklyStudentCount,
      weeklySessions: p.weeklySessionCount,
      avgMinutes: p.avgSessionMinutes,
      peakHours: p.peakHours,
      topCourses: p.topCourses,
      topModes: p.topStudyModes,
      noiseLevel: p.noiseLevel,
      hasStudySpaces: p.hasStudySpaces,
      hasFood: p.hasFood,
    })),
    lastComputed: profiles[0]?.computedAt || new Date(),
  }
}

export async function getStudyRecommendations(userId: string): Promise<StudyRecommendation[]> {
  const cached = await prisma.studyLocationRecommendation.findUnique({
    where: { userId },
  })

  if (cached && !isStale(cached.computedAt, 24)) {
    return cached.recommendations as StudyRecommendation[]
  }

  return computeStudyRecommendations(userId)
}

async function computeStudyRecommendations(userId: string): Promise<StudyRecommendation[]> {
  // Get user's courses and their buildings
  const enrollments = await prisma.courseEnrollment.findMany({
    where: { userId, role: 'STUDENT' },
    select: {
      course: { select: { id: true, title: true, building: true } },
    },
  })

  // Get building profiles
  const profiles = await prisma.buildingAcademicProfile.findMany({
    include: { building: true },
    where: { weatherScore: { gt: 0 } },
    orderBy: { weatherScore: 'desc' },
  })

  // Get user's fingerprint for personalization (if available)
  const fingerprint = await prisma.engagementFingerprint.findUnique({
    where: { userId },
  })

  // Score each building for this user
  const recommendations = profiles.map(profile => {
    let score = profile.weatherScore * 0.3 // Base: general activity level

    // Boost buildings near user's classes
    const isNearClass = enrollments.some(e => e.course.building === profile.building.name)
    if (isNearClass) score += 0.25

    // Boost buildings matching user's study preferences
    if (fingerprint) {
      // Night owl + building has late hours
      if (fingerprint.chronotype === 'night-owl' && profile.peakHours.some(h => h >= 20)) score += 0.1

      // Solo learner + quiet building
      if (fingerprint.socialOrientation === 'solo' && profile.noiseLevel === 'quiet') score += 0.15

      // Collaborative + busy building
      if (fingerprint.socialOrientation === 'community-active' && profile.weeklyStudentCount > 10) score += 0.1
    }

    // Boost if building has study spaces
    if (profile.hasStudySpaces) score += 0.1

    // Build reason string
    const reasons: string[] = []
    if (isNearClass) reasons.push('Near your classes')
    if (profile.hasStudySpaces) reasons.push('Study spaces available')
    if (profile.noiseLevel === 'quiet') reasons.push('Quiet environment')
    if (profile.weeklyStudentCount > 15) reasons.push('Popular study spot')
    if (profile.avgSessionScore && profile.avgSessionScore > 75) reasons.push('High-performance location')

    return {
      buildingId: profile.building.id,
      buildingName: profile.building.name,
      score: Math.min(1, score),
      reason: reasons.slice(0, 2).join(' · ') || 'Good study location',
      courseRelevance: enrollments
        .filter(e => e.course.building === profile.building.name)
        .map(e => e.course.title),
      weatherScore: profile.weatherScore,
      noiseLevel: profile.noiseLevel,
      peakHours: profile.peakHours,
    }
  })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)

  // Cache
  await prisma.studyLocationRecommendation.upsert({
    where: { userId },
    create: { userId, recommendations: recommendations as any, basedOnCourses: enrollments.map(e => e.course.id) },
    update: { recommendations: recommendations as any, basedOnCourses: enrollments.map(e => e.course.id), computedAt: new Date() },
  })

  return recommendations
}
```

---

## API Routes

### GET `/api/weather-map`

Full weather map data for the map overlay.

```typescript
// app/api/weather-map/route.ts
export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const map = await getWeatherMap()
  return NextResponse.json(map)
})
```

### GET `/api/weather-map/building/[buildingId]`

Detailed profile for a single building.

```typescript
// app/api/weather-map/building/[buildingId]/route.ts
export const GET = withErrorHandling(async (req: NextRequest, { params }) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { buildingId } = await params

  const profile = await prisma.buildingAcademicProfile.findUnique({
    where: { buildingId },
    include: { building: true },
  })

  if (!profile) return NextResponse.json({ error: 'No data for this building' }, { status: 404 })
  return NextResponse.json(profile)
})
```

### GET `/api/weather-map/recommendations`

Personalized study location suggestions for the current student.

```typescript
// app/api/weather-map/recommendations/route.ts
export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const recommendations = await getStudyRecommendations(auth.user.id)
  return NextResponse.json(recommendations)
})
```

### POST `/api/cron/weather-map-refresh`

Nightly building profile recomputation.

```typescript
// app/api/cron/weather-map-refresh/route.ts
export const POST = withErrorHandling(async (req: NextRequest) => {
  const cronAuth = verifyCronSecret(req)
  if (cronAuth) return cronAuth

  const result = await refreshAllBuildingProfiles()
  return NextResponse.json(result)
})
```

---

## UI: Map Overlay

### Weather Heatmap Layer

On the existing campus map, add a toggle: **"Learning Weather"** — shows building markers with heat-colored halos based on `weatherScore`.

```typescript
// Color scale for weather score
function getWeatherColor(score: number): string {
  if (score >= 0.8) return '#ef4444' // Red — very hot
  if (score >= 0.6) return '#f97316' // Orange — hot
  if (score >= 0.4) return '#eab308' // Yellow — warm
  if (score >= 0.2) return '#22c55e' // Green — mild
  return '#94a3b8'                    // Gray — cool / no data
}

// Marker size scales with student count
function getMarkerRadius(weeklyStudents: number): number {
  return Math.max(8, Math.min(30, 8 + weeklyStudents * 0.5))
}
```

### Building Sidebar Enhancement

When a building is clicked with weather mode on, the sidebar shows the academic profile:

```
┌──────────────────────────────────────────┐
│  WILLIAM T. YOUNG LIBRARY          🔥 Hot │
│  Library · Quiet                          │
│                                           │
│  ┌─ This Week ───────────────────────┐   │
│  │  42 study sessions · 28 students  │   │
│  │  Avg 34 min · Peak: 7-10 PM      │   │
│  └───────────────────────────────────┘   │
│                                           │
│  Top Courses: ENG 101, CS 215, BIO 305   │
│  Top Modes: Flashcards, Quiz, Tutor      │
│  Avg Score: 82%                           │
│                                           │
│  📊 Trending: ↗ Heating up (was Cool)    │
│                                           │
│  ⚠ Estimated from session patterns —      │
│    not real-time occupancy data            │
└──────────────────────────────────────────┘
```

### Study Spot Recommendations Widget

On the student homepage (or in Sandy chat):

```
┌──────────────────────────────────────────┐
│  📍 STUDY SPOTS FOR YOU                   │
│                                           │
│  1. W.T. Young Library    🔥 Hot          │
│     Near your classes · Quiet · Peak 7 PM │
│                                           │
│  2. Whitehall Classroom Bldg  🟠 Warm     │
│     Near ENG 101 · Study rooms available  │
│                                           │
│  3. Student Center  🟡 Mild               │
│     Has food · Popular group spot         │
│                                           │
│  [View on map →]                          │
└──────────────────────────────────────────┘
```

---

## Sandy Integration

### Sandy Tool: `find_study_spot`

```typescript
{
  name: 'find_study_spot',
  description: 'Find the best study locations on campus based on the student\'s courses, preferences, and current building activity levels.',
  parameters: {
    type: 'object',
    properties: {
      preference: {
        type: 'string',
        description: 'Optional: "quiet", "social", "near-food", "near-class"',
      },
      course: {
        type: 'string',
        description: 'Optional: course name to find study spots relevant to that course',
      },
    },
  },
  permission: 'auto',
  handler: async ({ preference, course }, context) => {
    const recs = await getStudyRecommendations(context.userId)

    let filtered = recs
    if (preference === 'quiet') filtered = recs.filter(r => r.noiseLevel === 'quiet')
    if (preference === 'social') filtered = recs.filter(r => r.weatherScore > 0.5)
    if (preference === 'near-food') filtered = recs.filter(r => r.hasFood)

    return {
      recommendations: filtered.slice(0, 3).map(r => ({
        building: r.buildingName,
        score: r.score,
        reason: r.reason,
        peakHours: r.peakHours.map(formatHour),
        noise: r.noiseLevel,
      })),
      note: 'Based on your schedule, study patterns, and campus activity levels.',
    }
  },
}
```

---

## Files to Create

| File | Purpose |
|---|---|
| `app/lib/weather-map/location-inference.ts` | Infer student location from schedule proximity |
| `app/lib/weather-map/building-profile-engine.ts` | Compute per-building academic profiles |
| `app/lib/weather-map/weather-map-service.ts` | Read/cache/recommend study locations |
| `app/lib/weather-map/types.ts` | Shared TypeScript types |
| `app/api/weather-map/route.ts` | GET — full weather map data |
| `app/api/weather-map/building/[buildingId]/route.ts` | GET — single building profile |
| `app/api/weather-map/recommendations/route.ts` | GET — personalized study spots |
| `app/api/cron/weather-map-refresh/route.ts` | POST — nightly profile refresh |
| `app/components/campus-map/WeatherOverlay.tsx` | Leaflet heatmap overlay layer |
| `app/components/campus-map/WeatherBuildingSidebar.tsx` | Enhanced sidebar with academic profile |
| `app/components/campus-map/WeatherLegend.tsx` | Color scale legend |
| `app/components/student-home/StudySpotWidget.tsx` | Homepage study spot recommendations |

## Files to Modify

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add `BuildingAcademicProfile`, `StudyLocationRecommendation` models |
| `app/components/campus-map/CampusMapClient.tsx` | Add weather toggle + overlay integration |
| `app/components/campus-map/MapControls.tsx` | Add "Learning Weather" toggle button |
| `app/components/campus-map/BuildingSidebar.tsx` | Extend with academic profile section when weather mode on |
| `app/components/student-home/StudentHomepage.tsx` | Add `StudySpotWidget` |
| `app/lib/agent/tools/campus-tools.ts` | Add `find_study_spot` tool |
| `app/lib/agent/tool-registry.ts` | Register new tool |

---

## Cron Schedule

| Job | Schedule | Route |
|---|---|---|
| Building profile refresh | Nightly 4:00 AM ET | `POST /api/cron/weather-map-refresh` |

---

## Migration Path

1. **Sprint 1**: Schema + location inference + building profile engine + API routes + weather map overlay on campus map + `WeatherBuildingSidebar`
2. **Sprint 2**: Study spot recommendations + homepage widget + Sandy tool + fingerprint integration for personalized recs

---

## What This Does NOT Do

- Does not track GPS locations — location is *inferred* from schedule proximity
- Does not show real-time occupancy — building profiles are computed daily
- Does not replace the existing campus map — adds an optional overlay toggle
- Does not collect new data — reads existing ToolSession timestamps and course schedules
- Does not show individual student locations — only aggregate building-level metrics

---

## Privacy

| Concern | Mitigation |
|---|---|
| **No GPS tracking** | Location inferred from schedule proximity — clearly labeled "estimated" |
| **Aggregate only** | Building profiles show counts and averages, never individual students |
| **Student recommendations** | Personalized recs are private — only the student sees their own |
| **Faculty view** | Faculty see class-level patterns per building, not individual student locations |
| **Disclaimer** | "Estimated from session patterns — not real-time occupancy data" shown on every weather view |

---

## Success Criteria

1. **Students discover spots.** A student asks Sandy "where should I study tonight?" and gets a personalized recommendation they haven't tried before.
2. **Faculty see patterns.** Katie sees that her students cluster at the library between 8-10 PM and adjusts office hours accordingly.
3. **The map comes alive.** The weather overlay transforms the campus map from a directory into a living intelligence layer.
4. **Honest labeling.** Every weather metric is clearly marked as "estimated" — no false precision about location tracking.
