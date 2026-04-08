# Reputation Pulse v2 — Architecture

## Purpose

Help crisis communicators analyze 7 days of social media activity around the University of Kentucky: classify sentiment, identify themes, detect AI-generated negative posts, and synthesize a structured intelligence brief with recommended actions.

Designed around **Sprout Social** as the future data source. Currently runs on synthetic demo data shaped like Sprout Social API responses. When real API access arrives, swap the data source without touching the UI or analysis pipeline.

---

## Product Shape

Elevated tool in the existing hub runtime. Auto-analyzes on mount (no scenario picker). Sandy acts as a conversational Q&A layer after the brief is delivered. Lives in the **Crisis Comms** swim lane.

### What It Does

1. Tool opens → automatically loads 50 pre-seeded posts (7-day window) and runs the full pipeline.
2. **Pipeline**: Sentiment analysis → Theme clustering → AI detection on negatives → Structured brief.
3. Sandy narrates key findings and offers deep-dive options (themes, AI-flagged posts, holding statements, threat level).
4. User can ask follow-up questions through Sandy.

### What It Does NOT Do

- Live social listening or real-time ingestion (pending Sprout Social access)
- Definitive bot identification (uses risk language, never certainty)
- Coordination analysis (cut in v2 — may return when real data is available)
- Calibration training exercise (cut in v2)

---

## Synthetic Data (Sprout Social Shape)

### Dataset

Single file: `synthetic-data/sprout-7day-posts.ts` — 50 UK-specific posts across Mar 18–25, 2026.

**Distribution:**
- ~18 positive (40%): Game day excitement, research pride, DanceBlue, campus beauty, professor shoutouts, Match Day
- ~18 negative (36%): Parking, dining, housing mold, tuition, campus safety, adjunct pay, accessibility, grad worker union. **5 of these are intentionally AI-sounding** (new accounts, formal language, hedging patterns, generic empathy)
- ~12 neutral (24%): Event announcements, schedule changes, weather, transit, library hours

Every post has a `sproutId` field (e.g. `"spr_900001"`) to match Sprout Social's message ID format.

### Post Schema

```typescript
interface SocialPost {
  id: string
  sproutId: string              // Sprout Social message ID

  // Author metadata
  authorHandle: string
  authorDisplayName: string
  accountAgeDays: number
  followerCount: number
  followingCount: number
  totalPostCount: number
  hasProfilePhoto: boolean
  bioKeywords: string[]
  platformVerified: boolean
  locationHint: string | null

  // Post content
  platform: 'twitter' | 'reddit' | 'facebook' | 'instagram' | 'news-comment' | 'tiktok'
  text: string
  mediaType: 'none' | 'image' | 'video' | 'link'
  mediaDescription: string | null
  timestamp: string             // ISO 8601
  isReply: boolean
  replyToId: string | null
  hashtags: string[]

  // Engagement
  likes: number
  shares: number
  replies: number
  quoteShares: number
}
```

### Data Location

```
app/lib/crisis-comms/reputation-pulse/
├── synthetic-data/
│   ├── sprout-7day-posts.ts          # 50 UK-specific posts
│   └── index.ts                      # exports getPosts()
├── sentiment-analysis-service.ts     # Haiku sentiment classifier
├── theme-clustering-service.ts       # Haiku dynamic theme identification
├── ai-detection-service.ts           # Haiku AI-authorship analysis (negatives only)
├── reputation-pulse-service.ts       # Pipeline orchestration
├── interview-service.ts              # Sandy prompt generation (ready/deep-dive)
├── preflight.ts                      # User profile
└── types.ts                          # All shared types
```

---

## Analysis Pipeline

```
50 posts (7-day window)
  → Sentiment Analysis (Haiku, batched 12/call)
    → Theme Clustering (Haiku, dynamic 4-8 themes)
      → AI Detection on negatives only (Haiku, batched 12/call)
        → Structured Brief (Sonnet)
```

### Stage 1: Sentiment Analysis

Service: `sentiment-analysis-service.ts`

Classifies each post as positive, negative, or neutral with a confidence score and 1-sentence reason. Uses Haiku with batched calls (12 posts per batch).

### Stage 2: Theme Clustering

Service: `theme-clustering-service.ts`

Haiku identifies 4–8 natural themes from the full post set (with sentiment labels). Each post is assigned to exactly one theme. Output includes sentiment breakdown and sample quotes per theme.

### Stage 3: AI Detection (Negatives Only)

Service: `ai-detection-service.ts`

Only runs on posts classified as negative in Stage 1. This saves cost and focuses attention where it matters. Uses the same 9-signal framework as v1:

**Linguistic signals:** lexical uniformity, sentence structure variance, hedging patterns, discourse markers, error patterns, emotional authenticity

**Contextual signals:** identity consistency, specificity, platform norms

**Cross-post signals:** template detection, timing clusters

Output per post:
```typescript
interface AIDetectionResult {
  postId: string
  humanLikelihood: number         // 0.0 – 1.0
  aiLikelihood: number            // 0.0 – 1.0
  confidence: 'low' | 'medium' | 'high'
  topSignals: string[]
  explanation: string
  verdict: 'likely-human' | 'inconclusive' | 'likely-ai'
}
```

### Stage 4: Brief Generation (Sonnet)

Service: `reputation-pulse-service.ts` → `generateBrief()`

Sonnet receives all pre-computed analysis (sentiment counts, themes, AI detection results, pipeline funnel) and produces a structured `CrisisIntelligenceBrief`:

```typescript
interface CrisisIntelligenceBrief {
  analysisTimestamp: string
  postCount: number
  timelineWindow: string

  threatLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL'
  threatRationale: string

  sentimentDistribution: {
    positive: { count: number; percentage: number }
    negative: { count: number; percentage: number }
    neutral: { count: number; percentage: number }
  }

  aiAuthorshipBreakdown: {  // scoped to negative posts only
    likelyHuman: { count: number; percentage: number }
    inconclusive: { count: number; percentage: number }
    likelyAI: { count: number; percentage: number }
  }

  themes: ThemeCluster[]
  pipelineFunnel: PipelineFunnel

  spreadAnalysis: {
    peakHour: number
    velocityTrend: 'accelerating' | 'steady' | 'decelerating'
    platformBreakdown: Record<string, number>
  }

  responsePosture: 'engage' | 'monitor' | 'ignore' | 'escalate'
  responseRationale: string
  suggestedActions: string[]
  evidenceGaps: string[]
  confidence: 'low' | 'medium' | 'high'
}
```

---

## Sandy Conversational Layer

### Phases

| Phase | What Happens |
|---|---|
| `loading` | Analysis running. Sandy shows "Analyzing your 7-day feed..." |
| `ready` | Brief delivered. Sandy narrates key findings and offers deep-dive chips. |
| `deep-dive` | User asks follow-up questions. Sandy has brief context injected into prompts. |

### Chips (ready phase)

```
<!--CHIPS:["Show AI-flagged posts","Walk me through themes","Draft a holding statement","What can we ignore?","Explain threat level"]-->
```

---

## API Routes

```
app/api/crisis-comms/reputation-pulse/
├── preflight/route.ts     # GET  — user context only
├── interview/route.ts     # POST — Sandy streaming (Haiku), receives brief context
├── analyze/route.ts       # POST — run full pipeline, body optional (userContext)
└── deep-dive/route.ts     # POST — follow-up questions on completed brief (Haiku)
```

All routes use `requireRequestUser` (tool is open to all roles, per platform policy).

---

## UI Components

```
app/components/crisis-comms/reputation-pulse/
├── PipelineFunnel.tsx              # 3-stage narrowing: Total → Negative → Likely AI
├── CrisisBriefPanel.tsx            # Threat banner, sentiment donut, AI authorship donut (negatives only), theme clusters, recommended actions
├── PostFeed.tsx                    # Filterable (All/Positive/Negative/AI Flagged) + sortable (time/engagement/AI score)
├── PostCard.tsx                    # Sentiment badge + AI verdict badge with expandable explanation
└── SpreadTimeline.tsx              # recharts stacked area by sentiment (green/gray/red), 6-hour buckets
```

### Page Route

```
app/crisis-comms/reputation-pulse/page.tsx
```

Auto-analyzes on mount. Layout: mobile tab toggle + 12-column grid (output 7 / Sandy 5). Uses shared `SandyInterviewPanel`. Output panel: PipelineFunnel (top) → 3 tabs (Brief, Posts, Timeline).

---

## Disclaimers (Required in UI)

1. **AI detection caveat** (in CrisisBriefPanel, near AI authorship donut):
   > AI detection is probabilistic, not definitive. Scores reflect linguistic pattern analysis on negative posts only.

2. **Demo data caveat** (amber banner, top of page):
   > You are analyzing synthetic demo data. In production, this tool would analyze real social media posts from Sprout Social or other licensed data providers.

3. **Not legal evidence** (footer):
   > This analysis is a decision-support tool for communications professionals. It is not forensic evidence and should not be used as the sole basis for public accusations of bot activity or manipulation.

---

## Future Versions

- **Sprout Social API integration** — swap `getPosts()` for real API calls when access is available
- CSV/JSON upload from Sprout Social exports (interim)
- Coordination analysis (re-add when real data provides meaningful clusters)
- Calibration exercise (re-add with community-sourced ground truth)
- Historical comparison ("how does this compare to last week?")
- Escalation alerts to crisis comms inbox
- Integration with Spokesperson Trainer
