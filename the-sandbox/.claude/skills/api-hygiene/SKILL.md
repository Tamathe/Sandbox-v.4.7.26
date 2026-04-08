---
name: api-hygiene
description: Audit all API routes for auth guards, CRON_SECRET, error handling, response consistency, input validation, and shared pattern adoption (withErrorHandling, parseRequestBody, apiFetch). Weekly.
allowed-tools: Read, Grep, Glob, Bash(npx tsc *, npm run *)
context: fork
agent: Explore
---

# API Route Hygiene & Pattern Adoption Audit

Audit all API routes under `app/api/` for security, correctness, and shared pattern adoption.

## Checks

### Security & Correctness

1. **Auth Guards** — every non-public route must call `requireRequestUser`, `requireAdminUser`, `requireEducatorUser`, `requireStaffOrAdminUser`, `requireCourseOwner`, `requireToolOwner`, or `requireRegistrarUser` from `app/lib/server-auth.ts` before any DB access.

   **Known intentionally public routes** (skip these):
   - `/api/announcements`, `/api/compliance-health`, `/api/interests/suggest`, `/api/onboarding/interest-suggestions`
   - `/api/lti/jwks`, `/api/playground/apps/public`, `/api/portfolio-mapper/view/[shareToken]`
   - `/api/lti/course-map/[courseId]/week/[weekNumber]`, `/api/collab/stream/[id]`, `/api/playground/store/.../[entryId]`

2. **CRON Routes** — any route under `app/api/cron/` must call `verifyCronSecret(req)`.

3. **Error Handling** — appropriate status codes, no internal leaks, try/catch around DB calls.

4. **Response Consistency** — flag mixed `{ ok: true }` vs `{ success: true }` patterns.

5. **Method Handling** — routes only export HTTP methods they support, no dead handlers.

6. **Input Validation** — flag unvalidated query params/body passed to Prisma.

### Shared Pattern Adoption

7. **withErrorHandling** — every route must use the wrapper from `app/lib/api-utils.ts`. Flag manual outer try/catch or bare `export async function`.

8. **parseRequestBody** — every route reading JSON must use this instead of raw `req.json()`.

9. **require*User helpers** — flag routes manually reading headers instead of using `server-auth.ts` helpers.

10. **apiFetch adoption** — client components using raw `fetch()` with manual header injection instead of `apiFetch` from `app/lib/api-client.ts`.

11. **pdf-extract.ts** — any file importing `pdf-parse` directly instead of the shared wrapper.

12. **Adoption rate** — for each shared utility: X of Y eligible sites use the shared version.

## Output

Table: `Route/File | Issue | Severity (High/Medium/Low) | Status (Fixed/Needs Review)`

Fix anything straightforward. Flag anything needing architectural discussion.

## Key References
- Auth guards: `app/lib/server-auth.ts`
- Error handling: `app/lib/api-utils.ts` (`withErrorHandling`, `parseRequestBody`)
- Client fetch: `app/lib/api-client.ts` (`apiFetch`)
- PDF: `app/lib/pdf-extract.ts`
