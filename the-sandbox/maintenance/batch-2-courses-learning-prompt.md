# Batch 2: Courses & Learning — Page Walkthrough Prompt

**Copy-paste this prompt into a new Claude Code session to run Batch 2.**

---

## Prompt

Run the `/page-walkthrough` skill to execute **Batch 2: courses-learning**. The dev server must be running on port 3002 (`npm run dev`). Batch 1 (core) is already completed — state and report files exist in `maintenance/`.

### Pages to check (18 pages)

Test each page with the per-page check protocol (HTTP 200, response body errors, API dependency trace, structural sanity, data presence).

**Static/list pages** (test as STUDENT `tiana.the.student@uky.edu`):
- `/courses` — course listing
- `/academy` — academy hub
- `/study` — study dashboard
- `/practice` — practice hub
- `/study-match` — study matching

**Dynamic course pages** (test as EDUCATOR `katie.thompson@uky.edu` — she owns TEK-100):
- `/courses/[id]` — use TEK-100's course ID from DB
- `/courses/[id]/syllabus`
- `/courses/[id]/course-map`
- `/courses/[id]/course-map/embed`
- `/courses/[id]/assignments`
- `/courses/[id]/assignments/new`
- `/courses/[id]/assessment-canvas`
- `/courses/share/[token]` — skip:no-test-token (share tokens are ephemeral)

**Assignment pages** (test as STUDENT `tiana.the.student@uky.edu`):
- `/assignments/[id]` — find an assignment ID from TEK-100 in DB
- `/assignments/[id]/workspace`
- `/assignments/[id]/mei`

**Teach-back** (test as STUDENT):
- `/teach-back/[sessionId]` — skip:no-test-id unless a TeachBack session exists in DB

### Role mapping
- `/courses/[id]/*` routes → katie.thompson@uky.edu (EDUCATOR, course owner)
- `/assignments/*`, `/study*`, `/practice`, `/academy`, `/teach-back/*` → tiana.the.student@uky.edu (STUDENT)

### Finding test IDs
To get the TEK-100 course ID, run:
```bash
curl -s -H "x-demo-user-email: katie.thompson@uky.edu" http://localhost:3002/api/courses | jq '.[0].id' 2>/dev/null || curl -s -H "x-demo-user-email: katie.thompson@uky.edu" http://localhost:3002/api/courses
```

To get an assignment ID from TEK-100, run:
```bash
curl -s -H "x-demo-user-email: katie.thompson@uky.edu" "http://localhost:3002/api/courses/<COURSE_ID>/assignments" | jq '.[0].id' 2>/dev/null
```

### Environment context from Batch 1
- Dev server port: **3002** (not 3000)
- Auth header: `x-demo-user-email: <email>`
- Build already verified as passing — no need to rebuild
- `/api/xp/*` routes return 404 — this is expected (gamification removed), mark as low severity

### Output
- Update `maintenance/walkthrough-state.json` — mark `courses-learning` batch completed with per-page results
- Update `maintenance/walkthrough-report-2026-04-04.md` — add Batch 2 detail section, update summary counts
- Print inline status per page during the session

### Structural checks
- Authenticated pages should use `PageHeader` component
- Follow `PLATFORM-CONSISTENCY-MANIFEST.md`: `max-w-6xl`, `border rounded-2xl shadow-sm` cards, `font-extrabold` headings
- Course pages owned by Katie should show real course data, not empty states
