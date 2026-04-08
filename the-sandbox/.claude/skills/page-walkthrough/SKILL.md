---
name: page-walkthrough
description: Use when auditing platform pages for rendering, API health, structural consistency, and demo data presence. Walks through all ~280 pages in domain batches with persistent state tracking across sessions.
allowed-tools: Read, Grep, Glob, Bash(curl *, npm run *, npx tsc *)
context: fork
effort: high
---

# Page Walkthrough — Full Platform Audit

Walk through every page in the platform, verifying rendering, API dependencies, structural conventions, and demo data. Runs in domain batches with persistent state so work resumes across sessions.

## Execution Model

1. Read `maintenance/walkthrough-state.json` to find the next pending batch (create file if missing)
2. Process ONE batch per invocation (user can invoke again for more)
3. Update state file after each batch
4. Write/update `maintenance/walkthrough-report-YYYY-MM-DD.md`

## Startup Checks

Before processing any batch:

1. **Dev server running?** — `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000` → must be 200. If not, tell user to run `npm run dev`.
2. **Build status** — If `buildStatus` is not yet recorded for today, run `npm run build`. If build fails, report errors and STOP.

## Domain Batches (13)

| # | Domain | Route Prefixes |
|---|--------|----------------|
| 1 | core | `today`, `login`, `signup`, `onboard`, `settings`, `profile`, `notifications`, `my-profile`, `privacy`, `terms`, root `/` |
| 2 | courses-learning | `courses/*`, `academy`, `study/*`, `assignments/*`, `teach-back/*`, `practice`, `study-match` |
| 3 | ai-literacy | `(pages)/ai-literacy/**` |
| 4 | admin-compliance | `admin/*`, `compliance`, `accreditation/*` |
| 5 | registrar | `registrar/*`, `degree-plan`, `explore-majors` |
| 6 | staff | `staff/*` |
| 7 | tools-write-room | `tools/*`, `write-room/*`, `data-desk/*` |
| 8 | social-collaboration | `messages/*`, `community`, `debate/*`, `pitch/*`, `bracket/*`, `sandcastle/*`, `quiz-bowl/*`, `rooms`, `together` |
| 9 | analytics | `analytics/*`, `assessment/*` |
| 10 | content-publishing | `builder`, `studio`, `library`, `hub/*`, `uknow/*`, `audio/*`, `playground*` |
| 11 | wellness-campus | `wellness-hub/*`, `campus*`, `student-services/*`, `office-hours/*` |
| 12 | specialized-tools | `meeting-machine/*`, `research-hub/*`, `innovation-lab/*`, `virtual-clinic/*`, `crisis-comms/*`, `workshop/*` |
| 13 | misc-edge | `bounties`, `petitions`, `datasets`, `documents`, `tasks`, `notes`, `reflect`, `contribute`, `showcase`, `portfolio*`, `agents/*` |

**Page discovery:** Use `find app -name "page.tsx"` to discover actual pages. Map filesystem paths to routes (strip `app/`, route groups like `(pages)/`, `(main)/`). Assign each page to the matching batch by route prefix.

## Per-Page Checks

### 1. HTTP 200

```bash
curl -s -o /dev/null -w "%{http_code}" -H "x-demo-user-email: <email>" http://localhost:3000/<route>
```

Flag any non-200 response.

### 2. Response Body Errors

Fetch full response body and scan for:
- `"Internal Server Error"`, `"Application error"`, `"NEXT_NOT_FOUND"`
- `__NEXT_DATA__` containing `"err"` field
- React error boundary output
- Next.js error page markers

### 3. Source Code Review

Read the page component file and check for:
- Unguarded `.map()` on potentially null data
- Missing null checks on async fetches
- Obvious runtime error risks

### 4. API Dependency Trace

Read the page source and identify all `fetch("/api/...")`, `useSWR`, server action calls, and `apiFetch` calls. For each API route found:

```bash
curl -s -w "\n%{http_code}" -H "x-demo-user-email: <email>" http://localhost:3000/api/<path>
```

Verify each returns valid JSON with 200 status, not 500/401/empty.

### 5. Structural Sanity

Verify the page component:
- Uses `PageHeader` component (exempt: login, signup, onboard, public pages)
- Follows layout conventions: `max-w-6xl`, `border rounded-2xl shadow-sm` cards, `font-extrabold` headings
- No hardcoded demo data that should come from DB

### 6. Data Presence

For pages that fetch data, verify the response contains actual records for demo users. Flag pages showing empty states when demo data should exist. Mark `n/a` for static/form pages.

## Role Mapping

| Route Prefix | Demo User |
|-------------|-----------|
| `admin/*` | heath.price@uky.edu (ADMIN) |
| `staff/*` | morgan.rivera@uky.edu (STAFF) |
| `registrar/*`, `accreditation/*` | heath.price@uky.edu (ADMIN) |
| `courses/*` (teaching view), `teach-back/*` | katie.thompson@uky.edu (EDUCATOR) |
| `study/*`, `assignments/*`, student pages | tiana.the.student@uky.edu (STUDENT) |
| Everything else | tiana.the.student@uky.edu (STUDENT) |

## Dynamic Routes

Pages with `[id]`, `[slug]`, `[roomId]`, etc.:
- Use known demo data IDs where available (query DB or check seed scripts)
- If no known ID exists, skip with note: `"skip:no-test-id"`

## State File: `maintenance/walkthrough-state.json`

```json
{
  "lastRun": "YYYY-MM-DD",
  "buildStatus": "pass",
  "batches": {
    "<domain>": {
      "status": "completed | pending",
      "lastChecked": "YYYY-MM-DD",
      "pages": {
        "/<route>": {
          "http": 200,
          "consoleErrors": 0,
          "apiDeps": "pass | fail | n/a",
          "structure": "pass | fail | exempt",
          "data": "pass | fail | n/a | skip:no-test-id",
          "issues": []
        }
      }
    }
  },
  "summary": {
    "totalPages": 0,
    "checked": 0,
    "passed": 0,
    "issues": 0
  }
}
```

Re-running a completed batch overwrites its results.

## Inline Output

Print status per page as you go:

```
## Batch 1/13: Core (12 pages)
✓ /today — all checks pass
✗ /settings — API fail: GET /api/settings returns 500
Core complete: 11/12 pass, 1 issue found
```

## Report: `maintenance/walkthrough-report-YYYY-MM-DD.md`

Update after each batch:

```markdown
# Page Walkthrough Report — YYYY-MM-DD

## Summary
- **Build:** pass/fail
- **Batches completed:** X/13
- **Pages checked:** X/~280
- **Passed:** X | **Issues:** X

## Issues Found

| Page | Check | Severity | Description |
|------|-------|----------|-------------|
| /settings | API dep | high | GET /api/settings returns 500 |

## Batch Status

| Batch | Status | Pages | Pass | Issues | Last Checked |
|-------|--------|-------|------|--------|--------------|
| Core | ✓ | 12 | 11 | 1 | YYYY-MM-DD |

## Next Run
Resume from: **Batch N — <domain>**
```

## Severity Levels

- **high** — page crashes, API 500s, auth failures, build errors
- **medium** — response errors, hydration mismatches, missing data, broken functionality
- **low** — structural drift, missing PageHeader, cosmetic pattern violations

## Rules

- **No code generation** — this is audit/reporting only. Don't fix issues, just report them.
- **Respects DO NOT REBUILD** — gamification references (XP, Sand, Quests, Leagues) flagged as "expected removal" not "broken"
- **Intentionally public routes** — `/api/announcements`, `/api/compliance-health`, `/api/interests/suggest`, `/api/onboarding/interest-suggestions`, `/api/lti/jwks`, `/api/playground/apps/public`, `/api/portfolio-mapper/view/[shareToken]` — don't flag missing auth on these
