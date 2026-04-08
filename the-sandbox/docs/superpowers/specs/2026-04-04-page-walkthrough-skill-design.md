# Page Walkthrough Skill — Design Spec

**Date:** 2026-04-04  
**Skill name:** `page-walkthrough`  
**Location:** `the-sandbox/.claude/skills/page-walkthrough/SKILL.md`  
**State file:** `maintenance/walkthrough-state.json`  
**Report file:** `maintenance/walkthrough-report-YYYY-MM-DD.md`

---

## Purpose

A structured skill that walks through every page in the platform (279 pages), verifying each one renders correctly, its API dependencies work, its structure follows conventions, and demo data populates properly. Designed to run in domain batches with persistent state tracking so work can be resumed across sessions.

---

## Execution Model

- **Trigger:** Manual invocation via `/page-walkthrough`
- **Pacing:** One domain batch per invocation (user can run multiple batches in a session)
- **State:** Reads `maintenance/walkthrough-state.json` to determine next pending batch
- **Output:** Brief inline status during the session + full markdown report written/updated after each batch

---

## Domain Batches (13)

| # | Domain | ~Pages | Description |
|---|--------|--------|-------------|
| 1 | **core** | 12 | `today`, `login`, `signup`, `onboard`, `settings`, `profile`, `notifications`, `my-profile`, `privacy`, `terms`, root page |
| 2 | **courses-learning** | 25 | `courses/*`, `academy`, `study/*`, `assignments/*`, `teach-back/*`, `practice`, `study-match` |
| 3 | **ai-literacy** | 25 | `(pages)/ai-literacy/**` — student modules, educator tools, starter packs |
| 4 | **admin-compliance** | 25 | `admin/*`, `compliance`, `accreditation/*` |
| 5 | **registrar** | 12 | `registrar/*`, `degree-plan`, `explore-majors` |
| 6 | **staff** | 10 | `staff/*` |
| 7 | **tools-write-room** | 20 | `tools/*`, `write-room/*`, `data-desk/*` |
| 8 | **social-collaboration** | 20 | `messages/*`, `community`, `debate/*`, `pitch/*`, `bracket/*`, `sandcastle/*`, `quiz-bowl/*`, `rooms`, `together` |
| 9 | **analytics** | 15 | `analytics/*`, `assessment/*` |
| 10 | **content-publishing** | 15 | `builder`, `studio`, `library`, `hub/*`, `uknow/*`, `audio/*`, `playground*` |
| 11 | **wellness-campus** | 15 | `wellness-hub/*`, `campus*`, `student-services/*`, `office-hours/*` |
| 12 | **specialized-tools** | 20 | `meeting-machine/*`, `research-hub/*`, `innovation-lab/*`, `virtual-clinic/*`, `crisis-comms/*`, `workshop/*` |
| 13 | **misc-edge** | 15 | `bounties`, `petitions`, `datasets`, `documents`, `tasks`, `notes`, `reflect`, `contribute`, `showcase`, `portfolio*`, `agents/*` |

Page counts are approximate — the skill discovers actual pages from the filesystem at runtime.

---

## Per-Page Check Protocol

For each page, run these checks in order:

### 1. Build Compilation (once per run)
- Run `npm run build` at the start of the walkthrough
- If build fails, report errors and stop — no point checking pages if the build is broken
- Record `buildStatus: "pass" | "fail"` in state file

### 2. HTTP 200
- `curl -s -o /dev/null -w "%{http_code}" -H "x-demo-user-email: <user>" localhost:3000/<route>`
- Dev server must be running (skill checks with a ping first; reminds user to start it if not)
- Auth: uses `x-demo-user-email` header (demo mode proxy passthrough)
- Flag any non-200 response

### 3. Console Errors & Server Errors
- After hitting the page via curl, read the **response body** for error indicators: Next.js error pages, "Internal Server Error", React error boundary output, `__NEXT_DATA__` with `err` field
- Read the **page source code** for common error-prone patterns: unguarded `.map()` on potentially null data, missing null checks on async fetches
- This is a static + response analysis — not a browser console check

### 4. API Dependency Trace
- Read the page source file and identify all `fetch("/api/...")`, `useSWR`, or server action calls
- Hit each API route with `curl -H "x-demo-user-email: <role-appropriate-user>"` 
- Verify each returns valid JSON, not 500/401/empty

### 5. Structural Sanity
- Read the page component code and verify:
  - Uses `PageHeader` component (per PLATFORM-CONSISTENCY-MANIFEST.md)
  - Follows layout conventions (`max-w-6xl`, `border rounded-2xl shadow-sm` cards, `font-extrabold` headings)
  - No hardcoded demo data that should come from DB
- Skip rules: login, signup, onboard, and public pages are exempt from PageHeader check

### 6. Data Presence
- For pages that fetch data, verify the response contains actual data for demo users
- Flag pages rendering empty states when demo data should exist
- Mark as `n/a` for pages that don't fetch data (static content, forms)

---

## Skip & Role Rules

### Dynamic Routes
- Pages with `[id]`, `[slug]`, `[roomId]`, etc. are tested with known demo data IDs where available
- If no known ID exists, skip the page with a note: `"skip:no-test-id"`
- The skill maintains a lookup of known test IDs (course IDs, room IDs, etc.) discovered from the database or seed scripts

### Role-Based Testing
- Pages are tested as the appropriate demo user based on their route prefix:
  - `admin/*` → heath.price@uky.edu (ADMIN)
  - `staff/*` → morgan.rivera@uky.edu (STAFF)
  - Educator-facing pages → katie.thompson@uky.edu (EDUCATOR)
  - Student-facing pages → tiana.the.student@uky.edu (STUDENT)
  - General pages → test as STUDENT (most restrictive)

---

## State File: `maintenance/walkthrough-state.json`

```json
{
  "lastRun": "2026-04-04",
  "buildStatus": "pass",
  "batches": {
    "core": {
      "status": "completed",
      "lastChecked": "2026-04-04",
      "pages": {
        "/today": {
          "http": 200,
          "consoleErrors": 0,
          "apiDeps": "pass",
          "structure": "pass",
          "data": "pass",
          "issues": []
        },
        "/settings": {
          "http": 200,
          "consoleErrors": 1,
          "apiDeps": "fail",
          "structure": "pass",
          "data": "pass",
          "issues": ["GET /api/settings returns 500 — missing user preferences table"]
        }
      }
    }
  },
  "summary": {
    "totalPages": 279,
    "checked": 0,
    "passed": 0,
    "issues": 0
  }
}
```

**Behavior:**
- Skill reads this file at the start of each run to determine next pending batch
- Updates after completing each batch
- Re-running on an already completed batch re-checks and overwrites (no locked state)
- Summary section rolls up totals across all batches
- If file doesn't exist, skill creates it with all batches set to `pending`

---

## Report Output

### Inline (during session)

Brief status per page as the batch is processed:

```
## Batch 1/13: Core (12 pages)
✓ /today — all checks pass
✓ /login — all checks pass
✗ /settings — API fail: GET /api/settings returns 500
✓ /signup — all checks pass
...
Core complete: 11/12 pass, 1 issue found
```

### Written Report: `maintenance/walkthrough-report-YYYY-MM-DD.md`

Written/updated after each batch completes:

```markdown
# Page Walkthrough Report — YYYY-MM-DD

## Summary
- **Build:** pass
- **Batches completed:** 3/13
- **Pages checked:** 62/279
- **Passed:** 58 | **Issues:** 4

## Issues Found

| Page | Check | Severity | Description |
|------|-------|----------|-------------|
| /settings | API dep | high | GET /api/settings returns 500 |
| /courses/abc123 | data | medium | Course page renders empty |

## Batch Status

| Batch | Status | Pages | Pass | Issues | Last Checked |
|-------|--------|-------|------|--------|--------------|
| Core | ✓ | 12 | 11 | 1 | 2026-04-04 |
| Courses & Learning | ✓ | 25 | 23 | 2 | 2026-04-04 |
| Admin & Compliance | pending | 25 | — | — | — |

## Next Run
Resume from: **Batch 4 — Admin & Compliance**
```

### Severity Levels

- **high** — page crashes, API 500s, auth failures, build errors
- **medium** — console errors, hydration mismatches, missing data, broken functionality
- **low** — structural drift, missing PageHeader, cosmetic pattern violations

---

## Skill File Conventions

Follows existing skill patterns:
- **Frontmatter:** `name`, `description`, `allowed-tools`, `context: fork`, `effort: high`
- **allowed-tools:** `Read, Grep, Glob, Bash(curl *, npm run *, npx tsc *)` — needs curl for HTTP checks and build commands
- **No code generation** — this is an audit/reporting skill only
- **Respects DO NOT REBUILD** — flags missing gamification references as "expected" not "broken"

---

## Key References

- Auth guard pattern: `app/lib/server-auth.ts`
- Route pattern: `withErrorHandling` + `parseRequestBody` (see CLAUDE.md)
- UI manifest: `PLATFORM-CONSISTENCY-MANIFEST.md`
- Demo users: heath (ADMIN), katie (EDUCATOR), tiana (STUDENT), morgan (STAFF)
- Proxy auth: `proxy.ts` — JWT cookie or `x-demo-user-email` header in demo mode
