# Blueprint: Predictive Space & Enrollment Planning

> **Sprint Scope:** Cross-reference enrollment trends, degree audit bottlenecks, building/room capacity, historical engagement per room, and course schedule patterns to predict next-semester demand and recommend optimal room/section planning.
> **Depends On:** Learning Weather Map (Blueprint 2) for building engagement data. Registrar Command Center (complete). Degree audit (complete).
> **Estimated Size:** Large (3 sprints)
> **Deploy Order:** 8 of 10 (Cross-Data Series)
> **Patent Relevance:** MEDIUM — "Predictive academic resource allocation through multi-signal demand forecasting"

---

## Context

Enrollment planning is reactive — departments discover overcrowding after registration opens. The Predictive Space & Enrollment system models future demand from 4 converging signals:

1. **Degree audit bottlenecks** — which courses are required by the most students approaching that year in their degree plan?
2. **Historical enrollment patterns** — how did enrollment in this course change year-over-year?
3. **Room capacity vs. historical utilization** — which rooms are consistently over/under-used?
4. **Building engagement data** — which physical spaces correlate with better academic outcomes?

### Signal Sources

| Signal | Source | Prediction |
|---|---|---|
| `DegreeAuditResult` + `DegreePlan` + `PlannedCourse` | Students' remaining requirements | Demand for specific courses next term |
| `CourseEnrollment` (historical) | Past enrollment counts | Growth/decline trends |
| `CampusBuilding` + `CampusRoom` | Room inventory and capacity | Space availability |
| `BuildingAcademicProfile` (Weather Map) | Engagement and outcome data by building | Optimal room assignments |
| `Assignment` + `Submission` + `ToolSession` | Section-level engagement metrics | Which section sizes work best |
| `CatalogCourse` | Prerequisites and co-requisites | Prerequisite chain bottlenecks |

---

## Schema Changes

### New Model: `EnrollmentForecast`

```prisma
model EnrollmentForecast {
  id          String   @id @default(cuid())
  term        String   // "Fall 2026", "Spring 2027"
  courseCode  String   // "STAT 200", "CS 101"
  computedAt  DateTime @default(now())

  // ── Demand Signals ──
  degreeAuditDemand    Int     // Students who need this course per degree plans
  historicalAvg        Float   // Average enrollment over past 4 terms
  historicalTrend      String  // "growing" | "stable" | "declining"
  waitlistHistory      Int     // Average waitlist count from past terms
  prerequisitesPassed  Int     // Students who passed prereqs and are eligible

  // ── Forecast ──
  predictedEnrollment  Int     // Forecasted enrollment
  predictedSections    Int     // Recommended number of sections
  confidenceLevel      Float   // 0-1
  riskLevel            String  // "normal" | "over-capacity" | "under-enrolled" | "bottleneck"

  // ── Room Recommendations ──
  recommendedRooms     Json    // Array of { buildingId, roomId, capacity, engagementScore, reason }
  currentCapacity      Int     // Total seats across current sections
  capacityGap          Int     // predictedEnrollment - currentCapacity (positive = need more seats)

  @@unique([term, courseCode])
  @@index([term])
  @@index([riskLevel])
}
```

---

## Service Architecture

### Demand Forecaster: `app/lib/enrollment-forecast/demand-forecaster.ts`

```typescript
export async function forecastCourseDemand(
  courseCode: string,
  targetTerm: string
): Promise<DemandForecast> {
  const [degreeAuditDemand, historicalData, prereqEligible, waitlistHistory] = await Promise.all([
    countDegreeAuditDemand(courseCode, targetTerm),
    getHistoricalEnrollment(courseCode, 4), // Last 4 terms
    countPrerequisiteEligible(courseCode),
    getWaitlistHistory(courseCode, 4),
  ])

  // Weighted prediction
  const historicalAvg = historicalData.enrollments.length > 0
    ? historicalData.enrollments.reduce((a, b) => a + b, 0) / historicalData.enrollments.length
    : 0
  const trend = computeTrend(historicalData.enrollments)

  // Demand = weighted combination of signals
  const predictedEnrollment = Math.round(
    (degreeAuditDemand * 0.4) +
    (historicalAvg * (1 + (trend === 'growing' ? 0.1 : trend === 'declining' ? -0.1 : 0)) * 0.35) +
    (prereqEligible * 0.15) +
    (waitlistHistory * 0.1)
  )

  const predictedSections = Math.ceil(predictedEnrollment / getOptimalSectionSize(courseCode))
  const confidenceLevel = computeConfidence(historicalData.enrollments.length, degreeAuditDemand)

  return {
    courseCode,
    term: targetTerm,
    degreeAuditDemand,
    historicalAvg,
    historicalTrend: trend,
    waitlistHistory: Math.round(waitlistHistory),
    prerequisitesPassed: prereqEligible,
    predictedEnrollment,
    predictedSections,
    confidenceLevel,
    riskLevel: classifyRisk(predictedEnrollment, getCurrentCapacity(courseCode)),
  }
}

async function countDegreeAuditDemand(courseCode: string, term: string): Promise<number> {
  // Count students whose degree plan includes this course and haven't completed it
  return prisma.plannedCourse.count({
    where: {
      courseCode,
      status: { not: 'COMPLETED' },
      plan: {
        user: {
          enrollments: { some: { role: 'STUDENT' } },
        },
      },
    },
  })
}
```

### Room Optimizer: `app/lib/enrollment-forecast/room-optimizer.ts`

```typescript
export async function recommendRooms(
  courseCode: string,
  predictedEnrollment: number,
  sections: number
): Promise<RoomRecommendation[]> {
  const sectionSize = Math.ceil(predictedEnrollment / sections)

  // Get rooms with sufficient capacity
  const rooms = await prisma.campusRoom.findMany({
    where: { capacity: { gte: sectionSize } },
    include: {
      building: {
        include: { academicProfile: true },
      },
    },
    orderBy: { capacity: 'asc' }, // Smallest sufficient room first
  })

  return rooms
    .map(room => ({
      roomId: room.id,
      buildingId: room.buildingId,
      buildingName: room.building.name,
      roomName: room.name,
      capacity: room.capacity,
      utilizationRate: room.capacity > 0 ? sectionSize / room.capacity : 0,
      engagementScore: room.building.academicProfile?.weatherScore || 0,
      reason: buildRoomReason(room, sectionSize),
    }))
    .sort((a, b) => {
      // Optimize for: right-sized (80-95% utilization) + high engagement
      const utilizationScore = 1 - Math.abs(a.utilizationRate - 0.85)
      const bUtilScore = 1 - Math.abs(b.utilizationRate - 0.85)
      return (bUtilScore + b.engagementScore) - (utilizationScore + a.engagementScore)
    })
    .slice(0, 5)
}
```

---

## API Routes

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/enrollment-forecast/course/[courseCode]` | GET | `requireAdminUser` | Forecast for a single course |
| `/api/enrollment-forecast/term/[term]` | GET | `requireAdminUser` | All forecasts for a term |
| `/api/enrollment-forecast/bottlenecks` | GET | `requireAdminUser` | Top bottleneck courses |
| `/api/enrollment-forecast/room-recommendations/[courseCode]` | GET | `requireAdminUser` | Room suggestions |
| `/api/cron/enrollment-forecast` | POST | `verifyCronSecret` | Monthly forecast refresh |

---

## UI: Enrollment Planning Dashboard

New page at `/registrar/enrollment-forecast`:

```
┌──────────────────────────────────────────────────────────────────┐
│  ENROLLMENT FORECAST — Fall 2026                                  │
│                                                                    │
│  ┌─ BOTTLENECKS (5) ────────────────────────────────────────┐    │
│  │ 🔴 STAT 200  Predicted: 340  Capacity: 200  Gap: +140   │    │
│  │    Degree demand: 280 · Growing trend · 45 avg waitlist  │    │
│  │    Recommend: 4→6 sections in Whitehall + Jacobs Science │    │
│  │                                                          │    │
│  │ 🔴 CS 101   Predicted: 290  Capacity: 180  Gap: +110    │    │
│  │    ...                                                   │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                    │
│  ┌─ UNDER-ENROLLED (3) ─────────────────────────────────────┐    │
│  │ 🔵 ART 350  Predicted: 8  Capacity: 30  Consider merge  │    │
│  └──────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

---

## Files to Create

| File | Purpose |
|---|---|
| `app/lib/enrollment-forecast/demand-forecaster.ts` | Multi-signal demand prediction |
| `app/lib/enrollment-forecast/room-optimizer.ts` | Room assignment recommendations |
| `app/lib/enrollment-forecast/forecast-service.ts` | CRUD + batch computation |
| `app/lib/enrollment-forecast/types.ts` | Shared types |
| `app/api/enrollment-forecast/course/[courseCode]/route.ts` | Single course forecast |
| `app/api/enrollment-forecast/term/[term]/route.ts` | Full term forecast |
| `app/api/enrollment-forecast/bottlenecks/route.ts` | Top bottlenecks |
| `app/api/enrollment-forecast/room-recommendations/[courseCode]/route.ts` | Room recs |
| `app/api/cron/enrollment-forecast/route.ts` | Monthly refresh |
| `app/registrar/enrollment-forecast/page.tsx` | Dashboard page |
| `app/components/enrollment-forecast/ForecastDashboard.tsx` | Dashboard orchestrator |
| `app/components/enrollment-forecast/BottleneckCard.tsx` | Course bottleneck card |
| `app/components/enrollment-forecast/RoomRecommendationList.tsx` | Room suggestions |
| `app/components/enrollment-forecast/DemandChart.tsx` | Historical + predicted chart |

## Files to Modify

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add `EnrollmentForecast` model |
| `app/components/Header.tsx` | Add registrar nav link |
| `app/lib/agent/tools/sandy-tools.ts` | Add `forecast_enrollment` tool |

---

## Migration Path

1. **Sprint 1**: Schema + demand forecaster + forecast service + API routes + bottlenecks page
2. **Sprint 2**: Room optimizer (requires Weather Map) + room recommendation UI + historical trend charts
3. **Sprint 3**: Sandy tool + auto-alerts for critical bottlenecks + integration with degree audit what-if

---

## Success Criteria

1. **Bottlenecks visible months ahead.** "STAT 200 will need 6 sections next fall" — visible before registration opens.
2. **Room assignments optimize outcomes.** Recommendations factor in engagement data, not just capacity.
3. **Under-enrollment flagged.** Low-demand courses surface for potential merging or cancellation decisions.
