# Security Deep Dive

**Frequency:** Monthly
**Time:** ~45 minutes
**Prerequisite:** Run #04 API Hygiene first to catch surface-level auth gaps.

## Prompt

```
Run a security-focused audit across the entire codebase. This platform has 4 roles
(ADMIN, EDUCATOR, STUDENT, STAFF), JWT auth via proxy.ts, and demo mode. Think like
an attacker.

1. **Auth Bypass Scenarios** — for every API route under app/api/:
   - Verify the route calls the correct require*User helper (not just any auth check,
     but the RIGHT role check for the operation)
   - Flag routes where an authenticated user of the wrong role could access data
     (e.g., STUDENT hitting an ADMIN-only endpoint)
   - Check that proxy.ts correctly gates all /api/* paths — are there routes that
     bypass the proxy?

2. **Demo Mode Scope** — with DEMO_MODE=true:
   - What can a demo user access? List all routes that accept x-demo-user-email
   - Flag any write operations (POST/PUT/DELETE) accessible in demo mode that shouldn't be
   - Check that demo mode can't be enabled by a client header alone in production

3. **Injection Risks** — for every route that reads user input:
   - Check query params, request body, URL params, and headers
   - Flag any unvalidated input passed directly to Prisma queries (especially
     orderBy, where clauses with dynamic keys, or $queryRaw)
   - Flag any user input rendered in HTML without sanitization (XSS)
   - Check that file uploads (if any) validate file type and size

4. **JWT & Session Security**:
   - Verify JWT tokens have expiration
   - Check that token validation rejects expired/malformed tokens
   - Flag any routes that trust client-provided user IDs without verifying against
     the JWT subject
   - Check cookie flags (httpOnly, secure, sameSite)

5. **CORS & Security Headers**:
   - Check next.config headers (or proxy.ts) for: Content-Security-Policy,
     X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security
   - Flag any wildcard CORS origins
   - Check that API routes don't set overly permissive CORS headers

6. **Rate Limiting Coverage**:
   - List all routes that call external APIs (Anthropic, OpenAI, Resend)
   - Verify each has Upstash rate limiting applied
   - Flag auth endpoints (login, signup, password reset) without rate limiting
   - Check that rate limit error responses return 429 with Retry-After header

7. **Secret Exposure**:
   - Grep for hardcoded API keys, tokens, or passwords in source files
   - Check that no NEXT_PUBLIC_ env var exposes a secret
   - Verify .gitignore covers .env*, credentials files, and key files
   - Check client-side bundles don't include server-only imports

Output a table: Category | Finding | File(s) | Severity (Critical/High/Medium/Low) | Status (Fixed/Needs Review).
Fix anything safe (adding missing headers, removing hardcoded values).
Flag anything that needs architectural discussion or my review.
```
