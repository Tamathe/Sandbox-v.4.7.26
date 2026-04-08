# Batch 4: Admin & Compliance — Page Walkthrough Prompt

**Copy-paste this prompt into a new Claude Code session to run Batch 4.**

---

## Prompt

Run the `/page-walkthrough` skill to execute **Batch 4: admin-compliance**. The dev server must be running on port 3002 (`npm run dev`). Batches 1–3 (core, courses-learning, ai-literacy) are already completed — state and report files exist in `maintenance/`.

### Pages to check (21 pages)

Test each page with the per-page check protocol (HTTP 200, response body errors, API dependency trace, structural sanity, data presence).

**Admin hub + command center** (test as ADMIN `heath.price@uky.edu`):
- `/admin` — admin dashboard / command center
- `/admin/users` — user management
- `/admin/integrations` — integration settings
- `/admin/news-sources` — UKNow news source management
- `/admin/sandy-traces` — Sandy AI trace viewer
- `/admin/campus-pulse` — campus pulse dashboard
- `/admin/curriculum-intelligence` — curriculum intelligence
- `/admin/policy-blast` — policy blast tool

**Admin compliance suite** (test as ADMIN `heath.price@uky.edu`):
- `/admin/compliance-dashboard` — compliance overview
- `/admin/compliance-portal` — compliance portal
- `/admin/compliance-summary` — compliance summary
- `/admin/compliance-reports` — compliance reports
- `/admin/compliance-trends` — compliance trends
- `/admin/compliance-actions` — compliance action items
- `/admin/compliance-calendar` — compliance calendar
- `/admin/compliance-exports` — compliance data exports
- `/admin/compliance-maturity` — compliance maturity assessment
- `/admin/compliance-readiness` — compliance readiness

**Standalone compliance pages** (test as ADMIN `heath.price@uky.edu`):
- `/compliance` — public compliance page
- `/registrar/compliance` — registrar compliance view

**ADA Compliance Tool** (test as STUDENT `tiana.the.student@uky.edu` — accessible to all roles):
- `/ada-tool` — ADA compliance checker

### Role mapping
- `/admin/*` routes → heath.price@uky.edu (ADMIN)
- `/compliance` → heath.price@uky.edu (ADMIN)
- `/registrar/compliance` → heath.price@uky.edu (ADMIN)
- `/ada-tool` → tiana.the.student@uky.edu (STUDENT)

### API dependencies to verify
Key APIs to check alongside page loads:
```bash
# Admin APIs (as ADMIN)
curl -s -H "x-demo-user-email: heath.price@uky.edu" http://localhost:3002/api/admin/users | head -c 200
curl -s -H "x-demo-user-email: heath.price@uky.edu" http://localhost:3002/api/compliance-health
curl -s -H "x-demo-user-email: heath.price@uky.edu" http://localhost:3002/api/admin/sandy-traces | head -c 200

# ADA tool (as STUDENT)
curl -s -o /dev/null -w "%{http_code}" -H "x-demo-user-email: tiana.the.student@uky.edu" http://localhost:3002/api/ada-tool
```

### Environment context from prior batches
- Dev server port: **3002** (not 3000)
- Auth header: `x-demo-user-email: <email>`
- Build already verified as passing — no need to rebuild
- `/api/xp/*` routes return 404 — this is expected (gamification removed), mark as low severity
- Admin pages require ADMIN role — test with heath.price@uky.edu

### Output
- Update `maintenance/walkthrough-state.json` — mark `admin-compliance` batch completed with per-page results
- Update `maintenance/walkthrough-report-2026-04-04.md` — add Batch 4 detail section, update summary counts
- Print inline status per page during the session

### Structural checks
- Authenticated pages should use `PageHeader` component
- Follow `PLATFORM-CONSISTENCY-MANIFEST.md`: `max-w-6xl`, `border rounded-2xl shadow-sm` cards, `font-extrabold` headings
- Admin pages should show real data for Heath (demo admin), not empty states
- Compliance pages should surface actual compliance data from the DB
