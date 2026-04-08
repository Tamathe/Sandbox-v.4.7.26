# Audio Experience Platform — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a unified audio surface — Audio Hub, Split View Player, Three-Tier Podcasts, Voice Tutoring, Interactive Scenarios, and Sandy integration — that makes audio a first-class learning modality in the platform.

**Architecture:** Four sequential phases. Phase 1 builds the Audio Hub pages, extends the podcast engine (tiers, tags, visibility), and adds the Split View Player with live transcript + contextual linking. Phase 2 adds voice tutoring (5 modes + smart suggestion + session lifecycle). Phase 3 adds interactive scenarios (4 templates + educator builder + rubric scoring). Phase 4 adds the personalized feed, educator analytics dashboard, and CIL/Early Warning/Assessment data integration. Each phase produces working software that builds on the previous phase's infrastructure.

**Tech Stack:** Next.js 16 App Router, Prisma v7 (PrismaPg adapter), Anthropic Claude (Haiku for scripts/scoring, Sonnet for concierge), Azure TTS (multi-voice podcasts), OpenAI TTS (Sandy voice), Tailwind v4, lucide-react icons, recharts (analytics).

**Spec:** `docs/superpowers/specs/2026-04-03-audio-experience-platform-design.md`

---

## File Map

### Schema
- **Modify:** `prisma/schema.prisma` — extend `AudioEpisode` (6 fields), extend `StudentAudioHistory` (1 field), add `VoiceSession`, `VoiceSessionScore`, `InteractiveScenario` models

### Pages
- **Create:** `app/audio/page.tsx` — Hub home (For You default tab)
- **Create:** `app/audio/episode/[id]/page.tsx` — Full player view
- **Create:** `app/audio/session/[id]/page.tsx` — Voice session replay
- **Create:** `app/audio/scenarios/page.tsx` — Scenario browser
- **Create:** `app/audio/scenarios/[id]/page.tsx` — Scenario launcher

### Components — Audio Shell & Player
- **Create:** `app/components/audio/AudioShell.tsx` — Layout wrapper (panel state machine)
- **Create:** `app/components/audio/AudioSidePanel.tsx` — Right panel (w-96)
- **Create:** `app/components/audio/AudioFullPlayer.tsx` — Immersive full-content view
- **Create:** `app/components/audio/EpisodeHeader.tsx` — Cover art, title, metadata
- **Create:** `app/components/audio/TranscriptView.tsx` — Auto-scrolling synced transcript
- **Create:** `app/components/audio/ChapterMarkers.tsx` — Clickable chapter jump points
- **Create:** `app/components/audio/AudioControls.tsx` — Play/pause, skip, speed, volume
- **Create:** `app/components/audio/BookmarkTimeline.tsx` — Student-created markers
- **Create:** `app/components/audio/SandyLauncher.tsx` — "Discuss with Sandy" button
- **Create:** `app/components/audio/ContextualLinker.tsx` — Page anchor sync

### Components — Hub
- **Create:** `app/components/audio/hub/ForYouFeed.tsx` — Sandy-curated recommendations
- **Create:** `app/components/audio/hub/CourseEpisodeList.tsx` — Course-grouped episodes
- **Create:** `app/components/audio/hub/BrowseGrid.tsx` — Tag-based discovery
- **Create:** `app/components/audio/hub/TrendingLane.tsx` — Campus trending
- **Create:** `app/components/audio/hub/ContinueListening.tsx` — Resume row
- **Create:** `app/components/audio/hub/EpisodeCard.tsx` — Reusable episode card

### Components — Voice
- **Create:** `app/components/audio/voice/VoiceSessionPanel.tsx` — Panel during voice sessions
- **Create:** `app/components/audio/voice/VoiceModeSelector.tsx` — Mode picker
- **Create:** `app/components/audio/voice/LiveTranscript.tsx` — Real-time transcript
- **Create:** `app/components/audio/voice/SessionTimer.tsx` — Timer for oral assessment
- **Create:** `app/components/audio/voice/SessionReport.tsx` — Post-session feedback

### Components — Scenarios
- **Create:** `app/components/audio/scenarios/ScenarioBrowser.tsx` — Template-filtered list
- **Create:** `app/components/audio/scenarios/ScenarioCard.tsx` — Preview card
- **Create:** `app/components/audio/scenarios/ScenarioLauncher.tsx` — Pre-session setup
- **Create:** `app/components/audio/scenarios/ScenarioBuilder.tsx` — Educator creation form
- **Create:** `app/components/audio/scenarios/PhaseEditor.tsx` — Phase + checkpoint editor
- **Create:** `app/components/audio/scenarios/RubricEditor.tsx` — Rubric dimension editor

### Components — Builder
- **Create:** `app/components/audio/builder/AudioEpisodeBuilder.tsx` — Educator podcast creation

### Services
- **Create:** `app/lib/audio/types.ts` — Shared types for audio platform
- **Create:** `app/lib/audio/audio-hub-service.ts` — Feed curation, trending, grouping
- **Create:** `app/lib/audio/voice-session-service.ts` — Session lifecycle
- **Create:** `app/lib/audio/scenario-service.ts` — Scenario CRUD + execution
- **Create:** `app/lib/audio/contextual-link-service.ts` — Segment map + anchor matching
- **Create:** `app/lib/audio/audio-analytics-service.ts` — Educator analytics

### Hooks
- **Modify:** `app/hooks/useAudioPlayer.ts` — Extend with panel state (IDLE/BAR/PANEL/FULL)
- **Create:** `app/hooks/useAudioContextLink.ts` — Page anchor registration
- **Create:** `app/hooks/useVoiceSession.ts` — Voice session state machine

### Sandy Tools
- **Create:** `app/lib/agent/tools/audio-tools.ts` — 6 new tools

### API Routes
- **Create:** `app/api/audio/hub/feed/route.ts`
- **Create:** `app/api/audio/hub/courses/route.ts`
- **Create:** `app/api/audio/hub/browse/route.ts`
- **Create:** `app/api/audio/hub/trending/route.ts`
- **Create:** `app/api/audio/episode/[id]/route.ts`
- **Create:** `app/api/audio/podcastify/route.ts`
- **Create:** `app/api/audio/voice-session/route.ts`
- **Create:** `app/api/audio/voice-session/[id]/route.ts`
- **Create:** `app/api/audio/voice-session/[id]/score/route.ts`
- **Create:** `app/api/audio/voice-session/[id]/save/route.ts`
- **Create:** `app/api/audio/scenarios/route.ts`
- **Create:** `app/api/audio/scenarios/[id]/route.ts`
- **Create:** `app/api/audio/history/route.ts`
- **Create:** `app/api/audio/history/[episodeId]/route.ts`
- **Create:** `app/api/audio/analytics/[courseId]/route.ts`

### Integration Points
- **Modify:** `app/lib/agent/tool-registry.ts` — Register audio tools module
- **Modify:** `app/lib/concierge-service.ts` — Add PAGE_DESCRIPTIONS for `/audio/*` routes
- **Modify:** `app/components/concierge/concierge-utils.ts` — Add `getPageStarters` for `/audio/*`
- **Modify:** `app/components/Header.tsx` — Add "Audio" nav item
- **Modify:** `app/hub/hub-config.ts` — Add Audio swim lane
- **Modify:** `app/components/ClientProviders.tsx` — Mount AudioShell wrapper
- **Modify:** `app/api/audio/episode/[id]/route.ts` — Extend existing or create for detail + segment map

---

## Phase 1: Audio Hub + Podcast Engine + Split View Player

### Task 1: Schema — Extend AudioEpisode & StudentAudioHistory

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add new fields to AudioEpisode model**

In `prisma/schema.prisma`, find the `AudioEpisode` model and add these fields after the existing `studentHistory` relation:

```prisma
  // Audio Experience Platform extensions
  segmentMap         Json?                         // timestamp-to-source-anchor mapping for contextual linking
  tags               String[]                      // topic tags for Browse tab
  listenCount        Int                  @default(0)
  tier               String               @default("auto")    // "auto" | "educator" | "student"
  status             String               @default("draft")   // "draft" | "published" | "stale"
  publishedAt        DateTime?
  creatorId          String?                       // educator or student who created it
  visibility         String               @default("course")  // "private" | "course" | "campus"
```

- [ ] **Step 2: Add bookmarks field to StudentAudioHistory**

In the `StudentAudioHistory` model, add after `lastListenAt`:

```prisma
  bookmarks          Json?                         // [{timestampMs: number, note: string}]
```

- [ ] **Step 3: Run migration**

```bash
cd the-sandbox && npx prisma migrate dev --name add-audio-experience-platform-fields
```

- [ ] **Step 4: Regenerate Prisma client**

```bash
npx prisma generate
```

- [ ] **Step 5: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(audio): extend AudioEpisode + StudentAudioHistory for Audio Experience Platform"
```

---

### Task 2: Types — Shared Audio Platform Types

**Files:**
- Create: `app/lib/audio/types.ts`

- [ ] **Step 1: Create the types file**

```typescript
// app/lib/audio/types.ts
// Shared types for the Audio Experience Platform

export type EpisodeTier = 'auto' | 'educator' | 'student'
export type EpisodeStatus = 'draft' | 'published' | 'stale'
export type EpisodeVisibility = 'private' | 'course' | 'campus'
export type PlayerState = 'idle' | 'bar' | 'panel' | 'full'

export interface SegmentMapEntry {
  startMs: number
  endMs: number
  sourceAnchor: string
  sourceText: string
  topic: string
}

export interface SegmentMap {
  segments: SegmentMapEntry[]
}

export interface ChapterMarker {
  title: string
  startMs: number
}

export interface Bookmark {
  timestampMs: number
  note: string
}

export interface EpisodeCardData {
  id: string
  title: string
  sourceName: string
  courseId: string | null
  courseName?: string
  tier: EpisodeTier
  status: EpisodeStatus
  tags: string[]
  listenCount: number
  durationSecs: number
  cdnUrl: string | null
  createdAt: string
  publishedAt: string | null
  // Listening progress (if student has history)
  completedPct?: number
  lastPositionMs?: number
}

export interface EpisodeDetail extends EpisodeCardData {
  transcript: string | null
  transcriptFormat: string | null
  segmentMap: SegmentMap | null
  chapters: ChapterMarker[]
  visibility: EpisodeVisibility
  creatorId: string | null
  creatorName?: string
}

export interface AudioHubFeedResponse {
  continueListening: EpisodeCardData[]
  recommended: EpisodeCardData[]
  trending: EpisodeCardData[]
}

export interface AudioHubCoursesResponse {
  courses: {
    courseId: string
    courseName: string
    courseCode: string
    episodes: EpisodeCardData[]
    totalDuration: number
  }[]
}

export interface AudioHubBrowseResponse {
  episodes: EpisodeCardData[]
  tags: { tag: string; count: number }[]
  total: number
}

// Voice session types
export type VoiceTutoringMode = 'socratic' | 'rehearsal' | 'walkthrough' | 'assessment' | 'scenario'

export interface TranscriptEntry {
  role: 'user' | 'assistant'
  text: string
  timestampMs: number
}

export interface CheckpointResult {
  name: string
  met: boolean
  evidence: string
}

export interface ScoreDimension {
  dimension: string
  score: number
  weight: number
  evidence: string
  feedback: string
}

export interface VoiceSessionSummary {
  id: string
  type: VoiceTutoringMode
  courseId: string | null
  topicTags: string[]
  durationSecs: number | null
  summary: string | null
  status: string
  createdAt: string
  scores: ScoreDimension[]
}

// Interactive scenario types
export type ScenarioTemplateType = 'clinical' | 'interview' | 'debate' | 'roleplay'

export interface ScenarioPersona {
  name: string
  role: string
  voice: string
  personality: string
}

export interface ScenarioPhase {
  name: string
  objective: string
  checkpoint?: { required: boolean; criteria: string }
  maxDurationSecs?: number
}

export interface RubricDimension {
  dimension: string
  weight: number
  descriptors: Record<string, string> // e.g. { "1": "...", "5": "...", "10": "..." }
}

export interface ScenarioDetail {
  id: string
  templateType: ScenarioTemplateType
  title: string
  description: string
  persona: ScenarioPersona
  situation: string
  phases: ScenarioPhase[]
  rubric: RubricDimension[]
  completionCriteria: string
  published: boolean
  courseId: string | null
  timesPlayed: number
  avgScore: number | null
  creatorId: string
  creatorName?: string
}

// Audio state for Sandy ambient context
export interface AudioAmbientState {
  isPlaying: boolean
  currentEpisode: { id: string; title: string; courseId: string | null; topicTags: string[] } | null
  currentTimestampMs: number
  currentSegment: { topic: string; sourceText: string } | null
  activeVoiceSession: { type: string; mode: VoiceTutoringMode; scenarioId: string | null } | null
}
```

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/lib/audio/types.ts
git commit -m "feat(audio): add shared types for Audio Experience Platform"
```

---

### Task 3: Audio Hub Service — Feed, Courses, Browse, Trending

**Files:**
- Create: `app/lib/audio/audio-hub-service.ts`

- [ ] **Step 1: Create the hub service**

```typescript
// app/lib/audio/audio-hub-service.ts
import { prisma } from '../prisma'
import type {
  EpisodeCardData,
  AudioHubFeedResponse,
  AudioHubCoursesResponse,
  AudioHubBrowseResponse,
} from './types'

/** Map a raw episode + render + history to an EpisodeCardData */
function toEpisodeCard(
  ep: any,
  render?: any,
  history?: any,
): EpisodeCardData {
  return {
    id: ep.id,
    title: render?.episode?.sourceName ?? ep.sourceName,
    sourceName: ep.sourceName,
    courseId: ep.courseId,
    tier: ep.tier ?? 'auto',
    status: ep.status ?? 'published',
    tags: ep.tags ?? [],
    listenCount: ep.listenCount ?? 0,
    durationSecs: render?.durationSecs ?? 0,
    cdnUrl: render?.cdnUrl ?? null,
    createdAt: ep.createdAt.toISOString(),
    publishedAt: ep.publishedAt?.toISOString() ?? null,
    completedPct: history?.completedPct,
    lastPositionMs: history?.lastPositionMs,
  }
}

/** Get personalized "For You" feed for a student */
export async function getForYouFeed(userId: string): Promise<AudioHubFeedResponse> {
  // Continue listening — episodes with partial progress
  const inProgress = await prisma.studentAudioHistory.findMany({
    where: { studentId: userId, completedPct: { lt: 100 } },
    orderBy: { lastListenAt: 'desc' },
    take: 5,
    include: {
      episode: {
        include: { audioRenders: { where: { isStale: false }, take: 1 } },
      },
    },
  })

  const continueListening = inProgress
    .filter(h => h.episode.status === 'published' || h.episode.status === 'draft')
    .map(h => toEpisodeCard(h.episode, h.episode.audioRenders[0], h))

  // Recommended — episodes from enrolled courses the student hasn't heard
  const enrollments = await prisma.courseEnrollment.findMany({
    where: { studentId: userId },
    select: { courseId: true },
  })
  const enrolledIds = enrollments.map(e => e.courseId)

  const heardIds = await prisma.studentAudioHistory.findMany({
    where: { studentId: userId },
    select: { episodeId: true },
  })
  const heardSet = new Set(heardIds.map(h => h.episodeId))

  const recommended = await prisma.audioEpisode.findMany({
    where: {
      courseId: { in: enrolledIds },
      status: 'published',
      id: { notIn: [...heardSet] },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { audioRenders: { where: { isStale: false }, take: 1 } },
  })

  // Trending — top episodes by listen count in last 7 days
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const trending = await prisma.audioEpisode.findMany({
    where: {
      status: 'published',
      visibility: { in: ['course', 'campus'] },
      createdAt: { gte: weekAgo },
    },
    orderBy: { listenCount: 'desc' },
    take: 10,
    include: { audioRenders: { where: { isStale: false }, take: 1 } },
  })

  return {
    continueListening,
    recommended: recommended.map(ep => toEpisodeCard(ep, ep.audioRenders[0])),
    trending: trending.map(ep => toEpisodeCard(ep, ep.audioRenders[0])),
  }
}

/** Get episodes grouped by enrolled courses */
export async function getCourseEpisodes(userId: string): Promise<AudioHubCoursesResponse> {
  const enrollments = await prisma.courseEnrollment.findMany({
    where: { studentId: userId },
    include: { course: { select: { id: true, name: true, courseCode: true } } },
  })

  const courses = await Promise.all(
    enrollments.map(async (enr) => {
      const episodes = await prisma.audioEpisode.findMany({
        where: {
          courseId: enr.courseId,
          status: 'published',
          visibility: { in: ['course', 'campus'] },
        },
        orderBy: { createdAt: 'desc' },
        include: { audioRenders: { where: { isStale: false }, take: 1 } },
      })

      const totalDuration = episodes.reduce(
        (sum, ep) => sum + (ep.audioRenders[0]?.durationSecs ?? 0),
        0,
      )

      return {
        courseId: enr.course.id,
        courseName: enr.course.name,
        courseCode: enr.course.courseCode ?? '',
        episodes: episodes.map(ep => toEpisodeCard(ep, ep.audioRenders[0])),
        totalDuration,
      }
    }),
  )

  return { courses: courses.filter(c => c.episodes.length > 0) }
}

/** Browse episodes by tag with search */
export async function browseEpisodes(
  query?: string,
  tag?: string,
  offset = 0,
  limit = 20,
): Promise<AudioHubBrowseResponse> {
  const where: any = {
    status: 'published',
    visibility: { in: ['course', 'campus'] },
  }
  if (tag) where.tags = { has: tag }
  if (query) where.sourceName = { contains: query, mode: 'insensitive' }

  const [episodes, total] = await Promise.all([
    prisma.audioEpisode.findMany({
      where,
      orderBy: { listenCount: 'desc' },
      skip: offset,
      take: limit,
      include: { audioRenders: { where: { isStale: false }, take: 1 } },
    }),
    prisma.audioEpisode.count({ where }),
  ])

  // Aggregate tags across all published episodes for tag cloud
  const allPublished = await prisma.audioEpisode.findMany({
    where: { status: 'published', visibility: { in: ['course', 'campus'] } },
    select: { tags: true },
  })
  const tagCounts: Record<string, number> = {}
  for (const ep of allPublished) {
    for (const t of ep.tags) {
      tagCounts[t] = (tagCounts[t] ?? 0) + 1
    }
  }
  const tags = Object.entries(tagCounts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 30)

  return {
    episodes: episodes.map(ep => toEpisodeCard(ep, ep.audioRenders[0])),
    tags,
    total,
  }
}

/** Get campus-wide trending episodes */
export async function getTrendingEpisodes(limit = 10): Promise<EpisodeCardData[]> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const episodes = await prisma.audioEpisode.findMany({
    where: {
      status: 'published',
      visibility: { in: ['course', 'campus'] },
      publishedAt: { gte: weekAgo },
    },
    orderBy: { listenCount: 'desc' },
    take: limit,
    include: { audioRenders: { where: { isStale: false }, take: 1 } },
  })
  return episodes.map(ep => toEpisodeCard(ep, ep.audioRenders[0]))
}

/** Get episode detail with segment map */
export async function getEpisodeDetail(episodeId: string, userId?: string) {
  const episode = await prisma.audioEpisode.findUnique({
    where: { id: episodeId },
    include: {
      audioRenders: { where: { isStale: false }, orderBy: { createdAt: 'desc' } },
    },
  })
  if (!episode) return null

  let history = null
  if (userId) {
    history = await prisma.studentAudioHistory.findUnique({
      where: { studentId_episodeId: { studentId: userId, episodeId } },
    })
  }

  const render = episode.audioRenders[0]

  return {
    ...toEpisodeCard(episode, render, history),
    transcript: episode.transcript,
    transcriptFormat: episode.transcriptFormat,
    segmentMap: episode.segmentMap as any ?? null,
    chapters: [], // extracted from segmentMap.segments → unique topics
    visibility: episode.visibility ?? 'course',
    creatorId: episode.creatorId,
    bookmarks: (history?.bookmarks as any) ?? [],
  }
}

/** Increment listen count (fire-and-forget) */
export async function incrementListenCount(episodeId: string) {
  await prisma.audioEpisode.update({
    where: { id: episodeId },
    data: { listenCount: { increment: 1 } },
  })
}

/** Update or create listening history */
export async function updateListeningHistory(
  userId: string,
  episodeId: string,
  positionMs: number,
  completedPct: number,
) {
  await prisma.studentAudioHistory.upsert({
    where: { studentId_episodeId: { studentId: userId, episodeId } },
    create: {
      studentId: userId,
      episodeId,
      lastPositionMs: positionMs,
      completedPct,
      listenCount: 1,
    },
    update: {
      lastPositionMs: positionMs,
      completedPct,
      lastListenAt: new Date(),
      listenCount: { increment: 1 },
      ...(completedPct >= 100 ? { completedAt: new Date() } : {}),
    },
  })
}

/** Add or update a bookmark */
export async function addBookmark(
  userId: string,
  episodeId: string,
  bookmark: { timestampMs: number; note: string },
) {
  const history = await prisma.studentAudioHistory.findUnique({
    where: { studentId_episodeId: { studentId: userId, episodeId } },
  })
  const existing = (history?.bookmarks as any[]) ?? []
  // Replace if same timestamp, else append
  const updated = [
    ...existing.filter((b: any) => b.timestampMs !== bookmark.timestampMs),
    bookmark,
  ].sort((a: any, b: any) => a.timestampMs - b.timestampMs)

  await prisma.studentAudioHistory.update({
    where: { studentId_episodeId: { studentId: userId, episodeId } },
    data: { bookmarks: updated },
  })
}

/** Student-triggered "podcastify" with rate limiting */
export async function canStudentGenerate(userId: string): Promise<boolean> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const count = await prisma.audioGenerationJob.count({
    where: {
      requestedBy: userId,
      createdAt: { gte: today },
    },
  })
  return count < 3 // 3 per day limit
}
```

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/lib/audio/audio-hub-service.ts
git commit -m "feat(audio): add audio hub service — feed, courses, browse, trending, history"
```

---

### Task 4: Audio Hub API Routes (4 routes)

**Files:**
- Create: `app/api/audio/hub/feed/route.ts`
- Create: `app/api/audio/hub/courses/route.ts`
- Create: `app/api/audio/hub/browse/route.ts`
- Create: `app/api/audio/hub/trending/route.ts`

- [ ] **Step 1: Create feed route**

```typescript
// app/api/audio/hub/feed/route.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { getForYouFeed } from '../../../../lib/audio/audio-hub-service'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const feed = await getForYouFeed(auth.user.id)
  return NextResponse.json(feed)
})
```

- [ ] **Step 2: Create courses route**

```typescript
// app/api/audio/hub/courses/route.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { getCourseEpisodes } from '../../../../lib/audio/audio-hub-service'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const result = await getCourseEpisodes(auth.user.id)
  return NextResponse.json(result)
})
```

- [ ] **Step 3: Create browse route**

```typescript
// app/api/audio/hub/browse/route.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { browseEpisodes } from '../../../../lib/audio/audio-hub-service'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const url = req.nextUrl
  const query = url.searchParams.get('q') ?? undefined
  const tag = url.searchParams.get('tag') ?? undefined
  const offset = parseInt(url.searchParams.get('offset') ?? '0', 10)
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20', 10), 50)
  const result = await browseEpisodes(query, tag, offset, limit)
  return NextResponse.json(result)
})
```

- [ ] **Step 4: Create trending route**

```typescript
// app/api/audio/hub/trending/route.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { getTrendingEpisodes } from '../../../../lib/audio/audio-hub-service'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const result = await getTrendingEpisodes()
  return NextResponse.json(result)
})
```

- [ ] **Step 5: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add app/api/audio/hub/
git commit -m "feat(audio): add Audio Hub API routes — feed, courses, browse, trending"
```

---

### Task 5: Episode Detail & History API Routes

**Files:**
- Create: `app/api/audio/episode/[id]/route.ts`
- Create: `app/api/audio/history/route.ts`
- Create: `app/api/audio/history/[episodeId]/route.ts`
- Create: `app/api/audio/podcastify/route.ts`

- [ ] **Step 1: Create episode detail route**

```typescript
// app/api/audio/episode/[id]/route.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { getEpisodeDetail, incrementListenCount } from '../../../../lib/audio/audio-hub-service'

export const GET = withErrorHandling(async (req: NextRequest, ctx: any) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { id } = await ctx.params
  const detail = await getEpisodeDetail(id, auth.user.id)
  if (!detail) return NextResponse.json({ error: 'Episode not found' }, { status: 404 })
  // Fire-and-forget listen count increment
  incrementListenCount(id).catch(() => {})
  return NextResponse.json(detail)
})
```

- [ ] **Step 2: Create history list route**

```typescript
// app/api/audio/history/route.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { prisma } from '../../../lib/prisma'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const history = await prisma.studentAudioHistory.findMany({
    where: { studentId: auth.user.id },
    orderBy: { lastListenAt: 'desc' },
    take: 50,
    include: {
      episode: {
        include: { audioRenders: { where: { isStale: false }, take: 1 } },
      },
    },
  })
  return NextResponse.json({ history })
})
```

- [ ] **Step 3: Create history update route (progress + bookmarks)**

```typescript
// app/api/audio/history/[episodeId]/route.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { updateListeningHistory, addBookmark } from '../../../../lib/audio/audio-hub-service'

export const PATCH = withErrorHandling(async (req: NextRequest, ctx: any) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { episodeId } = await ctx.params
  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as any

  if (body.positionMs !== undefined) {
    await updateListeningHistory(
      auth.user.id,
      episodeId,
      body.positionMs,
      body.completedPct ?? 0,
    )
  }
  if (body.bookmark) {
    await addBookmark(auth.user.id, episodeId, body.bookmark)
  }
  return NextResponse.json({ ok: true })
})
```

- [ ] **Step 4: Create podcastify route (student-triggered generation)**

```typescript
// app/api/audio/podcastify/route.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { canStudentGenerate } from '../../../lib/audio/audio-hub-service'
import { enqueueJob } from '../../../lib/audio-generation-queue'

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const body = parsed.data as any

  // Rate limit: 3 per day
  const allowed = await canStudentGenerate(auth.user.id)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Daily limit reached (3 episodes per day)' },
      { status: 429 },
    )
  }

  // Max source text: 10,000 chars
  const sourceText = (body.sourceText ?? '').slice(0, 10_000)
  if (!sourceText.trim()) {
    return NextResponse.json({ error: 'Source text is required' }, { status: 400 })
  }

  const result = await enqueueJob({
    requestedBy: auth.user.id,
    sourceText,
    sourceType: body.sourceType ?? 'custom_text',
    sourceName: body.sourceName ?? 'My Episode',
    duration: body.duration ?? '15min',
    voiceAId: body.voiceAId ?? '',
    voiceBId: body.voiceBId ?? '',
    courseId: body.courseId,
  })

  if (result.status === 'COMPLETED') {
    return NextResponse.json({
      episodeId: (result as any).episodeId,
      cdnUrl: (result as any).cdnUrl,
      status: 'CACHED',
    })
  }
  return NextResponse.json({ jobId: result.id, status: 'PENDING' }, { status: 202 })
})
```

- [ ] **Step 5: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add app/api/audio/episode/ app/api/audio/history/ app/api/audio/podcastify/
git commit -m "feat(audio): add episode detail, history, podcastify API routes"
```

---

### Task 6: EpisodeCard Component

**Files:**
- Create: `app/components/audio/hub/EpisodeCard.tsx`

- [ ] **Step 1: Create the reusable episode card**

```tsx
// app/components/audio/hub/EpisodeCard.tsx
'use client'

import { Headphones, Clock, Play } from 'lucide-react'
import type { EpisodeCardData } from '../../../lib/audio/types'

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60)
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`
}

function tierBadge(tier: string) {
  if (tier === 'educator') return <span className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded-full">Educator</span>
  if (tier === 'student') return <span className="text-xs px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full">Student</span>
  return null
}

interface Props {
  episode: EpisodeCardData
  onPlay: (episode: EpisodeCardData) => void
  compact?: boolean
}

export default function EpisodeCard({ episode, onPlay, compact }: Props) {
  const progress = episode.completedPct ?? 0

  return (
    <button
      type="button"
      onClick={() => onPlay(episode)}
      className={`group relative w-full text-left bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow ${compact ? 'p-3' : 'p-4'}`}
    >
      {/* Cover art placeholder */}
      <div className={`flex items-center justify-center bg-gradient-to-br from-[#0033A0] to-blue-400 rounded-xl text-white ${compact ? 'size-12 mb-2' : 'w-full aspect-[3/2] mb-3'}`}>
        <Headphones className={compact ? 'size-5' : 'size-8'} />
      </div>

      <h3 className={`font-extrabold text-gray-900 line-clamp-2 ${compact ? 'text-sm' : 'text-base'}`}>
        {episode.sourceName}
      </h3>

      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
        <Clock className="size-3" />
        <span>{formatDuration(episode.durationSecs)}</span>
        {episode.listenCount > 0 && (
          <span>· {episode.listenCount} listens</span>
        )}
        {tierBadge(episode.tier)}
      </div>

      {episode.tags.length > 0 && !compact && (
        <div className="flex flex-wrap gap-1 mt-2">
          {episode.tags.slice(0, 3).map(tag => (
            <span key={tag} className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full">{tag}</span>
          ))}
        </div>
      )}

      {/* Progress bar */}
      {progress > 0 && progress < 100 && (
        <div className="mt-2 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-[#0033A0] rounded-full" style={{ width: `${progress}%` }} />
        </div>
      )}

      {/* Play overlay */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/5 rounded-2xl">
        <div className="bg-white/90 rounded-full p-2 shadow-lg">
          <Play className="size-5 text-[#0033A0] fill-current" />
        </div>
      </div>
    </button>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/components/audio/hub/EpisodeCard.tsx
git commit -m "feat(audio): add EpisodeCard component"
```

---

### Task 7: Hub Tab Components — ForYouFeed, CourseEpisodeList, BrowseGrid

**Files:**
- Create: `app/components/audio/hub/ForYouFeed.tsx`
- Create: `app/components/audio/hub/CourseEpisodeList.tsx`
- Create: `app/components/audio/hub/BrowseGrid.tsx`
- Create: `app/components/audio/hub/ContinueListening.tsx`
- Create: `app/components/audio/hub/TrendingLane.tsx`

- [ ] **Step 1: Create ContinueListening row**

```tsx
// app/components/audio/hub/ContinueListening.tsx
'use client'

import { RotateCcw } from 'lucide-react'
import type { EpisodeCardData } from '../../../lib/audio/types'
import EpisodeCard from './EpisodeCard'

interface Props {
  episodes: EpisodeCardData[]
  onPlay: (episode: EpisodeCardData) => void
}

export default function ContinueListening({ episodes, onPlay }: Props) {
  if (!episodes.length) return null
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <RotateCcw className="size-4 text-[#0033A0]" />
        <h2 className="font-extrabold text-lg text-gray-900">Continue Listening</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {episodes.map(ep => (
          <div key={ep.id} className="min-w-[200px] max-w-[200px]">
            <EpisodeCard episode={ep} onPlay={onPlay} compact />
          </div>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Create TrendingLane**

```tsx
// app/components/audio/hub/TrendingLane.tsx
'use client'

import { TrendingUp } from 'lucide-react'
import type { EpisodeCardData } from '../../../lib/audio/types'
import EpisodeCard from './EpisodeCard'

interface Props {
  episodes: EpisodeCardData[]
  onPlay: (episode: EpisodeCardData) => void
}

export default function TrendingLane({ episodes, onPlay }: Props) {
  if (!episodes.length) return null
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="size-4 text-[#0033A0]" />
        <h2 className="font-extrabold text-lg text-gray-900">Trending on Campus</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {episodes.slice(0, 5).map(ep => (
          <EpisodeCard key={ep.id} episode={ep} onPlay={onPlay} compact />
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Create ForYouFeed**

```tsx
// app/components/audio/hub/ForYouFeed.tsx
'use client'

import { useState, useEffect } from 'react'
import { Sparkles } from 'lucide-react'
import { useAuth } from '../../../lib/auth-context'
import { apiFetch } from '../../../lib/api-client'
import type { AudioHubFeedResponse, EpisodeCardData } from '../../../lib/audio/types'
import ContinueListening from './ContinueListening'
import TrendingLane from './TrendingLane'
import EpisodeCard from './EpisodeCard'
import LoadingSpinner from '../../LoadingSpinner'
import ErrorBanner from '../../ErrorBanner'

interface Props {
  onPlay: (episode: EpisodeCardData) => void
}

export default function ForYouFeed({ onPlay }: Props) {
  const { user } = useAuth()
  const [feed, setFeed] = useState<AudioHubFeedResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    if (!user?.email) return
    apiFetch(user.email, '/api/audio/hub/feed', { signal: controller.signal })
      .then(setFeed)
      .catch(err => { if (err.name !== 'AbortError') setError(err.message) })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [user?.email])

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorBanner message={error} />
  if (!feed) return null

  return (
    <div className="space-y-8">
      <ContinueListening episodes={feed.continueListening} onPlay={onPlay} />

      {feed.recommended.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="size-4 text-[#0033A0]" />
            <h2 className="font-extrabold text-lg text-gray-900">Sandy Recommends</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {feed.recommended.map(ep => (
              <EpisodeCard key={ep.id} episode={ep} onPlay={onPlay} />
            ))}
          </div>
        </section>
      )}

      <TrendingLane episodes={feed.trending} onPlay={onPlay} />
    </div>
  )
}
```

- [ ] **Step 4: Create CourseEpisodeList**

```tsx
// app/components/audio/hub/CourseEpisodeList.tsx
'use client'

import { useState, useEffect } from 'react'
import { BookOpen, Clock } from 'lucide-react'
import { useAuth } from '../../../lib/auth-context'
import { apiFetch } from '../../../lib/api-client'
import type { AudioHubCoursesResponse, EpisodeCardData } from '../../../lib/audio/types'
import EpisodeCard from './EpisodeCard'
import LoadingSpinner from '../../LoadingSpinner'
import ErrorBanner from '../../ErrorBanner'

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60)
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`
}

interface Props {
  onPlay: (episode: EpisodeCardData) => void
}

export default function CourseEpisodeList({ onPlay }: Props) {
  const { user } = useAuth()
  const [data, setData] = useState<AudioHubCoursesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    if (!user?.email) return
    apiFetch(user.email, '/api/audio/hub/courses', { signal: controller.signal })
      .then(setData)
      .catch(err => { if (err.name !== 'AbortError') setError(err.message) })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [user?.email])

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorBanner message={error} />
  if (!data?.courses.length) {
    return <p className="text-gray-500 text-sm py-8 text-center">No audio episodes for your courses yet.</p>
  }

  return (
    <div className="space-y-8">
      {data.courses.map(course => (
        <section key={course.courseId}>
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="size-4 text-[#0033A0]" />
            <h2 className="font-extrabold text-lg text-gray-900">
              {course.courseCode} — {course.courseName}
            </h2>
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Clock className="size-3" />
              {formatDuration(course.totalDuration)} total
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {course.episodes.map(ep => (
              <EpisodeCard key={ep.id} episode={ep} onPlay={onPlay} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Create BrowseGrid**

```tsx
// app/components/audio/hub/BrowseGrid.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Tag } from 'lucide-react'
import { useAuth } from '../../../lib/auth-context'
import { apiFetch } from '../../../lib/api-client'
import type { AudioHubBrowseResponse, EpisodeCardData } from '../../../lib/audio/types'
import EpisodeCard from './EpisodeCard'
import LoadingSpinner from '../../LoadingSpinner'
import ErrorBanner from '../../ErrorBanner'

interface Props {
  onPlay: (episode: EpisodeCardData) => void
}

export default function BrowseGrid({ onPlay }: Props) {
  const { user } = useAuth()
  const [data, setData] = useState<AudioHubBrowseResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)

  const fetchEpisodes = useCallback(async (q?: string, tag?: string | null) => {
    if (!user?.email) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (tag) params.set('tag', tag)
      const result = await apiFetch(user.email, `/api/audio/hub/browse?${params}`)
      setData(result)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [user?.email])

  useEffect(() => { fetchEpisodes() }, [fetchEpisodes])

  const handleSearch = () => fetchEpisodes(query, activeTag)
  const handleTagClick = (tag: string) => {
    const next = activeTag === tag ? null : tag
    setActiveTag(next)
    fetchEpisodes(query, next)
  }

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Search episodes..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30"
          />
        </div>
      </div>

      {/* Tag cloud */}
      {data?.tags && data.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Tag className="size-4 text-gray-400 mt-0.5" />
          {data.tags.map(t => (
            <button
              key={t.tag}
              type="button"
              onClick={() => handleTagClick(t.tag)}
              className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                activeTag === t.tag
                  ? 'bg-[#0033A0] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t.tag} ({t.count})
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorBanner message={error} />
      ) : !data?.episodes.length ? (
        <p className="text-gray-500 text-sm py-8 text-center">No episodes found.</p>
      ) : (
        <>
          <p className="text-xs text-gray-500">{data.total} episodes</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {data.episodes.map(ep => (
              <EpisodeCard key={ep.id} episode={ep} onPlay={onPlay} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add app/components/audio/hub/
git commit -m "feat(audio): add hub tab components — ForYou, Courses, Browse, Continue, Trending"
```

---

### Task 8: Audio Hub Page

**Files:**
- Create: `app/audio/page.tsx`

- [ ] **Step 1: Create the Audio Hub page**

```tsx
// app/audio/page.tsx
'use client'

import { useState, useCallback } from 'react'
import { Headphones, User, BookOpen, Compass } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import TabNav from '../components/TabNav'
import ForYouFeed from '../components/audio/hub/ForYouFeed'
import CourseEpisodeList from '../components/audio/hub/CourseEpisodeList'
import BrowseGrid from '../components/audio/hub/BrowseGrid'
import type { EpisodeCardData } from '../lib/audio/types'
import { useAudioPlayer } from '../hooks/useAudioPlayer'

const TABS = [
  { id: 'for-you', label: 'For You', icon: User },
  { id: 'courses', label: 'Courses', icon: BookOpen },
  { id: 'browse', label: 'Browse', icon: Compass },
] as const

type TabId = (typeof TABS)[number]['id']

export default function AudioHubPage() {
  const [tab, setTab] = useState<TabId>('for-you')
  const { activate } = useAudioPlayer()

  const handlePlay = useCallback((episode: EpisodeCardData) => {
    if (!episode.cdnUrl) return
    // For now, activate the existing audio player with the episode
    // Full split-view integration comes in Task 10
    activate({
      toolId: episode.id,
      toolName: episode.sourceName,
      personaName: 'Podcast',
      voiceName: 'alloy',
      speed: 1,
      backgroundTrack: null,
      artworkUrl: null,
    })
  }, [activate])

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <PageHeader
        title="Audio"
        subtitle="Listen, learn, and practice with AI-powered audio experiences"
        icon={Headphones}
      />

      <TabNav
        tabs={TABS.map(t => ({ id: t.id, label: t.label }))}
        activeTab={tab}
        onChange={id => setTab(id as TabId)}
      />

      {tab === 'for-you' && <ForYouFeed onPlay={handlePlay} />}
      {tab === 'courses' && <CourseEpisodeList onPlay={handlePlay} />}
      {tab === 'browse' && <BrowseGrid onPlay={handlePlay} />}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/audio/page.tsx
git commit -m "feat(audio): add Audio Hub page with 3-tab layout"
```

---

### Task 9: Extend useAudioPlayer with Panel State

**Files:**
- Modify: `app/hooks/useAudioPlayer.ts`

- [ ] **Step 1: Add PlayerState to the audio player context**

Add new state and functions to the existing `AudioPlayerContextValue` interface and provider. The key additions are:

1. `playerState: PlayerState` — 'idle' | 'bar' | 'panel' | 'full'
2. `setPlayerState: (state: PlayerState) => void`
3. `currentEpisodeId: string | null`
4. `setCurrentEpisodeId: (id: string | null) => void`
5. `currentPositionMs: number`
6. `setCurrentPositionMs: (ms: number) => void`

Add these to the context value interface:

```typescript
import type { PlayerState } from '../lib/audio/types'

// Add to AudioPlayerContextValue:
playerState: PlayerState
setPlayerState: (state: PlayerState) => void
currentEpisodeId: string | null
setCurrentEpisodeId: (id: string | null) => void
currentPositionMs: number
```

Add state hooks inside `AudioPlayerProvider`:

```typescript
const [playerState, setPlayerState] = useState<PlayerState>('idle')
const [currentEpisodeId, setCurrentEpisodeId] = useState<string | null>(null)
const [currentPositionMs, setCurrentPositionMs] = useState(0)
```

Update `activate()` to set `playerState = 'bar'` and update `deactivate()` to set `playerState = 'idle'`.

Add a `timeupdate` listener on the speech audio element to track `currentPositionMs`.

Include all new values in the context provider value object.

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/hooks/useAudioPlayer.ts
git commit -m "feat(audio): extend useAudioPlayer with panel state machine (idle/bar/panel/full)"
```

---

### Task 10: AudioShell Layout Wrapper

**Files:**
- Create: `app/components/audio/AudioShell.tsx`

- [ ] **Step 1: Create AudioShell**

This component wraps the main content area and conditionally renders the AudioSidePanel on the right side.

```tsx
// app/components/audio/AudioShell.tsx
'use client'

import { useAudioPlayer } from '../../hooks/useAudioPlayer'
import dynamic from 'next/dynamic'

const AudioSidePanel = dynamic(() => import('./AudioSidePanel'), { ssr: false })

interface Props {
  children: React.ReactNode
}

export default function AudioShell({ children }: Props) {
  const { playerState } = useAudioPlayer()
  const showPanel = playerState === 'panel'

  return (
    <div className="flex h-full">
      <div className={`flex-1 min-w-0 transition-all duration-300 ${showPanel ? 'xl:mr-96' : ''}`}>
        {children}
      </div>
      {showPanel && <AudioSidePanel />}
    </div>
  )
}
```

- [ ] **Step 2: Create placeholder AudioSidePanel**

```tsx
// app/components/audio/AudioSidePanel.tsx
'use client'

import { X, Maximize2, Minimize2 } from 'lucide-react'
import { useAudioPlayer } from '../../hooks/useAudioPlayer'

export default function AudioSidePanel() {
  const { setPlayerState, currentEpisodeId } = useAudioPlayer()

  return (
    <aside className="fixed top-16 right-0 h-[calc(100vh-64px)] w-96 border-l border-gray-200 bg-white flex flex-col z-40 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <span className="font-extrabold text-sm text-gray-900">Now Playing</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPlayerState('full')}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <Maximize2 className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setPlayerState('bar')}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <Minimize2 className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setPlayerState('bar')}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* Content — filled in Task 11 */}
      <div className="flex-1 overflow-y-auto p-4">
        <p className="text-sm text-gray-500">Episode panel — transcript, chapters, and controls will render here.</p>
      </div>
    </aside>
  )
}
```

- [ ] **Step 3: Mount AudioShell in ClientProviders.tsx**

In `app/components/ClientProviders.tsx`, wrap the `{children}` inside `<main>` with `<AudioShell>`. Find the line where children are rendered inside `<main>` and wrap:

```tsx
import dynamic from 'next/dynamic'
const AudioShell = dynamic(() => import('./audio/AudioShell'), { ssr: false })

// Inside the return, wrap children:
<main className={...}>
  <AudioShell>
    {children}
  </AudioShell>
</main>
```

- [ ] **Step 4: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add app/components/audio/AudioShell.tsx app/components/audio/AudioSidePanel.tsx app/components/ClientProviders.tsx
git commit -m "feat(audio): add AudioShell layout wrapper with right side panel"
```

---

### Task 11: Side Panel Content — Transcript, Chapters, Controls, Bookmarks

**Files:**
- Create: `app/components/audio/TranscriptView.tsx`
- Create: `app/components/audio/ChapterMarkers.tsx`
- Create: `app/components/audio/AudioControls.tsx`
- Create: `app/components/audio/BookmarkTimeline.tsx`
- Create: `app/components/audio/EpisodeHeader.tsx`
- Create: `app/components/audio/SandyLauncher.tsx`
- Modify: `app/components/audio/AudioSidePanel.tsx`

- [ ] **Step 1: Create EpisodeHeader**

```tsx
// app/components/audio/EpisodeHeader.tsx
'use client'

import { Headphones, Clock } from 'lucide-react'

interface Props {
  title: string
  courseName?: string
  durationSecs: number
}

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60)
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`
}

export default function EpisodeHeader({ title, courseName, durationSecs }: Props) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="flex items-center justify-center size-14 bg-gradient-to-br from-[#0033A0] to-blue-400 rounded-xl text-white shrink-0">
        <Headphones className="size-6" />
      </div>
      <div className="min-w-0">
        <h3 className="font-extrabold text-sm text-gray-900 line-clamp-2">{title}</h3>
        {courseName && <p className="text-xs text-gray-500 mt-0.5">{courseName}</p>}
        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
          <Clock className="size-3" />
          {formatDuration(durationSecs)}
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create AudioControls**

```tsx
// app/components/audio/AudioControls.tsx
'use client'

import { Play, Pause, SkipBack, SkipForward, Volume2 } from 'lucide-react'
import { useState } from 'react'
import { useAudioPlayer } from '../../hooks/useAudioPlayer'

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2]

export default function AudioControls() {
  const { isPlaying, pause, resume } = useAudioPlayer()
  const [speedIdx, setSpeedIdx] = useState(2) // default 1x

  const cycleSpeed = () => {
    const next = (speedIdx + 1) % SPEEDS.length
    setSpeedIdx(next)
    // Speed change would be applied through the audio element
  }

  return (
    <div className="flex items-center justify-center gap-4 py-3">
      <button type="button" className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100">
        <SkipBack className="size-4" />
      </button>

      <button
        type="button"
        onClick={isPlaying ? pause : resume}
        className="p-3 bg-[#0033A0] text-white rounded-full hover:bg-[#002880] transition-colors"
      >
        {isPlaying ? <Pause className="size-5" /> : <Play className="size-5 ml-0.5" />}
      </button>

      <button type="button" className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100">
        <SkipForward className="size-4" />
      </button>

      <button
        type="button"
        onClick={cycleSpeed}
        className="text-xs font-semibold text-gray-500 hover:text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-100"
      >
        {SPEEDS[speedIdx]}x
      </button>

      <Volume2 className="size-4 text-gray-400" />
    </div>
  )
}
```

- [ ] **Step 3: Create TranscriptView**

```tsx
// app/components/audio/TranscriptView.tsx
'use client'

import { useRef, useEffect } from 'react'
import { FileText } from 'lucide-react'

interface Props {
  transcript: string | null
  currentTimestampMs: number
}

export default function TranscriptView({ transcript, currentTimestampMs }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  if (!transcript) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-gray-400">
        <FileText className="size-6 mb-2" />
        <p className="text-xs">No transcript available</p>
      </div>
    )
  }

  // Split transcript into paragraphs for display
  const paragraphs = transcript.split('\n\n').filter(Boolean)

  return (
    <div ref={containerRef} className="space-y-3 text-sm text-gray-700 leading-relaxed">
      {paragraphs.map((p, i) => (
        <p key={i} className="hover:bg-blue-50/50 rounded px-1 -mx-1 transition-colors cursor-pointer">
          {p}
        </p>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Create ChapterMarkers**

```tsx
// app/components/audio/ChapterMarkers.tsx
'use client'

import { ListMusic } from 'lucide-react'
import type { ChapterMarker } from '../../lib/audio/types'

interface Props {
  chapters: ChapterMarker[]
  currentTimestampMs: number
  onSeek: (ms: number) => void
}

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function ChapterMarkers({ chapters, currentTimestampMs, onSeek }: Props) {
  if (!chapters.length) return null

  const currentIdx = chapters.findLastIndex(c => c.startMs <= currentTimestampMs)

  return (
    <section>
      <div className="flex items-center gap-2 mb-2">
        <ListMusic className="size-3.5 text-gray-400" />
        <h4 className="font-semibold text-xs text-gray-500 uppercase tracking-wide">Chapters</h4>
      </div>
      <div className="space-y-1">
        {chapters.map((ch, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSeek(ch.startMs)}
            className={`w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
              i === currentIdx
                ? 'bg-[#0033A0]/10 text-[#0033A0] font-semibold'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span className="truncate">{ch.title}</span>
            <span className="text-gray-400 shrink-0 ml-2">{formatTime(ch.startMs)}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 5: Create BookmarkTimeline**

```tsx
// app/components/audio/BookmarkTimeline.tsx
'use client'

import { useState } from 'react'
import { Bookmark, Plus } from 'lucide-react'
import type { Bookmark as BookmarkType } from '../../lib/audio/types'

interface Props {
  bookmarks: BookmarkType[]
  currentTimestampMs: number
  onAddBookmark: (bookmark: BookmarkType) => void
  onSeek: (ms: number) => void
}

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function BookmarkTimeline({ bookmarks, currentTimestampMs, onAddBookmark, onSeek }: Props) {
  const [note, setNote] = useState('')
  const [adding, setAdding] = useState(false)

  const handleAdd = () => {
    onAddBookmark({ timestampMs: currentTimestampMs, note: note.trim() || 'Bookmark' })
    setNote('')
    setAdding(false)
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Bookmark className="size-3.5 text-gray-400" />
          <h4 className="font-semibold text-xs text-gray-500 uppercase tracking-wide">Bookmarks</h4>
        </div>
        <button
          type="button"
          onClick={() => setAdding(!adding)}
          className="p-1 text-gray-400 hover:text-[#0033A0] rounded-lg hover:bg-gray-100"
        >
          <Plus className="size-3.5" />
        </button>
      </div>

      {adding && (
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Add a note..."
            className="flex-1 text-xs px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0033A0]/30"
          />
          <button type="button" onClick={handleAdd} className="text-xs px-2 py-1.5 bg-[#0033A0] text-white rounded-lg">
            Save
          </button>
        </div>
      )}

      {bookmarks.length === 0 ? (
        <p className="text-xs text-gray-400">No bookmarks yet</p>
      ) : (
        <div className="space-y-1">
          {bookmarks.map((bm, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onSeek(bm.timestampMs)}
              className="w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center justify-between text-gray-600 hover:bg-gray-50"
            >
              <span className="truncate">{bm.note}</span>
              <span className="text-gray-400 shrink-0 ml-2">{formatTime(bm.timestampMs)}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
```

- [ ] **Step 6: Create SandyLauncher**

```tsx
// app/components/audio/SandyLauncher.tsx
'use client'

import { MessageCircle } from 'lucide-react'

interface Props {
  episodeTitle: string
  currentTopic?: string
}

export default function SandyLauncher({ episodeTitle, currentTopic }: Props) {
  const handleLaunch = () => {
    // Dispatch a custom event that ConciergePanel listens for
    const message = currentTopic
      ? `I'm listening to "${episodeTitle}" — specifically about ${currentTopic}. Can you help me understand this better?`
      : `I'm listening to "${episodeTitle}". What should I focus on?`
    window.dispatchEvent(new CustomEvent('sandy-prefill', { detail: { message, autoSend: false } }))
  }

  return (
    <button
      type="button"
      onClick={handleLaunch}
      className="w-full flex items-center gap-2 px-3 py-2.5 bg-[#0033A0]/5 text-[#0033A0] rounded-xl hover:bg-[#0033A0]/10 transition-colors text-sm font-medium"
    >
      <MessageCircle className="size-4" />
      Ask Sandy About This
    </button>
  )
}
```

- [ ] **Step 7: Wire components into AudioSidePanel**

Update `app/components/audio/AudioSidePanel.tsx` to import and render all sub-components with episode data. Replace the placeholder content div with:

```tsx
import EpisodeHeader from './EpisodeHeader'
import AudioControls from './AudioControls'
import TranscriptView from './TranscriptView'
import ChapterMarkers from './ChapterMarkers'
import BookmarkTimeline from './BookmarkTimeline'
import SandyLauncher from './SandyLauncher'

// In the panel body (scrollable area), render:
<EpisodeHeader title={...} courseName={...} durationSecs={...} />
<AudioControls />
<div className="border-t border-gray-100 pt-3 space-y-4">
  <SandyLauncher episodeTitle={...} />
  <ChapterMarkers chapters={...} currentTimestampMs={...} onSeek={...} />
  <BookmarkTimeline bookmarks={...} currentTimestampMs={...} onAddBookmark={...} onSeek={...} />
  <TranscriptView transcript={...} currentTimestampMs={...} />
</div>
```

- [ ] **Step 8: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 9: Commit**

```bash
git add app/components/audio/
git commit -m "feat(audio): add side panel content — transcript, chapters, controls, bookmarks, Sandy launcher"
```

---

### Task 12: Navigation Integration — Header, Hub Config, Page Descriptions

**Files:**
- Modify: `app/components/Header.tsx`
- Modify: `app/hub/hub-config.ts`
- Modify: `app/lib/concierge-service.ts`
- Modify: `app/components/concierge/concierge-utils.ts`

- [ ] **Step 1: Add "Audio" to Header nav**

In `app/components/Header.tsx`, add `Headphones` to the lucide-react import, then add a nav link entry for Audio visible to all roles. Find the NavLinks array and add:

```typescript
{ href: '/audio', label: 'Audio' }
```

The icon assignment should map Audio to `Headphones`.

- [ ] **Step 2: Add Audio swim lane to hub-config.ts**

In `app/hub/hub-config.ts`, add `Headphones` to imports and create a new swim lane:

```typescript
const AudioHubEntry: ShowcaseTool = {
  id: 'audio-hub',
  label: 'Audio Hub',
  hook: 'Podcasts, voice tutoring, and interactive audio experiences',
  route: '/audio',
  icon: Headphones,
  gradient: 'from-blue-500 to-indigo-600',
}

// Add a swim lane visible to all roles:
{
  id: 'audio-experiences',
  title: 'Audio & Voice',
  tools: [AudioHubEntry],
  visibleTo: ['STUDENT', 'EDUCATOR', 'ADMIN', 'STAFF'],
}
```

Add `'audio-experiences'` to each role's `ROLE_LANE_ORDER`.

- [ ] **Step 3: Add PAGE_DESCRIPTIONS for audio routes**

In `app/lib/concierge-service.ts`, add to the `PAGE_DESCRIPTIONS` map:

```typescript
'/audio': 'Audio Hub — discover podcasts, voice tutoring sessions, and interactive audio scenarios. Three tabs: For You (personalized feed), Courses (episodes by enrolled courses), Browse (tag-based discovery).',
'/audio/episode/*': 'Audio Episode — full immersive player with transcript, chapter markers, bookmarks, and Sandy integration.',
'/audio/session/*': 'Voice Session Replay — transcript, AI summary, rubric scores, and annotations from a completed voice tutoring or scenario session.',
'/audio/scenarios': 'Interactive Scenarios — browse and launch templatized audio scenarios (Clinical, Interview, Debate, Role-Play) with AI personas.',
'/audio/scenarios/*': 'Scenario Detail — launch an interactive audio scenario with Sandy playing a character. Phases, checkpoints, and rubric scoring.',
```

- [ ] **Step 4: Add page starters for audio routes**

In `app/components/concierge/concierge-utils.ts`, add a case in `getPageStarters()`:

```typescript
if (pathname === '/audio' || pathname.startsWith('/audio')) return [
  'What should I listen to?',
  'Quiz me verbally on my weakest course',
  'Make a podcast from my notes',
  'Start a practice interview',
]
```

- [ ] **Step 5: Add `/audio` to tool-registry page categories**

In `app/lib/agent/tool-registry.ts`, in the `getPageRelevantCategories()` function, add:

```typescript
if (page.startsWith('/audio'))
  return new Set([...UNIVERSAL_CATEGORIES, 'audio', 'academic', 'content'])
```

- [ ] **Step 6: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add app/components/Header.tsx app/hub/hub-config.ts app/lib/concierge-service.ts app/components/concierge/concierge-utils.ts app/lib/agent/tool-registry.ts
git commit -m "feat(audio): integrate Audio Hub into navigation, hub config, Sandy context"
```

---

### Task 13: Full Player Page

**Files:**
- Create: `app/audio/episode/[id]/page.tsx`

- [ ] **Step 1: Create the full episode player page**

```tsx
// app/audio/episode/[id]/page.tsx
'use client'

import { useState, useEffect, use } from 'react'
import { useAuth } from '../../../lib/auth-context'
import { apiFetch } from '../../../lib/api-client'
import type { EpisodeDetail } from '../../../lib/audio/types'
import EpisodeHeader from '../../../components/audio/EpisodeHeader'
import AudioControls from '../../../components/audio/AudioControls'
import TranscriptView from '../../../components/audio/TranscriptView'
import ChapterMarkers from '../../../components/audio/ChapterMarkers'
import BookmarkTimeline from '../../../components/audio/BookmarkTimeline'
import SandyLauncher from '../../../components/audio/SandyLauncher'
import LoadingSpinner from '../../../components/LoadingSpinner'
import ErrorBanner from '../../../components/ErrorBanner'

export default function EpisodePlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user } = useAuth()
  const [episode, setEpisode] = useState<EpisodeDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    if (!user?.email) return
    apiFetch(user.email, `/api/audio/episode/${id}`, { signal: controller.signal })
      .then(setEpisode)
      .catch(err => { if (err.name !== 'AbortError') setError(err.message) })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [user?.email, id])

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-12"><LoadingSpinner /></div>
  if (error) return <div className="max-w-4xl mx-auto px-4 py-12"><ErrorBanner message={error} /></div>
  if (!episode) return null

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <EpisodeHeader
        title={episode.sourceName}
        courseName={episode.courseName}
        durationSecs={episode.durationSecs}
      />

      <AudioControls />

      {/* Progress bar placeholder */}
      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-[#0033A0] rounded-full" style={{ width: '0%' }} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main — Transcript */}
        <div className="lg:col-span-2">
          <TranscriptView transcript={episode.transcript} currentTimestampMs={0} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <SandyLauncher episodeTitle={episode.sourceName} />
          <ChapterMarkers chapters={episode.chapters} currentTimestampMs={0} onSeek={() => {}} />
          <BookmarkTimeline
            bookmarks={(episode as any).bookmarks ?? []}
            currentTimestampMs={0}
            onAddBookmark={() => {}}
            onSeek={() => {}}
          />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/audio/episode/
git commit -m "feat(audio): add full episode player page"
```

---

## Phase 2: Voice Tutoring Modes

### Task 14: Schema — VoiceSession & VoiceSessionScore Models

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add VoiceSession and VoiceSessionScore models**

Add to `prisma/schema.prisma`:

```prisma
model VoiceSession {
  id                 String              @id @default(cuid())
  createdAt          DateTime            @default(now())
  updatedAt          DateTime            @updatedAt
  userId             String
  type               String              // "socratic" | "rehearsal" | "walkthrough" | "assessment" | "scenario"
  scenarioId         String?
  courseId            String?
  topicTags          String[]
  transcript         Json                // [{role, text, timestampMs}]
  summary            String?             @db.Text
  durationSecs       Int?
  checkpointResults  Json?               // [{name, met, evidence}]
  audioSaved         Boolean             @default(false)
  audioBlobPath      String?
  status             String              @default("active") // "active" | "completed" | "abandoned"

  user               User                @relation(fields: [userId], references: [id])
  scenario           InteractiveScenario? @relation(fields: [scenarioId], references: [id])
  scores             VoiceSessionScore[]

  @@index([userId])
  @@index([courseId])
  @@index([scenarioId])
}

model VoiceSessionScore {
  id          String       @id @default(cuid())
  sessionId   String
  dimension   String
  score       Float
  weight      Float
  evidence    String       @db.Text
  feedback    String       @db.Text

  session     VoiceSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([sessionId])
}

model InteractiveScenario {
  id                  String           @id @default(cuid())
  createdAt           DateTime         @default(now())
  updatedAt           DateTime         @updatedAt
  creatorId           String
  templateType        String           // "clinical" | "interview" | "debate" | "roleplay"
  title               String
  description         String           @db.Text
  persona             Json             // {name, role, voice, personality}
  situation           String           @db.Text
  phases              Json             // [{name, objective, checkpoint?, maxDurationSecs}]
  rubric              Json             // [{dimension, weight, descriptors}]
  completionCriteria  String
  published           Boolean          @default(false)
  courseId            String?
  timesPlayed         Int              @default(0)
  avgScore            Float?

  creator             User             @relation(fields: [creatorId], references: [id])
  sessions            VoiceSession[]

  @@index([creatorId])
  @@index([courseId])
  @@index([templateType])
}
```

Add the User model relation fields (find the User model and add):

```prisma
  voiceSessions          VoiceSession[]
  createdScenarios       InteractiveScenario[]
```

- [ ] **Step 2: Run migration**

```bash
npx prisma migrate dev --name add-voice-sessions-and-scenarios
```

- [ ] **Step 3: Regenerate + verify**

```bash
npx prisma generate && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(audio): add VoiceSession, VoiceSessionScore, InteractiveScenario models"
```

---

### Task 15: Voice Session Service

**Files:**
- Create: `app/lib/audio/voice-session-service.ts`

- [ ] **Step 1: Create voice session service**

```typescript
// app/lib/audio/voice-session-service.ts
import { prisma } from '../prisma'
import type {
  VoiceTutoringMode,
  TranscriptEntry,
  CheckpointResult,
  ScoreDimension,
  VoiceSessionSummary,
} from './types'

/** Start a new voice session */
export async function createVoiceSession(
  userId: string,
  type: VoiceTutoringMode,
  options?: { scenarioId?: string; courseId?: string; topicTags?: string[] },
) {
  return prisma.voiceSession.create({
    data: {
      userId,
      type,
      scenarioId: options?.scenarioId,
      courseId: options?.courseId,
      topicTags: options?.topicTags ?? [],
      transcript: [],
      status: 'active',
    },
  })
}

/** Append transcript entries and optionally end the session */
export async function updateVoiceSession(
  sessionId: string,
  data: {
    transcript?: TranscriptEntry[]
    status?: string
    durationSecs?: number
    summary?: string
    checkpointResults?: CheckpointResult[]
  },
) {
  const update: any = {}
  if (data.transcript) update.transcript = data.transcript
  if (data.status) update.status = data.status
  if (data.durationSecs !== undefined) update.durationSecs = data.durationSecs
  if (data.summary) update.summary = data.summary
  if (data.checkpointResults) update.checkpointResults = data.checkpointResults

  return prisma.voiceSession.update({
    where: { id: sessionId },
    data: update,
  })
}

/** Score a completed voice session */
export async function scoreVoiceSession(
  sessionId: string,
  scores: ScoreDimension[],
) {
  // Delete existing scores and recreate
  await prisma.voiceSessionScore.deleteMany({ where: { sessionId } })
  await prisma.voiceSessionScore.createMany({
    data: scores.map(s => ({
      sessionId,
      dimension: s.dimension,
      score: s.score,
      weight: s.weight,
      evidence: s.evidence,
      feedback: s.feedback,
    })),
  })
}

/** Get session detail with scores */
export async function getVoiceSession(sessionId: string) {
  return prisma.voiceSession.findUnique({
    where: { id: sessionId },
    include: { scores: true, scenario: true },
  })
}

/** List user's voice sessions */
export async function listVoiceSessions(
  userId: string,
  limit = 20,
): Promise<VoiceSessionSummary[]> {
  const sessions = await prisma.voiceSession.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { scores: true },
  })

  return sessions.map(s => ({
    id: s.id,
    type: s.type as VoiceTutoringMode,
    courseId: s.courseId,
    topicTags: s.topicTags,
    durationSecs: s.durationSecs,
    summary: s.summary,
    status: s.status,
    createdAt: s.createdAt.toISOString(),
    scores: s.scores.map(sc => ({
      dimension: sc.dimension,
      score: sc.score,
      weight: sc.weight,
      evidence: sc.evidence,
      feedback: sc.feedback,
    })),
  }))
}

/** Get mode-specific system prompt for voice tutoring */
export function getVoiceTutoringPrompt(mode: VoiceTutoringMode, topic: string, courseName?: string): string {
  const context = courseName ? ` for the course "${courseName}"` : ''

  const prompts: Record<VoiceTutoringMode, string> = {
    socratic: `You are a Socratic tutor${context}. The topic is: ${topic}.
Never give answers directly. Ask one question at a time. Increase complexity when the student demonstrates understanding. If they struggle, simplify and guide with leading questions. Keep responses concise (2-3 sentences max).`,

    rehearsal: `You are a curious student who doesn't understand the topic: ${topic}${context}.
The student will explain the concept to you (Feynman Technique). Ask clarifying questions. Be encouraging but persistent — if something is unclear or missing, say "I don't quite follow..." Ask about examples and edge cases. Keep responses to 1-2 sentences.`,

    walkthrough: `Walk the student through the topic "${topic}"${context} step by step.
After each concept, pause and check understanding: "Does that make sense?" If they say no, re-explain with a different analogy. If they ask a question, answer it, then resume the walkthrough. Keep each step to 3-4 sentences.`,

    assessment: `You are an oral examiner${context}. The topic is: ${topic}.
Ask exactly 5 questions, one at a time. Wait for the student's answer. Do NOT help, hint, or provide feedback between questions. After each answer, say only "Thank you. Next question:" and ask the next one. After all 5 questions, say "Assessment complete."`,

    scenario: '', // Handled by scenario-specific prompts
  }

  return prompts[mode]
}

/** Smart mode suggestion based on student context */
export function suggestVoiceTutoringMode(signals: {
  justFinishedReading?: boolean
  assessmentWithin3Days?: boolean
  lowQuizScores?: boolean
  newTopic?: boolean
}): { mode: VoiceTutoringMode; reason: string } {
  if (signals.assessmentWithin3Days) {
    return { mode: 'assessment', reason: 'You have an assessment coming up — oral practice will prepare you.' }
  }
  if (signals.justFinishedReading) {
    return { mode: 'rehearsal', reason: "You just finished reading — explaining it back solidifies understanding." }
  }
  if (signals.lowQuizScores) {
    return { mode: 'socratic', reason: 'Socratic questioning helps identify and fill knowledge gaps.' }
  }
  if (signals.newTopic) {
    return { mode: 'walkthrough', reason: 'A guided walkthrough is the best way to approach new material.' }
  }
  return { mode: 'socratic', reason: 'Socratic dialogue is a great all-purpose study mode.' }
}
```

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/lib/audio/voice-session-service.ts
git commit -m "feat(audio): add voice session service — CRUD, 5 mode prompts, smart suggestion"
```

---

### Task 16: Voice Session API Routes

**Files:**
- Create: `app/api/audio/voice-session/route.ts`
- Create: `app/api/audio/voice-session/[id]/route.ts`
- Create: `app/api/audio/voice-session/[id]/score/route.ts`
- Create: `app/api/audio/voice-session/[id]/save/route.ts`

- [ ] **Step 1: Create voice session start + list route**

```typescript
// app/api/audio/voice-session/route.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { createVoiceSession, listVoiceSessions } from '../../../lib/audio/voice-session-service'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const sessions = await listVoiceSessions(auth.user.id)
  return NextResponse.json({ sessions })
})

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { type, scenarioId, courseId, topicTags } = parsed.data as any
  if (!type) return NextResponse.json({ error: 'type is required' }, { status: 400 })
  const session = await createVoiceSession(auth.user.id, type, { scenarioId, courseId, topicTags })
  return NextResponse.json(session, { status: 201 })
})
```

- [ ] **Step 2: Create session detail + update route**

```typescript
// app/api/audio/voice-session/[id]/route.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { getVoiceSession, updateVoiceSession } from '../../../../lib/audio/voice-session-service'

export const GET = withErrorHandling(async (req: NextRequest, ctx: any) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { id } = await ctx.params
  const session = await getVoiceSession(id)
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  return NextResponse.json(session)
})

export const PATCH = withErrorHandling(async (req: NextRequest, ctx: any) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { id } = await ctx.params
  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const session = await updateVoiceSession(id, parsed.data as any)
  return NextResponse.json(session)
})
```

- [ ] **Step 3: Create score route**

```typescript
// app/api/audio/voice-session/[id]/score/route.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { scoreVoiceSession } from '../../../../../lib/audio/voice-session-service'

export const POST = withErrorHandling(async (req: NextRequest, ctx: any) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { id } = await ctx.params
  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const { scores } = parsed.data as any
  if (!Array.isArray(scores)) return NextResponse.json({ error: 'scores array required' }, { status: 400 })
  await scoreVoiceSession(id, scores)
  return NextResponse.json({ ok: true })
})
```

- [ ] **Step 4: Create save audio route**

```typescript
// app/api/audio/voice-session/[id]/save/route.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireRequestUser, isAuthFailure } from '../../../../../lib/server-auth'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { prisma } from '../../../../../lib/prisma'

export const POST = withErrorHandling(async (req: NextRequest, ctx: any) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { id } = await ctx.params
  // Mark session for audio save (actual blob storage is deferred)
  await prisma.voiceSession.update({
    where: { id },
    data: { audioSaved: true },
  })
  return NextResponse.json({ ok: true })
})
```

- [ ] **Step 5: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add app/api/audio/voice-session/
git commit -m "feat(audio): add voice session API routes — start, update, score, save"
```

---

### Task 17: Voice Session UI Components

**Files:**
- Create: `app/components/audio/voice/VoiceModeSelector.tsx`
- Create: `app/components/audio/voice/VoiceSessionPanel.tsx`
- Create: `app/components/audio/voice/LiveTranscript.tsx`
- Create: `app/components/audio/voice/SessionTimer.tsx`
- Create: `app/components/audio/voice/SessionReport.tsx`
- Create: `app/hooks/useVoiceSession.ts`

- [ ] **Step 1: Create VoiceModeSelector**

```tsx
// app/components/audio/voice/VoiceModeSelector.tsx
'use client'

import { MessageCircle, Mic, BookOpen, ClipboardCheck, Users } from 'lucide-react'
import type { VoiceTutoringMode } from '../../../lib/audio/types'

const MODES: { id: VoiceTutoringMode; label: string; description: string; icon: any }[] = [
  { id: 'socratic', label: 'Socratic Dialogue', description: 'Sandy asks probing questions to deepen understanding', icon: MessageCircle },
  { id: 'rehearsal', label: 'Verbal Rehearsal', description: 'Explain a concept as if teaching Sandy', icon: Mic },
  { id: 'walkthrough', label: 'Guided Walkthrough', description: 'Sandy walks you through a topic step by step', icon: BookOpen },
  { id: 'assessment', label: 'Oral Assessment', description: 'Timed verbal quiz with rubric scoring', icon: ClipboardCheck },
  { id: 'scenario', label: 'Interactive Scenario', description: 'Role-play a professional scenario', icon: Users },
]

interface Props {
  selected: VoiceTutoringMode | null
  onSelect: (mode: VoiceTutoringMode) => void
  suggestedMode?: { mode: VoiceTutoringMode; reason: string }
}

export default function VoiceModeSelector({ selected, onSelect, suggestedMode }: Props) {
  return (
    <div className="space-y-3">
      <h3 className="font-extrabold text-base text-gray-900">Choose a Mode</h3>
      {suggestedMode && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm text-blue-800">
          <span className="font-semibold">Suggested:</span> {MODES.find(m => m.id === suggestedMode.mode)?.label} — {suggestedMode.reason}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {MODES.map(m => {
          const Icon = m.icon
          const isSelected = selected === m.id
          const isSuggested = suggestedMode?.mode === m.id
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onSelect(m.id)}
              className={`text-left p-4 border-2 rounded-2xl transition-all ${
                isSelected
                  ? 'border-[#0033A0] bg-[#0033A0]/5'
                  : isSuggested
                  ? 'border-blue-200 bg-blue-50/50 hover:border-blue-300'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`size-4 ${isSelected ? 'text-[#0033A0]' : 'text-gray-500'}`} />
                <span className={`font-semibold text-sm ${isSelected ? 'text-[#0033A0]' : 'text-gray-900'}`}>{m.label}</span>
              </div>
              <p className="text-xs text-gray-500">{m.description}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create SessionTimer**

```tsx
// app/components/audio/voice/SessionTimer.tsx
'use client'

import { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'

interface Props {
  startedAt: number // Date.now()
  maxSecs?: number
  onTimeout?: () => void
}

export default function SessionTimer({ startedAt, maxSecs, onTimeout }: Props) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      const secs = Math.floor((Date.now() - startedAt) / 1000)
      setElapsed(secs)
      if (maxSecs && secs >= maxSecs) onTimeout?.()
    }, 1000)
    return () => clearInterval(interval)
  }, [startedAt, maxSecs, onTimeout])

  const m = Math.floor(elapsed / 60)
  const s = elapsed % 60
  const remaining = maxSecs ? maxSecs - elapsed : null
  const isUrgent = remaining !== null && remaining <= 30

  return (
    <div className={`flex items-center gap-1.5 text-xs font-mono ${isUrgent ? 'text-red-600' : 'text-gray-500'}`}>
      <Clock className="size-3" />
      <span>{m}:{s.toString().padStart(2, '0')}</span>
      {remaining !== null && (
        <span className="text-gray-400">/ {Math.floor(maxSecs! / 60)}:{(maxSecs! % 60).toString().padStart(2, '0')}</span>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create LiveTranscript**

```tsx
// app/components/audio/voice/LiveTranscript.tsx
'use client'

import { useRef, useEffect } from 'react'
import type { TranscriptEntry } from '../../../lib/audio/types'

interface Props {
  entries: TranscriptEntry[]
  isListening: boolean
}

export default function LiveTranscript({ entries, isListening }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [entries.length])

  return (
    <div className="flex-1 overflow-y-auto space-y-3 p-3">
      {entries.map((entry, i) => (
        <div key={i} className={`flex ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-[80%] px-3 py-2 text-sm ${
            entry.role === 'user'
              ? 'bg-[#0033A0] text-white rounded-2xl rounded-tr-sm'
              : 'bg-white border border-gray-100 rounded-2xl rounded-tl-sm text-gray-800'
          }`}>
            {entry.text}
          </div>
        </div>
      ))}

      {isListening && (
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <div className="flex gap-0.5">
            <div className="w-1 h-3 bg-[#0033A0] rounded-full animate-pulse" />
            <div className="w-1 h-4 bg-[#0033A0] rounded-full animate-pulse delay-75" />
            <div className="w-1 h-2 bg-[#0033A0] rounded-full animate-pulse delay-150" />
          </div>
          Listening...
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
```

- [ ] **Step 4: Create SessionReport**

```tsx
// app/components/audio/voice/SessionReport.tsx
'use client'

import { FileText, BarChart3, Star } from 'lucide-react'
import type { ScoreDimension } from '../../../lib/audio/types'

interface Props {
  summary: string | null
  scores: ScoreDimension[]
  durationSecs: number | null
}

export default function SessionReport({ summary, scores, durationSecs }: Props) {
  const compositeScore = scores.length
    ? scores.reduce((sum, s) => sum + s.score * s.weight, 0) / scores.reduce((sum, s) => sum + s.weight, 0)
    : null

  return (
    <div className="space-y-6">
      {/* Summary */}
      {summary && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="size-4 text-[#0033A0]" />
            <h3 className="font-extrabold text-base text-gray-900">Session Summary</h3>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">{summary}</p>
          {durationSecs && (
            <p className="text-xs text-gray-400 mt-2">{Math.floor(durationSecs / 60)} min {durationSecs % 60}s</p>
          )}
        </div>
      )}

      {/* Rubric Scores */}
      {scores.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="size-4 text-[#0033A0]" />
              <h3 className="font-extrabold text-base text-gray-900">Rubric Scorecard</h3>
            </div>
            {compositeScore !== null && (
              <div className="flex items-center gap-1 text-sm font-semibold text-[#0033A0]">
                <Star className="size-4" />
                {compositeScore.toFixed(1)}/10
              </div>
            )}
          </div>
          <div className="space-y-3">
            {scores.map(s => (
              <div key={s.dimension}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">{s.dimension}</span>
                  <span className="text-sm font-semibold text-gray-900">{s.score}/10</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#0033A0] rounded-full transition-all"
                    style={{ width: `${(s.score / 10) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{s.feedback}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Create useVoiceSession hook**

```typescript
// app/hooks/useVoiceSession.ts
'use client'

import { useState, useCallback, useRef } from 'react'
import { useAuth } from '../lib/auth-context'
import { apiFetch } from '../lib/api-client'
import type { VoiceTutoringMode, TranscriptEntry, ScoreDimension } from '../lib/audio/types'

type SessionPhase = 'select' | 'active' | 'ending' | 'report'

export function useVoiceSession() {
  const { user } = useAuth()
  const [phase, setPhase] = useState<SessionPhase>('select')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [mode, setMode] = useState<VoiceTutoringMode | null>(null)
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([])
  const [summary, setSummary] = useState<string | null>(null)
  const [scores, setScores] = useState<ScoreDimension[]>([])
  const [loading, setLoading] = useState(false)
  const startTimeRef = useRef<number>(0)

  const startSession = useCallback(async (
    selectedMode: VoiceTutoringMode,
    options?: { courseId?: string; topicTags?: string[]; scenarioId?: string },
  ) => {
    if (!user?.email) return
    setLoading(true)
    try {
      const session = await apiFetch(user.email, '/api/audio/voice-session', {
        method: 'POST',
        body: JSON.stringify({ type: selectedMode, ...options }),
      })
      setSessionId(session.id)
      setMode(selectedMode)
      setPhase('active')
      startTimeRef.current = Date.now()
    } finally {
      setLoading(false)
    }
  }, [user?.email])

  const addTranscriptEntry = useCallback((entry: TranscriptEntry) => {
    setTranscript(prev => [...prev, entry])
  }, [])

  const endSession = useCallback(async () => {
    if (!user?.email || !sessionId) return
    setPhase('ending')
    const durationSecs = Math.floor((Date.now() - startTimeRef.current) / 1000)
    try {
      const result = await apiFetch(user.email, `/api/audio/voice-session/${sessionId}`, {
        method: 'PATCH',
        body: JSON.stringify({ transcript, status: 'completed', durationSecs }),
      })
      setSummary(result.summary)

      // Trigger scoring
      const scoreResult = await apiFetch(user.email, `/api/audio/voice-session/${sessionId}/score`, {
        method: 'POST',
        body: JSON.stringify({ scores: [] }), // AI scoring would be triggered server-side
      })
      setScores(scoreResult.scores ?? [])
    } catch {
      // Session saved even if scoring fails
    } finally {
      setPhase('report')
    }
  }, [user?.email, sessionId, transcript])

  const reset = useCallback(() => {
    setPhase('select')
    setSessionId(null)
    setMode(null)
    setTranscript([])
    setSummary(null)
    setScores([])
  }, [])

  return {
    phase,
    sessionId,
    mode,
    transcript,
    summary,
    scores,
    loading,
    startedAt: startTimeRef.current,
    startSession,
    addTranscriptEntry,
    endSession,
    reset,
  }
}
```

- [ ] **Step 6: Create VoiceSessionPanel (assembly component)**

```tsx
// app/components/audio/voice/VoiceSessionPanel.tsx
'use client'

import { useState } from 'react'
import { Mic, Square } from 'lucide-react'
import { useVoiceSession } from '../../../hooks/useVoiceSession'
import VoiceModeSelector from './VoiceModeSelector'
import LiveTranscript from './LiveTranscript'
import SessionTimer from './SessionTimer'
import SessionReport from './SessionReport'
import type { VoiceTutoringMode } from '../../../lib/audio/types'

export default function VoiceSessionPanel() {
  const {
    phase, mode, transcript, summary, scores, loading, startedAt,
    startSession, addTranscriptEntry, endSession, reset,
  } = useVoiceSession()
  const [selectedMode, setSelectedMode] = useState<VoiceTutoringMode | null>(null)

  if (phase === 'select') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <VoiceModeSelector
          selected={selectedMode}
          onSelect={setSelectedMode}
        />
        {selectedMode && (
          <button
            type="button"
            onClick={() => startSession(selectedMode)}
            disabled={loading}
            className="w-full py-3 bg-[#0033A0] text-white font-semibold rounded-xl hover:bg-[#002880] transition-colors disabled:opacity-50"
          >
            {loading ? 'Starting...' : 'Begin Session'}
          </button>
        )}
      </div>
    )
  }

  if (phase === 'active' || phase === 'ending') {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Mic className="size-4 text-[#0033A0]" />
            <span className="font-semibold text-sm text-gray-900 capitalize">{mode}</span>
          </div>
          <SessionTimer startedAt={startedAt} />
        </div>

        {/* Transcript */}
        <LiveTranscript entries={transcript} isListening={phase === 'active'} />

        {/* Controls */}
        <div className="px-4 py-3 border-t border-gray-100 flex justify-center">
          <button
            type="button"
            onClick={endSession}
            disabled={phase === 'ending'}
            className="flex items-center gap-2 px-6 py-2.5 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50"
          >
            <Square className="size-4" />
            {phase === 'ending' ? 'Ending...' : 'End Session'}
          </button>
        </div>
      </div>
    )
  }

  // Report phase
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <SessionReport summary={summary} scores={scores} durationSecs={null} />
      <button
        type="button"
        onClick={reset}
        className="w-full py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:border-gray-300 transition-colors"
      >
        Start New Session
      </button>
    </div>
  )
}
```

- [ ] **Step 7: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 8: Commit**

```bash
git add app/components/audio/voice/ app/hooks/useVoiceSession.ts
git commit -m "feat(audio): add voice tutoring UI — mode selector, live transcript, timer, report"
```

---

## Phase 3: Interactive Scenarios

### Task 18: Scenario Service

**Files:**
- Create: `app/lib/audio/scenario-service.ts`

- [ ] **Step 1: Create scenario CRUD service**

```typescript
// app/lib/audio/scenario-service.ts
import { prisma } from '../prisma'
import type { ScenarioTemplateType, ScenarioPersona, ScenarioPhase, RubricDimension } from './types'

export async function createScenario(
  creatorId: string,
  data: {
    templateType: ScenarioTemplateType
    title: string
    description: string
    persona: ScenarioPersona
    situation: string
    phases: ScenarioPhase[]
    rubric: RubricDimension[]
    completionCriteria: string
    courseId?: string
  },
) {
  return prisma.interactiveScenario.create({
    data: {
      creatorId,
      templateType: data.templateType,
      title: data.title,
      description: data.description,
      persona: data.persona,
      situation: data.situation,
      phases: data.phases,
      rubric: data.rubric,
      completionCriteria: data.completionCriteria,
      courseId: data.courseId,
    },
  })
}

export async function updateScenario(
  scenarioId: string,
  data: Partial<{
    title: string
    description: string
    persona: ScenarioPersona
    situation: string
    phases: ScenarioPhase[]
    rubric: RubricDimension[]
    completionCriteria: string
    published: boolean
  }>,
) {
  return prisma.interactiveScenario.update({
    where: { id: scenarioId },
    data,
  })
}

export async function listScenarios(filters?: {
  templateType?: ScenarioTemplateType
  courseId?: string
  published?: boolean
}) {
  const where: any = {}
  if (filters?.templateType) where.templateType = filters.templateType
  if (filters?.courseId) where.courseId = filters.courseId
  if (filters?.published !== undefined) where.published = filters.published

  return prisma.interactiveScenario.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { creator: { select: { name: true } } },
  })
}

export async function getScenario(scenarioId: string) {
  return prisma.interactiveScenario.findUnique({
    where: { id: scenarioId },
    include: { creator: { select: { name: true } } },
  })
}

export async function incrementTimesPlayed(scenarioId: string) {
  await prisma.interactiveScenario.update({
    where: { id: scenarioId },
    data: { timesPlayed: { increment: 1 } },
  })
}

/** Build the scenario-specific system prompt for Sandy as persona */
export function buildScenarioPrompt(scenario: {
  persona: any
  situation: string
  phases: any[]
  completionCriteria: string
}): string {
  const p = scenario.persona as ScenarioPersona
  const phases = scenario.phases as ScenarioPhase[]

  const phaseInstructions = phases.map((ph, i) => {
    let instruction = `Phase ${i + 1}: ${ph.name} — ${ph.objective}`
    if (ph.checkpoint?.required) {
      instruction += `\n  CHECKPOINT: ${ph.checkpoint.criteria}. Do not advance past this phase until the checkpoint is met. Steer back naturally if the student skips ahead.`
    }
    if (ph.maxDurationSecs) {
      instruction += `\n  Max duration: ${Math.floor(ph.maxDurationSecs / 60)} minutes`
    }
    return instruction
  }).join('\n\n')

  return `You are ${p.name}, a ${p.role}. Personality: ${p.personality}.
Voice: ${p.voice}.

SITUATION: ${scenario.situation}

PHASES (progress through these in order):
${phaseInstructions}

COMPLETION: ${scenario.completionCriteria}

RULES:
- Stay in character at all times
- Never break the fourth wall or mention that you are an AI
- Keep responses to 2-4 sentences to maintain conversational flow
- Track which phase the student is currently in
- When all phases are complete, say "SESSION_COMPLETE" at the end of your final response`
}
```

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/lib/audio/scenario-service.ts
git commit -m "feat(audio): add interactive scenario service — CRUD, prompt builder"
```

---

### Task 19: Scenario API Routes

**Files:**
- Create: `app/api/audio/scenarios/route.ts`
- Create: `app/api/audio/scenarios/[id]/route.ts`

- [ ] **Step 1: Create scenarios list + create route**

```typescript
// app/api/audio/scenarios/route.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../lib/server-auth'
import { withErrorHandling } from '../../../lib/api-utils'
import { listScenarios, createScenario } from '../../../lib/audio/scenario-service'

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const url = req.nextUrl
  const templateType = url.searchParams.get('type') as any
  const courseId = url.searchParams.get('courseId') ?? undefined
  const scenarios = await listScenarios({
    templateType: templateType ?? undefined,
    courseId,
    published: true,
  })
  return NextResponse.json({ scenarios })
})

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const scenario = await createScenario(auth.user.id, parsed.data as any)
  return NextResponse.json(scenario, { status: 201 })
})
```

- [ ] **Step 2: Create scenario detail + update route**

```typescript
// app/api/audio/scenarios/[id]/route.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireRequestUser, isAuthFailure, parseRequestBody } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { getScenario, updateScenario } from '../../../../lib/audio/scenario-service'

export const GET = withErrorHandling(async (req: NextRequest, ctx: any) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { id } = await ctx.params
  const scenario = await getScenario(id)
  if (!scenario) return NextResponse.json({ error: 'Scenario not found' }, { status: 404 })
  return NextResponse.json(scenario)
})

export const PATCH = withErrorHandling(async (req: NextRequest, ctx: any) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { id } = await ctx.params
  const parsed = await parseRequestBody(req)
  if ('error' in parsed) return parsed.error
  const scenario = await updateScenario(id, parsed.data as any)
  return NextResponse.json(scenario)
})
```

- [ ] **Step 3: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add app/api/audio/scenarios/
git commit -m "feat(audio): add interactive scenario API routes"
```

---

### Task 20: Scenario UI Components

**Files:**
- Create: `app/components/audio/scenarios/ScenarioCard.tsx`
- Create: `app/components/audio/scenarios/ScenarioBrowser.tsx`
- Create: `app/components/audio/scenarios/ScenarioLauncher.tsx`
- Create: `app/components/audio/scenarios/ScenarioBuilder.tsx`
- Create: `app/audio/scenarios/page.tsx`
- Create: `app/audio/scenarios/[id]/page.tsx`

- [ ] **Step 1: Create ScenarioCard**

```tsx
// app/components/audio/scenarios/ScenarioCard.tsx
'use client'

import { Users, Mic, Scale, Swords } from 'lucide-react'
import type { ScenarioTemplateType } from '../../../lib/audio/types'

const TEMPLATE_ICONS: Record<ScenarioTemplateType, any> = {
  clinical: Users,
  interview: Mic,
  debate: Swords,
  roleplay: Scale,
}

const TEMPLATE_COLORS: Record<ScenarioTemplateType, string> = {
  clinical: 'from-emerald-500 to-teal-600',
  interview: 'from-blue-500 to-indigo-600',
  debate: 'from-amber-500 to-orange-600',
  roleplay: 'from-purple-500 to-violet-600',
}

interface Props {
  scenario: {
    id: string
    templateType: string
    title: string
    description: string
    timesPlayed: number
    avgScore: number | null
    persona: any
  }
  onClick: (id: string) => void
}

export default function ScenarioCard({ scenario, onClick }: Props) {
  const type = scenario.templateType as ScenarioTemplateType
  const Icon = TEMPLATE_ICONS[type] ?? Users
  const gradient = TEMPLATE_COLORS[type] ?? 'from-gray-500 to-gray-600'

  return (
    <button
      type="button"
      onClick={() => onClick(scenario.id)}
      className="text-left bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow p-4"
    >
      <div className={`flex items-center justify-center size-12 bg-gradient-to-br ${gradient} rounded-xl text-white mb-3`}>
        <Icon className="size-5" />
      </div>
      <h3 className="font-extrabold text-sm text-gray-900 line-clamp-2">{scenario.title}</h3>
      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{scenario.description}</p>
      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
        <span className="capitalize">{type}</span>
        <span>{scenario.timesPlayed} plays</span>
        {scenario.avgScore !== null && <span>Avg: {scenario.avgScore.toFixed(1)}/10</span>}
      </div>
    </button>
  )
}
```

- [ ] **Step 2: Create ScenarioBrowser**

```tsx
// app/components/audio/scenarios/ScenarioBrowser.tsx
'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../../lib/auth-context'
import { apiFetch } from '../../../lib/api-client'
import ScenarioCard from './ScenarioCard'
import LoadingSpinner from '../../LoadingSpinner'
import ErrorBanner from '../../ErrorBanner'
import type { ScenarioTemplateType } from '../../../lib/audio/types'

const FILTERS: { id: ScenarioTemplateType | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'clinical', label: 'Clinical' },
  { id: 'interview', label: 'Interview' },
  { id: 'debate', label: 'Debate' },
  { id: 'roleplay', label: 'Role-Play' },
]

interface Props {
  onSelect: (id: string) => void
}

export default function ScenarioBrowser({ onSelect }: Props) {
  const { user } = useAuth()
  const [scenarios, setScenarios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    const controller = new AbortController()
    if (!user?.email) return
    const params = filter !== 'all' ? `?type=${filter}` : ''
    apiFetch(user.email, `/api/audio/scenarios${params}`, { signal: controller.signal })
      .then(data => setScenarios(data.scenarios))
      .catch(err => { if (err.name !== 'AbortError') setError(err.message) })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [user?.email, filter])

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {FILTERS.map(f => (
          <button
            key={f.id}
            type="button"
            onClick={() => { setFilter(f.id); setLoading(true) }}
            className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
              filter === f.id ? 'bg-[#0033A0] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner /> : error ? <ErrorBanner message={error} /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {scenarios.map(s => (
            <ScenarioCard key={s.id} scenario={s} onClick={onSelect} />
          ))}
          {!scenarios.length && <p className="text-gray-500 text-sm col-span-full text-center py-8">No scenarios yet.</p>}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create scenario browser page**

```tsx
// app/audio/scenarios/page.tsx
'use client'

import { useRouter } from 'next/navigation'
import { Users } from 'lucide-react'
import PageHeader from '../../components/PageHeader'
import ScenarioBrowser from '../../components/audio/scenarios/ScenarioBrowser'

export default function ScenariosPage() {
  const router = useRouter()
  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <PageHeader
        title="Interactive Scenarios"
        subtitle="Practice professional skills through AI-powered role-play"
        icon={Users}
      />
      <ScenarioBrowser onSelect={id => router.push(`/audio/scenarios/${id}`)} />
    </div>
  )
}
```

- [ ] **Step 4: Create scenario launcher page**

```tsx
// app/audio/scenarios/[id]/page.tsx
'use client'

import { useState, useEffect, use } from 'react'
import { useAuth } from '../../../lib/auth-context'
import { apiFetch } from '../../../lib/api-client'
import { Play, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import LoadingSpinner from '../../../components/LoadingSpinner'
import ErrorBanner from '../../../components/ErrorBanner'
import VoiceSessionPanel from '../../../components/audio/voice/VoiceSessionPanel'

export default function ScenarioLauncherPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user } = useAuth()
  const [scenario, setScenario] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    if (!user?.email) return
    apiFetch(user.email, `/api/audio/scenarios/${id}`, { signal: controller.signal })
      .then(setScenario)
      .catch(err => { if (err.name !== 'AbortError') setError(err.message) })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [user?.email, id])

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-12"><LoadingSpinner /></div>
  if (error) return <div className="max-w-4xl mx-auto px-4 py-12"><ErrorBanner message={error} /></div>
  if (!scenario) return null

  if (started) {
    return <VoiceSessionPanel />
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <Link href="/audio/scenarios" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="size-4" /> Back to scenarios
      </Link>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-4">
        <h1 className="font-extrabold text-xl text-gray-900">{scenario.title}</h1>
        <p className="text-sm text-gray-600">{scenario.description}</p>

        <div className="border-t border-gray-100 pt-4 space-y-2">
          <p className="text-xs text-gray-500">
            <span className="font-semibold">Character:</span> {(scenario.persona as any)?.name} — {(scenario.persona as any)?.role}
          </p>
          <p className="text-xs text-gray-500">
            <span className="font-semibold">Phases:</span> {(scenario.phases as any[])?.length ?? 0}
          </p>
          <p className="text-xs text-gray-500">
            <span className="font-semibold">Played:</span> {scenario.timesPlayed} times
          </p>
        </div>

        <button
          type="button"
          onClick={() => setStarted(true)}
          className="w-full flex items-center justify-center gap-2 py-3 bg-[#0033A0] text-white font-semibold rounded-xl hover:bg-[#002880] transition-colors"
        >
          <Play className="size-4" /> Launch Scenario
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add app/components/audio/scenarios/ app/audio/scenarios/
git commit -m "feat(audio): add interactive scenario UI — browser, cards, launcher pages"
```

---

## Phase 4: Sandy Tools, Analytics, Data Integration

### Task 21: Sandy Audio Tools (6 tools)

**Files:**
- Create: `app/lib/agent/tools/audio-tools.ts`
- Modify: `app/lib/agent/tool-registry.ts`

- [ ] **Step 1: Create audio tools module**

```typescript
// app/lib/agent/tools/audio-tools.ts
import type { ToolModule, AgentUser } from '../agent-types'
import { browseEpisodes, getForYouFeed } from '../../audio/audio-hub-service'
import { suggestVoiceTutoringMode } from '../../audio/voice-session-service'
import { listScenarios } from '../../audio/scenario-service'

export const audioTools: ToolModule = {
  tools: [
    {
      name: 'play_audio_episode',
      description: 'Find and play a podcast episode. Search by title, course, or topic. Returns episode details and a link to play.',
      category: 'audio' as const,
      permission: 'auto',
      reliability: 'navigation' as const,
      roles: ['STUDENT', 'EDUCATOR', 'ADMIN', 'STAFF', 'REGISTRAR'],
      input_schema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search term (title, topic, or course name)' },
        },
        required: ['query'],
      },
    },
    {
      name: 'generate_podcast',
      description: 'Trigger podcast generation from content. Navigates the user to the podcastify flow. Use when a user says "make a podcast", "podcastify this", or wants to turn reading into audio.',
      category: 'audio' as const,
      permission: 'auto',
      reliability: 'navigation' as const,
      roles: ['STUDENT', 'EDUCATOR', 'ADMIN', 'STAFF', 'REGISTRAR'],
      input_schema: {
        type: 'object',
        properties: {
          sourceText: { type: 'string', description: 'Optional source text to convert' },
        },
        required: [],
      },
    },
    {
      name: 'start_voice_tutoring',
      description: 'Launch a voice tutoring session with Sandy. 5 modes: socratic (probing questions), rehearsal (explain to Sandy), walkthrough (Sandy teaches step-by-step), assessment (timed oral quiz), scenario (interactive role-play). Use when a student says "quiz me verbally", "practice speaking", "oral assessment", etc.',
      category: 'audio' as const,
      permission: 'auto',
      reliability: 'navigation' as const,
      roles: ['STUDENT', 'EDUCATOR', 'ADMIN'],
      input_schema: {
        type: 'object',
        properties: {
          mode: { type: 'string', enum: ['socratic', 'rehearsal', 'walkthrough', 'assessment', 'scenario'], description: 'Tutoring mode' },
          topic: { type: 'string', description: 'Topic to study' },
          courseId: { type: 'string', description: 'Optional course context' },
        },
        required: [],
      },
    },
    {
      name: 'launch_scenario',
      description: 'Start an interactive scenario. Sandy plays a character (patient, interviewer, debate opponent, historical figure). Use when a user says "start a simulation", "practice interview", "debate practice", "ER triage", etc.',
      category: 'audio' as const,
      permission: 'auto',
      reliability: 'navigation' as const,
      roles: ['STUDENT', 'EDUCATOR', 'ADMIN'],
      input_schema: {
        type: 'object',
        properties: {
          scenarioId: { type: 'string', description: 'Specific scenario ID to launch' },
          templateType: { type: 'string', enum: ['clinical', 'interview', 'debate', 'roleplay'], description: 'Filter by template type' },
        },
        required: [],
      },
    },
    {
      name: 'get_audio_recommendations',
      description: 'Get personalized audio episode recommendations based on the student\'s courses, progress, and upcoming assessments. Use when a user asks "what should I listen to?" or wants audio suggestions.',
      category: 'audio' as const,
      permission: 'auto',
      roles: ['STUDENT', 'EDUCATOR', 'ADMIN', 'STAFF', 'REGISTRAR'],
      input_schema: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Max recommendations (default 5)' },
        },
        required: [],
      },
    },
    {
      name: 'suggest_voice_tutoring_mode',
      description: 'Recommend the best voice tutoring mode based on context (upcoming assessment, reading completion, quiz scores, new topic). Internal tool — called before suggesting a tutoring session.',
      category: 'audio' as const,
      permission: 'auto',
      roles: ['STUDENT', 'EDUCATOR', 'ADMIN'],
      input_schema: {
        type: 'object',
        properties: {
          courseId: { type: 'string', description: 'Course context for mode suggestion' },
          justFinishedReading: { type: 'boolean' },
          assessmentWithin3Days: { type: 'boolean' },
          lowQuizScores: { type: 'boolean' },
          newTopic: { type: 'boolean' },
        },
        required: [],
      },
    },
  ],

  handlers: {
    play_audio_episode: async (input: Record<string, unknown>) => {
      const query = (input.query as string) ?? ''
      const results = await browseEpisodes(query, undefined, 0, 3)
      if (results.episodes.length === 0) {
        return { message: 'No episodes found matching your search.', results: [] }
      }
      return {
        message: `Found ${results.episodes.length} episode(s). Navigate to play.`,
        results: results.episodes.map(ep => ({
          id: ep.id,
          title: ep.sourceName,
          duration: ep.durationSecs,
          url: `/audio/episode/${ep.id}`,
        })),
        navigateTo: `/audio/episode/${results.episodes[0].id}`,
      }
    },

    generate_podcast: async () => {
      return {
        message: 'Navigate to the Audio Hub to generate a podcast from your content.',
        navigateTo: '/audio',
      }
    },

    start_voice_tutoring: async (input: Record<string, unknown>) => {
      const mode = input.mode as string
      return {
        message: mode
          ? `Starting ${mode} voice tutoring session.`
          : 'Navigate to Audio Hub to start a voice tutoring session.',
        navigateTo: '/audio',
        action: { type: 'voice-tutoring', mode },
      }
    },

    launch_scenario: async (input: Record<string, unknown>) => {
      const scenarioId = input.scenarioId as string
      if (scenarioId) {
        return {
          message: 'Launching scenario.',
          navigateTo: `/audio/scenarios/${scenarioId}`,
        }
      }
      const templateType = input.templateType as string
      const scenarios = await listScenarios({
        templateType: templateType as any,
        published: true,
      })
      return {
        message: `Found ${scenarios.length} scenario(s).`,
        results: scenarios.slice(0, 3).map(s => ({
          id: s.id,
          title: s.title,
          type: s.templateType,
          url: `/audio/scenarios/${s.id}`,
        })),
        navigateTo: '/audio/scenarios',
      }
    },

    get_audio_recommendations: async (_input: Record<string, unknown>, user: AgentUser) => {
      const feed = await getForYouFeed(user.id)
      const recs = feed.recommended.slice(0, 5)
      return {
        message: recs.length
          ? `Here are ${recs.length} recommended episodes for you.`
          : 'No personalized recommendations yet. Browse the Audio Hub to discover content.',
        recommendations: recs.map(ep => ({
          title: ep.sourceName,
          duration: ep.durationSecs,
          url: `/audio/episode/${ep.id}`,
        })),
        navigateTo: '/audio',
      }
    },

    suggest_voice_tutoring_mode: async (input: Record<string, unknown>) => {
      const suggestion = suggestVoiceTutoringMode({
        justFinishedReading: input.justFinishedReading as boolean,
        assessmentWithin3Days: input.assessmentWithin3Days as boolean,
        lowQuizScores: input.lowQuizScores as boolean,
        newTopic: input.newTopic as boolean,
      })
      return suggestion
    },
  },
}
```

- [ ] **Step 2: Register audio tools in tool-registry.ts**

In `app/lib/agent/tool-registry.ts`, add the import and registration:

```typescript
// Add import after existing tool imports:
import { audioTools } from './tools/audio-tools'

// In the registry initialization (find where registerModule calls are):
registry.registerModule(audioTools)
```

- [ ] **Step 3: Add 'audio' to page category mappings**

In the `getPageRelevantCategories()` function in `tool-registry.ts`, the `/audio` mapping was added in Task 12. Verify it includes `'audio'` in its category set. Also add `'audio'` to the homepage (null = all categories, so it's already included).

- [ ] **Step 4: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add app/lib/agent/tools/audio-tools.ts app/lib/agent/tool-registry.ts
git commit -m "feat(audio): add 6 Sandy audio tools + register in tool registry"
```

---

### Task 22: Audio Analytics Service + API

**Files:**
- Create: `app/lib/audio/audio-analytics-service.ts`
- Create: `app/api/audio/analytics/[courseId]/route.ts`

- [ ] **Step 1: Create analytics service**

```typescript
// app/lib/audio/audio-analytics-service.ts
import { prisma } from '../prisma'

export interface AudioAnalytics {
  sessionsThisWeek: number
  sessionsTrend: number // percent change vs prior week
  avgSessionLength: number // seconds
  mostUsedMode: string | null
  checkpointMissRates: { checkpoint: string; missRate: number }[]
  scoreDistribution: { dimension: string; avg: number; min: number; max: number }[]
  podcastEngagement: {
    totalListens: number
    avgCompletionPct: number
    mostReplayedEpisode: { id: string; title: string; listenCount: number } | null
  }
}

export async function getAudioAnalytics(courseId: string): Promise<AudioAnalytics> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)

  // Voice sessions this week
  const [thisWeek, lastWeek] = await Promise.all([
    prisma.voiceSession.count({ where: { courseId, createdAt: { gte: weekAgo } } }),
    prisma.voiceSession.count({ where: { courseId, createdAt: { gte: twoWeeksAgo, lt: weekAgo } } }),
  ])
  const sessionsTrend = lastWeek > 0 ? ((thisWeek - lastWeek) / lastWeek) * 100 : 0

  // Average session length
  const sessions = await prisma.voiceSession.findMany({
    where: { courseId, status: 'completed', durationSecs: { not: null } },
    select: { durationSecs: true, type: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  const avgSessionLength = sessions.length
    ? sessions.reduce((sum, s) => sum + (s.durationSecs ?? 0), 0) / sessions.length
    : 0

  // Most used mode
  const modeCount: Record<string, number> = {}
  for (const s of sessions) {
    modeCount[s.type] = (modeCount[s.type] ?? 0) + 1
  }
  const mostUsedMode = Object.entries(modeCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  // Score distribution
  const scores = await prisma.voiceSessionScore.findMany({
    where: { session: { courseId } },
    select: { dimension: true, score: true },
  })
  const dimScores: Record<string, number[]> = {}
  for (const s of scores) {
    if (!dimScores[s.dimension]) dimScores[s.dimension] = []
    dimScores[s.dimension].push(s.score)
  }
  const scoreDistribution = Object.entries(dimScores).map(([dimension, vals]) => ({
    dimension,
    avg: vals.reduce((a, b) => a + b, 0) / vals.length,
    min: Math.min(...vals),
    max: Math.max(...vals),
  }))

  // Podcast engagement
  const episodes = await prisma.audioEpisode.findMany({
    where: { courseId, status: 'published' },
    select: { id: true, sourceName: true, listenCount: true },
    orderBy: { listenCount: 'desc' },
  })
  const totalListens = episodes.reduce((sum, ep) => sum + ep.listenCount, 0)
  const histories = await prisma.studentAudioHistory.findMany({
    where: { episode: { courseId } },
    select: { completedPct: true },
  })
  const avgCompletionPct = histories.length
    ? histories.reduce((sum, h) => sum + h.completedPct, 0) / histories.length
    : 0
  const mostReplayedEpisode = episodes[0]
    ? { id: episodes[0].id, title: episodes[0].sourceName, listenCount: episodes[0].listenCount }
    : null

  return {
    sessionsThisWeek: thisWeek,
    sessionsTrend,
    avgSessionLength,
    mostUsedMode,
    checkpointMissRates: [], // Populated when checkpoint data exists
    scoreDistribution,
    podcastEngagement: { totalListens, avgCompletionPct, mostReplayedEpisode },
  }
}
```

- [ ] **Step 2: Create analytics API route**

```typescript
// app/api/audio/analytics/[courseId]/route.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireEducatorUser, isAuthFailure } from '../../../../lib/server-auth'
import { withErrorHandling } from '../../../../lib/api-utils'
import { getAudioAnalytics } from '../../../../lib/audio/audio-analytics-service'

export const GET = withErrorHandling(async (req: NextRequest, ctx: any) => {
  const auth = await requireEducatorUser(req)
  if (isAuthFailure(auth)) return auth.response
  const { courseId } = await ctx.params
  const analytics = await getAudioAnalytics(courseId)
  return NextResponse.json(analytics)
})
```

- [ ] **Step 3: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add app/lib/audio/audio-analytics-service.ts app/api/audio/analytics/
git commit -m "feat(audio): add educator audio analytics service + API route"
```

---

### Task 23: Voice Session Replay Page

**Files:**
- Create: `app/audio/session/[id]/page.tsx`

- [ ] **Step 1: Create session replay page**

```tsx
// app/audio/session/[id]/page.tsx
'use client'

import { useState, useEffect, use } from 'react'
import { useAuth } from '../../../lib/auth-context'
import { apiFetch } from '../../../lib/api-client'
import { ArrowLeft, FileText } from 'lucide-react'
import Link from 'next/link'
import SessionReport from '../../../components/audio/voice/SessionReport'
import LiveTranscript from '../../../components/audio/voice/LiveTranscript'
import LoadingSpinner from '../../../components/LoadingSpinner'
import ErrorBanner from '../../../components/ErrorBanner'
import type { TranscriptEntry, ScoreDimension } from '../../../lib/audio/types'

export default function SessionReplayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user } = useAuth()
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    if (!user?.email) return
    apiFetch(user.email, `/api/audio/voice-session/${id}`, { signal: controller.signal })
      .then(setSession)
      .catch(err => { if (err.name !== 'AbortError') setError(err.message) })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [user?.email, id])

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-12"><LoadingSpinner /></div>
  if (error) return <div className="max-w-4xl mx-auto px-4 py-12"><ErrorBanner message={error} /></div>
  if (!session) return null

  const transcript = (session.transcript as TranscriptEntry[]) ?? []
  const scores: ScoreDimension[] = (session.scores ?? []).map((s: any) => ({
    dimension: s.dimension,
    score: s.score,
    weight: s.weight,
    evidence: s.evidence,
    feedback: s.feedback,
  }))

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <Link href="/audio" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="size-4" /> Back to Audio Hub
      </Link>

      <div className="flex items-center gap-2">
        <FileText className="size-5 text-[#0033A0]" />
        <h1 className="font-extrabold text-xl text-gray-900 capitalize">{session.type} Session</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transcript */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden" style={{ maxHeight: '500px' }}>
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-sm text-gray-700">Transcript</h3>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: '450px' }}>
            <LiveTranscript entries={transcript} isListening={false} />
          </div>
        </div>

        {/* Scores + Summary */}
        <SessionReport
          summary={session.summary}
          scores={scores}
          durationSecs={session.durationSecs}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/audio/session/
git commit -m "feat(audio): add voice session replay page"
```

---

### Task 24: Final Build Verification + Cleanup

**Files:**
- All files from Tasks 1–23

- [ ] **Step 1: Run full lint + type check**

```bash
cd the-sandbox && npm run lint && npx tsc --noEmit
```

Fix any lint errors or type issues found.

- [ ] **Step 2: Run build**

```bash
npm run build
```

Fix any build errors.

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix(audio): resolve build errors from Audio Experience Platform implementation"
```

---

## Deferred / Future Tasks (Not in This Plan)

These are spec requirements that need Phase 1-3 to be stable before implementation:

1. **Contextual Linking** — `useAudioContextLink` hook + `ContextualLinker` component (needs real playback integration)
2. **Educator Episode Builder** — `AudioEpisodeBuilder.tsx` (Tier 2 content sourcing, needs build page integration)
3. **Scenario Builder** — `ScenarioBuilder.tsx`, `PhaseEditor.tsx`, `RubricEditor.tsx` (educator authoring)
4. **Auto-generation pipeline** — Cron job for courses with content but no episodes (Tier 1)
5. **Post-session AI scoring** — Claude Haiku scoring pipeline for voice sessions
6. **CIL / Early Warning / Assessment integration** — Data forwarding to existing systems
7. **AudioFullPlayer.tsx** — Immersive full-content-area view (FULL player state)
8. **Dual-panel constraint** — Sandy left + Audio right, mutual exclusion below xl breakpoint
9. **Cover art generation** — Branded SVG/Canvas per episode
