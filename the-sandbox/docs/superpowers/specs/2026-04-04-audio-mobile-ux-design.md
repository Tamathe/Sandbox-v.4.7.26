# Audio Mobile UX Overhaul

Architecture spec for improving the Audio Hub's mobile experience: discoverability, playback persistence, player controls, and session intelligence.

**Date:** 2026-04-04
**Approach:** Layered build — 4 independently deployable layers, ordered by risk (lowest first)

---

## Context

The Audio Hub (`/audio`) is architecturally sophisticated — synthesis pipeline, voice tutoring (5 modes), interactive scenarios, caching, and a Podcastify API. But a mobile UX audit revealed two systemic problems:

1. **Discoverability:** The highest-value mobile features (Voice Tutoring, Scenarios, Podcastify) are the hardest to find. Voice/Scenarios live at `/audio/scenarios` with no link from the hub. Podcastify has an API but zero UI.
2. **Persistence:** Audio keeps playing across SPA navigation (context provider wraps the app), but there's no visible player outside `/audio` pages. Students think they lost their audio.

This spec addresses 10 audit findings across 4 layers.

---

## Layer 1: Player Controls

Pure component changes. No architecture shifts, no new APIs.

### 1A. Skip Controls

**Files:** `app/hooks/useAudioPlayer.ts`, `app/components/audio/AudioControls.tsx`

Add `skipBack(ms)` and `skipForward(ms)` to `useAudioPlayer`:
- Seek `speechAudioRef.current.currentTime` by +/- N seconds
- Clamp to `[0, duration]`

Wire into AudioControls:
- SkipBack button → `skipBack(15_000)` (15 seconds)
- SkipForward button → `skipForward(30_000)` (30 seconds)
- On mobile (`< lg`): remove the `Volume2` icon (mobile users use hardware volume), layout becomes: `[Skip Back 15] [Play/Pause] [Skip Forward 30] [Speed]`
- On desktop: keep volume icon at end

### 1B. MediaSession Seek Handlers

**File:** `app/hooks/useAudioPlayer.ts` (lines 338-360)

Add to existing MediaSession `useEffect`:
```
navigator.mediaSession.setActionHandler('seekbackward', () => skipBack(15_000))
navigator.mediaSession.setActionHandler('seekforward', () => skipForward(30_000))
```

This enables skip controls on lock screen and bluetooth headsets.

### 1C. Speed Control Reorder

**File:** `app/components/audio/AudioControls.tsx`

Change speed array from `[0.5, 0.75, 1, 1.25, 1.5, 2]` to `[1, 1.25, 1.5, 2, 0.75, 0.5]`.

Most students speed up, not down. Current order requires 3 taps to reach 1.5x from 1x. New order: 2 taps. Display as a pill button showing current speed (e.g., `1.5x`).

### 1D. Voice Session Pause

**Files:** `app/hooks/useVoiceSession.ts`, `app/components/audio/voice/VoiceSessionPanel.tsx`

Add `'paused'` to `SessionPhase` type (`select | active | paused | ending | report`).

New functions in `useVoiceSession`:
- `pauseSession()` — sets phase to `'paused'`, records elapsed time offset
- `resumeSession()` — sets phase to `'active'`, adjusts `startTimeRef` by paused duration

VoiceSessionPanel changes:
- Add Pause button (`PauseCircle` icon) next to End Session during `'active'` phase
- When `phase === 'paused'`: overlay "Paused" text with Resume button, mic muted, timer frozen

### 1E. End Session Confirmation

**File:** `app/components/audio/voice/VoiceSessionPanel.tsx`

Double-tap confirmation pattern (not a modal — modals break immersion during live voice sessions):
- First tap: button text changes to "Tap again to end", starts 3-second revert timeout
- Second tap within 3s: calls `endSession()`
- No second tap: button reverts to "End Session"

Implemented with local state: `confirmPending: boolean` + `setTimeout`.

---

## Layer 2: Layout & Audio Persistence

Architectural change: adds a global UI component to the root layout.

### 2A. Global Mini-Player Bar

**New file:** `app/components/audio/GlobalMiniPlayer.tsx`
**Modified file:** Root layout (inside `ClientProviders`)

A fixed bar that shows when audio is playing and the user is NOT on an `/audio` page.

**Visibility logic:**
```
const pathname = usePathname()
const { playerState, isPlaying, persona } = useAudioPlayer()
const isAudioPage = pathname.startsWith('/audio')
const show = playerState !== 'idle' && !isAudioPage
```

**Layout:**
- Fixed position, full width, 56px height, `z-40`
- Positioned just above the mobile bottom nav bar
- Contents: thin progress bar at top edge, episode title (truncated), play/pause button
- Tap body → navigate to `/audio` (expand panel)
- Swipe down → collapse bar (hide it, but audio keeps playing). Student can find it again by navigating to `/audio`. Does NOT deactivate audio — stopping requires the play/pause button or navigating to the full player.

**Desktop:** Same bar, same position. AudioShell side panel only exists on `/audio` pages, so this fills the gap on all other routes.

### 2B. Bottom Sheet Scroll Lock

**File:** `app/components/audio/MobileBottomSheet.tsx`

When sheet is at 90% (expanded):
- Disable drag handle touch events (`onTouchStart/Move/End`)
- Add a "collapse" button (`ChevronDown` icon) in the handle area instead
- Full scroll control goes to the inner content (transcript)
- Prevents the scroll-fighting anti-pattern on touch devices

Detection: `sheetHeight >= 85` → switch to locked mode.

### 2C. Page Content Spacing

The platform has no dedicated mobile bottom nav bar — navigation is page-level. The GlobalMiniPlayer is the only fixed-bottom element on non-audio pages.

When GlobalMiniPlayer is visible, page content needs `pb-14` (56px) bottom padding so nothing is clipped behind the bar. Apply this in `ClientProviders` (or the root layout wrapper) conditionally when `playerState !== 'idle'` and `!isAudioPage`.

### 2D. AudioShell — No Changes

AudioShell stays as-is. It only renders on `/audio` pages. GlobalMiniPlayer only renders on non-`/audio` pages. They read from the same `useAudioPlayer` context but never coexist visually.

---

## Layer 3: Hub & Discoverability

UI-only changes to the Audio Hub page and feed. No new APIs.

### 3A. Five-Tab Hub

**File:** `app/audio/page.tsx`

Expand from 3 tabs to 5:

| Tab | ID | Icon | Component |
|-----|----|------|-----------|
| For You | `for-you` | `User` | `ForYouFeed` |
| Courses | `courses` | `BookOpen` | `CourseEpisodeList` |
| Browse | `browse` | `Compass` | `BrowseGrid` |
| Voice | `voice` | `Mic` | `VoiceSessionPanel` |
| Scenarios | `scenarios` | `Users` | `ScenarioBrowser` |

**Mobile tab overflow:** On `< sm`, tabs render as a horizontally scrollable row with `overflow-x-auto` and `scrollbar-hide`. Each tab gets `whitespace-nowrap min-w-fit`. Standard pattern for >4 mobile tabs.

**URL sync:** Tab state stored in query param (`?tab=voice`) via `useSearchParams` + `router.replace` (no history push). Direct linking and back-button work correctly.

### 3B. Podcastify FAB

**New file:** `app/components/audio/PodcastifyFAB.tsx`
**New file:** `app/components/audio/PodcastifyModal.tsx`

Floating action button on the Audio Hub:
- Fixed bottom-right, above mini-player bar / bottom nav
- Icon: `Plus` with tooltip "Create Podcast"
- Only visible on the Audio Hub page

**Modal flow on tap:**
1. Title: "Turn notes into a podcast"
2. Textarea: paste/type source text, max 10,000 chars with live character count
3. Title field: auto-generated from first line, editable
4. Single "Generate" button — auto-selects default voice pair (`alex-sam-default`), auto-calculates duration from text length
5. POST to `/api/audio/podcastify`
6. Response handling:
   - `PENDING` (202) → "Generating your podcast..." spinner state with message
   - `CACHED` → navigate to episode immediately
   - 429 → "You've used your 3 podcasts for today. Try again tomorrow."

No voice pair selection for students. Educators get this in a future builder UI.

### 3C. First-Visit Onboarding Card

**New file:** `app/components/audio/hub/AudioWelcomeCard.tsx`

Renders on the For You tab when `feed.continueListening` is empty (zero listening history).

Three tiles in a horizontal scrollable row:

| Tile | Icon | Label | Action |
|------|------|-------|--------|
| 1 | `Headphones` | "Listen to lectures as podcasts" | Switch to Browse tab |
| 2 | `Mic` | "Practice with voice tutoring" | Switch to Voice tab |
| 3 | `Users` | "Try an interactive scenario" | Switch to Scenarios tab |

**Dismissal:** Disappears automatically once `continueListening` has any entries. No separate dismissed flag — the data drives the UI.

**Platform onboarding:** Add an "Explore Audio" step to the AI Literacy onboarding flow in `student-onboarding-service.ts` — content addition only, with a deep link to `/audio`.

### 3D. Episode Card Enhancements

**File:** `app/components/audio/hub/EpisodeCard.tsx`

Two additions:
- **Course label:** Show `courseName` (small gray text) below the title when present. Field already exists in `EpisodeCardData`.
- **Time remaining:** For episodes with progress, show "X min remaining" instead of raw duration. Calculation: `Math.ceil((durationSecs * (1 - completedPct / 100)) / 60)`. All data already available.

---

## Layer 4: Session Intelligence

Sandy-driven features. Adds 2 new API routes and Haiku calls.

### 4A. Session Report "What's Next"

**New file:** `app/components/audio/voice/SessionNextSteps.tsx`
**New API route:** `app/api/audio/voice-session/[id]/next-steps/route.ts`

**API:**
- Auth: `requireStudentUser`
- Fetches session's mode, scores, transcript summary, and student's enrolled courses
- Calls Haiku with a prompt returning structured JSON:
  ```json
  {
    "suggestion": "You scored 5.2/10 on mitosis. Review the Chapter 5 podcast, then retry.",
    "relatedEpisodes": ["episode-id-1", "episode-id-2"],
    "retryMode": "socratic"
  }
  ```
- Uses `audio-hub-service.ts` to look up episodes by course + tags matching weak rubric dimensions
- Wrapped with `withErrorHandling`

**Component — `SessionNextSteps`:**
- Called from `VoiceSessionPanel` during `'report'` phase, rendered below `SessionReport`
- On mount: POST to `/api/audio/voice-session/{id}/next-steps`
- Layout:

| Row | Icon | Content | Action |
|-----|------|---------|--------|
| Sandy's suggestion | `Sparkles` | Dynamic text from API | Full-width, blue-50 bg, top row |
| Related episodes | `Headphones` | Up to 3 compact episode cards | Tap plays episode |
| Quick actions | `RotateCcw` + `Copy` | "Try Again" / "Copy Summary" | Re-launch same mode / clipboard |

**Fallback:** If API fails or returns no episodes, show only "Try Again" and "Copy Summary". No error state — degrade silently.

### 4B. Sandy-Driven Mode Suggestion

**New API route:** `app/api/audio/voice-session/suggest/route.ts`
**Modified files:** `VoiceSessionPanel.tsx`, `VoiceModeSelector.tsx`

**API:**
- Auth: `requireStudentUser`
- Query param: `courseId` (optional)
- Fetches student's recent voice session history + enrolled courses
- Calls Haiku → returns `{ mode: VoiceTutoringMode, reason: string }`
- Wrapped with `withErrorHandling`

**VoiceSessionPanel changes:**
- On mount during `'select'` phase, fetch from `GET /api/audio/voice-session/suggest`
- Pass result to `VoiceModeSelector` as `suggestedMode`

**VoiceModeSelector restructure:**
- **Top:** Sandy's recommendation as a large CTA — full-width button, UK Blue bg, showing mode icon + label + reason + "Start Recommended Session"
- **Below:** "Or choose a mode" label, then the 5 modes as a compact single-column list (icon + label + description in one row, not stacked cards)
- **Loading:** Skeleton for the CTA while suggestion loads; 5-mode list renders immediately (student can pick manually without waiting)

### 4C. Session Duration Display

**Modified files:** `app/hooks/useVoiceSession.ts`, `app/components/audio/voice/SessionTimer.tsx`

- `useVoiceSession`: store `maxDurationSecs` from the session creation API response
- `SessionTimer`: show `elapsed / max` format (e.g., "4:32 / 15:00")
- Add a thin progress bar below the timer
- Red urgency color at < 60s remaining (changed from 30s — more warning time)

---

## New Files Summary

| File | Layer | Purpose |
|------|-------|---------|
| `app/components/audio/GlobalMiniPlayer.tsx` | 2 | Persistent mini-player on non-audio pages |
| `app/components/audio/PodcastifyFAB.tsx` | 3 | Floating action button for podcast creation |
| `app/components/audio/PodcastifyModal.tsx` | 3 | Modal flow for Podcastify text input |
| `app/components/audio/hub/AudioWelcomeCard.tsx` | 3 | First-visit onboarding card |
| `app/components/audio/voice/SessionNextSteps.tsx` | 4 | Post-session Sandy recommendations |
| `app/api/audio/voice-session/[id]/next-steps/route.ts` | 4 | Next-steps API for session intelligence |
| `app/api/audio/voice-session/suggest/route.ts` | 4 | Sandy mode suggestion API |

## Modified Files Summary

| File | Layer | Change |
|------|-------|--------|
| `app/hooks/useAudioPlayer.ts` | 1, 2 | Add `skipBack`, `skipForward`, MediaSession seek handlers |
| `app/components/audio/AudioControls.tsx` | 1 | Wire skip buttons, reorder speeds, mobile layout |
| `app/hooks/useVoiceSession.ts` | 1, 4 | Add `paused` phase, `pauseSession`, `resumeSession`, `maxDurationSecs` |
| `app/components/audio/voice/VoiceSessionPanel.tsx` | 1, 4 | Pause button, end confirmation, Sandy suggestion fetch, SessionNextSteps |
| `app/components/audio/voice/VoiceModeSelector.tsx` | 4 | Sandy CTA + compact mode list restructure |
| `app/components/audio/voice/SessionTimer.tsx` | 4 | Elapsed/max format, progress bar, 60s urgency |
| `app/components/audio/voice/SessionReport.tsx` | 4 | No changes — SessionNextSteps renders alongside it |
| `app/components/audio/MobileBottomSheet.tsx` | 2 | Scroll lock at 90%, collapse button |
| `app/audio/page.tsx` | 3 | 5 tabs, URL sync, scrollable tab bar |
| `app/components/audio/hub/ForYouFeed.tsx` | 3 | Render AudioWelcomeCard when history empty |
| `app/components/audio/hub/EpisodeCard.tsx` | 3 | Course label, time remaining |
| Root layout / ClientProviders | 2 | Render GlobalMiniPlayer |
| `app/lib/ai-literacy/student-onboarding-service.ts` | 3 | Add "Explore Audio" onboarding step |

## Deployment Order

1. **Layer 1** → deploy, verify on production
2. **Layer 2** → deploy, verify mini-player across routes
3. **Layer 3** → deploy, verify hub tabs + FAB + onboarding
4. **Layer 4** → deploy, verify Sandy suggestions + next-steps

Each layer is a separate commit (or small PR). No layer depends on another — they can be deployed in any order, though the listed order is recommended for risk management.
