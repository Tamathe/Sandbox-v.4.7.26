---
name: security-deep-dive
description: Auth bypass, injection risks, JWT/session security, CORS, rate limiting, secret exposure. Monthly adversarial security audit.
allowed-tools: Read, Grep, Glob, Bash(npx tsc *, npm run *)
context: fork
agent: Explore
effort: high
---

# Security Deep Dive

Prerequisite: Run `/api-hygiene` first to catch surface-level auth gaps. This audit thinks like an attacker.

## Checks

1. **Auth Bypass Scenarios** — for every API route under `app/api/`:
   - Correct `require*User` helper (not just any auth, but the RIGHT role check)
   - Wrong-role access (STUDENT hitting ADMIN endpoint)
   - Routes that bypass `proxy.ts`

2. **Demo Mode Scope** — with `DEMO_MODE=true`:
   - What can demo users access? List all routes accepting `x-demo-user-email`
   - Flag write operations (POST/PUT/DELETE) in demo mode that shouldn't be
   - Verify demo mode can't be enabled by client header alone in production

3. **Injection Risks** — for every route reading user input:
   - Query params, body, URL params, headers → Prisma (especially orderBy, dynamic keys, `$queryRaw`)
   - User input rendered without sanitization (XSS)
   - File upload validation (type and size)

4. **JWT & Session Security**:
   - Token expiration, validation of expired/malformed tokens
   - Routes trusting client-provided user IDs without JWT verification
   - Cookie flags (httpOnly, secure, sameSite)

5. **CORS & Security Headers**:
   - CSP, X-Frame-Options, X-Content-Type-Options, HSTS
   - Wildcard CORS origins
   - Overly permissive CORS on API routes

6. **Rate Limiting Coverage**:
   - All routes calling external APIs (Anthropic, OpenAI, Resend) have Upstash rate limiting
   - Auth endpoints (login, signup) have rate limiting
   - 429 responses include Retry-After header

7. **Secret Exposure**:
   - Hardcoded API keys/tokens/passwords in source
   - `NEXT_PUBLIC_` env vars exposing secrets
   - `.gitignore` covers `.env*`, credentials, key files
   - Client bundles don't include server-only imports

## Output

Table: `Category | Finding | File(s) | Severity (Critical/High/Medium/Low) | Status (Fixed/Needs Review)`

Fix safe items (missing headers, removing hardcoded values). Flag architectural issues for review.

## Key References
- Auth guards: `app/lib/server-auth.ts`
- JWT: `app/lib/auth-jwt.ts`
- Proxy: `proxy.ts` (NEVER delete)
- Intentionally public routes: see CLAUDE.md