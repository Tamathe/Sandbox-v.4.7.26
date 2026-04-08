---
name: dead-code
description: Find and remove unused exports, orphan files, dead API routes, dead pages, stale TODOs, half-finished work, placeholders, zombie env vars, commented-out code. Weekly.
allowed-tools: Read, Grep, Glob, Bash(npx tsc *, npm run *, npx depcheck *)
context: fork
agent: Explore
---

# Dead Code & WIP Cleanup

Scan the codebase for dead code and abandoned work-in-progress. Remove what's clearly unused.

## Checks

### Dead Code

1. **Unused Exports** — exported functions, components, types, constants never imported elsewhere.

2. **Orphan Files** — `.ts`/`.tsx` files not imported by any other file and not entry points (pages, API routes, layout files, proxy.ts).

3. **Dead API Routes** — routes under `app/api/` never called from the frontend (search for fetch/apiFetch calls matching each route path).

4. **Dead Pages** — pages under `app/` never linked to from navigation, sidebar, or any component.

5. **Stale TODO/FIXME/HACK** — flag any referencing completed work or no longer making sense.

### Abandoned WIP

6. **Dead JSX** — `{false && ...}`, commented-out JSX blocks, components rendering `null` unconditionally.

7. **Placeholders** — "Coming Soon", "TODO", "WIP", "Not yet implemented", permanently disabled UI.

8. **Zombie Env Vars** — `process.env.SOMETHING` checked in code but never set in `.env`, `.env.example`, or Vercel.

9. **Naming Red Flags** — "v2", "new", "old", "temp", "test", "backup", "copy", "deprecated" in names.

10. **Commented-Out Code** — 5+ line blocks of commented-out code. If it's in git history, remove it.

11. **Conditional Dead Code** — `if (false)`, `if (0)`, feature flags always off. Check `app/lib/ui-mode.ts` 'gamified' branch (DO NOT activate).

12. **Unused Dependencies** — run `npx depcheck` to find packages never imported.

## Output

Table: `File | Issue | Category (Dead/WIP) | Recommendation (Remove / Finish / Investigate)`

Remove anything clearly dead. Flag anything ambiguous.

## Important Context

- Check CLAUDE.md "Do Not Rebuild" section before flagging things as missing
- Many features were intentionally deleted (gamification, easter eggs, duplicate chat)
- `proxy.ts` at root is NOT dead code — it's the auth gateway
- Playground templates in `app/lib/playground-templates/` are loaded dynamically
- Seeder scripts in `scripts/` are run manually, not imported