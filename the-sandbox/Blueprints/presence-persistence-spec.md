# Technical Specification: Presence Persistence Enhancement
**Project:** The Sandbox (CATS-AI / University of Kentucky)
**Files:** `app/api/presence/route.ts`, `app/lib/presence-context.tsx`

---

## 1. Status: What Is Already Built

> **Do NOT re-implement any of the following. It is complete and working.**

| Component | File | Status |
|---|---|---|
| Presence context + BroadcastChannel heartbeat | `app/lib/presence-context.tsx` | ✅ Complete |
| WebRTC audio calling | `app/lib/presence-context.tsx` | ✅ Complete |
| Mode detection from path | `presence-context.tsx` → `getModeFromPath()` | ✅ Complete |
| Contacts in localStorage | `presence-context.tsx` → `addContact()` / `removeContact()` | ✅ Complete |
| Learn mode auto-decline | `presence-context.tsx` | ✅ Complete |
| Presence widget UI (floating panel) | `app/components/PresenceWidget.tsx` | ✅ Complete |
| Call overlay UI | `app/components/CallOverlay.tsx` | ✅ Complete |
| Providers wired in layout | `app/components/ClientProviders.tsx` | ✅ Complete |
| Schema: `lastPath`, `lastSeenAt`, `UserContact` | `prisma/schema.prisma` | ✅ Complete |

### Existing Mode Color System (DO NOT CHANGE)
```typescript
// In PresenceWidget.tsx and presence-context.tsx
learn   → red-500     // Focus mode, contacts hidden, calls auto-declined
build   → purple-500  // Creative mode, contactable
live    → green-500   // Social mode, contactable
explore → blue-400    // Home/browsing, contactable
null    → gray-300    // Offline
```

> **NOTE:** Gemini's spec uses blue for BUILD — the actual implementation uses **purple** for BUILD. Do not change the colors.

---

## 2. The Problem: Presence Is Tab-Local

The `BroadcastChannel` API only works within the **same browser on the same device**. Two users on different computers (or different browsers) cannot see each other's presence.

The schema already has `User.lastPath` and `User.lastSeenAt` fields for cross-browser presence. They are not yet wired up to an API.

**Goal:** Add a lightweight DB heartbeat so presence state is visible across browsers. The BroadcastChannel stays as-is for real-time same-tab responsiveness. The DB layer adds cross-browser discovery.

---

## 3. API Route: `app/api/presence/route.ts`

Create this file.

### PATCH — Update own presence

Called by the client when the path changes or as a 60-second keepalive.

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../lib/prisma'

export async function PATCH(req: NextRequest) {
  try {
    const userEmail = req.headers.get('x-demo-user-email')
    if (!userEmail) return NextResponse.json({ error: 'Auth required' }, { status: 401 })

    const { lastPath } = await req.json()

    await prisma.user.update({
      where: { email: userEmail },
      data: {
        lastPath: lastPath ?? null,
        lastSeenAt: new Date(),
      },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('PATCH /api/presence error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
```

### GET — Fetch recently active users

Returns users seen within the last 5 minutes. Used to seed presence for cross-browser visibility.

```typescript
export async function GET(req: NextRequest) {
  try {
    const userEmail = req.headers.get('x-demo-user-email')
    if (!userEmail) return NextResponse.json({ error: 'Auth required' }, { status: 401 })

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)

    const activeUsers = await prisma.user.findMany({
      where: {
        email: { not: userEmail },
        lastSeenAt: { gte: fiveMinutesAgo },
      },
      select: {
        email: true,
        name: true,
        lastPath: true,
        lastSeenAt: true,
      },
    })

    return NextResponse.json({ users: activeUsers })
  } catch (error) {
    console.error('GET /api/presence error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
```

---

## 4. Presence Context Updates (`app/lib/presence-context.tsx`)

Add two behaviors to the existing `PresenceProvider`. Do NOT change any existing logic.

### 4a. PATCH on path change

Inside `PresenceProvider`, add a `useEffect` that fires when `pathname` or `currentUser.email` changes. Reuse the existing `pathname` and `currentUser` that are already in the component.

```typescript
// Add this useEffect inside PresenceProvider, after the existing useEffects
useEffect(() => {
  fetch('/api/presence', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-demo-user-email': currentUser.email,
    },
    body: JSON.stringify({ lastPath: pathname }),
  }).catch(() => {}) // Fire-and-forget, never block UI
}, [pathname, currentUser.email])
```

### 4b. PATCH keepalive every 60 seconds

Add a `setInterval` inside the existing `useEffect` that sets up the BroadcastChannel. Place it alongside the existing `heartbeatTimer` and `pruneTimer`:

```typescript
const presenceTimer = setInterval(() => {
  fetch('/api/presence', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-demo-user-email': currentEmailRef.current,
    },
    body: JSON.stringify({ lastPath: window.location.pathname }),
  }).catch(() => {})
}, 60_000)

// Clean up in the return:
// clearInterval(presenceTimer)
```

### 4c. Seed DB users into onlineUsers on mount

Add a `useEffect` that fires once on mount to fetch DB-active users and merge them into `onlineUsers`. This seeds cross-browser visibility:

```typescript
useEffect(() => {
  fetch('/api/presence', {
    headers: { 'x-demo-user-email': currentUser.email },
  })
    .then((r) => r.json())
    .then((data) => {
      if (!Array.isArray(data.users)) return
      // Import getModeFromPath at top of file — it's already exported from this file
      setOnlineUsers((prev) => {
        const updated = [...prev]
        for (const u of data.users) {
          const mode = getModeFromPath(u.lastPath)
          const lastSeen = new Date(u.lastSeenAt).getTime()
          const idx = updated.findIndex((x) => x.email === u.email)
          if (idx >= 0) {
            // Only update if DB record is more recent than BroadcastChannel
            if (lastSeen > updated[idx].lastSeen) {
              updated[idx] = { ...updated[idx], lastSeen, mode }
            }
          } else {
            updated.push({ email: u.email, name: u.name, lastSeen, mode })
          }
        }
        return updated
      })
    })
    .catch(() => {})
}, [currentUser.email])
```

---

## 5. Migration

Run:
```bash
npx prisma migrate dev --name add-presence-fields
```

> The `lastPath` and `lastSeenAt` fields are already in the schema. Check `prisma migrate status` first — if they are already applied, skip this step.

---

## 6. Implementation Checklist for Codex

- [ ] **Presence API**: Create `app/api/presence/route.ts` with PATCH + GET handlers
- [ ] **Path heartbeat**: Add path-change `useEffect` in `PresenceProvider`
- [ ] **Keepalive**: Add 60s interval PATCH inside the BroadcastChannel `useEffect`
- [ ] **DB seed on mount**: Add mount `useEffect` to GET `/api/presence` and merge users
- [ ] **Migration**: Run `npx prisma migrate dev --name add-presence-fields` (or verify already applied)
- [ ] **Build**: Run `npm run build` — fix any TypeScript errors

---

## 7. What NOT to Change

- `app/components/PresenceWidget.tsx` — UI is complete, do not modify
- `app/components/CallOverlay.tsx` — complete, do not modify
- `app/components/ClientProviders.tsx` — complete, do not modify
- Mode colors in `PresenceWidget.tsx` — purple=build, red=learn, green=live, blue=explore
- The `SandboxMode` type — do not rename or add new modes
- Any existing `useEffect`, state, or WebRTC logic in `presence-context.tsx`

---

## 8. Why Not Implement `UserContact` DB Persistence?

The schema has a `UserContact` model. The current implementation stores contacts in `localStorage`. For this sprint, **keep localStorage**. Reasons:

1. The demo works fine with localStorage since all users are switching in the same browser
2. Adding DB contact management requires a CRUD UI that should be its own feature sprint
3. The localStorage key is scoped per user email, so contacts don't bleed between user switches

The `UserContact` model exists for production use when real SSO is in place.
