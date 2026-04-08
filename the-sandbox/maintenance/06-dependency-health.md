# Dependency Health

**Frequency:** Biweekly
**Time:** ~10 minutes

## Prompt

```
Check dependency health:

1. **Vulnerabilities** — run `npm audit`. Summarize findings by severity.
   Fix any that can be resolved with `npm audit fix` (no --force).
2. **Unused Packages** — run `npx depcheck`. For each unused package, verify it's
   truly unused (depcheck has false positives for Tailwind plugins, PostCSS, etc.).
   Remove confirmed unused packages.
3. **Duplicate Packages** — check for packages that do the same thing
   (e.g., axios AND fetch wrappers, multiple date libraries, lodash AND ramda).
   Recommend consolidation.
4. **Outdated** — run `npm outdated`. Flag any packages more than 2 major versions behind.
   Don't auto-update — just report.
5. **AI-Added Bloat** — look for packages that were likely added by an AI session for a
   single use case and could be replaced with a few lines of native code
   (e.g., a full library just for one utility function).

Output: Package | Issue | Action (Removed/Updated/Needs Discussion).
```
