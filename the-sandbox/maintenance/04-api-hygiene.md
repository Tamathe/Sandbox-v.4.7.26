# API Route Hygiene & Pattern Adoption

**Frequency:** Weekly
**Time:** ~20 minutes
**Why:** API routes are the security surface. Auth gaps, inconsistent error handling, and reinvented patterns create vulnerabilities and maintenance burden.

## Prompt

```
Audit all API routes under app/api/:

**Security & Correctness**

1. **Auth Guards** — every route that isn't public should check for the x-demo-user-email
   header (or whatever auth pattern this project uses). List any unprotected routes.
2. **CRON Routes** — any route meant for cron jobs should validate CRON_SECRET.
   List any that don't.
3. **Error Handling** — check that every route:
   - Returns appropriate HTTP status codes (not just 500 for everything)
   - Doesn't leak internal error messages or stack traces to the client
   - Has try/catch around database calls
4. **Response Consistency** — check that all routes follow the same response shape
   (e.g., { data, error } or { success, message }). Flag inconsistencies.
5. **Method Handling** — check that routes only export the HTTP methods they support
   and don't have dead method handlers.
6. **Input Validation** — flag any route that reads from request body or query params
   without validation (especially before passing to Prisma queries).

**Shared Pattern Adoption**

7. **withErrorHandling** — every route must use the wrapper from app/lib/api-utils.ts.
   Flag any with manual outer try/catch or bare `export async function`.
8. **parseRequestBody** — every route reading JSON must use this instead of raw req.json().
   List violations.
9. **require*User helpers** — routes that manually read headers instead of using
   requireRequestUser/requireAdminUser/etc from server-auth.ts. List violations.
10. **apiFetch adoption** — client components using raw fetch() with manual header
    injection instead of apiFetch from app/lib/api-client.ts. List violations.
11. **pdf-extract.ts** — any file importing pdf-parse directly instead of using the
    shared wrapper. List violations.
12. **Adoption rate** — for each shared utility, report: X of Y eligible call sites
    use the shared version.

Output a table: Route/File | Issue | Severity (High/Medium/Low) | Status (Fixed/Needs Review).
Fix anything straightforward. Flag anything that needs architectural discussion.
```
