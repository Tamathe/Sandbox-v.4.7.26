# Audio Experience Platform

Audio as a first-class learning modality. Hub, player, voice tutoring, interactive scenarios.

## Architecture

### Routes
- `/audio` — Audio Hub (5-tab: For You, Courses, Browse, Voice, Scenarios; URL-synced via `?tab=`)
- `/audio/episode/[id]` — Full episode player with transcript, chapters, bookmarks
- `/audio/session/[id]` — Voice session replay
- `/audio/scenarios` — Scenario browser
- `/audio/scenarios/[id]` — Scenario launcher

### Services (`app/lib/audio/`)
- `audio-hub-service.ts` — Feed curation, course grouping, browse, history, bookmarks
- `voice-session-service.ts` — Session CRUD, 5 mode prompts, smart suggestion
- `scenario-service.ts` — Scenario CRUD, prompt builder
- `audio-analytics-service.ts` — Educator dashboard analytics
- `types.ts` — All shared types
- `format.ts` — Shared formatting utilities

### API Routes (`app/api/audio/`)
- `hub/feed`, `hub/courses`, `hub/browse`, `hub/trending`
- `episode/[id]`, `history`, `history/[episodeId]`, `podcastify`
- `voice-session`, `voice-session/[id]`, `voice-session/[id]/score`, `voice-session/[id]/save`, `voice-session/[id]/next-steps`, `voice-session/suggest`
- `scenarios`, `scenarios/[id]`
- `analytics/[courseId]`

### Components (`app/components/audio/`)
- **Shell**: `AudioShell.tsx`, `AudioSidePanel.tsx`
- **Player**: `EpisodeHeader`, `AudioControls`, `TranscriptView`, `ChapterMarkers`, `BookmarkTimeline`, `SandyLauncher`, `GlobalMiniPlayer`, `PodcastifyFAB`, `PodcastifyModal`
- **Hub**: `hub/EpisodeCard`, `hub/ForYouFeed`, `hub/CourseEpisodeList`, `hub/BrowseGrid`, `hub/ContinueListening`, `hub/TrendingLane`, `hub/AudioWelcomeCard`
- **Voice**: `voice/VoiceModeSelector`, `voice/VoiceSessionPanel`, `voice/LiveTranscript`, `voice/SessionTimer`, `voice/SessionReport`, `voice/SessionNextSteps`
- **Scenarios**: `scenarios/ScenarioCard`, `scenarios/ScenarioBrowser`

### Hooks
- `useAudioPlayer` — Extended with `playerState` (idle/bar/panel/full), `currentEpisodeId`, `currentPositionMs`, `skipBack(ms)`, `skipForward(ms)`, MediaSession seek handlers
- `useVoiceSession` — Session lifecycle (select → active → paused → ending → report), `pauseSession()`, `resumeSession()`, paused-time-aware duration

### Sandy Integration
- 6 tools in `app/lib/agent/tools/audio-tools.ts`: `play_audio_episode`, `generate_podcast`, `start_voice_tutoring`, `launch_scenario`, `get_audio_recommendations`, `suggest_voice_tutoring_mode`
- Page descriptions + starters for all `/audio/*` routes

## Schema Models
- `AudioEpisode` — Extended with `segmentMap`, `tags`, `listenCount`, `tier`, `status`, `publishedAt`, `creatorId`, `visibility`
- `StudentAudioHistory` — Extended with `bookmarks`
- `VoiceSession` — Session type, transcript, summary, checkpoints, scores
- `VoiceSessionScore` — Rubric dimension scores
- `InteractiveScenario` — Template type, persona, phases, rubric

## Voice Tutoring Modes
1. **Socratic** — Probing questions to deepen understanding
2. **Rehearsal** — Student explains to Sandy (Feynman Technique)
3. **Walkthrough** — Sandy teaches step by step
4. **Assessment** — Timed oral quiz (5 questions, no feedback between)
5. **Scenario** — Role-play with AI persona

## Podcast Tiers
- **Tier 1 (Auto)**: System-generated from course content
- **Tier 2 (Educator)**: Faculty-created with builder
- **Tier 3 (Student)**: Student-triggered (3/day rate limit)

## Player States
`idle` → `bar` (mini player) → `panel` (side panel w-96) → `full` (immersive)

GlobalMiniPlayer renders on non-`/audio` pages when `playerState !== 'idle'`. AudioShell/AudioPlayerBar only render on `/audio` pages.

### Mobile UX (2026-04-04)
- **GlobalMiniPlayer** — 56px fixed bar on non-audio pages when audio playing; progress, play/pause, swipe-to-dismiss
- **MobileBottomSheet scroll lock** — drag disabled at 85%+ expanded; ChevronDown collapse button replaces grip handle
- **Skip controls** — SkipBack 15s / SkipForward 30s in AudioControls + MediaSession seek handlers
- **Speed presets** — Reordered [1, 1.25, 1.5, 2, 0.75, 0.5]; pill button style; Volume2 hidden on mobile
- **Voice pause** — `paused` phase with pause/resume; paused time excluded from duration
- **End confirmation** — Double-tap pattern (3s revert) instead of modal
- **5-tab Hub** — For You, Courses, Browse, Voice, Scenarios; URL-synced `?tab=`; scrollable tab bar on mobile
- **PodcastifyFAB** — FAB on Audio Hub; modal with text input, 10k char limit, rate-limit-aware errors
- **AudioWelcomeCard** — 3 onboarding tiles when zero listening history; auto-disappears
- **EpisodeCard** — Course label + "X min remaining" for in-progress episodes
- **Sandy mode suggestion** — GET `/api/audio/voice-session/suggest` (Haiku); CTA in VoiceModeSelector
- **Session next-steps** — POST `/api/audio/voice-session/[id]/next-steps` (Haiku); Try Again + Copy Summary
- **SessionTimer** — elapsed/max format, progress bar, 60s urgency (was 30s)

## Deferred (not yet built)
- Contextual linking (useAudioContextLink + ContextualLinker)
- Educator Episode Builder + Scenario Builder UI
- Auto-generation cron for Tier 1
- Post-session AI scoring pipeline
- CIL / Early Warning / Assessment data integration
- AudioFullPlayer (full immersive view)
- Cover art generation
