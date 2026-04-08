# Batch 7: Tools & Write Room — Page Walkthrough Prompt

**Copy-paste this prompt into a new Claude Code session to run Batch 7.**

---

## Prompt

Run the `/page-walkthrough` skill to execute **Batch 7: tools-write-room**. The dev server must be running on port 3002 (`npm run dev`). Batches 1–6 (core, courses-learning, ai-literacy, admin-compliance, registrar, staff) are already completed — state and report files exist in `maintenance/`.

### Pages to check (44 pages)

Test each page with the per-page check protocol (HTTP 200, response body errors, API dependency trace, structural sanity, data presence).

**Build Hub** (test as EDUCATOR `katie.thompson@uky.edu`):
- `/build` — main tool builder interface
- `/build/collaborator` — collaborative tool editing
- `/build/refiner` — AI refinement assistant
- `/builder` — legacy builder route (may redirect)

**Hub / Explore** (test as STUDENT `tiana.the.student@uky.edu`):
- `/hub` — main explore storefront (3-tier: storefront, featured, swim lanes)
- `/hub/browse` — tool browser with filters
- `/hub/departments` — department-specific tool collections
- `/hub/s/[slug]` — department detail page (use any seeded slug)
- `/hub/s/[slug]/[collectionSlug]` — collection detail page
- `/hub/s/[slug]/settings` — collection settings (test as ADMIN `heath.price@uky.edu`)
- `/hub/s/[slug]/settings/analytics` — collection analytics (test as ADMIN)
- `/hub/s/[slug]/settings/collections` — manage subcollections (test as ADMIN)

**Tools** (test as STUDENT `tiana.the.student@uky.edu`):
- `/tools` — tools index (may redirect to `/hub`)
- `/tools/[id]` — individual tool instance (use any seeded tool ID)
- `/tools/ai-registrar-flashcards` — flashcard tool
- `/tools/book-recommender` — book recommendation tool
- `/tools/file-cleaner` — file organization tool
- `/tools/transfer-credit-articulator` — transfer credit tool
- `/tools/uk-in-the-news` — news aggregation tool
- `/tools/uk-now` — campus news tool

**Write Room** (test as STUDENT `tiana.the.student@uky.edu`):
- `/write-room` — write room hub
- `/write-room/[slug]` — generic write-room tool detail (use any seeded slug)
- `/write-room/ai-policy-builder` — policy drafting tool
- `/write-room/contract-drafter` — contract writing tool
- `/write-room/cover-letter` — cover letter generator
- `/write-room/email-rewriter` — email composition tool
- `/write-room/institutional-resume` — institutional resume builder
- `/write-room/linkedin-optimizer` — LinkedIn profile optimizer
- `/write-room/resume-builder` — resume builder

**Data Desk** (test as STUDENT `tiana.the.student@uky.edu`):
- `/data-desk` — data desk hub
- `/data-desk/[slug]` — generic data-desk tool detail (use any seeded slug)
- `/data-desk/chart-explainer` — chart interpretation tool
- `/data-desk/presentation-outliner` — presentation builder
- `/data-desk/report-summarizer` — report analysis tool
- `/data-desk/sentiment-analyzer` — sentiment analysis tool
- `/data-desk/survey-analyzer` — survey analysis tool
- `/data-desk/team-analyzer` — team data analysis tool

**Research Hub** (test as STUDENT `tiana.the.student@uky.edu`):
- `/research-hub` — research hub landing
- `/research-hub/[slug]` — research tool detail (use any seeded slug)

**Playground** (test as STUDENT `tiana.the.student@uky.edu`):
- `/playground` — code sandbox / playground interface
- `/playground-templates` — template gallery and browser

### Role mapping
- `/build/*` routes → katie.thompson@uky.edu (EDUCATOR)
- `/hub/*` routes → tiana.the.student@uky.edu (STUDENT), except `/hub/s/[slug]/settings*` → heath.price@uky.edu (ADMIN)
- `/tools/*` routes → tiana.the.student@uky.edu (STUDENT)
- `/write-room/*` routes → tiana.the.student@uky.edu (STUDENT)
- `/data-desk/*` routes → tiana.the.student@uky.edu (STUDENT)
- `/research-hub/*` routes → tiana.the.student@uky.edu (STUDENT)
- `/playground*` routes → tiana.the.student@uky.edu (STUDENT)

### API dependencies to verify
Key APIs to check alongside page loads:
```bash
# Builder APIs (as EDUCATOR)
curl -s -H "x-demo-user-email: katie.thompson@uky.edu" http://localhost:3002/api/builder/sessions | head -c 200
curl -s -H "x-demo-user-email: katie.thompson@uky.edu" http://localhost:3002/api/tools | head -c 200

# Hub APIs (as STUDENT)
curl -s -H "x-demo-user-email: tiana.the.student@uky.edu" http://localhost:3002/api/hub/explore-bundle | head -c 200
curl -s -H "x-demo-user-email: tiana.the.student@uky.edu" http://localhost:3002/api/hub/search?q=resume | head -c 200
curl -s -H "x-demo-user-email: tiana.the.student@uky.edu" http://localhost:3002/api/hub/personalized | head -c 200

# Tool detail APIs (as STUDENT)
curl -s -H "x-demo-user-email: tiana.the.student@uky.edu" http://localhost:3002/api/tools/storefront-options | head -c 200

# Write Room APIs (as STUDENT)
curl -s -H "x-demo-user-email: tiana.the.student@uky.edu" http://localhost:3002/api/write-room | head -c 200

# Data Desk APIs (as STUDENT)
curl -s -H "x-demo-user-email: tiana.the.student@uky.edu" http://localhost:3002/api/data-desk | head -c 200

# Research Hub APIs (as STUDENT)
curl -s -H "x-demo-user-email: tiana.the.student@uky.edu" http://localhost:3002/api/research-hub | head -c 200

# Playground APIs (as STUDENT)
curl -s -o /dev/null -w "%{http_code}" -H "x-demo-user-email: tiana.the.student@uky.edu" http://localhost:3002/api/playground/apps
curl -s http://localhost:3002/api/playground/apps/public | head -c 200
```

### Environment context from prior batches
- Dev server port: **3002** (not 3000)
- Auth header: `x-demo-user-email: <email>`
- Build already verified as passing — no need to rebuild
- `/api/xp/*` routes return 404 — this is expected (gamification removed), mark as low severity
- `/tools` may redirect to `/hub` — mark as info, not an issue
- Dynamic routes (`[slug]`, `[id]`) need a real seeded value — query the list API first to get a valid ID/slug
- Hub department slugs: query `/api/tools/storefront-options` or check seeded data

### Output
- Update `maintenance/walkthrough-state.json` — mark `tools-write-room` batch completed with per-page results
- Update `maintenance/walkthrough-report-2026-04-04.md` — add Batch 7 detail section, update summary counts
- Print inline status per page during the session

### Structural checks
- Authenticated pages should use `PageHeader` component
- Follow `PLATFORM-CONSISTENCY-MANIFEST.md`: `max-w-6xl`, `border rounded-2xl shadow-sm` cards, `font-extrabold` headings
- Hub storefront should show real tool data (seeded tools), not empty states
- Write Room and Data Desk hubs should list all available tools with descriptions
- Tool detail pages should load tool metadata and show the interactive interface
- Playground should load without STORAGE_JWT_SECRET errors (may show empty state if no apps exist)
