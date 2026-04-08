# Campus Services — Claude Code Reference

> **Claude Code reference doc** extracted from `CLAUDE.md` for focused context loading.
> Covers: The Commons, UKNow, Campus Map, Dining, University Systems Hub, Personal Sites.

---

## The Commons (13 Room Types)

Time-boxed, Sandy-hosted interactive experiences in group chats. Rebranded from "Live Rooms."

### Schema

- Models: `LiveRoom`, `LiveRoomParticipant`, `LiveRoomRound`, `LiveRoomResponse`, `SimulationThread`, `PeerReviewSubmission`

### Services

- Location: `app/lib/commons/`
- Files: `commons-service.ts`, `question-service.ts`, `commentary-service.ts` + 9 type-specific engines

### API

- 20+ routes under `/api/commons/`

### Real-time

- `room-bus.ts` — Redis Streams + EventEmitter fallback
- SSE with `targetUserId` filtering

### 13 Room Types

`CHALLENGE`, `STUDY`, `WATCH`, `TEACHBACK`, `SIMULATION`, `DEBATE`, `IMPROV`, `CASE_STUDY`, `PROBLEM_LAB`, `SPEED_MENTORING`, `FISHBOWL`, `OFFICE_HOURS`, `PEER_REVIEW`

### Simulation Room (flagship)

- Private choices, divergence comparison

### Page

- The Commons at `/community`

---

## UKNow — Campus News Intelligence

### Page

- `/uknow` with 5 tabs: Browse, Ask AI, Insights, Alerts, Course Alerts

### Data

- 50 seeded articles across 8 sections, RSS ingest

### Service

- `app/lib/uknow-service.ts` — all functions have embedding-free fallbacks

### Sandy Tool

- `get_campus_news` in `campus-tools.ts`

---

## Campus Map

### Page

- Interactive Leaflet map at `/campus-map`, dynamic import with `ssr: false`

### Schema

- `CampusBuilding` model + `CampusBuildingType` enum (10 types)

### Data

- 56 real UK buildings, 4 Sandy tools

### Components

- 7 in `app/components/campus-map/`

---

## Dining Integration

### Data

- 10 real UK dining locations, computed open/closed status

### Service

- `app/lib/dining-service.ts`

### Widget

- `DiningWidget.tsx`

### Sandy Tool

- `check_dining` in `campus-tools.ts`

### Behavior

- Renders during meal hours only

---

## University Systems Hub (7 Integrations)

### Page

- Dashboard at `/university-systems` with 7 tabbed integrations

### Schema

- Models: `AttendanceRecord`, `PaperReview`, `WebsiteChangeRequest`, `TravelReimbursement`, `TravelGrant`, `CampusRoom`

### Service

- `university-systems-service.ts` — 18 functions

### Sandy Tools

- 10 tools in `university-systems-tools.ts`

---

## Personal Sites

### Overview

- Platform-native personal website builder at `/site/[slug]`

### Schema

- 6 models

### Components

- 7 components, custom CSS with `ps-*` prefix

### Demo

- Kaylee Daniel at `/site/kaylee-daniel`

### Route

- Public route, no auth required
