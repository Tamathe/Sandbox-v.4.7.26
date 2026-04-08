# Blueprint 7: Study Session Share Links — Meet Students Where They Coordinate

> **Sprint Scope:** Add shareable deep links to study rooms and Live Rooms that students can paste into iMessage, GroupMe, Discord, or any external chat — bridging the platform's collaboration features into the tools students already use.
> **Depends On:** Nothing — uses existing Live Room infrastructure.
> **Estimated Size:** Small (half sprint)
> **Deploy Order:** 7 of 10 — no prerequisites

---

## Context

The platform's messaging and study rooms compete with deeply entrenched communication tools (iMessage, GroupMe, Discord) that every student already uses. The social/collaboration layer requires network effects — students won't adopt a new messenger just to study together.

Instead of fighting this, **bridge into existing tools**: generate shareable URLs that students can paste into their group chat. One student creates a study room in Sandbox → copies a link → pastes into their iMessage group → classmates tap the link → land directly in the Sandbox study room.

This is how Zoom, Google Docs, and Figma grew — the product doesn't need to own the coordination channel, just the collaboration surface.

### Key Files to Create

| File | Purpose |
|------|---------|
| `app/api/live-rooms/[roomId]/share/route.ts` | **New:** GET — generate shareable link with metadata |
| `app/join/[roomId]/page.tsx` | **New:** landing page for shared links (auth-gated) |

### Key Files to Modify

| File | Change |
|------|--------|
| `app/components/live-rooms/ChallengeRoomOverlay.tsx` | Add "Share" button with copy-to-clipboard |
| `app/components/live-rooms/StudyRoomOverlay.tsx` | Add "Share" button |
| `app/components/live-rooms/WatchRoomOverlay.tsx` | Add "Share" button |
| `app/components/live-rooms/TeachBackOverlay.tsx` | Add "Share" button |
| `app/components/live-rooms/LiveRoomCard.tsx` | Add "Invite" action to room cards in chat |
| `app/api/community-pulse/route.ts` | Include share URLs in room data |

### Key Files to Read

| File | Why |
|------|-----|
| `app/lib/live-rooms/live-room-service.ts` | Room CRUD + join logic |
| `app/api/live-rooms/[roomId]/route.ts` | Existing room detail endpoint |
| `app/components/live-rooms/` | All overlay components for UI integration |

---

## Feature 1: Share Link Generation

### What

Every Live Room (Challenge, Study, Watch, Teach-Back) gets a shareable URL:
```
https://the-sandboxv2-rust.vercel.app/join/abc123-def456
```

This URL:
1. Works in any browser / any messaging app
2. Shows a preview card when pasted (Open Graph meta tags)
3. Handles auth (redirects to login if not authenticated, then back to the room)
4. Joins the room automatically after auth

### API: GET /api/live-rooms/[roomId]/share

```typescript
export const GET = withErrorHandling(async (req: NextRequest, { params }) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { roomId } = await params

  const room = await prisma.liveRoom.findUnique({
    where: { id: roomId },
    include: {
      participants: { select: { user: { select: { name: true } } } },
      channel: { select: { chatGroup: { select: { name: true } } } }
    }
  })

  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })

  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://the-sandboxv2-rust.vercel.app'}/join/${roomId}`

  const shareData = {
    url: shareUrl,
    title: room.title || `${room.type} Room`,
    description: buildShareDescription(room),
    participantCount: room.participants.length,
    type: room.type,
    phase: room.phase,
  }

  return NextResponse.json(shareData)
})

function buildShareDescription(room: LiveRoom & { participants: any[] }): string {
  const typeLabel = {
    CHALLENGE: 'Quiz Battle',
    STUDY: 'Study Session',
    WATCH: 'Watch Party',
    TEACHBACK: 'Teach-Back Circle'
  }[room.type]

  const count = room.participants.length
  return `Join ${count} ${count === 1 ? 'person' : 'people'} in a ${typeLabel}${room.title ? `: ${room.title}` : ''}`
}
```

### Share Text Templates

When the student taps "Share," generate a pre-formatted message they can paste:

```typescript
const SHARE_TEMPLATES: Record<LiveRoomType, (room: Room) => string> = {
  CHALLENGE: (r) => `🎯 Join my quiz battle on "${r.title}" in the platform!\n${r.shareUrl}`,
  STUDY: (r) => `📚 Study session happening now — ${r.title}. Join us!\n${r.shareUrl}`,
  WATCH: (r) => `📺 Watching ${r.title} together. Come hang!\n${r.shareUrl}`,
  TEACHBACK: (r) => `🎓 Teach-back circle on ${r.title}. Explain it to learn it!\n${r.shareUrl}`,
}
```

---

## Feature 2: Join Landing Page

### What

A public-ish landing page at `/join/[roomId]` that:
1. Shows room info (type, title, participants, status)
2. Handles authentication (if not logged in → redirect to `/login?redirect=/join/[roomId]`)
3. Auto-joins the room after auth
4. Redirects to the room's chat group in `/messages`

### Page: /join/[roomId]/page.tsx

```tsx
// Server component that fetches room data

export default async function JoinRoomPage({ params }) {
  const { roomId } = await params

  const room = await prisma.liveRoom.findUnique({
    where: { id: roomId },
    include: {
      participants: { include: { user: { select: { name: true, avatar: true } } } },
      channel: { select: { id: true, chatGroup: { select: { id: true, name: true } } } }
    }
  })

  if (!room) return <NotFoundState message="This room doesn't exist or has ended." />

  return <JoinRoomClient room={room} />
}

// Open Graph metadata for link previews
export async function generateMetadata({ params }) {
  const room = await prisma.liveRoom.findUnique({ where: { id: params.roomId } })
  if (!room) return { title: 'Room Not Found' }

  const typeEmoji = { CHALLENGE: '🎯', STUDY: '📚', WATCH: '📺', TEACHBACK: '🎓' }
  return {
    title: `${typeEmoji[room.type]} ${room.title || 'Live Room'} — the platform`,
    description: `Join this ${room.type.toLowerCase()} room on the platform`,
    openGraph: {
      title: `${room.title || 'Live Room'} — the platform`,
      description: `${room.participants?.length || 0} people in a live ${room.type.toLowerCase()} session`,
      type: 'website',
    }
  }
}
```

### Client Component: JoinRoomClient

```tsx
// JoinRoomClient.tsx

// States: loading → preview → joining → joined (redirect)

// Preview state shows:
// - Room type icon + title
// - Participant avatars (up to 5, "+N more")
// - Room status (LOBBY / ACTIVE / COMPLETE)
// - [Join Room] button (primary, UK Blue)
// - If COMPLETE: "This session has ended. [Start a new one →]"

// Join flow:
// 1. Check auth — if not logged in, redirect to /login?redirect=/join/{roomId}
// 2. POST /api/live-rooms/{roomId}/join — adds user as participant
// 3. Redirect to /messages/{groupId} with the room overlay auto-opening

// Error states:
// - Room not found: "This room doesn't exist."
// - Room full: "This room is at capacity."
// - Room ended: "This session has ended." + "Start a new one" button
// - Already joined: Skip join step, redirect directly
```

### Auth Redirect Flow

```typescript
// In JoinRoomClient, on mount:
const { user } = useAuth()

if (!user) {
  // Redirect to login with return URL
  router.push(`/login?redirect=${encodeURIComponent(`/join/${roomId}`)}`)
  return <LoadingSpinner />
}

// After login, user lands back at /join/{roomId} and the join flow continues
```

---

## Feature 3: Share Button on Room Overlays

### What

Add a share button to all 4 room overlay components + the LiveRoomCard in chat.

### UI

```
┌─────────────────────────────────────┐
│  Study Room: Evidence Exam Prep     │
│  3 participants · 15:42 remaining   │
│                                     │
│  [Share 🔗]  [Leave]               │
└─────────────────────────────────────┘
```

### Share Button Component

```tsx
// Reusable across all overlays

function ShareRoomButton({ roomId, roomType, title }: ShareButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/join/${roomId}`
    const shareText = SHARE_TEMPLATES[roomType]({ title, shareUrl })

    // Try Web Share API first (mobile)
    if (navigator.share) {
      await navigator.share({
        title: `${title} — the platform`,
        text: shareText,
        url: shareUrl,
      })
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(shareText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button onClick={handleShare} className="...">
      {copied ? <Check className="size-4" /> : <Share2 className="size-4" />}
      {copied ? 'Copied!' : 'Share'}
    </button>
  )
}
```

### Web Share API

On mobile devices that support it (iOS Safari, Android Chrome), `navigator.share()` opens the native share sheet — letting students send the link via iMessage, WhatsApp, Discord, or any other app directly. On desktop, falls back to clipboard copy with a "Copied!" confirmation.

---

## Feature 4: Quick Invite from Room Creation

### What

When a student creates a new Live Room (via `/challenge`, `/study`, `/watch`, or `/teachback` command in chat), show a **"Share with friends"** prompt after creation:

```
┌─────────────────────────────────────────────┐
│  ✓ Study Room created!                       │
│                                              │
│  Share this link to invite classmates:       │
│  ┌────────────────────────────────────────┐  │
│  │ https://the-sandbox.../join/abc123  📋 │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  [Share 🔗]          [Skip, start studying] │
└─────────────────────────────────────────────┘
```

This is a 3-second interstitial before the room starts — makes sharing frictionless at the moment of highest motivation (just created a room, want others to join).

---

## Feature 5: Homepage Study Room Nudge with Share

### What

The existing Sandy Briefing "Study Room" nudge ("2 classmates studying now — Join the study session") could also show for the student who **creates** a room: "You started a study room. Share with classmates?"

When the student starts a room from the homepage (via Smart Study or quick action), after the room is created, show a toast:

```
"Study room created! [Share link →] [Copy 📋]"
```

---

## Open Graph Preview

When a share link is pasted into iMessage, Slack, Discord, etc., the platform should render a rich preview:

```
┌─────────────────────────────────────┐
│  📚 Evidence Exam Prep              │
│  the platform                        │
│  Join 3 people in a study session   │
│  the-sandboxv2-rust.vercel.app      │
└─────────────────────────────────────┘
```

This is handled by the `generateMetadata()` function on the join page (Open Graph tags). Most messaging apps will auto-fetch and render these.

---

## Edge Cases

- **Room ended before link is used**: Join page shows "This session has ended" with a "Start a new one" button that pre-fills the same topic.
- **Room is full** (if capacity limits are added): Show "Room is at capacity" with "Notify me when a spot opens" option.
- **User already in the room**: Skip join → redirect directly to the room.
- **Non-UK user clicks link**: Show login/signup page. After creating an account, redirect back to the join page. (This is actually a growth vector — students invite friends who aren't on the platform yet.)
- **Link shared publicly**: Room is still gated by auth. No anonymous access.

---

## What This Does NOT Do

- Does not replace the in-platform messaging system (that stays for Sandbox-native communication)
- Does not create a Discord/GroupMe bot (that's pie-in-the-sky — this just generates links)
- Does not expose room content to unauthenticated users (auth required to join)
- Does not change how rooms work internally (just adds a new entry point via URL)
- Does not add push notifications for share link recipients (they just tap the link)

---

## Success Criteria

A student can create a study room and have 3 classmates join **within 60 seconds** by pasting a single link into their iMessage group chat. No Sandbox account setup for the inviter (they already have one). Invitees who don't have accounts are guided through signup and deposited directly into the room.
