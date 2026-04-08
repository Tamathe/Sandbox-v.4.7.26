---
name: environment-hygiene
description: Audit env var usage, .env.example sync, secret leakage, consistency patterns, Vercel alignment, graceful degradation. Biweekly.
allowed-tools: Read, Grep, Glob
context: fork
agent: Explore
---

# Environment Variable Hygiene Audit

Audit all environment variable usage for completeness, safety, and consistency.

## Checks

1. **Inventory** — grep every `process.env.` reference. Build table:
   `Variable | Used In (files) | Server-Only or NEXT_PUBLIC_ | Required or Optional`

2. **.env.example Sync**:
   - Vars used in code but missing from `.env.example`
   - Vars in `.env.example` never referenced in code (zombie)
   - Every var has a comment explaining its purpose

3. **Secret Leakage**:
   - Non-`NEXT_PUBLIC_` var accessed in client components
   - `NEXT_PUBLIC_` var containing a secret (API keys, tokens)
   - Hardcoded fallback values masking missing config (e.g., `process.env.SECRET || 'default'`)

4. **Consistency**:
   - Mixed patterns: `=== 'true'` vs truthiness for boolean env vars
   - Same var checked differently in different files
   - Boolean vars should consistently use `=== 'true'`

5. **Vercel Alignment**:
   - Env vars needing per-environment scoping (preview vs production)
   - Build-time vs runtime confusion

6. **Graceful Degradation**:
   - Optional services (Resend, Upstash) degrade gracefully when key missing
   - Required vars fail fast at startup, not on first request
   - Missing var = clear error, not silent failure

## Output

Table: `Variable | Issue | Severity (High/Medium/Low) | Status (Fixed/Needs Review)`

Fix documentation gaps (.env.example). Flag code changes for review.

## Key References
- Required: `DATABASE_URL`, `ANTHROPIC_API_KEY`
- Required for features: `AUTH_JWT_SECRET`, `STORAGE_JWT_SECRET`, `SANDCASTLE_WS_SECRET`, `CRON_SECRET`
- Optional: `RESEND_API_KEY`, `OPENAI_API_KEY`, `UPSTASH_*`
- Demo mode: `DEMO_MODE=true` (NOT `NEXT_PUBLIC_DEMO_MODE`)