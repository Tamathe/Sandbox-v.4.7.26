# Batch 8: Social & Collaboration — Page Walkthrough Prompt

**Copy-paste this prompt into a new Claude Code session to run Batch 8.**

---

## Prompt

Run the `/page-walkthrough` skill to execute **Batch 8: social-collaboration**. The dev server must be running on port 3002 (`npm run dev`). Batches 1–7 (core, courses-learning, ai-literacy, admin-compliance, registrar, staff, tools-write-room) are already completed — state and report files exist in `maintenance/`.

### Pages to check (28 pages)

Test each page with the per-page check protocol (HTTP 200, response body errors, API dependency trace, structural sanity, data presence).

**Messaging** (test as STUDENT `tiana.the.student@uky.edu`):
- `/messages` — main messaging inbox
- `/messages/[groupId]` — group conversation view (query `/api/messages/conversations` first to get a valid group ID)

**Sandcastle** (test as EDUCATOR `katie.thompson@uky.edu`):
- `/sandcastle/new` — create new sandcastle room
- `/sandcastle/[roomId]` — host/facilitator view (query `/api/sandcastle/rooms` first to get a valid room ID; if none exist, test with a synthetic ID and expect graceful empty/error state)
- `/sandcastle/[roomId]/participate` — participant view
- `/sandcastle/[roomId]/report` — post-session report
- `/sandcastle/experience/[slug]` — experience template view (check if any experience slugs are seeded)
- `/sandcastle/join/[joinCode]` — join via code (test with synthetic code, expect graceful handling)

**Community** (test as STUDENT `tiana.the.student@uky.edu`):
- `/community` — community pulse hub (route group: `(main)`)

**Debate Forum** (test as STUDENT `tiana.the.student@uky.edu`):
- `/debate` — debate listing
- `/debate/new` — create new debate
- `/debate/join` — join a debate
- `/debate/[roomId]` — debate room view (query `/api/debate/rooms` or check seeded data for a valid room ID)
- `/debate/[roomId]/argue` — active argument view

**Rooms & Collaboration** (test as STUDENT `tiana.the.student@uky.edu`):
- `/rooms` — rooms listing / lobby
- `/join-room/[roomId]` — join room by ID (test with a valid room ID from `/api/collab/sessions` or synthetic)
- `/together` — collaboration / together space

**Pitch** (test as STUDENT `tiana.the.student@uky.edu`):
- `/pitch` — pitch room listing
- `/pitch/new` — create new pitch room
- `/pitch/[roomId]` — pitch room view (query for valid room ID or test with synthetic)
- `/pitch/[roomId]/submit` — submit a pitch

**Office Hours** (test as STUDENT `tiana.the.student@uky.edu` and EDUCATOR `katie.thompson@uky.edu`):
- `/office-hours` — student office hours view (as STUDENT)
- `/office-hours/faculty` — faculty office hours management (as EDUCATOR)

**Studio** (test as EDUCATOR `katie.thompson@uky.edu`):
- `/studio` — studio page (may redirect to `/build` per CLAUDE.md Navigation table)

### Role mapping
- `/messages/*` routes → tiana.the.student@uky.edu (STUDENT)
- `/sandcastle/*` routes → katie.thompson@uky.edu (EDUCATOR)
- `/community` → tiana.the.student@uky.edu (STUDENT)
- `/debate/*` routes → tiana.the.student@uky.edu (STUDENT)
- `/rooms`, `/join-room/*`, `/together` → tiana.the.student@uky.edu (STUDENT)
- `/pitch/*` routes → tiana.the.student@uky.edu (STUDENT)
- `/office-hours` → tiana.the.student@uky.edu (STUDENT)
- `/office-hours/faculty` → katie.thompson@uky.edu (EDUCATOR)
- `/studio` → katie.thompson@uky.edu (EDUCATOR)

### API dependencies to verify
Key APIs to check alongside page loads:
```bash
# Messaging APIs (as STUDENT)
curl -s -H "x-demo-user-email: tiana.the.student@uky.edu" http://localhost:3002/api/messages/conversations | head -c 200
curl -s -H "x-demo-user-email: tiana.the.student@uky.edu" http://localhost:3002/api/messages/unread-count | head -c 200

# Sandcastle APIs (as EDUCATOR)
curl -s -H "x-demo-user-email: katie.thompson@uky.edu" http://localhost:3002/api/sandcastle/rooms | head -c 200
curl -s -H "x-demo-user-email: katie.thompson@uky.edu" http://localhost:3002/api/sandcastle/feature-flags | head -c 200

# Commons APIs (as STUDENT — used by community/together)
curl -s -H "x-demo-user-email: tiana.the.student@uky.edu" http://localhost:3002/api/commons | head -c 200
curl -s -H "x-demo-user-email: tiana.the.student@uky.edu" http://localhost:3002/api/commons/suggestions | head -c 200

# Community Pulse API
curl -s -H "x-demo-user-email: tiana.the.student@uky.edu" http://localhost:3002/api/community-pulse | head -c 200

# Collab APIs (as STUDENT)
curl -s -H "x-demo-user-email: tiana.the.student@uky.edu" http://localhost:3002/api/collab/sessions | head -c 200

# Debate APIs (as STUDENT)
curl -s -o /dev/null -w "%{http_code}" -H "x-demo-user-email: tiana.the.student@uky.edu" http://localhost:3002/api/debate/rooms

# Rooms API (as STUDENT)
curl -s -o /dev/null -w "%{http_code}" -H "x-demo-user-email: tiana.the.student@uky.edu" http://localhost:3002/api/rooms

# Pitch APIs (as STUDENT)
curl -s -o /dev/null -w "%{http_code}" -H "x-demo-user-email: tiana.the.student@uky.edu" http://localhost:3002/api/pitch

# Office Hours APIs (as STUDENT then EDUCATOR)
curl -s -o /dev/null -w "%{http_code}" -H "x-demo-user-email: tiana.the.student@uky.edu" http://localhost:3002/api/office-hours
curl -s -o /dev/null -w "%{http_code}" -H "x-demo-user-email: katie.thompson@uky.edu" http://localhost:3002/api/office-hours

# Announcements API (public)
curl -s http://localhost:3002/api/announcements | head -c 200
```

### Environment context from prior batches
- Dev server port: **3002** (not 3000)
- Auth header: `x-demo-user-email: <email>`
- Build already verified as passing — no need to rebuild
- `/api/xp/*` routes return 404 — this is expected (gamification removed), mark as low severity
- `/studio` may redirect to `/build` — mark as info, not an issue
- Dynamic routes (`[roomId]`, `[groupId]`, `[joinCode]`, `[slug]`) need a real seeded value — query the list API first to get a valid ID/slug. If no seeded data exists, test with a synthetic value and note the empty state behavior.
- Many social features may have little or no seeded demo data — empty states rendering correctly is a pass
- Sandcastle rooms may require WebSocket/SSE for full functionality — the page should still render the initial shell without errors
- `/community` is inside a `(main)` route group — the actual URL is just `/community`

### Output
- Update `maintenance/walkthrough-state.json` — mark `social-collaboration` batch completed with per-page results
- Update `maintenance/walkthrough-report-2026-04-04.md` — add Batch 8 detail section, update summary counts
- Print inline status per page during the session

### Structural checks
- Authenticated pages should use `PageHeader` component
- Follow `PLATFORM-CONSISTENCY-MANIFEST.md`: `max-w-6xl`, `border rounded-2xl shadow-sm` cards, `font-extrabold` headings
- Messaging should show conversation list or empty state, not errors
- Sandcastle room pages should render the host/participant shell even without active WebSocket
- Community hub should show real data or a well-designed empty state
- Office hours pages should render differently for student vs faculty roles
- Debate and pitch pages should handle missing room IDs gracefully (404 or redirect, not crash)
