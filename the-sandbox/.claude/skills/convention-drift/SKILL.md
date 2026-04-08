---
name: convention-drift
description: Audit for naming, file structure, component pattern, data fetching, styling, and API route convention inconsistencies. Biweekly.
allowed-tools: Read, Grep, Glob
context: fork
agent: Explore
---

# Convention Drift Audit

Audit the codebase for places where different parts follow different patterns for the same thing. **Report only — don't fix yet.**

## Checks

1. **Naming Conventions** — verify against CLAUDE.md rules:
   - Files: `app/lib/` kebab-case, `app/components/` PascalCase, `app/hooks/` camelCase+use prefix
   - Functions: `get*` (reads), `create*` (DB writes), `build*` (compute), NO `fetch*` (reserved) or `load*`
   - Components: `*Card`, `*Panel`, `*Modal`, `*View`, `*Viewer` suffixes
   - State: `loading` not `isLoading`, `setLoading` not `setIsLoading`

2. **File Organization** — do similar features follow the same structure? Mixed barrel file usage, mixed type placement (inline vs `.types.ts`).

3. **Component Patterns** — mixed state management (useState vs useReducer vs context for similar complexity), inconsistent loading/error/empty handling.

4. **Data Fetching** — should use `apiFetch` for all client-side calls. Flag any raw `fetch()` with manual header injection. Check `useEffect` cleanup with AbortController.

5. **Styling** — Tailwind v4 compliance:
   - No `@apply` in CSS files
   - `size-X` not `w-X h-X` for square elements
   - `font-extrabold` on h1/h2 headings
   - `max-w-6xl` on page containers
   - `border rounded-2xl shadow-sm` on cards
   - UK color tokens (`bg-uk-blue`) preferred over hex (`bg-[#0033A0]`)

6. **API Route Patterns** — all routes must use `withErrorHandling` + `parseRequestBody`. Flag any with manual try/catch, inline business logic, or `export async function`.

## Output

For each category: show competing conventions with examples, recommend which to standardize on (prefer most common / CLAUDE.md prescribed), and note files needing updates.