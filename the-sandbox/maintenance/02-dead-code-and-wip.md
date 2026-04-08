# Dead Code & WIP Cleanup

**Frequency:** Weekly
**Time:** ~20 minutes
**Why:** AI agents leave behind dead exports, orphan files, half-finished work, and stale placeholders that accumulate as noise. This combined audit catches both "never used" and "started but abandoned."

## Prompt

```
Run a dead code and WIP cleanup audit:

**Dead Code**

1. **Unused Exports** — find exported functions, components, types, and constants that are
   never imported anywhere else. List them with file paths.
2. **Orphan Files** — find .ts/.tsx files that are not imported by any other file and are not
   entry points (pages, API routes, layout files, middleware, proxy.ts). Likely leftovers
   from abandoned approaches.
3. **Dead API Routes** — find routes under app/api/ that are never called from the frontend
   (search for fetch/apiFetch calls matching each route path).
4. **Dead Pages** — find pages under app/ that are never linked to from navigation, sidebar,
   or any other component.
5. **Stale TODO/FIXME/HACK** — list all TODO/FIXME/HACK comments. Flag any that reference
   completed work or no longer make sense.

**Abandoned WIP**

6. **Dead JSX** — components wrapped in {false && ...}, commented-out JSX blocks,
   or components that render null unconditionally.
7. **Placeholders** — badges, buttons, or UI elements saying "Coming Soon", "TODO", "WIP",
   "Not yet implemented", or permanently disabled. Are these still planned or stale promises?
8. **Zombie Env Vars** — process.env.SOMETHING checked in code but never set in .env,
   .env.example, or Vercel config.
9. **Naming Red Flags** — files, components, or functions with "v2", "new", "old", "temp",
   "test", "backup", "copy", or "deprecated" in the name. Usually indicates incomplete migration.
10. **Commented-Out Code** — large blocks (5+ lines) of commented-out code. If it's in git
    history, it doesn't need to live in the file.
11. **Conditional Dead Code** — if (false), if (0), feature flags always off with no mechanism
    to turn on.

Output a table: File | Issue | Category (Dead/WIP) | Recommendation (Remove / Finish / Investigate)

Remove anything clearly dead. Flag anything ambiguous for my review.
```

## Important Context

- Check CLAUDE.md "Do Not Rebuild" section before flagging things as missing
- Many features were intentionally deleted (gamification, easter eggs, duplicate chat)
- `proxy.ts` at root is NOT dead code — it's the auth gateway
- Playground templates in `app/lib/playground-templates/` are loaded dynamically
- Seeder scripts in `scripts/` are run manually, not imported
- `app/lib/ui-mode.ts` 'gamified' branch — DO NOT activate
- Unused dependencies: run `npx depcheck` to verify
