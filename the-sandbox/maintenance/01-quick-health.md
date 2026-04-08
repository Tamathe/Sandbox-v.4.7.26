# Quick Health Check

**Frequency:** Every session / before any sprint
**Time:** ~5 minutes

## Prompt

```
Run a quick health check on this codebase:

1. **TypeScript** — run `npx tsc --noEmit`. Fix any type errors.
2. **Unused Imports** — scan all .ts/.tsx files for unused imports. Remove them.
3. **Console Pollution** — find and remove stray console.log/warn/error left from debugging.
   Keep any that are inside dedicated logger utilities or explicitly marked "// intentional".
4. **Build Check** — run `npm run build` and fix any build failures.

For each category give a one-line summary: how many issues found, how many fixed.
Don't refactor or improve anything — just fix what's broken.
```
