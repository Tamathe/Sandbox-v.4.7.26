---
name: health
description: Quick health check — TypeScript errors, unused imports, console pollution, build verification. Run every session before starting work.
allowed-tools: Read, Grep, Glob, Bash(npx tsc *, npm run *)
---

# Quick Health Check

Run a quick health check on the codebase. Fix what's broken, don't refactor.

## Steps

1. **TypeScript** — run `npx tsc --noEmit`. Fix any type errors.
2. **Unused Imports** — scan all .ts/.tsx files for unused imports. Remove them.
3. **Console Pollution** — find and remove stray `console.log`/`console.warn`/`console.error` left from debugging. Keep any inside dedicated logger utilities or explicitly marked `// intentional`.
4. **Build Check** — run `npm run build` and fix any build failures.

## Output

For each category give a one-line summary: how many issues found, how many fixed.

**Don't refactor or improve anything — just fix what's broken.**

## Project Context

- Working directory: `c:\AA Code\Educator marketplace\the-sandbox\`
- Build command: `npm run lint && npx tsc --noEmit && npm run build`
- Prisma generates before build (handled by `npm run build` script)