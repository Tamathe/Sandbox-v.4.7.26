# Student Experience — Claude Code Reference

> **Claude Code reference doc** extracted from `CLAUDE.md` for focused context loading.
> Covers: Student Homepage v2, Academic Pathfinder, AI Discovery Profile, Explore Page, Contribute.

---

## Student Homepage v2 (9/9 Complete)

### Features

- Quick Action Chips
- BeaconCard slim
- Smart Study CTA on Beacon (`sandy-prefill`)
- Sandy Proactive Study Nudges (`study-action` insight category)
- Due dates on course cards
- Campus Life links
- Night mode (10 PM - 6 AM)

### Components

- 20 in `app/components/student-home/`
- Insights default collapsed behind toggle bar

### Architecture

- No schema changes, no new API routes

---

## Academic Pathfinder

### Page

- `/explore-majors` — 3 states: `BROWSE` / `COMPARE` / `LOADING`

### Components

- 11 in `app/components/explore/`

### Service

- `what-if-service.ts`

### API

- `GET /api/students/me/degree-audit/what-if?program=CS-BS`

### Integration

- Sandy integration
- No schema changes
- Advisor-final-say disclaimer

---

## AI Discovery Profile

### Overview

- Sandy-powered conversational discovery, 4-phase interview

### Schema

- `AiDiscoveryProfile` model + `AiArchetype` enum (6 values)

### Services

- 2 services

### Hook

- `useAiDiscovery.ts`

### Components

- 2 components

### Pages

- 3 pages

### API

- 5 routes

### Dimensions (0-100)

1. `comfort`
2. `pedagogyAlignment`
3. `curiosity`
4. `ethicalAwareness`
5. `currentUsage`

### Completion

- Auto-completes at >= 10 exchanges when Sandy sends `<!--COMPLETE-->` marker

### Navigation

- Not yet in Header nav

---

## Explore Page — 3-Tier Featured Layout

### Config

- `app/hub/hub-config.ts`

### Page

- `app/hub/page.tsx`

### Layout (top to bottom)

1. `HubSearchBar`
2. `FeaturedStorefront`
3. 3 `FeaturedHeroCards`
4. `StaffToolkit` (STAFF only)
5. 6 curated swim lanes
6. Storefronts
7. Recommendations
8. Collections
9. Built by Wildcats
10. Browse CTA

---

## Contribute — Students as Platform Citizens

### Page

- `app/contribute/page.tsx` — 5-tab layout

### Schema

- 7 new models

### Service

- `contribute-service.ts` — 15 functions

### API

- 10 routes under `/api/contribute/`

### Components

- 5 components

### Integration

- Campus Map integration with `BuildingSidebar`
