Quick performance check following `maintenance/10-performance-audit.md`. Look for:
1. N+1 query patterns in service files (loop with prisma calls inside)
2. Missing `Promise.allSettled` in dashboard/homepage data fetching
3. Components missing `next/dynamic` that should be lazy-loaded
4. Large imports that could be tree-shaken
5. Missing AbortController cleanup in useEffect data fetches

Report findings with file paths.