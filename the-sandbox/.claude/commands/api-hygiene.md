Audit API routes following `maintenance/04-api-hygiene.md`. Check:
1. Every route under `app/api/` has an auth guard (require*User or verifyCronSecret) before DB access
2. All POST/PUT/PATCH routes use `parseRequestBody` (not raw `req.json()`)
3. All routes wrapped with `withErrorHandling`
4. No `error.message` leaks in production responses
5. CRON_SECRET guards on all `/api/cron/` routes

Report violations with file paths and line numbers.