# Error UX Audit

**Frequency:** Monthly
**Time:** ~20 minutes
**Why:** AI agents add generic try/catch blocks that either swallow errors silently or leak raw error.message strings to users. Both create poor user experience and potential security issues.

## Prompt

```
Audit every user-facing error state in the codebase:

1. **Raw error leaks** — API routes that return error.message directly to the client.
   These can expose internal details (stack traces, DB errors, file paths).
   Should return generic user-friendly messages instead.
2. **Silent swallowing** — try/catch blocks that catch errors but don't surface them
   to the user OR log them. The error just disappears.
3. **Missing error boundaries** — Key pages/layouts without error.tsx or ErrorBoundary
   components. A crash in one component takes down the whole page.
4. **Hanging loading states** — Loading spinners or skeleton screens with no timeout
   or fallback. If the API never responds, the user sees a spinner forever.
5. **Inconsistent error display** — Some errors show as toast notifications, some as
   inline text, some as full-page errors. Map the patterns and flag inconsistencies.
6. **Missing loading states** — Pages or data-fetching components with no loading.tsx,
   Suspense boundary, or loading indicator at all.

For API routes specifically, check:
- Does the withErrorHandling wrapper handle the error, or is there a manual try/catch
  that bypasses it?
- Are error responses using consistent status codes (400 vs 422 vs 500)?
- Do error responses follow a consistent shape ({ error: string })?

Output a table: File | Issue Type | Severity (High/Med/Low) | Details

Fix high-severity items (raw error leaks, silent swallowing). Flag the rest
for my review.
```
