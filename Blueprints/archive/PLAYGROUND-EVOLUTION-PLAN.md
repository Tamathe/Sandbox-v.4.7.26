# PLAYGROUND EVOLUTION — ARCHITECT PLAN

## What This Achieves

Transforms the Playground from a single-session prototyping tool into a full lifecycle environment: apps are discoverable (My Apps browsing), protected against accidental overwrite (auto-snapshots with restore), shareable as public embeds (publish toggle + public gallery), and secured consistently with the rest of the platform (auth and rate-limiting hardening). Educators and students will be able to build, save, version, publish, and share interactive educational apps without leaving the platform.

---

## Architectural Constraints

- **Prisma v7** — no `url` in datasource; PrismaPg adapter at runtime; prisma.config.ts
- **Tailwind v4** — no `@apply` with v3 class names; utility classes in JSX only
- **Auth** — `requireRequestUser()` from `app/lib/server-auth.ts` on all protected routes; no inline user lookups without LRU cache
- **Playground auth** — new `requirePlaygroundUser()` wrapper in `playground-storage.ts` (calls `getUserByEmail` from `server-auth.ts` for LRU caching + suspension check; throws `PlaygroundHttpError` for handler compatibility)
- **Icons** — lucide-react only
- **Rate limiting** — `checkRateLimit()` from `app/lib/rate-limit.ts` on all mutation routes
- **No `window.confirm()`** — inline React confirmation patterns only
- **No hardcoded emails or user IDs**
- **Build command:** `npm run build` from `c:\AA Code\Educator marketplace\the-sandbox\`
- **Prisma client import:** `../generated/prisma` (relative to `app/lib/`)
- **UK Blue:** `#0033A0`
- **Route logic rule:** API routes must be thin (auth → parse → call lib → return); no business logic in route files

---

## Schema Changes Required

### Add to `PlaygroundApp` model (in existing model block):

```prisma
// Add these two fields to the existing PlaygroundApp model:
tags      String[]  @default([])
snapshots PlaygroundAppSnapshot[]
```

### New model — add after `AppStoreDelegate` model:

```prisma
model PlaygroundAppSnapshot {
  id          String        @id @default(cuid())
  appId       String
  app         PlaygroundApp @relation(fields: [appId], references: [id], onDelete: Cascade)
  title       String
  htmlContent String        @db.Text
  reason      String        @default("auto")  // "auto" | "manual" | "restore"
  createdAt   DateTime      @default(now())

  @@index([appId, createdAt])
}
```

**Migration name:** `add-playground-snapshots`

---

## New API Routes

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/playground/apps/[appId]/snapshots` | requirePlaygroundUser, creator only | List up to 20 most recent snapshots |
| POST | `/api/playground/apps/[appId]/snapshots` | requirePlaygroundUser, creator only | Create a manual snapshot |
| POST | `/api/playground/apps/[appId]/snapshots/[snapshotId]/restore` | requirePlaygroundUser, creator only | Restore snapshot → auto-saves current state as "restore" snapshot first |
| POST | `/api/playground/apps/[appId]/publish` | requirePlaygroundUser, creator only | Set `publishedAt = now()` |
| DELETE | `/api/playground/apps/[appId]/publish` | requirePlaygroundUser, creator only | Set `publishedAt = null` |
| GET | `/api/playground/apps/public` | No auth (public) | List published apps with pagination |

### Snapshot list response shape:
```json
{
  "snapshots": [
    { "id": "...", "title": "...", "reason": "auto", "createdAt": "..." }
  ]
}
```

### Snapshot restore response shape:
```json
{ "restoredHtmlContent": "...", "restoredTitle": "..." }
```

### Publish response shape:
```json
{ "publishedAt": "2026-03-19T..." }
```

### Public gallery response shape:
```json
{
  "apps": [
    { "id": "...", "title": "...", "description": "...", "tags": [], "creatorName": "...", "publishedAt": "..." }
  ],
  "total": 42
}
```

---

## Component Changes

| Component | Action | Summary |
|-----------|--------|---------|
| `app/lib/playground-storage.ts` | Modify | Add `requirePlaygroundUser()` wrapper that uses `getUserByEmail` from server-auth (LRU cache + suspension) |
| `app/api/playground/apps/route.ts` | Modify | Replace `requireDemoUser` → `requirePlaygroundUser`; add rate limiting to POST |
| `app/api/playground/apps/[appId]/route.ts` | Modify | Replace `requireDemoUser` → `requirePlaygroundUser`; add rate limiting to PUT and DELETE; auto-snapshot before PUT if htmlContent changes |
| `app/api/playground/apps/[appId]/delegates/route.ts` | Modify | Replace `requireDemoUser` → `requirePlaygroundUser` |
| `app/api/playground/apps/[appId]/delegates/[delegateId]/route.ts` | Modify | Replace `requireDemoUser` → `requirePlaygroundUser` |
| `app/api/playground/token/route.ts` | Modify | Replace `requireDemoUser` → `requirePlaygroundUser` |
| `app/api/playground/export/route.ts` | Modify | Replace `requireDemoUser` → `requirePlaygroundUser` |
| `app/components/playground/PlaygroundLayout.tsx` | Modify | Add: delete button + inline confirm, publish toggle, tags input, snapshot history button, snapshot restore callback |
| `app/components/playground/SnapshotHistoryDrawer.tsx` | Create | Slide-in panel listing snapshots with restore button and inline confirm |
| `app/my-apps/page.tsx` | Create | My Apps browsing page — card grid, open/duplicate/delete |
| `app/app/[appId]/page.tsx` | Create | Public read-only app embed — renders the saved HTML in an iframe (no auth, 404 if not published) |
| `app/apps/page.tsx` | Create | Published playground apps gallery — card grid with search/filter by tag |

---

## Tasks

### Task 1: Auth Hardening — Replace `requireDemoUser` with `requirePlaygroundUser`

**Goal:** Fix all playground API routes to use the LRU-cached, suspension-aware auth helper instead of the bare inline DB lookup.

**Why:** `requireDemoUser` in `playground-storage.ts` calls `prisma.user.findUnique` directly, bypassing the 60-second LRU cache in `server-auth.ts` and skipping the suspension check. Every playground API call hits the DB unnecessarily, and suspended users can still access the Playground.

**Files to modify:**
- `app/lib/playground-storage.ts` — add `requirePlaygroundUser()` that imports `getUserByEmail` from `./server-auth`, checks `user.suspended`, throws `PlaygroundHttpError(403, 'Account suspended')` if true; keep `requireDemoUser` as a deprecated alias pointing to the new function (removes in Task 2 cleanup)
- `app/api/playground/apps/route.ts` — replace `requireDemoUser(request)` → `requirePlaygroundUser(request)` in GET and POST handlers
- `app/api/playground/apps/[appId]/route.ts` — replace all four handler calls
- `app/api/playground/apps/[appId]/delegates/route.ts` — replace call
- `app/api/playground/apps/[appId]/delegates/[delegateId]/route.ts` — replace call
- `app/api/playground/token/route.ts` — replace call
- `app/api/playground/export/route.ts` — replace call

**Files to create:** None

**Schema migration required:** No

**Verification steps:**
- Run `npm run build` — must pass with 0 errors
- Confirm `requireDemoUser` is no longer called anywhere (grep `requireDemoUser` in `app/api/playground/`)
- Confirm `requirePlaygroundUser` is imported from `playground-storage.ts` in all 6 route files

---

### Task 2: Rate Limiting on Playground Mutation Routes

**Goal:** Add `checkRateLimit` to the playground routes that create, update, and delete apps.

**Why:** `POST /api/playground/apps`, `PUT /api/playground/apps/[appId]`, and `DELETE /api/playground/apps/[appId]` currently have no rate limiting. This is inconsistent with the platform pattern (gradebook, sessions, portfolio routes all gate mutations).

**Files to modify:**
- `app/api/playground/apps/route.ts` — add `checkRateLimit(req, user.id, 'API', user.role !== 'STUDENT')` after auth in POST handler
- `app/api/playground/apps/[appId]/route.ts` — add rate limit check after auth in PUT and DELETE handlers; use `'GENERATE'` tier for PUT (expensive — triggers snapshot) and `'API'` tier for DELETE

**Files to create:** None

**Schema migration required:** No

**Verification steps:**
- Run `npm run build` — 0 errors
- Confirm each mutation handler has `checkRateLimit` before any DB write

---

### Task 3: Schema Migration — `PlaygroundAppSnapshot` + `tags` on `PlaygroundApp`

**Goal:** Add the snapshot model and tags field to the schema and run the migration.

**Why:** Version history (snapshots) and categorization (tags) are required by Tasks 4, 10, and 11. Schema must land before any code that references the new fields.

**Files to modify:**
- `prisma/schema.prisma` — add `tags String[] @default([])` and `snapshots PlaygroundAppSnapshot[]` to `PlaygroundApp` model; add the new `PlaygroundAppSnapshot` model block (see Schema Changes section above)

**Files to create:** None

**Schema migration required:** Yes — `add-playground-snapshots`

**Run sequence:**
```
npx prisma migrate dev --name add-playground-snapshots
npx prisma generate
npm run build
```

**Verification steps:**
- Migration runs without error
- `npm run build` passes with 0 errors
- Confirm `PlaygroundAppSnapshot` table exists in Neon DB (check via `npx prisma studio` or SQL)

---

### Task 4: Snapshot API Routes + Auto-snapshot on PUT

**Goal:** Implement the snapshot CRUD endpoints and wire auto-snapshot into the existing PUT handler.

**Why:** The PUT handler overwrites `htmlContent` permanently. Before overwriting, the current `htmlContent` should be saved as an auto-snapshot so users can roll back.

**Files to modify:**
- `app/api/playground/apps/[appId]/route.ts` — in the PUT handler, before `prisma.playgroundApp.update`, fetch the current `htmlContent` and create a `PlaygroundAppSnapshot` with `reason: 'auto'` if `htmlContent` in the body differs from the stored value; keep snapshot creation non-blocking (if it fails, the PUT still succeeds); cap snapshots at 20 per app (delete oldest if over limit after creating)

**Files to create:**
- `app/api/playground/apps/[appId]/snapshots/route.ts` — GET (list latest 20 snapshots, `select: { id, title, reason, createdAt }`) and POST (create manual snapshot) — both require `requirePlaygroundUser` and `assertCreator`
- `app/api/playground/apps/[appId]/snapshots/[snapshotId]/restore/route.ts` — POST: fetch snapshot, save current app state as a `reason: 'restore'` snapshot, then update the app's `htmlContent` and `title` to the snapshot values; return `{ restoredHtmlContent, restoredTitle }`; requires `requirePlaygroundUser` and `assertCreator`; add `checkRateLimit` with `'GENERATE'` tier

**Schema migration required:** No (runs on schema from Task 3)

**Verification steps:**
- Run `npm run build` — 0 errors
- Confirm `POST /api/playground/apps/[fakeId]/snapshots` returns 403/404 for wrong user (not the creator)
- Confirm a PUT to an existing app creates a row in `PlaygroundAppSnapshot`

---

### Task 5: My Apps Page

**Goal:** Create the `/my-apps` page so users can browse all their saved Playground apps.

**Why:** The current UX has no way to discover apps you've previously saved — you must remember the exact URL. This is the single biggest usability gap in the Playground.

**Files to create:**
- `app/my-apps/page.tsx` — Server component that renders a `MyAppsClient` wrapper; fetches nothing server-side (all data fetched client-side from `GET /api/playground/apps`)

**Files to modify:**
- `app/my-apps/page.tsx` (the client component embedded in it) — Card grid of apps showing `title`, `description`, `updatedAt` (formatted with `date-fns`); each card has: "Open" button (links to `/playground?app=[id]`), "Duplicate" button (calls `POST /api/playground/apps` with `sourceId`), "Delete" button with inline confirmation; empty state when no apps exist; loading skeleton; UK Blue header with "My Apps" title

**Schema migration required:** No

**Verification steps:**
- Run `npm run build` — 0 errors
- Navigate to `/my-apps` as a user with saved apps — cards appear
- Navigate as a user with 0 apps — empty state renders without crash
- Delete inline confirm works (no `window.confirm`)

---

### Task 6: Delete App from PlaygroundLayout

**Goal:** Add a delete button to the Playground header so creators can delete the current app from within the editor.

**Why:** There's currently no way to delete an app from the Playground itself; users must go to My Apps. Having the action in-context is faster and prevents app sprawl.

**Files to modify:**
- `app/components/playground/PlaygroundLayout.tsx` — Add a `Trash2` icon button in the right-side header button row (only visible when `appId !== null`); clicking it sets `deleteConfirm = true` state; show an inline confirmation banner (same pattern as `newSessionConfirm`): "Delete this app permanently?" with Cancel and Delete buttons; on confirm, call `DELETE /api/playground/apps/[appId]`, then call `handleNewSession()` and `router.push('/my-apps')`

**Files to create:** None

**Schema migration required:** No

**Verification steps:**
- Run `npm run build` — 0 errors
- Delete button hidden when no `appId`; visible when app is saved
- Delete confirm banner appears on click; Cancel dismisses it; Confirm deletes and navigates to `/my-apps`
- No `window.confirm()` used

---

### Task 7: Publish/Unpublish API Route

**Goal:** Add dedicated publish and unpublish endpoints for `PlaygroundApp`.

**Why:** The existing PATCH endpoint handles title/description only. Publish state is a distinct action with different authorization semantics (future: ADMIN could revoke; for now, creator only) and should be a dedicated route. The `publishedAt` field already exists in the schema.

**Files to create:**
- `app/api/playground/apps/[appId]/publish/route.ts` — POST (sets `publishedAt = new Date()`, returns `{ publishedAt }`) and DELETE (sets `publishedAt = null`, returns `{ publishedAt: null }`); both require `requirePlaygroundUser` + `assertCreator`; POST adds `checkRateLimit` with `'API'` tier

**Files to create:** None beyond the route file

**Schema migration required:** No

**Verification steps:**
- Run `npm run build` — 0 errors
- POST sets `publishedAt`; DELETE clears it; wrong user gets 403

---

### Task 8: Publish Toggle UI + Public Embed Page

**Goal:** Surface the publish action in `PlaygroundLayout` and create the public URL that anyone can visit to see a published app.

**Why:** Publishing is only useful if there's a shareable link and a UI to toggle it. Educators need to share a "live" URL with students.

**Files to modify:**
- `app/components/playground/PlaygroundLayout.tsx` — Add a `Globe` icon button in the header right-side area (only when `appId !== null`); clicking when unpublished calls `POST /api/playground/apps/[appId]/publish` and sets local `isPublished` state + shows a toast-style inline banner with the shareable URL (`/app/[appId]`); clicking when published calls `DELETE` to unpublish; show a `Globe` (green) or `GlobeOff` icon based on state; load initial published state from the app data already fetched in `loadAppId` effect (add `publishedAt` to the select fields)

**Files to create:**
- `app/app/[appId]/page.tsx` — Public read-only page (no auth required); fetches app via `GET /api/playground/apps/[appId]` but on the server using a new public-safe variant that only returns data if `publishedAt != null`; renders an iframe with the `htmlContent` (no SANDBOX injection for public view); returns 404 if not published

**Files to modify additionally:**
- `app/api/playground/apps/[appId]/route.ts` — Add a public read path: if no `x-demo-user-email` header and the method is GET, return the app if `publishedAt != null` (title, htmlContent, creatorId — no creatorId in response for privacy); if not published return 404

**Schema migration required:** No

**Verification steps:**
- Run `npm run build` — 0 errors
- Toggle publish → GET `/app/[appId]` returns the iframe page
- Unpublish → GET `/app/[appId]` returns 404
- Non-creator cannot publish via API (403)

---

### Task 9: Published Apps Gallery

**Goal:** Create a public gallery page at `/apps` showing all published Playground apps.

**Why:** Published apps have no discoverability without a gallery. This creates a "marketplace" dimension to the Playground — build something, publish it, let others discover and use it.

**Files to create:**
- `app/api/playground/apps/public/route.ts` — GET, no auth required; returns published apps (`publishedAt != null`) ordered by `publishedAt desc`; includes `id, title, description, tags, publishedAt`; excludes `htmlContent`; paginates (query param `?cursor=` and `?limit=24`); selects `creator: { select: { name: true } }` for creator name display
- `app/apps/page.tsx` — Client component; fetches from `/api/playground/apps/public`; renders a card grid (title, description, tags, creator name, published date); each card links to `/app/[appId]`; tag filter chips at top; search box (client-side filter against loaded data); empty state; UK Blue hero header "Published Apps — Built in The Sandbox"

**Schema migration required:** No

**Verification steps:**
- Run `npm run build` — 0 errors
- Unpublished apps do not appear in `/api/playground/apps/public`
- Published apps appear and are clickable through to the embed page

---

### Task 10: Snapshot History Panel

**Goal:** Add a version history drawer to `PlaygroundLayout` so creators can browse and restore previous snapshots without leaving the editor.

**Why:** Snapshots (created in Task 4) are useless without a UI. The restore flow must not require leaving the Playground.

**Files to create:**
- `app/components/playground/SnapshotHistoryDrawer.tsx` — Slide-in drawer (right edge, fixed position, z-50); lists snapshots from `GET /api/playground/apps/[appId]/snapshots`; each row shows `reason` badge, truncated title, formatted `createdAt`; "Restore" button on each row shows an inline confirm (`Restoring will replace current code. Continue?` + Cancel / Restore buttons); on confirm, calls `POST /api/playground/apps/[appId]/snapshots/[snapshotId]/restore`, then calls `onRestored(restoredHtmlContent, restoredTitle)` callback and closes the drawer; shows loading state during restore; "Create snapshot" button at top that calls `POST /api/playground/apps/[appId]/snapshots` with `reason: 'manual'`

**Files to modify:**
- `app/components/playground/PlaygroundLayout.tsx` — Add `History` icon button in header (only when `appId !== null`); clicking toggles `snapshotDrawerOpen` state; pass `appId`, `onRestored` callback (updates `code`, `appTitle`, `lastSavedCode`, `appDescription` to restored values) to `SnapshotHistoryDrawer`

**Schema migration required:** No (uses schema from Task 3, API from Task 4)

**Verification steps:**
- Run `npm run build` — 0 errors
- History button hidden when no `appId`; visible when saved
- Drawer opens, shows snapshot list; Restore inline confirm works; after restore, editor code updates to snapshot content

---

### Task 11: App Tags

**Goal:** Add a tags input to `PlaygroundLayout` so creators can categorize their apps, and wire it to the PATCH endpoint and the gallery filter.

**Why:** The `tags` field (added in Task 3) and the gallery filter chips (added in Task 9) need a UI to populate tags. Without this, all gallery filtering is empty.

**Files to modify:**
- `app/api/playground/apps/[appId]/route.ts` — Extend the PATCH handler to accept `tags?: string[]` in the body; trim each tag, lowercase, max 5 tags, max 30 chars each; validate and update
- `app/components/playground/PlaygroundLayout.tsx` — Below the description input in the header, add a tag input row (only visible when `appId !== null`, collapsed by default with a `Tag` icon + "Add tags" text that expands on click); shows current tags as dismissible pills; input for new tag with Enter key to add; max 5 tags enforced; on blur or Enter, calls `PATCH /api/playground/apps/[appId]` with updated tags array; load initial tags from the `loadAppId` effect (add `tags` to the select fields in the GET response)

**Files to create:** None

**Schema migration required:** No (uses schema from Task 3)

**Verification steps:**
- Run `npm run build` — 0 errors
- Tags appear as pills in PlaygroundLayout when app is loaded
- Adding/removing tags auto-saves via PATCH
- Tags appear in gallery cards and filter chips work

---

## Task Order Summary

| # | Task | Schema dep | API dep | Risk |
|---|------|-----------|---------|------|
| 1 | Auth hardening | None | None | Low |
| 2 | Rate limiting on mutations | None | Task 1 | Low |
| 3 | Schema migration: snapshots + tags | None | None | Low |
| 4 | Snapshot API routes + auto-snapshot | Task 3 | Task 1 | Medium |
| 5 | My Apps page | None | None | Low |
| 6 | Delete from PlaygroundLayout | None | Task 1 | Low |
| 7 | Publish/unpublish API | None | Task 1 | Low |
| 8 | Publish toggle UI + public embed page | None | Task 7 | Low |
| 9 | Published apps gallery | None | Task 7 | Low |
| 10 | Snapshot history panel | Task 3 | Task 4 | Medium |
| 11 | App tags | Task 3 | None | Low |
