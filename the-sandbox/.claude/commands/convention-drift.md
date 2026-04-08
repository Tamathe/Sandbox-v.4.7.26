Check for convention drift following `maintenance/05-convention-drift.md`. Audit:
1. Component state: `loading` not `isLoading`
2. Function verbs: no `load*` functions (should be `get*`)
3. File naming: kebab-case in lib/, PascalCase in components/
4. API client: `apiFetch` not raw `fetch()` with manual headers
5. Headings: `font-extrabold` not `font-bold`
6. Containers: `max-w-6xl` on page wrappers

Report violations with counts and fix the easy ones.