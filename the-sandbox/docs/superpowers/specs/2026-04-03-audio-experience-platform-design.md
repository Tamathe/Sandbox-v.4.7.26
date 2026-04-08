# Audio Experience Platform — Design Spec

**Date:** 2026-04-03
**Status:** Approved
**Scope:** Audio Hub, Split View Player, Three-Tier Podcasts, Voice Tutoring, Interactive Scenarios, Sandy Integration

---

## Problem

the platform has robust audio infrastructure — OpenAI TTS for Sandy, Azure Neural TTS for multi-voice podcasts, speech recognition, an async generation pipeline, and a global audio player. But there is no unified surface for students to discover, consume, and interact with audio content. Audio is a hidden capability, not a first-class experience.

Students learn differently. Some retain more from listening than reading. Some need to articulate concepts out loud to internalize them. Some learn best through simulated conversations. The platform has the building blocks but no cohesive audio experience that serves these learners.

## Solution

A four-phase **Audio Experience Platform** that unifies passive listening (podcasts), active voice tutoring (Sandy), and interactive audio scenarios into a single, discoverable surface with a persistent split-view player.

### What's In Scope

1. **Audio Hub** — Dedicated `/audio` page with three navigation tabs: For You (Sandy-curated), Courses, Browse
2. **Split View Player** — Three-state player (bar → side panel → full player) with live transcript, chapter markers, contextual linking to source material, and Sandy integration
3. **Three-Tier Content Sourcing** — Auto-generated (zero effort), educator-curated (intentional), student-triggered (personal study)
4. **Voice Tutoring Modes** — Five modes (Socratic Dialogue, Verbal Rehearsal, Guided Walkthrough, Oral Assessment, Interactive Scenario) with smart mode suggestion
5. **Interactive Audio Scenarios** — Four templatized scenario types (Clinical, Interview, Debate, Role-Play) with educator builder, checkpoint system, and rubric scoring
6. **Post-Session Feedback** — Three layers: transcript + AI summary, rubric scorecard, replay + annotation
7. **Sandy as Universal Launcher** — Six new Sandy tools for audio discovery, playback, tutoring, and scenario launch
8. **Data Integration** — Feeds into Classroom Intelligence Loop, Student Success Early Warning, and Assessment Reimagined

### What's Out of Scope

- Mobile-native audio app (web-only for now)
- AI-generated cover art (using branded SVG templates instead)
- Student voice recording storage by default (opt-in only, FERPA)
- Real-time collaborative listening (listen-along / watch party)
- Podcast RSS feed export

---

## Design

### 1. Audio Hub — Page Structure & Navigation

#### URL Structure

```
/audio                    → Hub home (For You feed)
/audio/courses            → Course-centric view
/audio/browse             → Topic/tag discovery
/audio/episode/[id]       → Full player view
/audio/session/[id]       → Voice session replay
/audio/scenarios          → Interactive scenario browser
/audio/scenarios/[id]     → Scenario launcher
```

#### Hub Layout

Three tabs serve three intents:

- **For You** — Sandy-curated personalized feed. Sections: Continue Listening (resume in-progress episodes), Sandy Recommends (contextual suggestions based on courses, progress, upcoming assessments), Trending on Campus (popular episodes across all students).
- **Courses** — Episodes grouped by the student's enrolled courses. Each course card shows episode count, total duration, and individual episode list. Educators see their created/auto-generated episodes here too.
- **Browse** — Topic/tag-based discovery across all courses and disciplines. Tag cloud navigation (Critical Thinking, Pharmacology, Interview Prep, Ethics, Research, etc.). Episode cards with cover art, duration, source course, and listen count.

#### Navigation Integration

- New "Audio" item in the main header nav (alongside Explore, Study, Build)
- Sandy awareness: "Take me to Audio" or "What should I listen to?" routes to the hub
- Quick-launch from any course page: "Listen" button generates/plays that course's episodes

---

### 2. Split View Player

#### Four-State System

The player exists in one of four states. Playback is continuous across all transitions — no interruption.

```
IDLE → BAR → PANEL → FULL
       ↕       ↕
      BAR ← PANEL ← FULL
```

- **IDLE** — Nothing playing. No player visible.
- **BAR** — Minimized bottom bar (enhances existing `AudioPlayerBar`). Full-width main content. Play/pause, progress bar, episode title, expand button.
- **PANEL** — Right side panel (`w-96`). Main content shrinks to accommodate. Live transcript, chapter markers, bookmarks, Sandy launcher, contextual linking.
- **FULL** — Takes over main content area. Immersive view with expanded transcript, chapter markers, bookmark timeline, and all controls.

#### AudioShell — Layout Integration

```
RootLayout
├── Header
├── AudioShell                          ← new layout wrapper
│   ├── MainContent (flex-1, shrinks when panel open)
│   │   └── {children}                  ← all existing pages
│   └── AudioSidePanel (w-96, conditional)
├── AudioPlayerBar (fixed bottom, conditional)
├── SandyConcierge (left panel, unchanged)
```

**Dual-panel constraint:** Sandy is left, Audio is right. Both can be open simultaneously on `xl` screens (1280px+). Below `xl`, only one panel at a time — Audio takes priority if playing, Sandy slides to overlay mode.

#### Panel Contents (PANEL state)

- **Episode Header** — Cover art (branded SVG template), title, source course, duration
- **Transport Controls** — Skip back 15s, play/pause, skip forward 15s, speed (0.5x–2x), volume
- **Live Transcript** — Auto-scrolling text. Current sentence highlighted in brand color. Clickable sentences to jump to that timestamp.
- **Chapter Markers** — Clickable list of chapters with timestamps. Current chapter indicated. Generated alongside the podcast script by Claude.
- **Sandy Launcher** — "Ask Sandy About This" button. Opens Sandy pre-loaded with episode context, current timestamp, and current segment topic.
- **Bookmarks** — Student can bookmark moments with optional notes. Bookmarks appear as markers on the progress bar and in a collapsible list.
- **Expand/Collapse** — Toggle between PANEL and FULL states. Collapse to BAR.

#### Contextual Linking

The audio panel knows what's on the main screen and links to it in real-time.

**1. Segment Map (generated at podcast creation time):**

Stored on `AudioEpisode` as JSON. Generated by Claude alongside the podcast script.

```json
{
  "segments": [
    {
      "startMs": 0,
      "endMs": 45000,
      "sourceAnchor": "chapter-3-section-1",
      "sourceText": "Cell division is the process by which...",
      "topic": "Introduction to Cell Division"
    }
  ]
}
```

**2. Page Registration (runtime):**

Pages that support contextual linking register anchors via a hook:

```tsx
useAudioContextLink({
  anchors: [
    { id: "chapter-3-section-1", ref: sectionRef },
    { id: "chapter-3-section-2", ref: sectionRef2 }
  ]
})
```

**3. Sync Behavior:**

- Audio timestamp → lookup current segment → find matching anchor on page
- **Match found:** Subtle highlight pulse on the relevant passage + smooth scroll into view
- **No match (student navigated away):** Panel shows "Jump to source" link. No forced navigation.

**4. Phase 1 pages with linking support:**

- Course reading/content pages
- Syllabus view
- Tool output pages

#### Cover Art

Branded SVG/Canvas template per episode. Sandbox gradient background + course icon + episode number + title. Not AI image generation — lightweight and on-brand.

---

### 3. Three-Tier Content Sourcing

#### Tier 1: Auto-Generated (zero educator effort)

**Trigger points:**
- Educator uploads a syllabus → system parses sections → generates one episode per major topic
- Educator creates/updates course content → episode auto-generated or flagged for refresh
- Cron job checks for courses with content but no episodes → backfills

**Pipeline (leverages existing infrastructure):**

```
Source Content → normalizeSource() → contentHash()
  → Cache check (existing AudioEpisode with matching hash?)
    → HIT: serve existing
    → MISS: Enqueue AudioGenerationJob
      → Claude Haiku generates 2-host script + segment map
      → Azure TTS renders multi-voice MP3
      → Upload to Azure Blob → CDN URL
      → Create AudioEpisode + AudioRender
```

**Auto-generation rules:**
- Default duration: 15 minutes per episode
- Default voice pair: Alex & Sam
- Episodes tagged with course, topic, and auto-detected Bloom's level
- Status: `DRAFT` until educator approves or 48h passes (then auto-publishes)
- Educator notified: "3 new episodes generated for Bio 101. Review & publish?"

#### Tier 2: Educator-Curated (intentional creation)

New "Audio Episode" option in the Build page. Educator workflow:

1. Select source material (paste text, upload PDF, or select from course content)
2. Choose format: Two-Host Discussion (default), Lecture Summary, Q&A Breakdown, Debate (pro/con), Case Study Walkthrough
3. Set duration (5/15/30 min or full) and voice pair
4. Optionally add audience focus notes and discussion prompts (fed to Claude as context)
5. Preview the generated script (can edit before synthesis)
6. Generate → same pipeline as Tier 1
7. Published immediately (educator chose to create it)

#### Tier 3: Student-Triggered (personal study)

**Entry points — "Podcastify" button appears on:**
- Course reading pages
- Tool outputs
- Study page ("Generate a review episode for this week's material")
- Highlighted text (context menu)

**Student flow:**
1. Click "Podcastify" → brief modal: duration + voice pair (sensible defaults)
2. Job enqueued → progress indicator
3. Episode appears in "My Episodes" section of the hub
4. Private by default. Option to share to course or campus.

**Cost guardrails:**
- Rate limit: 3 student-generated episodes per day
- Max source text: 10,000 characters per episode
- Cache-first: if same source already generated, serve cached version

#### Content Lifecycle

```
DRAFT → PUBLISHED → STALE → REFRESHED
                      ↑
              (source content updated)
```

- `DRAFT`: Auto-generated, awaiting educator review (or 48h auto-publish)
- `PUBLISHED`: Live in the hub
- `STALE`: Source content changed since generation. Flagged with "Updated content available — regenerate?"
- `REFRESHED`: New episode from updated source, old version archived

---

### 4. Voice Tutoring Modes

#### Five Modes, One Sandy

Each mode is a **persona overlay** on Sandy's existing agent — not a separate system. Mode-specific system prompts are injected, Sandy's core capabilities remain.

**1. Socratic Dialogue**
- Sandy asks probing questions, escalates difficulty based on responses
- System prompt: "You are a Socratic tutor. Never give answers directly. Ask one question at a time. Increase complexity when the student demonstrates understanding."
- Session length: Open-ended
- Scoring: Depth of reasoning, conceptual accuracy, progression

**2. Verbal Rehearsal (Feynman Technique)**
- Student explains a concept as if teaching Sandy
- Sandy plays a confused but eager learner, asking clarifying questions that expose gaps
- System prompt: "You are a curious student who doesn't understand the topic. Ask clarifying questions. Be encouraging but persistent."
- Scoring: Completeness, clarity, accuracy, use of examples

**3. Guided Walkthrough**
- Sandy narrates through a concept step-by-step, pausing after each: "Does that make sense?"
- Student responds yes (continue), no (re-explain with different analogy), or asks a question
- System prompt: "Walk through this topic step by step. After each concept, pause and check understanding."
- Scoring: None (passive learning mode)

**4. Oral Assessment**
- Timed responses (configurable: 30s, 60s, 90s per question)
- Sandy asks N questions, does not help or hint
- Visual timer in the audio panel
- System prompt: "Ask exactly {N} questions. Wait for answer. Say only 'Thank you, next question' until done."
- Scoring: Rubric-based (accuracy, completeness, specificity)

**5. Interactive Scenario**
- Routes to the scenario system (see Section 5)

#### Smart Mode Suggestion

Sandy uses context signals to recommend a mode before the session starts:

| Signal | Suggested Mode |
|--------|---------------|
| Just finished reading | Verbal Rehearsal |
| Assessment within 3 days | Oral Assessment |
| Low quiz scores on topic | Socratic Dialogue |
| New topic, no prior engagement | Guided Walkthrough |
| Student explicitly asks | Whatever they want |

Logic lives as a Sandy tool: `suggestVoiceTutoringMode({ courseId, topicId, studentId })` → returns ranked modes with reasoning.

#### Session Flow

```
Student triggers voice tutoring
  → Sandy suggests mode (student can override)
  → Mode-specific system prompt injected
  → Full voice loop: Sandy speaks (TTS) ↔ Student speaks (STT)
  → Session ends (student says "done" / timer expires / completion detected)
  → Post-session: Transcript saved, AI summary generated, rubric scored
  → Results appear in Audio Hub → "My Sessions"
  → Data forwarded to CIL + Early Warning
```

#### Voice Session UI (in Split Panel)

During a voice session, the split panel shows:
- Mode indicator and topic
- Session duration timer
- Live transcript (both speakers, real-time)
- Listening indicator ("Listening..." with waveform)
- Press-to-talk button and continuous mode toggle
- End Session button

---

### 5. Interactive Audio Scenarios

#### Template System

Four scenario templates. Each is a configuration schema that educators fill out — Sandy handles execution dynamically.

```
ScenarioTemplate
├── templateType: "clinical" | "interview" | "debate" | "roleplay"
├── persona: { name, role, voice, personality traits }
├── situation: string (setup Sandy reads to start)
├── phases: Phase[]
│   ├── name: "Patient History"
│   ├── objective: "Student should ask about medications"
│   ├── checkpoint: { required: true, criteria: "asked about current meds" }
│   └── maxDurationSecs: 180
├── rubric: RubricDimension[]
│   ├── name: "Clinical Reasoning"
│   ├── weight: 0.3
│   └── descriptors: { 1: "...", 5: "...", 10: "..." }
└── completionCriteria: "all phases addressed" | "time limit" | "student ends"
```

#### The Four Templates

**1. Clinical Simulation** — Sandy plays the patient. Phases: Intake → History → Physical Assessment → Diagnosis → Treatment Plan. Ties into Virtual Clinic where applicable.

**2. Interview / Professional Prep** — Sandy plays the interviewer. Phases: Introduction → Behavioral Questions → Technical/Situational → Student Questions → Closing.

**3. Debate / Argumentation** — Sandy takes the opposing position. Phases: Opening Statement → First Rebuttal → Cross-Examination → Closing Argument.

**4. Historical / Scenario Role-Play** — Sandy plays a character (historical figure, domain expert). Phases: Context Setting → Guided Interaction → Key Decision Point → Reflection.

#### Scenario Builder

New builder type — "Interactive Scenario" in the Build page:
- Select template type
- Configure persona (name, role, voice, personality description)
- Write situation setup text
- Define phases with optional checkpoints per phase
- Configure scoring rubric with dimensions and weights
- Preview scenario → Publish

#### Checkpoint Enforcement

Checkpoints are **soft gates**, not hard blocks. Sandy steers naturally, not mechanically:
- Sandy's system prompt includes checkpoint awareness: "Do not reveal diagnosis until the student asks about current medications. If they skip ahead, steer back naturally."
- Post-session, Claude evaluates whether each checkpoint was met and factors it into rubric scoring
- Educators see which checkpoints students commonly miss → feeds into CIL insight cards

#### Scenario Execution Flow

```
Student launches scenario (Hub or Sandy)
  → Sandy reads situation aloud
  → Voice loop begins, phase 1 active
  → Sandy responds dynamically as persona
  → Checkpoint monitor tracks progress
  → All phases complete OR time limit → Session ends
  → Post-session: transcript, rubric scoring, summary
  → Results in Hub + Assessment Reimagined
```

---

### 6. Post-Session Feedback

Three layers, progressively richer:

#### Layer 1: Transcript + AI Summary (always generated)
- Full text transcript of every voice session
- Claude generates 3-5 sentence summary: what went well, what was missed, one actionable suggestion
- Available immediately after session ends

#### Layer 2: Rubric Scorecard (when educator configures rubric)
- Dimensions + weights from scenario template or tutoring mode config
- Claude scores each dimension 1-10 with evidence quotes from transcript
- Composite score from weights

#### Layer 3: Replay + Annotation (opt-in save)
- Default: transcript saved, audio discarded (privacy + cost)
- Student clicks "Save Session" → TTS chunks cached, timestamped annotations generated
- Replay re-synthesizes Sandy's voice from transcript, overlays annotations
- Annotations are Claude-generated: "Strong answer," "Missed opportunity," "Good follow-up"

#### Storage Model

- **Podcasts:** Stored on Azure Blob CDN. Reusable across students. Persistent.
- **Voice sessions:** Transcript always saved. Audio ephemeral by default. Opt-in "Save Session" triggers audio storage.
- **Privacy:** Student voice recordings never stored (only STT text). FERPA-safe.

---

### 7. Sandy as Universal Audio Launcher

#### Six New Sandy Tools

| Tool | Description | Example Trigger |
|---|---|---|
| `playAudioEpisode` | Find and play a podcast episode | "Play the Bio 101 episode about mitosis" |
| `generatePodcast` | Trigger podcast generation from content | "Make a podcast from this reading" |
| `startVoiceTutoring` | Launch voice tutoring with mode | "Quiz me verbally on Chapter 3" |
| `launchScenario` | Start an interactive scenario | "Start the ER triage simulation" |
| `getAudioRecommendations` | Personalized episode suggestions | "What should I listen to?" |
| `suggestVoiceTutoringMode` | Context-based mode recommendation | (internal — called before suggesting) |

#### Sandy's Audio Awareness

`SandyAmbientContext` gains new state signals:

```
audioState: {
  isPlaying: boolean
  currentEpisode: { id, title, courseId, topicTags } | null
  currentTimestampMs: number
  currentSegment: { topic, sourceText } | null
  activeVoiceSession: { type, mode, scenarioId } | null
}
```

Sandy always knows whether audio is playing, what topic is being discussed, and whether a voice session is active. Questions mid-listen are automatically scoped to the audio context.

#### Mode Transitions

Sandy handles seamless transitions between modes:

```
Browsing Audio Hub
  → "Play this" → Listening (passive)
  → "I don't get this" → Tutoring (active)
  → "Let me try the scenario" → Scenario (interactive)
  → Session ends → Review (feedback)
  → "Resume the podcast" → Listening (passive)
```

Each transition preserves state — playback position, panel contents, conversation context.

---

### 8. Data Integration

#### Classroom Intelligence Loop
- Voice session completion rates and scores → concept difficulty signals
- Commonly missed checkpoints → insight cards for educators
- Mode usage patterns → teaching strategy suggestions

#### Student Success Early Warning
- Voice engagement frequency as positive signal
- Declining session scores as warning signal
- Abandoned sessions tracked

#### Assessment Reimagined
- Voice session scores contribute to competency portfolio
- Scenario completions count as authentic assessment evidence
- Rubric scores map to mastery gate progress

#### Educator Analytics Dashboard

Available at `/audio` for EDUCATOR/ADMIN roles:
- Sessions this week (with trend)
- Average session length
- Most used tutoring mode
- Checkpoint miss rates
- Score distributions by rubric dimension
- Podcast engagement (listen rates, completion rates, most replayed)

---

## Data Models

### Existing Models — Extensions

**AudioEpisode** — add fields:
- `segmentMap: Json?` — timestamp-to-source-anchor mapping for contextual linking
- `tags: String[]` — topic tags for Browse tab
- `listenCount: Int @default(0)`
- `tier: String @default("auto")` — "auto" | "educator" | "student"
- `status: String @default("draft")` — "draft" | "published" | "stale"
- `publishedAt: DateTime?`
- `creatorId: String?` — educator or student who created it
- `visibility: String @default("course")` — "private" | "course" | "campus"

**StudentAudioHistory** — add fields:
- `bookmarks: Json?` — `[{timestampMs, note}]`

### New Models

```prisma
model VoiceSession {
  id                 String    @id @default(cuid())
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt
  userId             String
  type               String    // "socratic" | "rehearsal" | "walkthrough" | "assessment" | "scenario"
  scenarioId         String?
  courseId            String?
  topicTags          String[]
  transcript         Json      // [{role, text, timestampMs}]
  summary            String?
  durationSecs       Int?
  checkpointResults  Json?     // [{name, met, evidence}]
  audioSaved         Boolean   @default(false)
  audioBlobPath      String?
  status             String    @default("active")

  user               User      @relation(fields: [userId], references: [id])
  scenario           InteractiveScenario? @relation(fields: [scenarioId], references: [id])
  scores             VoiceSessionScore[]

  @@index([userId])
  @@index([courseId])
  @@index([scenarioId])
}

model VoiceSessionScore {
  id          String  @id @default(cuid())
  sessionId   String
  dimension   String
  score       Float
  weight      Float
  evidence    String
  feedback    String

  session     VoiceSession @relation(fields: [sessionId], references: [id])

  @@index([sessionId])
}

model InteractiveScenario {
  id                  String    @id @default(cuid())
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
  creatorId           String
  templateType        String    // "clinical" | "interview" | "debate" | "roleplay"
  title               String
  description         String
  persona             Json      // {name, role, voice, personality}
  situation           String    @db.Text
  phases              Json      // [{name, objective, checkpoint?, maxDurationSecs}]
  rubric              Json      // [{dimension, weight, descriptors}]
  completionCriteria  String
  published           Boolean   @default(false)
  courseId            String?
  timesPlayed         Int       @default(0)
  avgScore            Float?

  creator             User      @relation(fields: [creatorId], references: [id])
  sessions            VoiceSession[]

  @@index([creatorId])
  @@index([courseId])
  @@index([templateType])
}
```

---

## API Routes

```
// Audio Hub
GET    /api/audio/hub/feed            → Personalized "For You" feed
GET    /api/audio/hub/courses         → Episodes grouped by enrolled courses
GET    /api/audio/hub/browse          → Tag/topic-based discovery
GET    /api/audio/hub/trending        → Campus-wide popular episodes

// Podcasts (extends existing /api/audio/)
POST   /api/audio/generate            → (exists) Enqueue podcast generation
GET    /api/audio/episode/[id]        → Episode detail + segment map
PATCH  /api/audio/episode/[id]        → Update status/tags (educator)
POST   /api/audio/podcastify          → Student-triggered generation (rate-limited)
GET    /api/audio/transcript          → (exists) ADA transcript

// Voice Sessions
POST   /api/audio/voice-session       → Start session (returns sessionId)
PATCH  /api/audio/voice-session/[id]  → Update transcript, end session
GET    /api/audio/voice-session/[id]  → Session detail + scores + transcript
POST   /api/audio/voice-session/[id]/score → Trigger Claude scoring
POST   /api/audio/voice-session/[id]/save  → Opt-in audio save

// Interactive Scenarios
GET    /api/audio/scenarios           → List scenarios (by course/template)
GET    /api/audio/scenarios/[id]      → Scenario detail
POST   /api/audio/scenarios           → Create scenario (educator)
PATCH  /api/audio/scenarios/[id]      → Update scenario (educator)

// Listening History & Bookmarks
PATCH  /api/audio/history/[episodeId] → Update progress, add bookmark
GET    /api/audio/history             → Student's full listening history

// Analytics (educator)
GET    /api/audio/analytics/[courseId] → Session stats, checkpoint miss rates, scores
```

---

## Component Hierarchy

```
app/audio/                              ← page directory
├── page.tsx                            ← Hub home (For You default)
├── episode/[id]/page.tsx               ← Full player view
├── session/[id]/page.tsx               ← Voice session replay
└── scenarios/
    ├── page.tsx                        ← Scenario browser
    └── [id]/page.tsx                   ← Scenario launcher

app/components/audio/                   ← component directory
├── AudioShell.tsx                      ← Layout wrapper (panel state)
├── AudioSidePanel.tsx                  ← Right panel (w-96)
├── AudioFullPlayer.tsx                 ← Immersive view
├── EpisodeHeader.tsx                   ← Cover art, title, metadata
├── TranscriptView.tsx                  ← Auto-scrolling synced transcript
├── ChapterMarkers.tsx                  ← Clickable jump points
├── AudioControls.tsx                   ← Play/pause, skip, speed, volume
├── BookmarkTimeline.tsx                ← Student-created markers
├── SandyLauncher.tsx                   ← "Discuss with Sandy" button
├── ContextualLinker.tsx                ← Page anchor registration + sync
├── hub/
│   ├── ForYouFeed.tsx                  ← Sandy-curated recommendations
│   ├── CourseEpisodeList.tsx           ← Course-grouped episodes
│   ├── BrowseGrid.tsx                  ← Tag-based discovery
│   ├── TrendingLane.tsx                ← Campus trending
│   ├── ContinueListening.tsx           ← Resume row
│   └── EpisodeCard.tsx                 ← Reusable episode card
├── voice/
│   ├── VoiceSessionPanel.tsx           ← Panel during voice sessions
│   ├── VoiceModeSelector.tsx           ← Mode picker
│   ├── LiveTranscript.tsx              ← Real-time transcript
│   ├── SessionTimer.tsx                ← Timer for oral assessment
│   └── SessionReport.tsx              ← Post-session feedback
├── scenarios/
│   ├── ScenarioBrowser.tsx             ← Template-filtered list
│   ├── ScenarioCard.tsx                ← Preview card
│   ├── ScenarioLauncher.tsx            ← Pre-session setup
│   ├── ScenarioBuilder.tsx             ← Educator creation form
│   ├── PhaseEditor.tsx                 ← Phase + checkpoint editor
│   └── RubricEditor.tsx                ← Rubric dimension editor
└── builder/
    └── AudioEpisodeBuilder.tsx         ← Educator podcast creation

app/lib/audio/                          ← service directory
├── audio-hub-service.ts                ← Feed curation, trending, grouping
├── voice-session-service.ts            ← Session lifecycle
├── scenario-service.ts                 ← Scenario CRUD + execution
├── contextual-link-service.ts          ← Segment map + anchor matching
└── audio-analytics-service.ts          ← Educator analytics

app/hooks/
├── useAudioPlayer.ts                   ← (exists) extend with panel state
├── useAudioContextLink.ts              ← (new) page anchor registration
└── useVoiceSession.ts                  ← (new) voice session state machine

app/lib/sandy/tools/
├── playAudioEpisode.ts                 ← Search + play episode
├── generatePodcast.ts                  ← Trigger podcast from content
├── startVoiceTutoring.ts              ← Launch voice mode
├── launchScenario.ts                   ← Start scenario
├── getAudioRecommendations.ts          ← Personalized suggestions
└── suggestVoiceTutoringMode.ts         ← Mode recommendation
```

---

## Phasing

| Phase | Scope | Depends On |
|-------|-------|------------|
| **Phase 1** | Audio Hub + Podcast Engine + Split View Player + Contextual Linking | Existing audio pipeline |
| **Phase 2** | Voice Tutoring Modes (5 modes + smart suggestion + session management) | Phase 1 (panel, transcript view) |
| **Phase 3** | Interactive Scenarios (4 templates + builder + scoring + replay) | Phase 2 (voice session infra) |
| **Phase 4** | Personalized Feed + Analytics Dashboard + CIL/Early Warning integration | Phases 1-3 (data) |

---

## Success Criteria

1. A student can open `/audio` and immediately see personalized podcast recommendations
2. Playing an episode opens a split-view panel with live transcript that syncs to source material on screen
3. Educators can create podcast episodes and interactive scenarios through the builder with zero coding
4. Students can "podcastify" any reading with one click
5. Voice tutoring sessions produce transcripts, AI summaries, and rubric scores
6. Interactive scenarios enforce soft checkpoints and score against educator-defined rubrics
7. Sandy can launch any audio experience via voice command
8. All voice session data feeds into CIL, Early Warning, and Assessment Reimagined
9. Student voice recordings are never stored without explicit opt-in (FERPA compliance)
10. The audio player is continuous across page navigation and panel state transitions

## Non-Goals

- No real-time collaborative listening features
- No podcast RSS export
- No speech pronunciation scoring (Phase 2+ consideration for language courses)
- No background music/ambient sound mixing (existing background track support is sufficient)
- No offline audio download
