---
name: perf-audit
description: Performance audit — bundle analysis, N+1 queries, rendering issues, network waterfalls, image optimization. Monthly.
allowed-tools: Read, Grep, Glob, Bash(npx *, npm *)
context: fork
agent: Explore
---

# Performance Audit

## Checks

1. **Bundle Analysis**
   - Large dependencies imported without tree-shaking (e.g., `import _ from 'lodash'` instead of `import get from 'lodash/get'`)
   - Heavy components that should use `next/dynamic` with `{ ssr: false }` (already done for Leaflet, Monaco — check for others)
   - Client components that could be server components
   - Barrel file re-exports pulling in unnecessary code

2. **Database Performance**
   - N+1 query patterns (Prisma queries inside loops)
   - Queries without `select` fetching entire rows when few fields needed
   - Missing pagination on list endpoints
   - Check against existing bundle endpoints (`/api/faculty/home-bundle`, `/api/hub/explore-bundle`, `/api/student/home-bundle`, `/api/build/bundle`)

3. **Rendering Performance**
   - Components re-rendering unnecessarily (missing memo/useMemo/useCallback where it matters — large lists, expensive computations)
   - State stored too high causing cascade re-renders
   - Layout thrashing from repeated DOM reads/writes

4. **Network**
   - Waterfall requests that could be parallelized (sequential awaits for independent data)
   - Missing revalidation/caching on stable data (check `app/lib/cached-queries.ts` for coverage)
   - Large payloads sent to client (API returns full objects when subset needed)

5. **Images/Assets**
   - Images not using `next/image`
   - Missing width/height causing layout shift
   - Large unoptimized assets

## Output

Table: `Issue | File | Impact (High/Medium/Low) | Fix Complexity (Easy/Medium/Hard)`

Fix easy wins. Report the rest.

## Existing Optimizations (don't duplicate)
- 4 bundle endpoints consolidate 21 individual requests
- `unstable_cache` for degree programs, campus buildings, competency frameworks
- `@next/bundle-analyzer` available: `ANALYZE=true npx next build --webpack`
