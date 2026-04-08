# UK News Apps — Architecture Blueprint

Two complementary standalone tools that together form a UK Media Hub:

- **UK Now** (`/tools/uk-now`) — Official university content aggregator
- **UK in the News** (`/tools/uk-in-the-news`) — External media monitoring

---

## Shared Infrastructure

Both tools share a single data pipeline, DB schema, and cron job.

### Database Schema

```prisma
model NewsSource {
  id            String        @id @default(cuid())
  name          String
  rssUrl        String
  sourceType    NewsSourceType  // INTERNAL | EXTERNAL
  category      String?       // "Research", "Athletics", "HealthCare", etc.
  active        Boolean       @default(true)
  lastFetchedAt DateTime?
  articles      NewsArticle[]
  createdAt     DateTime      @default(now())
}

model NewsArticle {
  id             String      @id @default(cuid())
  sourceId       String
  source         NewsSource  @relation(fields: [sourceId], references: [id])
  sourceType     NewsSourceType
  url            String      @unique
  title          String
  summaryAi      String?     // Claude Haiku 2-sentence summary
  fullText       String?     // scraped body (optional)
  sentiment      Sentiment?  // POSITIVE | NEUTRAL | NEGATIVE
  sentimentScore Float?      // -1.0 to 1.0
  tags           String[]    // Claude-assigned topic tags
  category       String?     // top-level category bucket
  outletName     String?     // e.g. "Louisville Courier-Journal"
  outletCity     String?     // for coverage map
  outletState    String?     // for coverage map
  thumbnailUrl   String?
  publishedAt    DateTime
  fetchedAt      DateTime    @default(now())
}

enum NewsSourceType {
  INTERNAL  // UK Now
  EXTERNAL  // UK in the News
}

enum Sentiment {
  POSITIVE
  NEUTRAL
  NEGATIVE
}
```

### Seeded Sources — UK Now (INTERNAL)

| Name | RSS URL | Category |
|---|---|---|
| UKNow | `https://uknow.uky.edu/feed` | General |
| UK Athletics | `https://ukathletics.com/rss.aspx` | Athletics |
| UK HealthCare | `https://ukhealthcare.uky.edu/rss.xml` | HealthCare |
| UK College of Engineering | *(engineering.uky.edu/news/feed)* | Research |
| UK College of Medicine | *(med.uky.edu/news/feed)* | Research |
| Markey Cancer Center | *(ukhealthcare.uky.edu/markey/rss)* | Research |

> Admins can add/remove sources via `/admin/news-sources`

### Seeded Sources — UK in the News (EXTERNAL)

| Name | Method | Notes |
|---|---|---|
| Google News RSS | `https://news.google.com/rss/search?q="University+of+Kentucky"` | Free, no API key |
| NewsAPI.org | REST API, query `"University of Kentucky"` | 100 req/day free tier |
| Bing News (future) | Azure Cognitive Services | Upgrade path via UK Azure EA |

---

## Cron Job — News Fetch

**Route:** `POST /api/cron/news-fetch`
**Protected by:** `Authorization: Bearer ${CRON_SECRET}`
**Schedule:** Every 30 minutes (Vercel Cron or external)

### Fetch Pipeline

```
For each active NewsSource:
  1. Fetch RSS XML (or call NewsAPI)
  2. Parse items → extract url, title, publishedAt, thumbnailUrl
  3. Deduplicate: skip if url already in NewsArticle table
  4. For new articles, batch to Claude Haiku:
       - Generate 2-sentence summary
       - Assign tags (array of topic strings)
       - Score sentiment (-1.0 to 1.0) + enum
       - Assign category bucket
  5. Upsert NewsArticle rows
  6. Update NewsSource.lastFetchedAt
```

### Claude Haiku Prompt (per article batch)

```
Given this news article title and excerpt, return JSON:
{
  "summary": "2-sentence plain-English summary",
  "tags": ["tag1", "tag2", "tag3"],
  "sentiment": "POSITIVE" | "NEUTRAL" | "NEGATIVE",
  "sentimentScore": 0.0,
  "category": "Research | Athletics | HealthCare | Campus Life | Arts | Administration"
}
Title: {{title}}
Excerpt: {{excerpt}}
```

---

## API Routes

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/news/articles` | Any | Paginated article list; `?type=INTERNAL\|EXTERNAL&category=&page=&limit=20` |
| GET | `/api/news/articles/[id]` | Any | Single article detail |
| GET | `/api/news/stats` | Any | Coverage stats: article count by outlet, sentiment breakdown, top tags |
| GET | `/api/news/sources` | ADMIN | List all sources |
| POST | `/api/news/sources` | ADMIN | Add a new RSS source |
| PATCH | `/api/news/sources/[id]` | ADMIN | Toggle active / update URL |
| POST | `/api/cron/news-fetch` | CRON_SECRET | Trigger fetch pipeline |

---

## UK Now — `/tools/uk-now`

Official university news aggregator. Audience: students, faculty, staff.

### UI Layout

```
┌──────────────────────────────────────────────────┐
│  [UK Blue Header]  UK Now  "Today at Kentucky"   │
│  Last updated: 12 minutes ago                     │
├──────────────────────────────────────────────────┤
│  [Featured Article Banner — latest high-priority] │
│  Large thumbnail + headline + 2-line AI summary   │
├──────────────────────────────────────────────────┤
│  [Category Pills]                                 │
│  All · Research · Athletics · HealthCare ·        │
│  Campus Life · Arts · Administration              │
├──────────────────────────────────────────────────┤
│  [Article Card Grid — 3 cols desktop, 1 mobile]   │
│  Each card: thumbnail, source badge, headline,    │
│  AI summary, tags, published date                 │
│                                                   │
│  [Load More] button (cursor pagination)           │
└──────────────────────────────────────────────────┘
```

### Features

- **Category filter pills** — horizontal scroll on mobile
- **Source badge** on each card (UKNow, UK Athletics, HealthCare, etc.)
- **AI summary** shown in card (2 sentences from Haiku)
- **Tag chips** below each card — click to filter by tag
- **"Read full article"** opens original URL in new tab
- **Share** button (copy link)
- **Sandy integration** — "Ask Sandy about UK news this week" CTA in concierge panel
- **Weekly digest** — Resend email every Monday at 7am, top 5 stories per category
- **Admin source manager** — `/admin/news-sources` to add/remove RSS feeds

### State & Data Fetching

- Initial load: server component, SSR first page (20 articles)
- Category/tag filter: client-side API call to `/api/news/articles`
- Auto-refresh: `setInterval` recheck for new articles every 10 minutes (silent)
- No auth required — public tool

---

## UK in the News — `/tools/uk-in-the-news`

External media monitoring. Audience: admin, marketing, faculty tracking coverage.

### UI Layout

```
┌──────────────────────────────────────────────────┐
│  UK in the News                   [Last 7d ▾]    │
├────────────────────────┬─────────────────────────┤
│                        │  Coverage by Outlet       │
│   COVERAGE MAP         │  ───────────────────      │
│   (US map, pins at     │  Louisville CJ  ██ 8      │
│   outlet city)         │  AP News        ██ 6      │
│   Pin color =          │  ESPN           █  4      │
│   sentiment            │  NY Times       █  3      │
│                        │  ...                      │
├────────────────────────┴─────────────────────────┤
│  Sentiment Bar: ████████░░░░░░  62% positive      │
│  Top Tags: [research] [basketball] [funding] ...  │
├──────────────────────────────────────────────────┤
│  [Article Feed — reverse chron]                   │
│  Each card: outlet name + city, headline,         │
│  AI summary, sentiment badge, published date      │
│  [Load More]                                      │
└──────────────────────────────────────────────────┘
```

### Coverage Map

- Library: **react-simple-maps** (lightweight, no API key)
- Data: `outletCity` + `outletState` → lat/long lookup table (top 100 US cities seeded)
- Pin color: green (POSITIVE) / gray (NEUTRAL) / red (NEGATIVE)
- Pin size: proportional to article count from that outlet
- Tooltip on hover: outlet name + article count + sentiment

### Features

- **Date range filter** — Last 24h / 7d / 30d / 90d
- **Sentiment filter** — All / Positive / Neutral / Negative
- **Coverage spike detection** — if article count in 24h > 2× 7-day daily average, show alert banner: "UK trending in the news — 14 articles today"
- **Top tags** — click to filter feed
- **Source credibility note** — small tooltip per outlet (national / regional / local)
- **Sandy integration** — "What's driving UK's coverage this week?"
- **Export** — download filtered article list as CSV (admin only)

### Spike Alert (server-side)

Calculated in `/api/news/stats`:
```
dailyAvg = total articles (last 7d) / 7
todayCount = articles in last 24h
if todayCount > dailyAvg * 2 → return { spike: true, count: todayCount }
```
Banner shown client-side when `spike === true`.

---

## Shared Admin Panel — `/admin/news-sources`

| Column | Value |
|---|---|
| Source name | Text input |
| RSS URL | URL input |
| Type | INTERNAL / EXTERNAL toggle |
| Category | Dropdown |
| Active | Toggle |
| Last fetched | Timestamp |
| Article count | Count |
| Actions | Edit / Delete / Fetch Now |

"Fetch Now" button hits `POST /api/cron/news-fetch?sourceId=xxx` — partial fetch for one source.

---

## Build Order

1. **DB migration** — add `NewsSource` + `NewsArticle` models + seed sources
2. **Cron fetch job** — RSS parser + NewsAPI client + Haiku tagging pipeline
3. **API routes** — `/api/news/articles`, `/api/news/stats`
4. **UK Now UI** — card grid + category pills + featured banner
5. **UK in the News UI** — article feed + sentiment bar + top tags
6. **Coverage map** — react-simple-maps integration
7. **Admin source manager**
8. **Sandy hooks** + weekly digest email

---

## Dependencies to Add

```bash
npm install rss-parser react-simple-maps d3-scale
```

- **rss-parser** — parse RSS/Atom feeds
- **react-simple-maps** — SVG US map for coverage visualization
- **d3-scale** — pin sizing/color scales (likely already transitive)

Optional (upgrade path):
```bash
npm install newsapi  # NewsAPI.org JS client
```

---

*Blueprint created: 2026-03-18*
