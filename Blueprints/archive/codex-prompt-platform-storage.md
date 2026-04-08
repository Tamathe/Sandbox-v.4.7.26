# Codex Prompt: Build Platform Storage

---

## Prompt

You are implementing **Platform Storage** for The Sandbox — a persistence layer that allows Playground apps to save and share data. This is Stage 2, built after the Playground (Stage 1) is live.

Read the full blueprint before writing any code:
**`c:\AA Code\Educator marketplace\Blueprints\platform-storage.md`**

Also read these existing files to understand patterns you must match:
- `the-sandbox/prisma/schema.prisma` — existing schema, add new models here
- `the-sandbox/app/lib/prisma.ts` — DB client pattern (PrismaPg adapter)
- `the-sandbox/app/api/chat/route.ts` — auth header pattern (`x-demo-user-email`)
- `the-sandbox/app/lib/auth-context.tsx` — useAuth() hook
- `the-sandbox/app/components/playground/AppPreview.tsx` — you will modify this file

---

## Task

Implement Platform Storage exactly as specified in the blueprint. Build in this order:

1. Add `PlaygroundApp`, `AppStoreEntry`, `AppStoreDelegate` models to `prisma/schema.prisma` then run `npx prisma migrate dev --name platform-storage`
2. `app/api/playground/token/route.ts` — JWT generation
3. `app/api/playground/apps/route.ts` — POST (create app)
4. `app/api/playground/apps/[appId]/route.ts` — PUT (update), DELETE
5. `app/api/playground/store/[appId]/user/[key]/route.ts` — GET + PUT
6. `app/api/playground/store/[appId]/collection/[name]/route.ts` — GET + POST
7. `app/api/playground/store/[appId]/collection/[name]/[entryId]/route.ts` — DELETE
8. `app/api/playground/store/[appId]/config/[key]/route.ts` — GET + PUT
9. `app/api/playground/apps/[appId]/delegates/route.ts` — GET + POST
10. `app/api/playground/apps/[appId]/delegates/[delegateId]/route.ts` — DELETE
11. Modify `app/components/playground/AppPreview.tsx` — add `appId` prop, token fetch, SANDBOX script injection
12. Modify `app/components/playground/PlaygroundLayout.tsx` — add Save button, wire to app CRUD, pass `appId` to AppPreview
13. Modify `app/api/playground/chat/route.ts` — append the SANDBOX API documentation section to the system prompt

---

## Constraints

- Match the code style, imports, and patterns of the existing codebase exactly
- Use `x-demo-user-email` header for user identity on all API routes (NOT the JWT — JWT is only for iframe-to-storage calls)
- The JWT for storage is separate from the demo auth system. Sign it with `process.env.STORAGE_JWT_SECRET`. Add this env var to `.env` with any non-empty string value for local dev.
- Add `NEXT_PUBLIC_APP_URL` to `.env` as `http://localhost:3000` for local dev — this is needed for the SANDBOX fetch base URL injected into the iframe
- Use `jsonwebtoken` package for JWT signing/verification. Install it: `npm install jsonwebtoken` and `npm install --save-dev @types/jsonwebtoken`
- The iframe `sandbox` attribute must remain `"allow-scripts"` ONLY — do NOT add `allow-same-origin` even though storage calls need fetch. Fetch works fine without allow-same-origin.
- The SANDBOX script must be injected as a string into the HTML BEFORE the closing `</head>` tag, not appended at the end of the body
- All size limits and count limits specified in the blueprint must be enforced with appropriate HTTP status codes (413 for size, 429 for count)
- `onDelete: Cascade` must be set on all relations from `PlaygroundApp` — deleting an app must clean up all store entries and delegates
- Use Prisma upsert (not create+catch) for user store and config PUT routes

---

## Key Behaviors to Verify After Building

1. User saves a Playground app → `PlaygroundApp` record created → `appId` returned → token fetched → SANDBOX script injected into iframe HTML
2. App calls `await SANDBOX.user.set('score', 94)` → `AppStoreEntry` row created with `type:'user'`, `bucket:'score'`, `userId`, `data:{value:94}`
3. Same user refreshes → `await SANDBOX.user.get('score')` returns `{value: 94}`
4. Different user opens the same app → their user store is empty (isolated)
5. App calls `await SANDBOX.collection('leaderboard').add({name:'Ian', score:94})` → row created
6. `await SANDBOX.collection('leaderboard').getAll()` returns all entries from all users
7. Non-creator user tries `await SANDBOX.config.set('key', val)` → 403 response → app shows error
8. Collection with 1000 entries → 1001st POST returns 429
9. Token with wrong appId → all storage routes return 403
10. Expired token → all storage routes return 401
