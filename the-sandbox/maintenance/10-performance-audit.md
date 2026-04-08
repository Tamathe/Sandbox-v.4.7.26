# Performance Audit

**Frequency:** Monthly
**Time:** ~20 minutes

## Prompt

```
Run a performance audit:

1. **Bundle Analysis** — check for:
   - Large dependencies imported without tree-shaking (e.g., `import _ from 'lodash'`
     instead of `import get from 'lodash/get'`)
   - Heavy components that should be lazy-loaded with `dynamic()` or `React.lazy()`
   - Client components that could be server components
   - Barrel file re-exports pulling in unnecessary code

2. **Database Performance** — find:
   - N+1 query patterns (Prisma queries inside loops)
   - Queries without `select` fetching entire rows when few fields needed
   - Missing pagination on list endpoints
   - Queries that could benefit from Prisma's `findMany` with cursor-based pagination

3. **Rendering Performance** — find:
   - Components re-rendering unnecessarily (missing memo/useMemo/useCallback where
     it actually matters — large lists, expensive computations)
   - State stored too high in the tree causing cascade re-renders
   - Layout thrashing from repeated DOM reads/writes

4. **Network** — find:
   - Waterfall requests that could be parallelized (sequential awaits that are independent)
   - Missing revalidation/caching on data that doesn't change often
   - Large payloads being sent to the client (API returns full objects when subset needed)

5. **Images/Assets** — check:
   - Images not using next/image
   - Missing width/height causing layout shift
   - Large unoptimized assets

Output: Issue | File | Impact (High/Medium/Low) | Fix Complexity (Easy/Medium/Hard).
Fix easy wins. Report the rest.
```
