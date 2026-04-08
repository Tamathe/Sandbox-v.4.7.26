# Convention Drift Audit (AI-Specific)

**Frequency:** Biweekly
**Time:** ~20 minutes
**Why this matters:** Each AI session may adopt slightly different conventions. Over many sprints this creates a codebase that looks like it has 20 different authors with different style preferences.

## Prompt

```
Audit the codebase for convention drift — places where different parts of the code
follow different patterns for the same thing:

1. **Naming Conventions** — are files, components, functions, and variables named
   consistently? Look for:
   - Mixed casing (camelCase vs PascalCase vs kebab-case in filenames)
   - Inconsistent suffixes (UserCard vs CardUser, useAuth vs authHook)
   - Verb inconsistency (getUser vs fetchUser vs loadUser for the same pattern)

2. **File Organization** — do similar features follow the same structure?
   - Some features in one file, others split into components/hooks/utils
   - Inconsistent barrel file (index.ts) usage
   - Mixed placement of types (inline vs separate .types.ts files)

3. **Component Patterns** — look for:
   - Mixed state management approaches (useState vs useReducer vs context for similar complexity)
   - Inconsistent loading/error/empty state handling
   - Some components with prop drilling, others with context, for no clear reason

4. **Data Fetching** — are similar data needs handled the same way?
   - Mixed patterns (server components vs client fetch vs SWR/React Query)
   - Inconsistent cache/revalidation strategies

5. **Styling** — are Tailwind classes applied consistently?
   - Custom classes vs inline Tailwind for the same pattern
   - Inconsistent spacing/sizing scales
   - Duplicate color definitions or inconsistent color usage

6. **API Route Patterns** — check CLAUDE.md's prescribed route pattern
   (withErrorHandling + auth → parse → call lib → return) and flag routes
   that use different patterns (manual try/catch, inline business logic, etc.)

For each category, show the competing conventions with examples, recommend which
convention to standardize on (prefer the most common one), and note the files that
need updating. Don't fix yet — just produce the report so I can review.
```
