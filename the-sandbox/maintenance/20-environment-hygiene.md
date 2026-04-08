# Environment Variable Hygiene

**Frequency:** Biweekly
**Time:** ~15 minutes

## Prompt

```
Audit all environment variable usage across the codebase:

1. **Inventory** — grep for every `process.env.` reference. Build a table:
   Variable Name | Used In (files) | Server-Only or NEXT_PUBLIC_ | Required or Optional

2. **.env.example Sync** — compare the inventory against .env.example:
   - Flag vars used in code but missing from .env.example
   - Flag vars in .env.example but never referenced in code (zombie vars)
   - Verify every var has a comment explaining its purpose

3. **Secret Leakage** — check that no secret is exposed to the client:
   - Any non-NEXT_PUBLIC_ var accessed in a client component (files without
     'use server' or not in app/api/, app/lib/, or server-only modules)
   - Any NEXT_PUBLIC_ var that contains a secret (API keys, tokens, passwords)
   - Flag any env var with a hardcoded fallback value that masks missing config
     (e.g., `process.env.SECRET || 'default'`)

4. **Consistency** — check that env var checking is consistent:
   - Flag mixed patterns: `=== 'true'` vs truthiness (`if (process.env.X)`)
   - Flag vars that are checked differently in different files
   - Verify boolean env vars consistently use `=== 'true'` (strings, not truthy)

5. **Vercel Alignment** — check vercel.json and any deployment config:
   - Are env vars that need to differ per environment (preview vs production)
     properly scoped?
   - Flag any env var required at build time vs runtime confusion

6. **Graceful Degradation** — for each optional service (Resend, Upstash, etc.):
   - Verify the code degrades gracefully when the env var is missing
   - Flag any missing var that would cause a runtime crash instead of a clear error
   - Check that required vars fail fast at startup, not on first request

Output a table: Variable | Issue | Severity (High/Medium/Low) | Status (Fixed/Needs Review).
Fix documentation gaps (.env.example). Flag code changes for my review.
```
