Scan for dead code following the guidance in `maintenance/02-dead-code.md`. Focus on:
1. Unused exports (functions, types, constants)
2. Orphan files (not imported anywhere)
3. Dead API routes (no client calls them)
4. Stale TODO/FIXME comments older than 2 weeks

List findings grouped by severity. Remove confirmed dead code. Do NOT remove anything ambiguous — flag it instead.