# New Tools Roadmap

A running list of tools to build for The Sandbox beyond the initial catalog.

---

## Tool Index

| # | Name | Status | Type |
|---|------|--------|------|
| 1 | [NCAA Bracket Challenge](#1-ncaa-bracket-challenge) | ✅ Built | Social / Game |
| 2 | [Book Recommender](#2-book-recommender) | ✅ Built | AI / Personalized |

---

## 1. NCAA Bracket Challenge

**Status:** ✅ Complete
**Route:** `/tools/ncaa-bracket`
**Type:** Social Game Tool
**Audience:** Students, Faculty, Staff — anyone at UK
**Category:** Campus Life / Fun

### What Was Built

**Pages**
- `app/tools/ncaa-bracket/page.tsx` — landing page: create pool, join by code, list my pools
- `app/tools/ncaa-bracket/[poolId]/page.tsx` — pool leaderboard, game results, admin panel, email sub
- `app/tools/ncaa-bracket/[poolId]/fill/page.tsx` — bracket fill UI (region tabs: East/West/South/Midwest + Final Four)

**API Routes**
- `POST /api/brackets` — create pool (auto-seeds 63 games, enrolls creator)
- `GET /api/brackets` — list pools I'm in
- `POST /api/brackets/join` — join pool by join code
- `GET/PATCH /api/brackets/[poolId]` — pool detail, lock bracket, toggle email sub
- `GET/PUT /api/brackets/[poolId]/entry` — fetch/save my picks
- `POST /api/brackets/[poolId]/results` — creator enters game winner, recomputes all scores + ranks
- `POST /api/brackets/digest` — weekly cron endpoint (Vercel Cron: Mondays 9am ET)

**Lib Files**
- `app/lib/bracket-teams.ts` — 64 teams (2026 bracket, all 4 regions), 63-game structure, scoring, `computeScore()`
- `app/lib/email.ts` — Resend email wrapper + `bracketDigestHtml()` + `bookDigestHtml()`

**Schema** (7 new models in `prisma/schema.prisma`)
- `BracketPool`, `BracketEntry`, `BracketGame`, `BracketEmailSub`

**Notable: Kentucky is seeded #1 in the Midwest region.**

### Features
- Create a named pool → get a shareable 6-character join code
- Each member fills their own 63-pick bracket (region-by-region tabs)
- Pool locks when creator clicks "Lock Bracket"
- Creator enters game results → all entries rescored + ranked automatically
- Weekly Monday email digest to subscribed members via Resend
- Scoring: Round 1=1pt, R32=2, S16=4, E8=8, FF=16, Championship=32

### Setup Notes
- `RESEND_API_KEY` env var → emails send live; without it, logs to console
- `CRON_SECRET` env var → protects cron endpoint from public calls
- Vercel Cron configured in `vercel.json` (Mondays 9am ET = 13:00 UTC)

---

## 2. Book Recommender

**Status:** ✅ Complete
**Route:** `/tools/book-recommender`
**Type:** AI Personalization Tool
**Audience:** Students, Faculty — any reader
**Category:** General Education / Personal Enrichment

### What Was Built

**Pages**
- `app/tools/book-recommender/page.tsx` — full single-page app: taste profile, add/remove books, generate recs, manage digest sub

**API Routes**
- `GET/POST/DELETE/PATCH /api/book-recommender/profile` — full profile CRUD: add books, remove books, update recommendation status, toggle digest sub
- `POST /api/book-recommender/recommend` — Claude Haiku generates 8 personalized recommendations with 2-sentence "why this fits you" for each
- `POST /api/book-recommender/digest` — weekly cron: fetches new releases via Google Books API, scores each against user taste profile via Claude, emails matches ≥7/10 (Vercel Cron: Fridays 8am ET)

**Schema** (3 new models)
- `BookProfile`, `BookEntry`, `BookRecommendation`, `BookDigestSub`

### Features
- Build a taste profile: add books you loved (with reason), books you disliked
- Claude generates 8 recommendations referencing your specific inputs
- Mark recs as "Want to Read", "Already Read", or "Not for Me" — keeps your list clean
- Restore previously marked recs back to Want to Read
- Goodreads search link on every recommendation
- Weekly Friday email: Google Books API → Claude scoring → only emails if something scores 7+/10

### Setup Notes
- `ANTHROPIC_API_KEY` — required for recommendations and digest scoring
- `RESEND_API_KEY` — required for email delivery
- `CRON_SECRET` — protects digest endpoint
- Vercel Cron configured in `vercel.json` (Fridays 8am ET = 12:00 UTC)

---

## Status Key

| Icon | Meaning |
|------|---------|
| 🔲 | Not Started |
| 🔧 | In Progress |
| ✅ | Complete |
| 🔄 | Needs Revision |

---

## Adding New Tools

When adding a tool to this list:
1. Add a row to the Tool Index table
2. Create a full section with: Overview, What Was Built (pages + API routes + schema), Features, Setup Notes
3. Update status once built
