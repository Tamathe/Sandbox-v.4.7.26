# Blueprint: Platform Storage — Persistence Layer for Playground Apps
### Feature: Storage API that Playground apps can call to persist and share data
### New models: `PlaygroundApp`, `AppStoreEntry`, `AppStoreDelegate`
### New API routes: `/api/playground/store/*`, `/api/playground/token`
### Depends on: Playground Stage 1 being live (`playground-vibe-coder.md`)
### Status: Stage 2 — build after Playground Stage 1 is stable

---

## 1. Vision

Playground apps are stateless today — every refresh starts fresh, no data persists, no user identity. Platform Storage changes that without requiring users to think about databases.

From the app's perspective, storage is a single `SANDBOX` object available globally:
```javascript
// Save the current user's score
await SANDBOX.user.set('score', 94)

// Read it back
const score = await SANDBOX.user.get('score')

// Add to a shared leaderboard
await SANDBOX.collection('leaderboard').add({ name: 'Ian', score: 94 })

// Read the leaderboard
const entries = await SANDBOX.collection('leaderboard').getAll({ orderBy: 'score', limit: 10 })
```

Claude generates this. Users never think about the API — they just describe what they want the app to remember.

---

## 2. Three Storage Types

### Type 1: User Store (`SANDBOX.user`)
- **Scope:** Per-user, per-app. Each user gets their own isolated namespace.
- **Read:** Own entries only
- **Write:** Own entries only
- **Use cases:** Save quiz progress, personal settings, "continue where you left off", personal high score
- **DB pattern:** Upsert on write (one entry per appId + key + userId)

### Type 2: Collection (`SANDBOX.collection(name)`)
- **Scope:** Shared across all users of the app
- **Read:** Anyone using the app
- **Write (add):** Any authenticated user
- **Write (delete):** App creator, their delegates, platform admins only
- **Use cases:** Leaderboards, class polls/voting, activity feeds, shared submissions, bracket results
- **DB pattern:** Append on write (multiple entries per appId + collection name)

### Type 3: Config (`SANDBOX.config`)
- **Scope:** Shared, owner-controlled
- **Read:** Anyone using the app
- **Write:** App creator and delegates only
- **Use cases:** App settings set once by creator (team names, question banks, seed data), admin-controlled state (entering game results, releasing correct answers)
- **DB pattern:** Upsert on write (one entry per appId + key)

---

## 3. Database Schema

Add these three models to `prisma/schema.prisma`:

```prisma
model PlaygroundApp {
  id          String   @id @default(cuid())
  creatorId   String
  creator     User     @relation(fields: [creatorId], references: [id])
  title       String   @default("Untitled App")
  description String?
  htmlContent String   @db.Text
  publishedAt DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  storeEntries AppStoreEntry[]
  delegates    AppStoreDelegate[]
}

model AppStoreEntry {
  id         String   @id @default(cuid())
  appId      String
  app        PlaygroundApp @relation(fields: [appId], references: [id], onDelete: Cascade)
  type       String   // 'user' | 'collection' | 'config'
  bucket     String   // key name (user/config) or collection name
  userId     String?  // null for config entries; the writing user for user/collection
  data       Json
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([appId, type, bucket])
  @@index([appId, type, bucket, userId])
}

model AppStoreDelegate {
  id        String   @id @default(cuid())
  appId     String
  app       PlaygroundApp @relation(fields: [appId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  grantedAt DateTime @default(now())

  @@unique([appId, userId])
}
```

**Notes:**
- `AppStoreEntry` with `type: 'user'` → unique per `appId + bucket + userId` (enforced in API logic, not DB constraint — allows upsert)
- `AppStoreEntry` with `type: 'config'` → unique per `appId + bucket` (same)
- `AppStoreEntry` with `type: 'collection'` → multiple per `appId + bucket` (append)
- `onDelete: Cascade` means all store entries are deleted when the app is deleted

---

## 4. Auth Model — Token Injection

The iframe is sandboxed (`sandbox="allow-scripts"` only). To make authenticated storage API calls from inside the iframe, a short-lived signed JWT is injected into the HTML before rendering.

### Token Generation: `GET /api/playground/token`

**Request:** Header `x-demo-user-email` (standard auth pattern)
**Query param:** `?appId=xxx`

**Response:**
```json
{
  "token": "eyJ...",
  "expiresIn": 3600
}
```

**JWT payload:**
```json
{
  "userId": "cuid-of-user",
  "email": "ian.mcclure.student@uky.edu",
  "appId": "cuid-of-app",
  "role": "creator" | "user",
  "iat": 1234567890,
  "exp": 1234571490
}
```

- Sign with `process.env.STORAGE_JWT_SECRET` (new env var, add to `.env`)
- TTL: 1 hour
- `role` is `"creator"` if the requesting user is the app's creator or a delegate; otherwise `"user"`

### Injection in `AppPreview.tsx`

When rendering an app with a known `appId`:
1. `AppPreview` calls `GET /api/playground/token?appId={appId}` (with auth header)
2. Injects a `<script>` block into the HTML string before setting `srcDoc`:

```javascript
// Injected before the closing </head> tag
const SANDBOX_SCRIPT = `
<script>
(function() {
  const TOKEN = "${token}";
  const APP_ID = "${appId}";
  const BASE = "${process.env.NEXT_PUBLIC_APP_URL}/api/playground/store";

  async function req(method, path, body) {
    const res = await fetch(BASE + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + TOKEN
      },
      body: body ? JSON.stringify(body) : undefined
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  window.SANDBOX = {
    user: {
      get: (key) => req('GET', '/' + APP_ID + '/user/' + key),
      set: (key, value) => req('PUT', '/' + APP_ID + '/user/' + key, { value })
    },
    collection: (name) => ({
      getAll: (opts = {}) => req('GET', '/' + APP_ID + '/collection/' + name + '?' + new URLSearchParams(opts)),
      add: (data) => req('POST', '/' + APP_ID + '/collection/' + name, { data }),
      delete: (id) => req('DELETE', '/' + APP_ID + '/collection/' + name + '/' + id)
    }),
    config: {
      get: (key) => req('GET', '/' + APP_ID + '/config/' + key),
      set: (key, value) => req('PUT', '/' + APP_ID + '/config/' + key, { value })
    }
  };
})();
<\/script>
`;
```

**When `appId` is not yet set** (user is still iterating in Playground, app not yet saved): SANDBOX object is not injected. If Claude generates code using `SANDBOX`, the app will fail with a clear error ("SANDBOX is not defined") which routes back to Claude for fixing. This is acceptable — users need to save their app to get storage.

---

## 5. API Routes

All routes live at `/api/playground/store/[appId]/[...path]/route.ts`.

**Auth for all routes:**
- Read `Authorization: Bearer {token}` header
- Verify JWT signature with `STORAGE_JWT_SECRET`
- Verify `appId` in JWT matches route param
- Return 401 if missing/invalid, 403 if insufficient permission

---

### User Store

**`GET /api/playground/store/[appId]/user/[key]`**
- Returns `{ value: any }` or `{ value: null }` if not set
- Auth: any valid token for this appId
- DB: find `AppStoreEntry` where `appId + type:'user' + bucket:key + userId:tokenUserId`

**`PUT /api/playground/store/[appId]/user/[key]`**
- Body: `{ value: any }`
- Upserts the entry (update if exists, create if not)
- Auth: any valid token for this appId
- Size limit: reject if `JSON.stringify(value).length > 102400` (100KB)

---

### Collection

**`GET /api/playground/store/[appId]/collection/[name]`**
- Query params: `orderBy?: 'createdAt' | string` (field name inside `data`), `order?: 'asc' | 'desc'`, `limit?: number` (max 100, default 50)
- Returns `{ entries: Array<{ id, userId, data, createdAt }> }`
- Auth: any valid token for this appId
- For `orderBy` on a nested `data` field: fetch all and sort in JS (acceptable for ≤1000 entries)

**`POST /api/playground/store/[appId]/collection/[name]`**
- Body: `{ data: object }`
- Appends a new entry attributed to `tokenUserId`
- Returns `{ id, userId, data, createdAt }`
- Auth: any valid token for this appId
- Size limit: reject if `JSON.stringify(data).length > 10240` (10KB per entry)
- Count limit: reject with 429 if collection already has ≥1000 entries

**`DELETE /api/playground/store/[appId]/collection/[name]/[entryId]`**
- Deletes the entry
- Auth: token must have `role: 'creator'` OR the entry's `userId` matches the token's `userId` (users can delete their own entries)
- Returns `{ deleted: true }`

---

### Config

**`GET /api/playground/store/[appId]/config/[key]`**
- Returns `{ value: any }` or `{ value: null }` if not set
- Auth: any valid token for this appId (world-readable)

**`PUT /api/playground/store/[appId]/config/[key]`**
- Body: `{ value: any }`
- Upserts the config entry
- Auth: token must have `role: 'creator'` ONLY
- Size limit: 100KB

---

## 6. Delegate Management

Delegates are trusted users who can write config and delete collection entries for an app.

**`GET /api/playground/apps/[appId]/delegates`**
- Returns list of delegates
- Auth: creator only

**`POST /api/playground/apps/[appId]/delegates`**
- Body: `{ email: string }`
- Looks up user by email, creates `AppStoreDelegate` record
- Auth: creator only
- Returns: `{ id, userId, email, name }`

**`DELETE /api/playground/apps/[appId]/delegates/[delegateId]`**
- Removes delegate
- Auth: creator only

---

## 7. App CRUD

These routes are needed to give apps an `appId` before storage can work.

**`POST /api/playground/apps`**
- Body: `{ title: string, htmlContent: string }`
- Creates a `PlaygroundApp` record, returns `{ id, title }`
- Auth: any authenticated user — they become the creator
- Called when user clicks "Save" in the Playground for the first time

**`PUT /api/playground/apps/[appId]`**
- Body: `{ title?: string, htmlContent?: string }`
- Updates the app
- Auth: creator only

**`DELETE /api/playground/apps/[appId]`**
- Deletes app + all store entries (cascade)
- Auth: creator only
- Confirmation required in UI

---

## 8. Limits

| Resource | Limit | Enforced By |
|---|---|---|
| User store key size | 100 KB | API route |
| Config key size | 100 KB | API route |
| Collection entry size | 10 KB | API route |
| Entries per collection | 1,000 | API route (429 response) |
| Total storage per app | 10 MB | Not enforced in Stage 2 — monitor and add later |
| Token TTL | 1 hour | JWT exp claim |

---

## 9. Updated System Prompt Addition (Platform Storage section)

When Storage is live, add this section to the `/api/playground/chat` system prompt:

```
## Persistence — SANDBOX Object
When the user's app needs to remember data (scores, progress, leaderboards, settings), use the SANDBOX object which is globally available in all saved apps.

SANDBOX API:
- SANDBOX.user.get(key) → returns { value } — current user's personal data
- SANDBOX.user.set(key, value) → saves current user's personal data
- SANDBOX.collection(name).getAll({ orderBy, order, limit }) → returns { entries: [{id, userId, data, createdAt}] }
- SANDBOX.collection(name).add(data) → appends entry to shared collection
- SANDBOX.collection(name).delete(id) → removes entry (creator/own entries only)
- SANDBOX.config.get(key) → returns { value } — app-wide config (readable by all)
- SANDBOX.config.set(key, value) → sets app-wide config (creator only)

All SANDBOX methods return Promises — always use await.

SANDBOX is only available after the user saves their app. If they haven't saved yet, SANDBOX is undefined. If you generate code using SANDBOX and the user gets a "SANDBOX is not defined" error, tell them: "Save your app first using the Save button — storage requires a saved app."

Choose the right type:
- Personal progress, user settings → SANDBOX.user
- Leaderboards, voting, shared feeds → SANDBOX.collection
- App-wide settings the creator controls → SANDBOX.config
```

---

## 10. Playground UI Changes (when Storage goes live)

**`PlaygroundLayout.tsx`:**
- Add "Save" button to top bar (enabled once `code !== ''`)
- On first save: calls `POST /api/playground/apps`, stores returned `appId` in state
- On subsequent saves: calls `PUT /api/playground/apps/[appId]`
- Once `appId` is set: `AppPreview` fetches a token and injects the SANDBOX script

**`AppPreview.tsx`:**
- Add `appId?: string` prop
- If `appId` is set: fetch token, inject SANDBOX script before rendering
- If `appId` is not set: render as before (no SANDBOX)

**`PlaygroundLayout.tsx` top bar final state:**
```
[The Playground]  [Save ✓]  [Export ↓]  [Delegates ⚙]  [← Build]
```

---

## 11. Implementation Order

1. **DB migration** — add `PlaygroundApp`, `AppStoreEntry`, `AppStoreDelegate` models, run `prisma migrate dev`
2. **`POST /api/playground/apps`** — create app, returns `appId`
3. **`GET /api/playground/token`** — JWT generation, verify it works with Postman/curl
4. **User store routes** — GET + PUT, test with curl using a real JWT
5. **Collection routes** — GET + POST + DELETE, test ordering and limits
6. **Config routes** — GET + PUT with creator-only gate
7. **SANDBOX script injection** in `AppPreview.tsx` — test that `window.SANDBOX` is available inside the iframe
8. **Save button** in `PlaygroundLayout.tsx` — wire to app CRUD
9. **Delegate management routes** + UI (simple modal, lower priority)
10. **Update system prompt** with SANDBOX API docs
11. **End-to-end test:** build a leaderboard app, save it, verify scores persist across refresh and are visible to multiple users
