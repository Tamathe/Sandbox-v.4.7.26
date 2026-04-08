# Architecture: UKNow Showcase — Department Intelligence Platform

> **Status:** Building
> **Goal:** Elevate UKNow from a campus news search tool into a showstopper demo that proves any department, college, or unit can have an AI-powered institutional knowledge base.

---

## The Pitch

> "Any department, college, or unit can point this at their content and get an AI-powered institutional knowledge base — overnight."

UKNow is the proof of concept: 14,097 real articles, fully embedded in pgvector, with RAG Q&A, semantic alerts, and AI entity extraction — all live. The showcase features make evaluators think: *"My college could use this."*

---

## What's New (3 Features)

### 1. Insights Dashboard (New Tab)

A visual intelligence dashboard that answers: "What is the university talking about?"

**College/Department Lens** — A selector at the top lets you scope all data to a specific college. Every chart, metric, and brief updates to reflect that college's coverage.

| Component | Data Source | Visual |
|-----------|------------|--------|
| **KPI Strip** | Article counts, entity counts, citation count | 4 stat cards |
| **Coverage Over Time** | Articles per month, grouped by section | Area chart (recharts) |
| **Section Breakdown** | Article count per section (for selected college) | Horizontal bar chart |
| **Top Mentions** | People + Departments from `entities` JSON | Ranked list with count badges |
| **Topic Cloud** | Topics from `entities` JSON, sized by frequency | Tag cloud (CSS-based) |
| **Intelligence Brief** | Haiku-generated summary of top themes | Blue callout card |
| **Citation Analytics** | Sandy citation stats (admin only) | Stat strip + recent citations list |

**API:** `GET /api/uknow/insights`
- Query params: `college` (optional filter), `days` (default 90), `section`
- Returns: `{ kpi, coverageByMonth, sectionBreakdown, topMentions, topicCloud, brief }`
- Auth: `requireRequestUser` (all roles; citation stats only for ADMIN)

**Service:** `app/lib/uknow-insights-service.ts`
- `getInsightsDashboard(opts)` — orchestrates all sub-queries
- `getArticlesByCollege(college, days)` — filters articles where entities.departments match college keywords
- `getCoverageByMonth(college, days)` — groups articles by month + section
- `getTopMentions(college, days, limit)` — aggregates people + departments from entities JSON
- `getTopicCloud(college, days)` — aggregates topic tags from entities JSON
- `generateIntelligenceBrief(topMentions, topicCloud, college)` — Haiku single-shot summary

**Component:** `app/components/uknow/InsightsTab.tsx`
- College selector (dropdown with "All UK" default + list of colleges from entities data)
- Days selector (30 / 90 / 365)
- Responsive grid: KPI strip → Coverage chart → two-column (Section breakdown + Top mentions) → Topic cloud → Intelligence Brief
- Admin-only: Citation Analytics strip at bottom
- Uses recharts `AreaChart`, `BarChart` (already a project dependency)

---

### 2. Knowledge Graph (Inside Insights Tab)

Interactive entity network showing how people, departments, and topics connect through shared articles.

**API:** `GET /api/uknow/knowledge-graph`
- Query params: `college` (optional), `days` (default 90), `limit` (max nodes, default 40)
- Returns: `{ nodes: Array<{id, label, type, weight}>, edges: Array<{source, target, weight}> }`
- Logic: Query articles with entities, count co-occurrences of entity pairs within the same article, return top nodes + edges

**Component:** `app/components/uknow/KnowledgeGraph.tsx`
- Pure SVG force-directed layout (no new dependency — simple spring simulation with requestAnimationFrame)
- Node colors by type: people (purple), departments (emerald), topics (blue)
- Node size by weight (mention count)
- Edge thickness by co-occurrence count
- Hover: tooltip with entity name + count
- Click: filters Insights dashboard to that entity

---

### 3. Timeline Stories (Inside Ask AI Tab)

When a user asks a temporal question ("Tell me the story of UK's AI research" or "What has UK done about sustainability?"), Sandy synthesizes a narrative arc across years of articles.

**API:** `POST /api/uknow/timeline`
- Body: `{ query: string }`
- Returns: `{ narrative: string, milestones: Array<{date, title, slug, excerpt}>, followUps: string[] }`
- Logic:
  1. Embed the query
  2. Vector search across all UKNow chunks (top 20, wider net than Ask AI)
  3. Group retrieved articles by year
  4. Send to Haiku with a timeline-specific system prompt: "Synthesize a chronological narrative... identify key milestones... cite article titles"
  5. Parse milestones from structured response

**Component:** `app/components/uknow/TimelineStory.tsx`
- Vertical timeline with milestone dots
- Each milestone: date, title (linked to article), excerpt
- Sandy's narrative text above the timeline
- Follow-up chips below
- Triggered from Ask AI via a "Timeline" toggle or auto-detected temporal keywords

**Integration with Ask AI:**
- Add a "Timeline Mode" toggle button next to the input
- When enabled, POST to `/api/uknow/timeline` instead of `/api/uknow/ask`
- Auto-detect temporal keywords ("story of", "history of", "over the years", "timeline") and suggest timeline mode
- Response renders inline in the chat as a TimelineStory component

---

## Enhanced Demo Beats

### Beat: Ask AI → Alert Conversion (30-Second Arc)

**Current state:** User asks question → gets answer → can click "Save as alert" (small link).

**Enhanced state:**
1. User asks: "What grants has UK won recently?"
2. Sandy answers with citations, dollar amounts pulled from articles
3. **New:** Below the answer, a prominent conversion card appears:
   - "Stay informed — I can notify you when new grant articles are published."
   - One-click "Create Alert" button (pre-filled with the query)
   - Shows live preview of 3 matching articles as social proof
4. User clicks → alert created → success animation → "You'll get a weekly digest."

**Implementation:**
- Add `AlertConversionCard` component to AskAITab
- Shows after any assistant response (not just the first)
- Pre-fills alert label from query (truncated to 60 chars)
- Calls existing `POST /api/uknow/alerts` + `GET /api/uknow/alerts/preview`
- Success state: green checkmark with digest frequency hint

---

## File Map

```
app/
├── components/uknow/
│   ├── InsightsTab.tsx          ← NEW: Full insights dashboard
│   ├── KnowledgeGraph.tsx       ← NEW: SVG entity network
│   ├── TimelineStory.tsx        ← NEW: Timeline narrative + milestones
│   ├── AlertConversionCard.tsx  ← NEW: Ask AI → Alert conversion prompt
│   ├── AskAITab.tsx             ← MODIFIED: Timeline mode + auto-detect
│   ├── BrowseTab.tsx            ← unchanged
│   ├── AlertsTab.tsx            ← unchanged
│   ├── CourseAlertsTab.tsx       ← unchanged
│   ├── ArticleCard.tsx          ← unchanged
│   ├── TrendingChips.tsx        ← unchanged
│   └── uknow-helpers.ts        ← MODIFIED: new types
├── lib/
│   ├── uknow-insights-service.ts  ← NEW: Insights + Knowledge Graph logic
│   ├── uknow-service.ts           ← MODIFIED: timeline function
│   └── uknow-alert-service.ts     ← unchanged
├── api/uknow/
│   ├── insights/route.ts          ← NEW
│   ├── knowledge-graph/route.ts   ← NEW
│   ├── timeline/route.ts          ← NEW
│   └── ... (16 existing routes unchanged)
└── uknow/page.tsx                 ← MODIFIED: add Insights tab
```

---

## Schema Changes

**None.** All new features query existing data (entities JSON, articles, citations, query logs). No migrations needed.

---

## College Detection Strategy

Articles don't have a `college` column. We detect college affiliation by:
1. **Entity matching:** `entities.departments` contains department names that map to colleges (e.g., "Computer Science" → "Engineering", "English" → "Arts & Sciences")
2. **Section matching:** Some sections correlate with colleges (e.g., "UK HealthCare" → "Medicine")
3. **Keyword matching:** Article title/content contains college names

We maintain a static `COLLEGE_DEPARTMENT_MAP` in the insights service — a lookup table mapping known departments to their college. This is pragmatic for demo purposes and can be extended.

---

## Demo Script (for evaluators)

1. **Open UKNow Live** → "This is 14,097 real articles from uknow.uky.edu, fully indexed and AI-searchable."
2. **Click Insights tab** → "Here's what the university is talking about right now."
3. **Select 'College of Engineering'** → All charts update. "Now imagine you're the dean. This is your college's news footprint — top researchers mentioned, trending topics, coverage over time."
4. **Click a knowledge graph node** → "See how people and topics connect through shared coverage."
5. **Switch to Ask AI** → Type: "What grants has UK won in the last year?"
6. Sandy answers with citations. **Alert conversion card appears** → "One click and you're getting notified when new grants are announced."
7. **Click Create Alert** → "Weekly digest, done. That's the loop: question → intelligence → automation."
8. **Timeline mode** → "Tell me the story of UK's AI research" → Sandy synthesizes a narrative across years of articles with a visual timeline.

**Closing:** "Every department, every college, every unit could have this — pointed at their own content. UKNow is the proof it works."

---

## Constraints

- No new npm dependencies (recharts + SVG cover all viz needs)
- No schema migrations (all data already exists)
- All routes use `requireRequestUser` (citation stats gated to ADMIN)
- Tailwind v4 utilities only, `size-X` icons, `border-2 rounded-2xl` cards
- UK Blue `#0033A0` throughout
