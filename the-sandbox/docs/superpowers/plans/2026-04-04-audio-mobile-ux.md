# Audio Mobile UX Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the Audio Hub's mobile experience across player controls, playback persistence, discoverability, and session intelligence.

**Architecture:** 4 independently deployable layers. Each layer is a separate commit. Layer 1 = pure component changes, Layer 2 = global mini-player architecture, Layer 3 = hub UI expansion, Layer 4 = Sandy-driven API routes + Haiku calls.

**Tech Stack:** Next.js 16, React 19, Tailwind v4, lucide-react icons, Anthropic Haiku for AI suggestions, existing `useAudioPlayer` + `useVoiceSession` hooks.

---

## File Structure

### New Files (7)
| File | Layer | Purpose |
|------|-------|---------|
| `app/components/audio/GlobalMiniPlayer.tsx` | 2 | Persistent mini-player bar on non-audio pages |
| `app/components/audio/PodcastifyFAB.tsx` | 3 | Floating action button for podcast creation on Audio Hub |
| `app/components/audio/PodcastifyModal.tsx` | 3 | Modal flow for Podcastify text input |
| `app/components/audio/hub/AudioWelcomeCard.tsx` | 3 | First-visit onboarding tiles |
| `app/components/audio/voice/SessionNextSteps.tsx` | 4 | Post-session Sandy recommendations |
| `app/api/audio/voice-session/[id]/next-steps/route.ts` | 4 | Next-steps API |
| `app/api/audio/voice-session/suggest/route.ts` | 4 | Sandy mode suggestion API |

### Modified Files (13)
| File | Layer | Change |
|------|-------|--------|
| `app/hooks/useAudioPlayer.ts` | 1 | Add `skipBack`, `skipForward`, MediaSession seek handlers |
| `app/components/audio/AudioControls.tsx` | 1 | Wire skip buttons, reorder speeds, mobile layout |
| `app/hooks/useVoiceSession.ts` | 1 | Add `paused` phase, `pauseSession`, `resumeSession` |
| `app/components/audio/voice/VoiceSessionPanel.tsx` | 1, 4 | Pause button, end confirmation, Sandy suggestion, SessionNextSteps |
| `app/components/audio/voice/VoiceModeSelector.tsx` | 4 | Sandy CTA + compact list restructure |
| `app/components/audio/voice/SessionTimer.tsx` | 4 | Elapsed/max format, progress bar, 60s urgency |
| `app/components/audio/MobileBottomSheet.tsx` | 2 | Scroll lock at expanded, collapse button |
| `app/audio/page.tsx` | 3 | 5 tabs, URL sync, scrollable tab bar |
| `app/components/audio/hub/ForYouFeed.tsx` | 3 | Render AudioWelcomeCard when history empty |
| `app/components/audio/hub/EpisodeCard.tsx` | 3 | Course label, time remaining |
| `app/components/ClientProviders.tsx` | 2 | Render GlobalMiniPlayer, conditional bottom padding |
| `app/lib/audio/types.ts` | 1 | Add `SessionPhase` type update |
| `app/lib/ai-literacy/student-onboarding-service.ts` | 3 | Add "Explore Audio" onboarding step content reference |

---

## Layer 1: Player Controls

### Task 1: Skip Controls in useAudioPlayer

**Files:**
- Modify: `app/hooks/useAudioPlayer.ts`

- [ ] **Step 1: Add skipBack and skipForward to the context value type**

In `app/hooks/useAudioPlayer.ts`, add to the `AudioPlayerContextValue` interface (after `addQuickBookmark`):

```typescript
  skipBack: (ms: number) => void
  skipForward: (ms: number) => void
```

- [ ] **Step 2: Implement skipBack and skipForward callbacks**

Add these two callbacks inside `AudioPlayerProvider`, after the `addQuickBookmark` callback (around line 374):

```typescript
  const skipBack = useCallback((ms: number) => {
    if (!speechAudioRef.current) return
    const secs = ms / 1000
    speechAudioRef.current.currentTime = Math.max(0, speechAudioRef.current.currentTime - secs)
  }, [])

  const skipForward = useCallback((ms: number) => {
    if (!speechAudioRef.current) return
    const secs = ms / 1000
    const duration = speechAudioRef.current.duration || 0
    speechAudioRef.current.currentTime = Math.min(duration, speechAudioRef.current.currentTime + secs)
  }, [])
```

- [ ] **Step 3: Wire into context value and useMemo deps**

Add `skipBack` and `skipForward` to the `value` object inside `useMemo` (line ~407), and add both to the dependency array.

- [ ] **Step 4: Add MediaSession seek handlers**

In the existing MediaSession `useEffect` (the one at ~line 338 that sets metadata), add after the `'stop'` handler:

```typescript
    navigator.mediaSession.setActionHandler('seekbackward', () => skipBack(15_000))
    navigator.mediaSession.setActionHandler('seekforward', () => skipForward(30_000))
```

Add `skipBack` and `skipForward` to the `useEffect` dependency array.

- [ ] **Step 5: Verify build**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 6: Commit**

```bash
git add app/hooks/useAudioPlayer.ts
git commit -m "feat: add skip back/forward to audio player with MediaSession seek handlers"
```

---

### Task 2: AudioControls Skip Buttons + Speed Reorder + Mobile Layout

**Files:**
- Modify: `app/components/audio/AudioControls.tsx`

- [ ] **Step 1: Rewrite AudioControls**

Replace the entire content of `app/components/audio/AudioControls.tsx`:

```tsx
'use client'

import { Play, Pause, SkipBack, SkipForward, Volume2 } from 'lucide-react'
import { useState } from 'react'
import { useAudioPlayer } from '../../hooks/useAudioPlayer'

const SPEEDS = [1, 1.25, 1.5, 2, 0.75, 0.5]

export default function AudioControls() {
  const { isPlaying, pause, resume, skipBack, skipForward } = useAudioPlayer()
  const [speedIdx, setSpeedIdx] = useState(0) // default 1x

  const cycleSpeed = () => {
    setSpeedIdx((speedIdx + 1) % SPEEDS.length)
  }

  return (
    <div className="flex items-center justify-center gap-4 py-3">
      <button
        type="button"
        onClick={() => skipBack(15_000)}
        className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
        aria-label="Skip back 15 seconds"
      >
        <SkipBack className="size-4" />
      </button>

      <button
        type="button"
        onClick={isPlaying ? pause : resume}
        className="p-3 bg-[#0033A0] text-white rounded-full hover:bg-[#002880] transition-colors"
      >
        {isPlaying ? <Pause className="size-5" /> : <Play className="size-5 ml-0.5" />}
      </button>

      <button
        type="button"
        onClick={() => skipForward(30_000)}
        className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
        aria-label="Skip forward 30 seconds"
      >
        <SkipForward className="size-4" />
      </button>

      <button
        type="button"
        onClick={cycleSpeed}
        className="text-xs font-semibold text-gray-500 hover:text-gray-700 px-2.5 py-1 rounded-full hover:bg-gray-100 border border-gray-200"
      >
        {SPEEDS[speedIdx]}x
      </button>

      <Volume2 className="size-4 text-gray-400 hidden lg:block" />
    </div>
  )
}
```

Key changes:
- `SPEEDS` reordered: `[1, 1.25, 1.5, 2, 0.75, 0.5]` — 2 taps to 1.5x
- Default `speedIdx` is `0` (1x is first now)
- SkipBack onClick calls `skipBack(15_000)`, SkipForward calls `skipForward(30_000)`
- Speed button styled as pill with border
- Volume2 icon hidden on mobile (`hidden lg:block`)
- Added `aria-label` to skip buttons

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add app/components/audio/AudioControls.tsx
git commit -m "feat: wire skip buttons, reorder speed presets, hide volume on mobile"
```

---

### Task 3: Voice Session Pause Phase

**Files:**
- Modify: `app/hooks/useVoiceSession.ts`

- [ ] **Step 1: Add paused phase and pause/resume functions**

Replace the full content of `app/hooks/useVoiceSession.ts`:

```typescript
'use client'

import { useState, useCallback, useRef } from 'react'
import { useAuth } from '../lib/auth-context'
import { apiFetch } from '../lib/api-client'
import type { VoiceTutoringMode, TranscriptEntry, ScoreDimension } from '../lib/audio/types'

type SessionPhase = 'select' | 'active' | 'paused' | 'ending' | 'report'

export function useVoiceSession() {
  const { currentUser } = useAuth()
  const [phase, setPhase] = useState<SessionPhase>('select')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [mode, setMode] = useState<VoiceTutoringMode | null>(null)
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([])
  const transcriptRef = useRef<TranscriptEntry[]>([])
  const [summary, setSummary] = useState<string | null>(null)
  const [scores, setScores] = useState<ScoreDimension[]>([])
  const [loading, setLoading] = useState(false)
  const startTimeRef = useRef<number>(0)
  const pausedElapsedRef = useRef<number>(0)
  const pausedAtRef = useRef<number>(0)

  const startSession = useCallback(async (
    selectedMode: VoiceTutoringMode,
    options?: { courseId?: string; topicTags?: string[]; scenarioId?: string },
  ) => {
    if (!currentUser?.email) return
    setLoading(true)
    try {
      const session = await apiFetch(currentUser.email, '/api/audio/voice-session', {
        method: 'POST',
        body: JSON.stringify({ type: selectedMode, ...options }),
      })
      setSessionId((session as { id: string }).id)
      setMode(selectedMode)
      setPhase('active')
      startTimeRef.current = Date.now()
      pausedElapsedRef.current = 0
    } finally {
      setLoading(false)
    }
  }, [currentUser?.email])

  const addTranscriptEntry = useCallback((entry: TranscriptEntry) => {
    setTranscript(prev => {
      const next = [...prev, entry]
      transcriptRef.current = next
      return next
    })
  }, [])

  const pauseSession = useCallback(() => {
    pausedAtRef.current = Date.now()
    setPhase('paused')
  }, [])

  const resumeSession = useCallback(() => {
    if (pausedAtRef.current > 0) {
      pausedElapsedRef.current += Date.now() - pausedAtRef.current
      pausedAtRef.current = 0
    }
    setPhase('active')
  }, [])

  const endSession = useCallback(async () => {
    if (!currentUser?.email || !sessionId) return
    setPhase('ending')
    // Account for any active pause
    let totalPaused = pausedElapsedRef.current
    if (pausedAtRef.current > 0) {
      totalPaused += Date.now() - pausedAtRef.current
    }
    const durationSecs = Math.floor((Date.now() - startTimeRef.current - totalPaused) / 1000)
    try {
      const result = await apiFetch(currentUser.email, `/api/audio/voice-session/${sessionId}`, {
        method: 'PATCH',
        body: JSON.stringify({ transcript: transcriptRef.current, status: 'completed', durationSecs }),
      })
      setSummary((result as { summary?: string }).summary ?? null)

      const scoreResult = await apiFetch(currentUser.email, `/api/audio/voice-session/${sessionId}/score`, {
        method: 'POST',
        body: JSON.stringify({ scores: [] }),
      })
      setScores((scoreResult as { scores?: ScoreDimension[] }).scores ?? [])
    } catch {
      // Session saved even if scoring fails
    } finally {
      setPhase('report')
    }
  }, [currentUser?.email, sessionId])

  const reset = useCallback(() => {
    setPhase('select')
    setSessionId(null)
    setMode(null)
    setTranscript([])
    setSummary(null)
    setScores([])
    pausedElapsedRef.current = 0
    pausedAtRef.current = 0
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
    pausedElapsed: pausedElapsedRef.current,
    startSession,
    addTranscriptEntry,
    pauseSession,
    resumeSession,
    endSession,
    reset,
  }
}
```

Key changes:
- `SessionPhase` now includes `'paused'`
- `pausedElapsedRef` tracks total ms spent paused
- `pausedAtRef` tracks when current pause started
- `pauseSession()` records pause start time, sets phase to `'paused'`
- `resumeSession()` accumulates paused duration, sets phase back to `'active'`
- `endSession()` subtracts total paused time from duration calculation
- `reset()` clears pause refs
- Returns `pausedElapsed`, `pauseSession`, `resumeSession`

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add app/hooks/useVoiceSession.ts
git commit -m "feat: add paused phase with pause/resume to voice session hook"
```

---

### Task 4: VoiceSessionPanel — Pause Button + End Confirmation

**Files:**
- Modify: `app/components/audio/voice/VoiceSessionPanel.tsx`

- [ ] **Step 1: Rewrite VoiceSessionPanel with pause + end confirmation**

Replace the full content of `app/components/audio/voice/VoiceSessionPanel.tsx`:

```tsx
'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Mic, Square, PauseCircle, PlayCircle } from 'lucide-react'
import { useVoiceSession } from '../../../hooks/useVoiceSession'
import VoiceModeSelector from './VoiceModeSelector'
import LiveTranscript from './LiveTranscript'
import SessionTimer from './SessionTimer'
import SessionReport from './SessionReport'
import type { VoiceTutoringMode } from '../../../lib/audio/types'

export default function VoiceSessionPanel() {
  const {
    phase, mode, transcript, summary, scores, loading, startedAt,
    startSession, endSession, pauseSession, resumeSession, reset,
  } = useVoiceSession()
  const [selectedMode, setSelectedMode] = useState<VoiceTutoringMode | null>(null)
  const [confirmPending, setConfirmPending] = useState(false)
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleEndClick = useCallback(() => {
    if (!confirmPending) {
      setConfirmPending(true)
      confirmTimerRef.current = setTimeout(() => setConfirmPending(false), 3000)
      return
    }
    // Second tap — actually end
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current)
    setConfirmPending(false)
    void endSession()
  }, [confirmPending, endSession])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current)
    }
  }, [])

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

  if (phase === 'active' || phase === 'paused' || phase === 'ending') {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Mic className="size-4 text-[#0033A0]" />
            <span className="font-semibold text-sm text-gray-900 capitalize">{mode}</span>
          </div>
          <SessionTimer startedAt={startedAt} />
        </div>

        {phase === 'paused' && (
          <div className="flex flex-col items-center justify-center py-8 bg-gray-50">
            <p className="text-lg font-extrabold text-gray-900 mb-3">Paused</p>
            <button
              type="button"
              onClick={resumeSession}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#0033A0] text-white font-semibold rounded-xl hover:bg-[#002880] transition-colors"
            >
              <PlayCircle className="size-4" />
              Resume
            </button>
          </div>
        )}

        <LiveTranscript entries={transcript} isListening={phase === 'active'} />

        <div className="px-4 py-3 border-t border-gray-100 flex justify-center gap-3">
          {phase === 'active' && (
            <button
              type="button"
              onClick={pauseSession}
              className="flex items-center gap-2 px-5 py-2.5 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:border-gray-300 transition-colors"
            >
              <PauseCircle className="size-4" />
              Pause
            </button>
          )}
          <button
            type="button"
            onClick={handleEndClick}
            disabled={phase === 'ending'}
            className={`flex items-center gap-2 px-6 py-2.5 font-semibold rounded-xl transition-colors disabled:opacity-50 ${
              confirmPending
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-red-500 text-white hover:bg-red-600'
            }`}
          >
            <Square className="size-4" />
            {phase === 'ending'
              ? 'Ending...'
              : confirmPending
                ? 'Tap again to end'
                : 'End Session'}
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

Key changes:
- Handles `'paused'` phase — shows "Paused" overlay with Resume button
- Pause button appears next to End Session during `'active'` phase
- Double-tap end confirmation: first tap → "Tap again to end" (3s revert), second tap → `endSession()`
- `confirmTimerRef` cleaned up on unmount

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add app/components/audio/voice/VoiceSessionPanel.tsx
git commit -m "feat: add pause button and double-tap end confirmation to voice sessions"
```

---

## Layer 2: Layout & Audio Persistence

### Task 5: GlobalMiniPlayer Component

**Files:**
- Create: `app/components/audio/GlobalMiniPlayer.tsx`

- [ ] **Step 1: Create GlobalMiniPlayer**

Create `app/components/audio/GlobalMiniPlayer.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Play, Pause } from 'lucide-react'
import { useAudioPlayer } from '../../hooks/useAudioPlayer'

export default function GlobalMiniPlayer() {
  const pathname = usePathname()
  const router = useRouter()
  const { playerState, isPlaying, persona, progressPct, pause, resume } = useAudioPlayer()
  const [collapsed, setCollapsed] = useState(false)

  const isAudioPage = pathname.startsWith('/audio')
  const show = playerState !== 'idle' && !isAudioPage && !collapsed

  if (!show) return null

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touch = e.changedTouches[0]
    const startY = (e.target as HTMLElement).dataset.touchStartY
    if (startY && touch.clientY - Number(startY) > 40) {
      setCollapsed(true)
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.currentTarget as HTMLElement
    target.dataset.touchStartY = String(e.touches[0].clientY)
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 bg-white/95 backdrop-blur border-t border-gray-200 shadow-lg"
      style={{ height: 56 }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Thin progress bar at top edge */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gray-200">
        <div
          className="h-full bg-[#0033A0] transition-[width] duration-500 ease-linear"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="flex items-center h-full px-4 gap-3">
        {/* Tap body → navigate to /audio */}
        <button
          type="button"
          onClick={() => router.push('/audio')}
          className="flex-1 min-w-0 text-left"
        >
          <p className="text-sm font-semibold text-gray-900 truncate">
            {persona?.toolName ?? 'Now Playing'}
          </p>
        </button>

        {/* Play/Pause */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            if (isPlaying) pause()
            else void resume()
          }}
          className="flex size-9 items-center justify-center rounded-full bg-[#0033A0] text-white"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause className="size-4" /> : <Play className="size-4 ml-0.5" />}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add app/components/audio/GlobalMiniPlayer.tsx
git commit -m "feat: create GlobalMiniPlayer bar for non-audio pages"
```

---

### Task 6: Wire GlobalMiniPlayer into ClientProviders + Page Spacing

**Files:**
- Modify: `app/components/ClientProviders.tsx`

- [ ] **Step 1: Import and render GlobalMiniPlayer**

In `app/components/ClientProviders.tsx`, add the import near the other audio imports (around line 19-22):

```typescript
import GlobalMiniPlayer from './audio/GlobalMiniPlayer'
```

Then render `<GlobalMiniPlayer />` inside the `AppShell` component, right after `<AudioPlayerBar />` (around line 795):

```tsx
      <AudioPlayerBar />
      <GlobalMiniPlayer />
```

- [ ] **Step 2: Add conditional bottom padding**

Inside the `AppShell` component, after the existing hooks at the top of the function, add:

```typescript
  const { playerState } = useAudioPlayer()
  const miniPlayerVisible = playerState !== 'idle' && !pathname.startsWith('/audio')
```

Note: `useAudioPlayer` is already available in scope (imported for other uses). `pathname` is already available from `usePathname()` which is already called in `AppShell`.

Then find the `<main>` tag that wraps the children content and add a conditional class:

```tsx
<main className={miniPlayerVisible ? 'pb-14' : ''}>
```

If the main tag already has classes, append the conditional. The exact location depends on how `AppShell` renders — look for where `{children}` is rendered inside `AudioShell`.

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add app/components/ClientProviders.tsx
git commit -m "feat: render GlobalMiniPlayer in root layout with conditional page spacing"
```

---

### Task 7: MobileBottomSheet Scroll Lock

**Files:**
- Modify: `app/components/audio/MobileBottomSheet.tsx`

- [ ] **Step 1: Rewrite MobileBottomSheet with scroll lock at expanded state**

Replace the full content of `app/components/audio/MobileBottomSheet.tsx`:

```tsx
'use client'

import { useState, useRef, useEffect, type ReactNode } from 'react'
import { GripHorizontal, ChevronDown } from 'lucide-react'

interface Props {
  children: ReactNode
  onClose: () => void
}

export default function MobileBottomSheet({ children, onClose }: Props) {
  const [sheetHeight, setSheetHeight] = useState(40)
  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null)
  const sheetRef = useRef<HTMLDivElement>(null)

  const isLocked = sheetHeight >= 85

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isLocked) return
    dragRef.current = { startY: e.touches[0].clientY, startHeight: sheetHeight }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragRef.current || isLocked) return
    const deltaY = dragRef.current.startY - e.touches[0].clientY
    const deltaPercent = (deltaY / window.innerHeight) * 100
    const next = Math.max(0, Math.min(95, dragRef.current.startHeight + deltaPercent))
    setSheetHeight(next)
  }

  const handleTouchEnd = () => {
    if (!dragRef.current || isLocked) return
    dragRef.current = null

    if (sheetHeight < 15) {
      onClose()
    } else if (sheetHeight < 60) {
      setSheetHeight(40)
    } else {
      setSheetHeight(90)
    }
  }

  useEffect(() => {
    const origOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = origOverflow
    }
  }, [])

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
        onClick={onClose}
      />

      <div
        ref={sheetRef}
        className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-2xl bg-white shadow-2xl lg:hidden"
        style={{
          height: `${sheetHeight}vh`,
          transition: dragRef.current ? 'none' : 'height 0.3s ease-out',
        }}
      >
        {/* Handle area — drag when not locked, collapse button when locked */}
        <div
          className="flex items-center justify-center py-3 touch-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {isLocked ? (
            <button
              type="button"
              onClick={() => setSheetHeight(40)}
              className="flex items-center gap-1 text-gray-400 hover:text-gray-600"
              aria-label="Collapse sheet"
            >
              <ChevronDown className="size-5" />
            </button>
          ) : (
            <GripHorizontal className="size-5 text-gray-300 cursor-grab active:cursor-grabbing" />
          )}
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-safe">
          {children}
        </div>
      </div>
    </>
  )
}
```

Key changes:
- `isLocked = sheetHeight >= 85` — when at 90% expanded
- When locked: drag handle touch events are disabled (early return in handlers)
- ChevronDown button replaces GripHorizontal, clicking it collapses to 40%
- Inner content gets full scroll control when locked

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add app/components/audio/MobileBottomSheet.tsx
git commit -m "feat: add scroll lock and collapse button at expanded state in bottom sheet"
```

---

## Layer 3: Hub & Discoverability

### Task 8: Five-Tab Audio Hub with URL Sync

**Files:**
- Modify: `app/audio/page.tsx`

- [ ] **Step 1: Rewrite the Audio Hub page**

Replace the full content of `app/audio/page.tsx`:

```tsx
'use client'

import { useState, useCallback, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { User, BookOpen, Compass, Mic, Users, Headphones } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import ForYouFeed from '../components/audio/hub/ForYouFeed'
import CourseEpisodeList from '../components/audio/hub/CourseEpisodeList'
import BrowseGrid from '../components/audio/hub/BrowseGrid'
import VoiceSessionPanel from '../components/audio/voice/VoiceSessionPanel'
import ScenarioBrowser from '../components/audio/scenarios/ScenarioBrowser'
import type { EpisodeCardData } from '../lib/audio/types'
import { useAudioPlayer } from '../hooks/useAudioPlayer'

const TABS = [
  { id: 'for-you', label: 'For You', icon: User },
  { id: 'courses', label: 'Courses', icon: BookOpen },
  { id: 'browse', label: 'Browse', icon: Compass },
  { id: 'voice', label: 'Voice', icon: Mic },
  { id: 'scenarios', label: 'Scenarios', icon: Users },
] as const

type TabId = (typeof TABS)[number]['id']

function isValidTab(value: string | null): value is TabId {
  return TABS.some(t => t.id === value)
}

function AudioHubContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialTab = searchParams.get('tab')
  const [tab, setTab] = useState<TabId>(isValidTab(initialTab) ? initialTab : 'for-you')
  const { activate } = useAudioPlayer()

  const handleTabChange = useCallback((id: TabId) => {
    setTab(id)
    router.replace(`/audio?tab=${id}`, { scroll: false })
  }, [router])

  const handlePlay = useCallback((episode: EpisodeCardData) => {
    if (!episode.cdnUrl) return
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

  const handleScenarioSelect = useCallback((id: string) => {
    router.push(`/audio/scenarios/${id}`)
  }, [router])

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <PageHeader
        title="Audio"
        subtitle="Listen, learn, and practice with AI-powered audio experiences"
      />

      {/* Scrollable tab bar */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto scrollbar-hide">
        {TABS.map(t => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => handleTabChange(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap min-w-fit ${
                active
                  ? 'border-[#0033A0] text-[#0033A0]'
                  : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
              }`}
            >
              <Icon className="size-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'for-you' && <ForYouFeed onPlay={handlePlay} />}
      {tab === 'courses' && <CourseEpisodeList onPlay={handlePlay} />}
      {tab === 'browse' && <BrowseGrid onPlay={handlePlay} />}
      {tab === 'voice' && <VoiceSessionPanel />}
      {tab === 'scenarios' && <ScenarioBrowser onSelect={handleScenarioSelect} />}
    </div>
  )
}

export default function AudioHubPage() {
  return (
    <Suspense fallback={null}>
      <AudioHubContent />
    </Suspense>
  )
}
```

Key changes:
- 5 tabs: For You, Courses, Browse, Voice, Scenarios
- `useSearchParams` for URL-synced tab state (`?tab=voice`)
- `router.replace` so no extra history entries
- `Suspense` wrapper required for `useSearchParams`
- Tab bar has `overflow-x-auto scrollbar-hide whitespace-nowrap min-w-fit`
- Voice tab renders `VoiceSessionPanel` directly
- Scenarios tab renders `ScenarioBrowser` with navigation handler
- `isValidTab` validates query param

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add app/audio/page.tsx
git commit -m "feat: expand Audio Hub to 5 tabs with URL sync and scrollable tab bar"
```

---

### Task 9: PodcastifyFAB + PodcastifyModal

**Files:**
- Create: `app/components/audio/PodcastifyFAB.tsx`
- Create: `app/components/audio/PodcastifyModal.tsx`

- [ ] **Step 1: Create PodcastifyModal**

Create `app/components/audio/PodcastifyModal.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import { apiFetch } from '../../lib/api-client'
import { useRouter } from 'next/navigation'

const MAX_CHARS = 10_000

interface Props {
  onClose: () => void
}

export default function PodcastifyModal({ onClose }: Props) {
  const { currentUser } = useAuth()
  const router = useRouter()
  const [sourceText, setSourceText] = useState('')
  const [title, setTitle] = useState('')
  const [generating, setGenerating] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const autoTitle = sourceText.trim().split('\n')[0]?.slice(0, 80) || ''

  const handleGenerate = async () => {
    if (!currentUser?.email || !sourceText.trim()) return
    setGenerating(true)
    setError(null)
    setStatus('Generating your podcast...')
    try {
      const result = await apiFetch(currentUser.email, '/api/audio/podcastify', {
        method: 'POST',
        body: JSON.stringify({
          sourceText: sourceText.trim(),
          sourceName: title || autoTitle || 'My Podcast',
          sourceType: 'text',
          voiceAId: 'alex-sam-default',
          voiceBId: 'alex-sam-default',
        }),
      }) as { status: string; episodeId?: string }

      if (result.status === 'CACHED' && result.episodeId) {
        router.push(`/audio/episode/${result.episodeId}`)
        onClose()
      }
      // PENDING — show spinner message (stays visible)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Generation failed'
      if (message.includes('429') || message.includes('rate')) {
        setError("You've used your 3 podcasts for today. Try again tomorrow.")
      } else {
        setError(message)
      }
      setStatus(null)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-extrabold text-lg text-gray-900">Turn notes into a podcast</h2>
          <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="size-5" />
          </button>
        </div>

        <div>
          <label htmlFor="podcast-title" className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input
            id="podcast-title"
            type="text"
            value={title || autoTitle}
            onChange={e => setTitle(e.target.value)}
            placeholder="Auto-generated from first line"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0033A0]/20 focus:border-[#0033A0]"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="podcast-source" className="text-sm font-medium text-gray-700">Source text</label>
            <span className={`text-xs ${sourceText.length > MAX_CHARS ? 'text-red-500' : 'text-gray-400'}`}>
              {sourceText.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}
            </span>
          </div>
          <textarea
            id="podcast-source"
            value={sourceText}
            onChange={e => setSourceText(e.target.value)}
            maxLength={MAX_CHARS}
            rows={8}
            placeholder="Paste or type your notes, lecture content, or study material..."
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#0033A0]/20 focus:border-[#0033A0]"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {status && (
          <div className="flex items-center gap-2 text-sm text-[#0033A0]">
            <Loader2 className="size-4 animate-spin" />
            {status}
          </div>
        )}

        <button
          type="button"
          onClick={handleGenerate}
          disabled={!sourceText.trim() || sourceText.length > MAX_CHARS || generating}
          className="w-full py-3 bg-[#0033A0] text-white font-semibold rounded-xl hover:bg-[#002880] transition-colors disabled:opacity-50"
        >
          {generating ? 'Generating...' : 'Generate'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create PodcastifyFAB**

Create `app/components/audio/PodcastifyFAB.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import PodcastifyModal from './PodcastifyModal'

export default function PodcastifyFAB() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-6 z-30 flex size-14 items-center justify-center rounded-full bg-[#0033A0] text-white shadow-lg hover:bg-[#002880] transition-colors"
        title="Create Podcast"
        aria-label="Create Podcast"
      >
        <Plus className="size-6" />
      </button>

      {open && <PodcastifyModal onClose={() => setOpen(false)} />}
    </>
  )
}
```

- [ ] **Step 3: Wire PodcastifyFAB into Audio Hub page**

In `app/audio/page.tsx`, add the import:

```typescript
import PodcastifyFAB from '../components/audio/PodcastifyFAB'
```

Then render `<PodcastifyFAB />` at the end of the `AudioHubContent` return, just before the closing `</div>`:

```tsx
      {tab === 'scenarios' && <ScenarioBrowser onSelect={handleScenarioSelect} />}

      <PodcastifyFAB />
    </div>
```

- [ ] **Step 4: Verify build**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 5: Commit**

```bash
git add app/components/audio/PodcastifyFAB.tsx app/components/audio/PodcastifyModal.tsx app/audio/page.tsx
git commit -m "feat: add Podcastify FAB and modal for podcast creation on Audio Hub"
```

---

### Task 10: AudioWelcomeCard + ForYouFeed Integration

**Files:**
- Create: `app/components/audio/hub/AudioWelcomeCard.tsx`
- Modify: `app/components/audio/hub/ForYouFeed.tsx`

- [ ] **Step 1: Create AudioWelcomeCard**

Create `app/components/audio/hub/AudioWelcomeCard.tsx`:

```tsx
'use client'

import { Headphones, Mic, Users } from 'lucide-react'

const TILES = [
  { icon: Headphones, label: 'Listen to lectures as podcasts', tab: 'browse' },
  { icon: Mic, label: 'Practice with voice tutoring', tab: 'voice' },
  { icon: Users, label: 'Try an interactive scenario', tab: 'scenarios' },
] as const

interface Props {
  onNavigateTab: (tab: string) => void
}

export default function AudioWelcomeCard({ onNavigateTab }: Props) {
  return (
    <section className="mb-6">
      <h2 className="font-extrabold text-lg text-gray-900 mb-3">Get Started with Audio</h2>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {TILES.map(tile => {
          const Icon = tile.icon
          return (
            <button
              key={tile.tab}
              type="button"
              onClick={() => onNavigateTab(tile.tab)}
              className="min-w-[180px] flex-shrink-0 flex flex-col items-center gap-3 p-5 bg-blue-50 border border-blue-100 rounded-2xl hover:bg-blue-100 transition-colors text-center"
            >
              <div className="flex size-12 items-center justify-center rounded-full bg-[#0033A0] text-white">
                <Icon className="size-5" />
              </div>
              <span className="text-sm font-semibold text-gray-900">{tile.label}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Wire AudioWelcomeCard into ForYouFeed**

In `app/components/audio/hub/ForYouFeed.tsx`, add the import:

```typescript
import AudioWelcomeCard from './AudioWelcomeCard'
```

Update the `Props` interface to include `onNavigateTab`:

```typescript
interface Props {
  onPlay: (episode: EpisodeCardData) => void
  onNavigateTab?: (tab: string) => void
}
```

Update the function signature:

```typescript
export default function ForYouFeed({ onPlay, onNavigateTab }: Props) {
```

Add the welcome card at the top of the return, right inside `<div className="space-y-8">`:

```tsx
  return (
    <div className="space-y-8">
      {feed.continueListening.length === 0 && onNavigateTab && (
        <AudioWelcomeCard onNavigateTab={onNavigateTab} />
      )}

      <ContinueListening episodes={feed.continueListening} onPlay={onPlay} />
```

- [ ] **Step 3: Pass onNavigateTab from AudioHubPage**

In `app/audio/page.tsx`, update the `ForYouFeed` rendering to pass `onNavigateTab`:

```tsx
      {tab === 'for-you' && <ForYouFeed onPlay={handlePlay} onNavigateTab={(t) => handleTabChange(t as TabId)} />}
```

- [ ] **Step 4: Verify build**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 5: Commit**

```bash
git add app/components/audio/hub/AudioWelcomeCard.tsx app/components/audio/hub/ForYouFeed.tsx app/audio/page.tsx
git commit -m "feat: add first-visit welcome card when no listening history"
```

---

### Task 11: EpisodeCard Enhancements — Course Label + Time Remaining

**Files:**
- Modify: `app/components/audio/hub/EpisodeCard.tsx`

- [ ] **Step 1: Add course label and time remaining**

In `app/components/audio/hub/EpisodeCard.tsx`, make two changes:

**After the `<h3>` title tag (line 33-35), add the course label:**

Replace:
```tsx
      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
        <Clock className="size-3" />
        <span>{formatDuration(episode.durationSecs)}</span>
```

With:
```tsx
      {episode.courseName && (
        <p className="text-xs text-gray-400 mt-0.5">{episode.courseName}</p>
      )}

      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
        <Clock className="size-3" />
        <span>
          {progress > 0 && progress < 100
            ? `${Math.ceil((episode.durationSecs * (1 - progress / 100)) / 60)} min remaining`
            : formatDuration(episode.durationSecs)}
        </span>
```

This shows:
- `courseName` as small gray text below the title (when present — field already exists in `EpisodeCardData`)
- "X min remaining" instead of raw duration when episode has partial progress

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add app/components/audio/hub/EpisodeCard.tsx
git commit -m "feat: add course label and time remaining to episode cards"
```

---

## Layer 4: Session Intelligence

### Task 12: Session Duration Display in SessionTimer

**Files:**
- Modify: `app/components/audio/voice/SessionTimer.tsx`

- [ ] **Step 1: Rewrite SessionTimer with progress bar and 60s urgency**

Replace the full content of `app/components/audio/voice/SessionTimer.tsx`:

```tsx
'use client'

import { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'

interface Props {
  startedAt: number
  maxSecs?: number
  onTimeout?: () => void
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
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

  const remaining = maxSecs ? maxSecs - elapsed : null
  const isUrgent = remaining !== null && remaining <= 60
  const progressPct = maxSecs ? Math.min(100, (elapsed / maxSecs) * 100) : null

  return (
    <div className="flex flex-col items-end gap-1">
      <div className={`flex items-center gap-1.5 text-xs font-mono ${isUrgent ? 'text-red-600' : 'text-gray-500'}`}>
        <Clock className="size-3" />
        <span>{formatTime(elapsed)}</span>
        {maxSecs && (
          <span className="text-gray-400">/ {formatTime(maxSecs)}</span>
        )}
      </div>
      {progressPct !== null && (
        <div className="w-20 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isUrgent ? 'bg-red-500' : 'bg-[#0033A0]'}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}
    </div>
  )
}
```

Key changes:
- `formatTime` helper for cleaner rendering
- Progress bar below timer when `maxSecs` is provided
- Red urgency at `<= 60s` remaining (was 30s)
- Format: `elapsed / max` (e.g., "4:32 / 15:00")

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add app/components/audio/voice/SessionTimer.tsx
git commit -m "feat: add progress bar and 60s urgency threshold to session timer"
```

---

### Task 13: Sandy Mode Suggestion API

**Files:**
- Create: `app/api/audio/voice-session/suggest/route.ts`

- [ ] **Step 1: Create the suggest API route**

Create `app/api/audio/voice-session/suggest/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../lib/api-utils'
import { requireRequestUser, isAuthFailure } from '../../../../lib/server-auth'
import { listVoiceSessions } from '../../../../lib/audio/voice-session-service'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const sessions = await listVoiceSessions(auth.user.id, 10)

  const sessionSummary = sessions.length
    ? sessions.map(s => `${s.type} (${s.status}, score: ${s.scores?.[0]?.score ?? 'N/A'})`).join('; ')
    : 'No prior sessions'

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    messages: [
      {
        role: 'user',
        content: `You are Sandy, an AI study assistant. Based on the student's recent voice tutoring sessions, suggest the best next mode.

Recent sessions: ${sessionSummary}

Available modes:
- socratic: Probing questions to deepen understanding
- rehearsal: Student explains a concept (Feynman Technique)
- walkthrough: Step-by-step guided teaching
- assessment: Timed oral quiz
- scenario: Professional role-play

Return JSON only: { "mode": "<mode_id>", "reason": "<one sentence why>" }`,
      },
    ],
  })

  try {
    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = text.match(/\{[^}]+\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return NextResponse.json(parsed)
    }
  } catch {
    // Fall through to default
  }

  return NextResponse.json({ mode: 'socratic', reason: 'Socratic dialogue is a great all-purpose study mode.' })
})
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add app/api/audio/voice-session/suggest/route.ts
git commit -m "feat: add Sandy-driven voice tutoring mode suggestion API"
```

---

### Task 14: VoiceModeSelector Restructure with Sandy CTA

**Files:**
- Modify: `app/components/audio/voice/VoiceModeSelector.tsx`

- [ ] **Step 1: Rewrite VoiceModeSelector with Sandy CTA + compact list**

Replace the full content of `app/components/audio/voice/VoiceModeSelector.tsx`:

```tsx
'use client'

import { MessageCircle, Mic, BookOpen, ClipboardCheck, Users, Sparkles } from 'lucide-react'
import type { VoiceTutoringMode } from '../../../lib/audio/types'

const MODES: { id: VoiceTutoringMode; label: string; description: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'socratic', label: 'Socratic Dialogue', description: 'Sandy asks probing questions to deepen understanding', icon: MessageCircle },
  { id: 'rehearsal', label: 'Verbal Rehearsal', description: 'Explain a concept as if teaching Sandy', icon: Mic },
  { id: 'walkthrough', label: 'Guided Walkthrough', description: 'Sandy walks you through a topic step by step', icon: BookOpen },
  { id: 'assessment', label: 'Oral Assessment', description: 'Timed verbal quiz with rubric scoring', icon: ClipboardCheck },
  { id: 'scenario', label: 'Interactive Scenario', description: 'Role-play a professional scenario', icon: Users },
]

interface Props {
  selected: VoiceTutoringMode | null
  onSelect: (mode: VoiceTutoringMode) => void
  suggestedMode?: { mode: VoiceTutoringMode; reason: string } | null
  suggestLoading?: boolean
}

export default function VoiceModeSelector({ selected, onSelect, suggestedMode, suggestLoading }: Props) {
  const suggestedModeData = suggestedMode ? MODES.find(m => m.id === suggestedMode.mode) : null

  return (
    <div className="space-y-4">
      {/* Sandy's recommendation CTA */}
      {suggestLoading && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 animate-pulse">
          <div className="h-4 bg-blue-200 rounded w-3/4 mb-2" />
          <div className="h-3 bg-blue-100 rounded w-1/2" />
        </div>
      )}

      {suggestedModeData && suggestedMode && !suggestLoading && (
        <button
          type="button"
          onClick={() => onSelect(suggestedMode.mode)}
          className={`w-full text-left p-5 rounded-2xl border-2 transition-all ${
            selected === suggestedMode.mode
              ? 'border-[#0033A0] bg-[#0033A0] text-white'
              : 'border-[#0033A0] bg-[#0033A0]/5 hover:bg-[#0033A0]/10'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className={`size-4 ${selected === suggestedMode.mode ? 'text-white' : 'text-[#0033A0]'}`} />
            <span className={`font-extrabold text-sm ${selected === suggestedMode.mode ? 'text-white' : 'text-[#0033A0]'}`}>
              Sandy Recommends: {suggestedModeData.label}
            </span>
          </div>
          <p className={`text-xs ${selected === suggestedMode.mode ? 'text-white/80' : 'text-gray-600'}`}>
            {suggestedMode.reason}
          </p>
          <p className={`text-xs font-semibold mt-2 ${selected === suggestedMode.mode ? 'text-white' : 'text-[#0033A0]'}`}>
            Start Recommended Session →
          </p>
        </button>
      )}

      {/* Mode list */}
      <div>
        <h3 className="font-extrabold text-base text-gray-900 mb-3">
          {suggestedMode ? 'Or choose a mode' : 'Choose a Mode'}
        </h3>
        <div className="space-y-2">
          {MODES.map(m => {
            const Icon = m.icon
            const isSelected = selected === m.id
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onSelect(m.id)}
                className={`w-full flex items-center gap-3 p-3 border-2 rounded-xl transition-all text-left ${
                  isSelected
                    ? 'border-[#0033A0] bg-[#0033A0]/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Icon className={`size-4 flex-shrink-0 ${isSelected ? 'text-[#0033A0]' : 'text-gray-500'}`} />
                <div className="min-w-0">
                  <span className={`font-semibold text-sm ${isSelected ? 'text-[#0033A0]' : 'text-gray-900'}`}>{m.label}</span>
                  <span className="text-xs text-gray-500 ml-2">{m.description}</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
```

Key changes:
- Sandy CTA: full-width button with UK Blue bg when selected, sparkles icon
- Skeleton loading state for CTA
- Modes rendered as compact single-column list (icon + label + description in one row)
- `suggestLoading` prop for loading state

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add app/components/audio/voice/VoiceModeSelector.tsx
git commit -m "feat: restructure VoiceModeSelector with Sandy CTA and compact list"
```

---

### Task 15: Wire Sandy Suggestion into VoiceSessionPanel

**Files:**
- Modify: `app/components/audio/voice/VoiceSessionPanel.tsx`

- [ ] **Step 1: Add suggestion fetch to VoiceSessionPanel select phase**

In `app/components/audio/voice/VoiceSessionPanel.tsx`, add imports at the top:

```typescript
import { useState, useRef, useCallback, useEffect } from 'react'
import { useAuth } from '../../../lib/auth-context'
import { apiFetch } from '../../../lib/api-client'
```

Add state and fetch inside the component (after the existing state declarations):

```typescript
  const { currentUser } = useAuth()
  const [suggestedMode, setSuggestedMode] = useState<{ mode: VoiceTutoringMode; reason: string } | null>(null)
  const [suggestLoading, setSuggestLoading] = useState(true)

  useEffect(() => {
    if (phase !== 'select' || !currentUser?.email) return
    const controller = new AbortController()
    setSuggestLoading(true)
    apiFetch(currentUser.email, '/api/audio/voice-session/suggest', { signal: controller.signal })
      .then(data => setSuggestedMode(data as { mode: VoiceTutoringMode; reason: string }))
      .catch(() => {}) // Degrade silently
      .finally(() => setSuggestLoading(false))
    return () => controller.abort()
  }, [phase, currentUser?.email])
```

Then update the `VoiceModeSelector` call to pass the new props:

```tsx
        <VoiceModeSelector
          selected={selectedMode}
          onSelect={setSelectedMode}
          suggestedMode={suggestedMode}
          suggestLoading={suggestLoading}
        />
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add app/components/audio/voice/VoiceSessionPanel.tsx
git commit -m "feat: fetch Sandy mode suggestion on voice session select phase"
```

---

### Task 16: Session Next-Steps API

**Files:**
- Create: `app/api/audio/voice-session/[id]/next-steps/route.ts`

- [ ] **Step 1: Create the next-steps API route**

Create the directory and file `app/api/audio/voice-session/[id]/next-steps/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../../lib/api-utils'
import { requireRequestUser, isAuthFailure } from '../../../../../lib/server-auth'
import { getVoiceSession } from '../../../../../lib/audio/voice-session-service'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

export const POST = withErrorHandling(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { id } = await params
  const session = await getVoiceSession(id)
  if (!session || session.userId !== auth.user.id) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  const scores = session.scores ?? []
  const scoresSummary = scores.length
    ? scores.map(s => `${s.dimension}: ${s.score}/10`).join(', ')
    : 'No scores available'

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [
      {
        role: 'user',
        content: `You are Sandy, an AI study assistant. A student just completed a ${session.type} voice tutoring session.

Scores: ${scoresSummary}
Summary: ${session.summary ?? 'No summary'}

Suggest what they should do next. Return JSON only:
{
  "suggestion": "<personalized 1-2 sentence suggestion>",
  "retryMode": "<recommended mode for retry: socratic|rehearsal|walkthrough|assessment|scenario>"
}`,
      },
    ],
  })

  try {
    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*?\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return NextResponse.json({
        suggestion: parsed.suggestion ?? '',
        relatedEpisodes: [],
        retryMode: parsed.retryMode ?? 'socratic',
      })
    }
  } catch {
    // Fall through to default
  }

  return NextResponse.json({
    suggestion: 'Great session! Try another mode to reinforce your learning.',
    relatedEpisodes: [],
    retryMode: 'socratic',
  })
})
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add app/api/audio/voice-session/[id]/next-steps/route.ts
git commit -m "feat: add Sandy-driven next-steps API for voice session reports"
```

---

### Task 17: SessionNextSteps Component + Wire into Report Phase

**Files:**
- Create: `app/components/audio/voice/SessionNextSteps.tsx`
- Modify: `app/components/audio/voice/VoiceSessionPanel.tsx`

- [ ] **Step 1: Create SessionNextSteps**

Create `app/components/audio/voice/SessionNextSteps.tsx`:

```tsx
'use client'

import { useState, useEffect } from 'react'
import { Sparkles, RotateCcw, Copy } from 'lucide-react'
import { useAuth } from '../../../lib/auth-context'
import { apiFetch } from '../../../lib/api-client'
import type { VoiceTutoringMode } from '../../../lib/audio/types'

interface NextStepsData {
  suggestion: string
  retryMode: VoiceTutoringMode
}

interface Props {
  sessionId: string
  summary: string | null
  onRetry: (mode: VoiceTutoringMode) => void
}

export default function SessionNextSteps({ sessionId, summary, onRetry }: Props) {
  const { currentUser } = useAuth()
  const [data, setData] = useState<NextStepsData | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!currentUser?.email || !sessionId) return
    const controller = new AbortController()
    apiFetch(currentUser.email, `/api/audio/voice-session/${sessionId}/next-steps`, {
      method: 'POST',
      signal: controller.signal,
    })
      .then(result => setData(result as NextStepsData))
      .catch(() => {}) // Degrade silently
    return () => controller.abort()
  }, [currentUser?.email, sessionId])

  const handleCopy = () => {
    if (!summary) return
    navigator.clipboard.writeText(summary).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="space-y-3">
      {data?.suggestion && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3">
          <Sparkles className="size-4 text-[#0033A0] flex-shrink-0 mt-0.5" />
          <p className="text-sm text-gray-800">{data.suggestion}</p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => onRetry(data?.retryMode ?? 'socratic')}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:border-gray-300 transition-colors text-sm"
        >
          <RotateCcw className="size-4" />
          Try Again
        </button>
        <button
          type="button"
          onClick={handleCopy}
          disabled={!summary}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:border-gray-300 transition-colors text-sm disabled:opacity-50"
        >
          <Copy className="size-4" />
          {copied ? 'Copied!' : 'Copy Summary'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Wire SessionNextSteps into VoiceSessionPanel report phase**

In `app/components/audio/voice/VoiceSessionPanel.tsx`, add the import:

```typescript
import SessionNextSteps from './SessionNextSteps'
```

In the report phase (the final `return` block), add `SessionNextSteps` between `SessionReport` and the "Start New Session" button:

```tsx
  // Report phase
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <SessionReport summary={summary} scores={scores} durationSecs={null} />
      {sessionId && (
        <SessionNextSteps
          sessionId={sessionId}
          summary={summary}
          onRetry={(retryMode) => {
            reset()
            setSelectedMode(retryMode)
          }}
        />
      )}
      <button
        type="button"
        onClick={reset}
        className="w-full py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:border-gray-300 transition-colors"
      >
        Start New Session
      </button>
    </div>
  )
```

The `onRetry` handler resets the session and pre-selects the suggested retry mode.

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add app/components/audio/voice/SessionNextSteps.tsx app/components/audio/voice/VoiceSessionPanel.tsx
git commit -m "feat: add Sandy next-steps recommendations to voice session reports"
```

---

### Task 18: Final Build Verification

- [ ] **Step 1: Full build check**

Run: `npm run lint && npx tsc --noEmit && npm run build`
Expected: All checks pass, build succeeds

- [ ] **Step 2: Commit any lint fixes if needed**

```bash
git add -A
git commit -m "chore: lint fixes for audio mobile UX overhaul"
```

---

## Deployment Order

1. **Layer 1** (Tasks 1-4) → deploy, verify player controls + pause + end confirmation
2. **Layer 2** (Tasks 5-7) → deploy, verify mini-player across routes + bottom sheet scroll lock
3. **Layer 3** (Tasks 8-11) → deploy, verify 5-tab hub + FAB + welcome card + episode enhancements
4. **Layer 4** (Tasks 12-17) → deploy, verify Sandy suggestions + next-steps + timer upgrades
