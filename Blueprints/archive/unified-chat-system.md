# Unified Chat System — Deep Architecture Plan

## Overview

Embed a Discord-style group chat system into the existing Sandy concierge panel (`ConciergePanel.tsx`) as a second mode. Sandy remains the default; a toggle in the panel header switches to "Messages" — a unified inbox covering DMs, course channels, org groups, and private groups. No new pages; the entire experience lives in the right-rail panel (280px fixed, `w-80`, `z-40`) that's already on every page.

---

## Existing Infrastructure Inventory

### Schema Models (ALL already migrated — zero changes except `ChannelReadCursor`)

```
ChatGroup
  id             String    @id @default(cuid())
  name           String
  type           ChatGroupType  (COURSE | ORG | PRIVATE)
  courseId        String?   @unique          ← links to Course
  orgId           String?   @unique          ← links to Organization
  createdById     String
  sandyEnabled    Boolean   @default(false)
  sandyPersonaId  String?
  isArchived      Boolean   @default(false)
  createdAt       DateTime  @default(now())
  → channels[], memberships[], mutes[]

ChatChannel
  id          String        @id @default(cuid())
  groupId     String
  name        String
  type        ChannelType   (GENERAL | SANDY | ANNOUNCEMENTS | SUBGROUP)
  position    Int           @default(0)
  isDefault   Boolean       @default(false)
  createdById String
  → messages[], mutes[]
  @@unique([groupId, name])

ChatMembership
  id       String          @id @default(cuid())
  userId   String
  groupId  String
  role     ChatMemberRole  (OWNER | MODERATOR | MEMBER)
  joinedAt DateTime        @default(now())
  @@unique([userId, groupId])

ChannelMessage
  id             String    @id @default(cuid())
  channelId      String
  authorId       String
  content        String
  isPrivate      Boolean   @default(false)
  isSandy        Boolean   @default(false)
  crisisFlag     Boolean   @default(false)
  crisisSeverity String?
  editedAt       DateTime?
  deletedAt      DateTime?
  createdAt      DateTime  @default(now())
  → author (User), channel (ChatChannel), notifications[]

ChatMute
  id        String    @id @default(cuid())
  userId    String
  mutedById String
  groupId   String?
  channelId String?
  expiresAt DateTime?
  createdAt DateTime  @default(now())

ChannelNotification
  id        String    @id @default(cuid())
  userId    String
  messageId String
  type      ChannelNotificationType (DM | COURSE | UNIVERSITY)
  isRead    Boolean   @default(false)
  createdAt DateTime  @default(now())
```

### Service Layer (`app/lib/group-chat-service.ts` — 210 lines, fully built)

| Function | Signature | What It Does |
|---|---|---|
| `detectCrisisInMessage(content)` | `→ { crisisFlag: boolean, crisisSeverity: string \| null }` | Scans for HIGH (suicide, self-harm) and MEDIUM (assault, threatened) keywords |
| `publishToChannelStream(channelId, message)` | `→ void` | Publishes to Redis Streams key `channel:{id}:messages`; sets 24h TTL; no-ops if Redis unavailable |
| `generateSandyReply(channelId, groupId, userMessage)` | `→ Promise<void>` | Fetches last 10 non-Sandy messages for context; builds course-aware system prompt; calls Haiku (512 tokens); creates `ChannelMessage` with `isSandy: true`; publishes to stream |
| `isUserMuted(userId, channelId, groupId)` | `→ Promise<boolean>` | Checks for non-expired `ChatMute` matching channel OR group |
| `getUserGroupRole(userId, groupId)` | `→ Promise<ChatMemberRole \| null>` | Looks up `ChatMembership` unique constraint `[userId, groupId]` |
| `getEligibleGroups(userId)` | `→ Promise<{ courses: ChatGroup[], orgs: ChatGroup[] }>` | Returns groups user can join: COURSE groups linked to enrolled courses (via `CourseEnrollment`), ORG groups (all non-archived), excluding already-joined; PRIVATE never returned |

### API Routes (15 routes — ALL already built and correct)

#### `/api/chat/groups` — GET/POST
**GET** — Returns all non-archived `ChatGroup`s user is a member of. Includes channels (ordered by position) and `currentUserRole` per group.
```json
// Response shape:
[{
  "id": "cuid", "name": "TEK-100", "type": "COURSE",
  "courseId": "...", "sandyEnabled": true, "isArchived": false,
  "channels": [{ "id": "...", "name": "general", "type": "GENERAL", "position": 0, "isDefault": true }],
  "currentUserRole": "MEMBER"
}]
```

**POST** — Creates ORG or PRIVATE group. Body: `{ name: string, type: "ORG"|"PRIVATE", orgId?: string }`. Auto-creates `#general` channel + creator as OWNER. Returns group with channels and `currentUserRole: "OWNER"`. Returns 400 if `type === "COURSE"` (those are auto-created).

#### `/api/chat/groups/eligible` — GET
Returns `{ courses: ChatGroup[], orgs: ChatGroup[] }` — groups user can join but hasn't. PRIVATE never included.

#### `/api/chat/groups/[groupId]` — GET/PATCH/DELETE
**GET** — Group detail with channels, memberCount, currentUserRole. 404 if archived.
**PATCH** — Update `name` (1-80 chars) and/or `sandyEnabled`. Requires OWNER or MODERATOR.
**DELETE** — Sets `isArchived: true`. Requires OWNER or ADMIN.

#### `/api/chat/groups/[groupId]/join` — POST
Joins a group. Creates membership with `role: MEMBER`. Rules:
- PRIVATE → 403 ("invite-only")
- COURSE → checks `CourseEnrollment` exists; 403 if not enrolled
- Already member → 409
Response: `{ joined: true, groupId, role: "MEMBER" }`

#### `/api/chat/groups/[groupId]/leave` — POST
Leaves a group. Deletes membership. Rules:
- OWNER with other members → 400 ("Transfer ownership first")
- OWNER as last member → archives group automatically
Response: `{ left: true }`

#### `/api/chat/groups/[groupId]/members` — GET
Returns `{ members: [{ userId, name, email, avatarUrl, role, joinedAt }] }`. Requires membership.

#### `/api/chat/groups/[groupId]/members/[userId]` — PATCH
Updates member role. Body: `{ role: "MODERATOR"|"MEMBER" }`. OWNER-only. Cannot set OWNER, cannot change self.

#### `/api/chat/groups/[groupId]/channels` — GET/POST
**GET** — All channels sorted by position. Requires membership.
**POST** — Creates SUBGROUP channel. Body: `{ name: string, position?: number }`. OWNER/MODERATOR only. Name normalized: lowercase, spaces→hyphens, alphanumeric only, 1-40 chars. Position defaults to max+1.

#### `/api/chat/groups/[groupId]/channels/[channelId]` — DELETE
Hard-deletes channel. OWNER only. Cannot delete default, SANDY, or ANNOUNCEMENTS channels.

#### `/api/chat/channels/[channelId]/messages` — GET/POST
**GET** — Fetches messages with cursor pagination. Query: `limit` (1-100, default 50), `before` (message ID). Checks membership + mute. Admin sees crisisFlag/crisisSeverity; non-admin gets these stripped. Response:
```json
[{
  "id": "...", "channelId": "...", "authorId": "...", "content": "...",
  "isSandy": false, "editedAt": null, "deletedAt": null, "createdAt": "...",
  "author": { "name": "Ian McClure", "avatarUrl": null }
}]
```
**POST** — Sends message. Body: `{ content: string }` (1-4000 chars). Runs crisis detection. Publishes to Redis stream (fire-and-forget). If channel type is SANDY and group has `sandyEnabled: true`, triggers `generateSandyReply()` (fire-and-forget).

#### `/api/chat/channels/[channelId]/messages/[msgId]` — PATCH/DELETE
**PATCH** — Edit own message. Body: `{ content: string }`. Re-runs crisis detection. Sets `editedAt`.
**DELETE** — Soft-delete. Author OR group OWNER/MODERATOR OR platform ADMIN. Sets `deletedAt`, replaces content with `"[deleted]"`.

#### `/api/chat/groups/[groupId]/mute/[userId]` — POST/DELETE
**POST** — Mute user. Body: `{ durationMinutes?: number }`. ADMIN or OWNER/MODERATOR. Cannot mute OWNER.
**DELETE** — Unmute user. Deletes all matching ChatMute records.

#### `/api/chat/channels/[channelId]/mute/[userId]` — POST
Same as group mute but scoped to channel.

### ConciergePanel Structure (`app/components/ConciergePanel.tsx` — 805 lines)

**Desktop:** Fixed right panel, `top-16 right-0 h-[calc(100vh-64px)] w-80`, `z-40`, slides in/out with `translate-x-0 / translate-x-full` (300ms transition). Hidden below `lg` breakpoint.

**Mobile:** FAB button at `bottom-6 right-6` (56x56, `z-50`, blue gradient). Opens 80vh bottom-sheet modal with `bg-black/40 backdrop-blur-sm` overlay.

**Header bar** (rendered in `panelContent` variable):
- Blue-to-purple gradient (`from-[#0033A0] to-purple-700`)
- "S" avatar circle (36x36, white/20 bg)
- Title "Sandy" + context subtitle (changes per page)
- Clear chat button (RotateCcw, shown when messages exist and not compact)
- Compact toggle (ChevronUp/ChevronDown)
- Close button (X)

**Compact mode:** `compact` state persisted in `localStorage('sandy-compact')`. When true: entire messages area + input form hidden; only header visible.

**Key state:** `open`, `compact`, `mobileOpen`, `messages[]`, `input`, `isLoading`, `showBadge`, `showSandyTooltip`, `proactiveMessageId`, `panelMode` (TO BE ADDED).

### Existing DM System (SEPARATE — will be superseded)

`app/lib/messaging.ts` uses `Conversation` + `Message` models (different from `ChatGroup`/`ChannelMessage`). The `/messages` page and `MessageButton.tsx` (header unread badge, polls every 30s) use this system. New DMs will go through `ChatGroup` type=PRIVATE; old data stays in DB but we stop creating new `Conversation` records.

---

## NEW Schema Addition

Only one new model:

```prisma
model ChannelReadCursor {
  id         String      @id @default(cuid())
  userId     String
  channelId  String
  lastReadAt DateTime

  user       User        @relation(fields: [userId], references: [id])
  channel    ChatChannel @relation(fields: [channelId], references: [id], onDelete: Cascade)

  @@unique([userId, channelId])
}
```

Back-relations to add:
- On `User`: `channelReadCursors ChannelReadCursor[]`
- On `ChatChannel`: `readCursors ChannelReadCursor[]`

---

## New API Routes (2 new)

### `GET /api/chat/unread-count`

**Auth:** `requireRequestUser`

**Logic:**
1. Fetch all `ChatMembership` records for user → get `groupId` list
2. For each group, fetch all `ChatChannel` IDs
3. For each channel, fetch `ChannelReadCursor` (if exists) → get `lastReadAt`
4. Count `ChannelMessage` where `channelId` matches, `createdAt > lastReadAt` (or all messages if no cursor), `deletedAt IS NULL`, `authorId != userId`
5. Return `{ total: number, byGroup: [{ groupId, groupName, groupType, unreadCount }] }`

**Optimization:** Single raw SQL query joining `ChatMembership` → `ChatChannel` → `ChannelMessage` with LEFT JOIN on `ChannelReadCursor`. Group by `groupId`.

### `PATCH /api/chat/channels/[channelId]/read`

**Auth:** `requireRequestUser`

**Logic:**
1. Verify channel exists
2. Verify user is a member of the channel's group (via `getUserGroupRole`)
3. Upsert `ChannelReadCursor` with `lastReadAt: new Date()`
4. Return `{ ok: true }`

---

## New UI Components (6 new files)

### `app/components/chat/ChatInbox.tsx`

**Props:** `{ onSelectChannel: (channelId: string, groupId: string) => void }`

**On mount:** Fetch `GET /api/chat/groups` → store as `groups[]`. Also fetch `GET /api/chat/unread-count` → store as `unreadMap`.

**Render:**
1. Search bar: `<input type="text" placeholder="Search conversations..." />` — filters groups client-side by name
2. Three collapsible sections (always rendered, collapsed if empty):
   - **DIRECT MESSAGES** — groups where `type === 'PRIVATE'`. Display name = other member's name (filter out current user from memberships). Show avatar initial circle (first letter of name, blue bg).
   - **COURSES** — groups where `type === 'COURSE'`. Display name = group name (which is the course title). Show `GraduationCap` icon.
   - **GROUPS** — groups where `type === 'ORG'`. Display name = group name. Show `Users` icon.
3. Each row: clickable `<button>` with:
   - Left: icon/avatar initial
   - Center: name (bold if unread) + last message preview (gray, truncated 60 chars, italic if Sandy)
   - Right: relative timestamp (`formatDistanceToNow` from `date-fns`) + unread dot (blue `size-2 rounded-full bg-blue-500`)
4. Sort rows within each section by most recent message (descending)
5. Bottom: "Discover Groups" link → calls `onDiscover()` prop
6. Top-right: `[+]` button → calls `onNewConversation()` prop

**To get last message per group:** The `GET /api/chat/groups` response includes channels. For each group, take the default channel and show its last message. This requires extending the GET route OR making a separate lightweight call. **Decision:** Extend the `GET /api/chat/groups` response to include `lastMessage` per group (optional enhancement in the route handler — add a subquery for the most recent `ChannelMessage` per default channel). If that's too much for the first pass, fetch messages lazily when the inbox renders.

### `app/components/chat/ChatThread.tsx`

**Props:** `{ channelId: string, groupId: string, onBack: () => void }`

**On mount:**
1. Fetch `GET /api/chat/channels/{channelId}/messages?limit=50` → store as `messages[]`
2. Fetch `GET /api/chat/groups/{groupId}` → store group details (name, type, sandyEnabled, channels list)
3. Fire `PATCH /api/chat/channels/{channelId}/read` to mark as read

**Render:**
1. **Header row:**
   - `ArrowLeft` button → `onBack()`
   - Group name + `·` + channel name (e.g., "TEK-100 · #general")
   - `Hash` icon → opens `ChatChannelSwitcher`
   - `MoreVertical` icon → opens `ChatGroupSettings`
2. **Message list** (`role="log"`, `aria-live="polite"`):
   - Each message: author avatar initial (first letter, colored by role), author name (bold), timestamp (`format(createdAt, 'h:mm a')` from `date-fns`), content
   - Sandy messages (`isSandy`): purple-tinted bubble (`bg-purple-50 border border-purple-100`), `Bot` icon badge next to name
   - Deleted messages (`deletedAt` not null): gray italic "[Message deleted]"
   - Edited messages: "(edited)" label in gray after timestamp
   - Crisis-flagged messages: subtle `border-l-2 border-red-300` (only if current user is ADMIN or group OWNER/MODERATOR)
   - Own messages: aligned right with blue bubble (`bg-blue-50`)
3. **Message actions** (hover on desktop, long-press on mobile):
   - Own messages: "Edit" and "Delete" in a small dropdown
   - OWNER/MODERATOR: "Delete" on any message
   - Edit: inline textarea replacement, confirm/cancel buttons
   - Delete: inline confirm card ("Delete this message?" + Confirm/Cancel)
4. **Input area** (bottom, sticky):
   - `<textarea>` with `placeholder="Type a message..."`, rows=1, auto-grow to max 3 rows
   - `Send` icon button (blue gradient, same as Sandy's send button)
   - Enter to send, Shift+Enter for newline
   - Disabled when `isLoading`
5. **Auto-scroll:** `useEffect` scrolls to bottom on new messages. If user has scrolled up, show "New messages ↓" pill button.

**Polling:** `useEffect` with 10-second `setInterval` when component is mounted. Calls `GET /api/chat/channels/{channelId}/messages?after={lastMessageTimestamp}` (need to add `after` query param support to the existing route — see modifications below). Appends new messages. Fires read cursor update.

### `app/components/chat/ChatChannelSwitcher.tsx`

**Props:** `{ groupId: string, activeChannelId: string, onSelectChannel: (channelId: string) => void, onClose: () => void }`

**Render:** Small popover/dropdown (positioned below the `#` icon in the thread header).
- Lists all channels in the group (already available from the group detail fetch)
- Each row: type icon (`Hash` for GENERAL/SUBGROUP, `Megaphone` for ANNOUNCEMENTS, `Bot` for SANDY) + channel name
- Active channel: bold + blue left border
- OWNER/MODERATOR: "Create Channel" button at bottom → inline text input for name + confirm

### `app/components/chat/ChatGroupSettings.tsx`

**Props:** `{ groupId: string, currentUserRole: ChatMemberRole, onClose: () => void, onLeave: () => void }`

**Render:** Dropdown/panel from the `⋮` icon.
- **Members section:** Fetches `GET /api/chat/groups/{groupId}/members`. Lists each member with name, role badge, avatar initial. OWNER can tap a member to change role (MODERATOR ↔ MEMBER) or remove.
- **Actions:**
  - "Mute Group" toggle → `POST /api/chat/groups/{groupId}/mute/{userId}` / `DELETE` to unmute
  - "Leave Group" → confirm → `POST /api/chat/groups/{groupId}/leave` → calls `onLeave()` (returns to inbox). Hidden for COURSE groups.
  - OWNER: "Archive Group" → confirm → `DELETE /api/chat/groups/{groupId}`

### `app/components/chat/ChatDiscoverGroups.tsx`

**Props:** `{ onJoin: (groupId: string) => void, onBack: () => void }`

**On mount:** Fetch `GET /api/chat/groups/eligible`

**Render:**
- Header: `ArrowLeft` + "Discover Groups"
- Two sections: "Course Channels" and "Organizations"
- Each row: group name + type badge + "Join" button
- Join button: `POST /api/chat/groups/{groupId}/join` → on success, calls `onJoin(groupId)` (switches to that group's default channel)
- Empty state: "You're in all available groups!" with `CheckCircle` icon

### `app/components/chat/ChatNewConversation.tsx`

**Props:** `{ onCreated: (channelId: string, groupId: string) => void, onBack: () => void }`

**Render:** Two-option panel:
1. **"New Message"** — User search:
   - Text input → debounced fetch `GET /api/users?q={query}` (already exists)
   - Results list: name + role badge + department
   - Select user → check if PRIVATE group already exists between these two users (client-side check against groups list, or `POST /api/chat/groups` which handles dedup) → `POST /api/chat/groups` with `{ name: "{OtherUser} & {CurrentUser}", type: "PRIVATE" }` → calls `onCreated` with the new group's default channel
2. **"New Group"** — Name input + create:
   - Text input for group name
   - "Create" button → `POST /api/chat/groups` with `{ name, type: "PRIVATE" }` → calls `onCreated`

---

## Modified Files

### `prisma/schema.prisma`
- Add `ChannelReadCursor` model (see above)
- Add `channelReadCursors ChannelReadCursor[]` relation on `User` model
- Add `readCursors ChannelReadCursor[]` relation on `ChatChannel` model

### `app/components/ConciergePanel.tsx`

**Changes:**
1. Add `panelMode` state: `const [panelMode, setPanelMode] = useState<'sandy' | 'messages'>('sandy')` — persisted in `localStorage('sandy-panel-mode')`
2. Add `unreadCount` state: `const [unreadCount, setUnreadCount] = useState(0)`
3. Add `useEffect` to poll `GET /api/chat/unread-count` every 30 seconds → update `unreadCount`
4. Add `messagesView` state for sub-navigation within Messages mode: `'inbox' | 'thread' | 'discover' | 'new'`
5. Add `activeChannel` state: `{ channelId: string, groupId: string } | null`

**Header bar modification** — Replace the title area with a two-segment toggle when the panel is NOT in compact mode:

```tsx
// In the gradient header bar, replace the "Sandy" title section with:
<div className="flex-1 flex items-center gap-1 min-w-0">
  <button
    onClick={() => setPanelMode('sandy')}
    className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
      panelMode === 'sandy'
        ? 'bg-white/25 text-white'
        : 'text-white/60 hover:text-white/80'
    }`}
  >
    <Bot className="size-3.5 inline mr-1" />
    Sandy
  </button>
  <button
    onClick={() => setPanelMode('messages')}
    className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors relative ${
      panelMode === 'messages'
        ? 'bg-white/25 text-white'
        : 'text-white/60 hover:text-white/80'
    }`}
  >
    <MessageSquare className="size-3.5 inline mr-1" />
    Messages
    {unreadCount > 0 && (
      <span className="ml-1 bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0.5 font-bold">
        {unreadCount > 99 ? '99+' : unreadCount}
      </span>
    )}
  </button>
</div>
```

**Content area modification** — Wrap the existing Sandy content in a conditional, add Messages content:

```tsx
// Replace the existing panelContent body (everything after the header bar):
{panelMode === 'sandy' ? (
  // === EXISTING SANDY CONTENT (messages list + input form) — unchanged ===
  <>
    {!compact && <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
      {/* ... existing message rendering ... */}
    </div>}
    {!compact && <div className="flex-shrink-0 border-t border-gray-200 p-3 bg-white">
      {/* ... existing input form ... */}
    </div>}
  </>
) : (
  // === NEW MESSAGES CONTENT ===
  <div className="flex-1 overflow-hidden bg-white flex flex-col">
    {messagesView === 'inbox' && (
      <ChatInbox
        onSelectChannel={(channelId, groupId) => {
          setActiveChannel({ channelId, groupId })
          setMessagesView('thread')
        }}
        onDiscover={() => setMessagesView('discover')}
        onNewConversation={() => setMessagesView('new')}
      />
    )}
    {messagesView === 'thread' && activeChannel && (
      <ChatThread
        channelId={activeChannel.channelId}
        groupId={activeChannel.groupId}
        onBack={() => {
          setActiveChannel(null)
          setMessagesView('inbox')
        }}
      />
    )}
    {messagesView === 'discover' && (
      <ChatDiscoverGroups
        onJoin={(groupId) => {
          // After joining, switch to inbox to see the new group
          setMessagesView('inbox')
        }}
        onBack={() => setMessagesView('inbox')}
      />
    )}
    {messagesView === 'new' && (
      <ChatNewConversation
        onCreated={(channelId, groupId) => {
          setActiveChannel({ channelId, groupId })
          setMessagesView('thread')
        }}
        onBack={() => setMessagesView('inbox')}
      />
    )}
  </div>
)}
```

### `app/api/chat/channels/[channelId]/messages/route.ts`

**Modification to GET handler:** Add `after` query param support for polling:
```typescript
const after = searchParams.get('after')
// In the where clause, add:
...(after ? { createdAt: { gt: new Date(after) } } : {}),
// Remove the `before` cursor when `after` is present
```

### `app/api/chat/groups/route.ts`

**Modification to GET handler:** Add `lastMessage` to each group's response for inbox preview:
```typescript
// After fetching memberships, for each group get the last message from its default channel:
const defaultChannel = group.channels.find(c => c.isDefault)
const lastMessage = defaultChannel ? await prisma.channelMessage.findFirst({
  where: { channelId: defaultChannel.id, deletedAt: null },
  orderBy: { createdAt: 'desc' },
  select: { content: true, createdAt: true, isSandy: true, author: { select: { name: true } } }
}) : null
// Add to response: { ...group, lastMessage }
```

### `app/components/Header.tsx`

**Modification:** Update `MessageButton.tsx` (or the inline message badge logic) to use `GET /api/chat/unread-count` instead of the old `/api/messages/unread-count`. This unifies the badge across both systems.

### Enrollment/Course routes (auto-channel creation)

**In `/api/enrollment/route.ts` POST handler** (or whichever route handles student enrollment):
After creating the `CourseEnrollment` record, add:
```typescript
// Auto-join course chat group
const courseGroup = await prisma.chatGroup.findUnique({ where: { courseId } })
if (courseGroup) {
  await prisma.chatMembership.upsert({
    where: { userId_groupId: { userId: student.id, groupId: courseGroup.id } },
    update: {},
    create: { userId: student.id, groupId: courseGroup.id, role: 'MEMBER' },
  })
}
```

**In `/api/courses/route.ts` POST handler** (course creation):
After creating the course, add:
```typescript
// Auto-create course chat group
await prisma.chatGroup.create({
  data: {
    name: course.title,
    type: 'COURSE',
    courseId: course.id,
    createdById: user.id,
    sandyEnabled: true,
    channels: {
      create: [
        { name: 'general', type: 'GENERAL', isDefault: true, position: 0, createdById: user.id },
        { name: 'announcements', type: 'ANNOUNCEMENTS', isDefault: false, position: 1, createdById: user.id },
      ],
    },
    memberships: { create: { userId: user.id, role: 'OWNER' } },
  },
})
```

---

## Constraints & Guardrails

- **Auth:** Every new route calls `requireRequestUser` before any DB access
- **Route logic:** Routes are thin — auth → parse → call lib → return
- **Icons:** `lucide-react` only — `Bot`, `MessageSquare`, `Hash`, `Megaphone`, `Users`, `Plus`, `ArrowLeft`, `MoreVertical`, `Search`, `Send`, `GraduationCap`, `CheckCircle`, `Trash2`, `Pencil`
- **Tailwind v4:** No `@apply`; use `size-N` not `w-N h-N`; inline utility classes in JSX only
- **Prisma v7:** Import from `../generated/prisma`; use PrismaPg adapter; no `url` in datasource
- **FERPA:** Course channel messages are visible to all group members including the educator. No `sensitiveSession` filtering needed (chat is not AI-graded). Crisis detection already runs on every message.
- **Rate limiting:** Message send should use existing `CHAT` rate limit tier
- **No WebSockets:** App Router doesn't support them. 10s polling for thread, 30s for unread count.

---

## Task List (15 tasks, 7 phases)

| ID | Phase | Task | Files |
|---|---|---|---|
| CHAT-00 | 0 | Add `ChannelReadCursor` model + back-relations to schema; `npx prisma db push && npx prisma generate` | `prisma/schema.prisma` |
| CHAT-01 | 0 | Create `GET /api/chat/unread-count` + `PATCH /api/chat/channels/[channelId]/read` routes | 2 new route files |
| CHAT-02 | 1 | Add `panelMode` toggle to ConciergePanel header; conditional Sandy vs Messages rendering | `ConciergePanel.tsx` |
| CHAT-03 | 1 | Add 30s unread polling in ConciergePanel; update Header `MessageButton` to use unified count | `ConciergePanel.tsx`, `Header.tsx` or `MessageButton.tsx` |
| CHAT-04 | 2 | Build `ChatInbox.tsx` — grouped list (DMs/Courses/Groups), search, unread dots, last message preview | New `app/components/chat/ChatInbox.tsx` |
| CHAT-05 | 2 | Build `ChatNewConversation.tsx` — new DM (user search) + new group creation | New `app/components/chat/ChatNewConversation.tsx` |
| CHAT-06 | 2 | Build `ChatDiscoverGroups.tsx` — eligible groups with Join buttons | New `app/components/chat/ChatDiscoverGroups.tsx` |
| CHAT-07 | 3 | Build `ChatThread.tsx` — message list, author avatars, Sandy styling, crisis flags, read cursor | New `app/components/chat/ChatThread.tsx` |
| CHAT-08 | 3 | Add message input + send to ChatThread; optimistic insert; Enter/Shift+Enter; Sandy auto-reply | `ChatThread.tsx` |
| CHAT-09 | 3 | Add message edit/delete actions (own messages + moderator delete) | `ChatThread.tsx` |
| CHAT-10 | 4 | Build `ChatChannelSwitcher.tsx` — channel list popover, create channel | New `app/components/chat/ChatChannelSwitcher.tsx` |
| CHAT-11 | 4 | Build `ChatGroupSettings.tsx` — members list, role management, mute, leave, archive | New `app/components/chat/ChatGroupSettings.tsx` |
| CHAT-12 | 5 | Add 10s polling for new messages in ChatThread; `after` query param on messages GET route | `ChatThread.tsx`, `messages/route.ts` |
| CHAT-13 | 5 | Auto-create course ChatGroup on course creation; auto-join on enrollment | `courses/route.ts`, enrollment route |
| CHAT-14 | 6 | Mobile: full-modal messages, touch targets, ARIA attributes | All chat components |

---

## Implementation Prompts

Below are copy-paste prompts for executing this plan in a new Claude instance. Each prompt instructs Claude to complete exactly **two tasks**, then stop and output the next prompt.

---

### PROMPT 1 — Phase 0: Schema + Infrastructure

```
You are working on "The Sandbox" — a Next.js 16 App Router + Prisma v7 + Tailwind v4 educational platform at c:\AA Code\Educator marketplace\the-sandbox\.

Read CLAUDE.md first for all constraints (Prisma v7 driver adapter pattern, no @apply, lucide-react only, requireRequestUser on all routes, thin route handlers).

You are implementing the Unified Chat System from Blueprints/unified-chat-system.md. Complete these TWO tasks only, then STOP:

**CHAT-00: Add ChannelReadCursor model**
1. Read `prisma/schema.prisma` to find the Chat System section (around line 2536)
2. Add this model after the existing `ChannelNotification` model:
   ```prisma
   model ChannelReadCursor {
     id         String      @id @default(cuid())
     userId     String
     channelId  String
     lastReadAt DateTime

     user       User        @relation("UserReadCursors", fields: [userId], references: [id])
     channel    ChatChannel @relation(fields: [channelId], references: [id], onDelete: Cascade)

     @@unique([userId, channelId])
   }
   ```
3. Add the back-relation `channelReadCursors ChannelReadCursor[] @relation("UserReadCursors")` on the User model (in the "Chat System relations" section around line 121)
4. Add the back-relation `readCursors ChannelReadCursor[]` on the ChatChannel model (around line 2610)
5. Run: `npx prisma db push` then `npx prisma generate`

**CHAT-01: Create unread-count + read-cursor API routes**
1. Create `app/api/chat/unread-count/route.ts`:
   - GET handler with `requireRequestUser`
   - Fetch all user's ChatMembership → get groupIds
   - For each group's channels, count ChannelMessages where createdAt > ChannelReadCursor.lastReadAt (or all if no cursor), deletedAt IS NULL, authorId != userId
   - Use a single raw SQL query for efficiency:
     ```sql
     SELECT cg.id as "groupId", cg.name as "groupName", cg.type as "groupType",
            COUNT(cm.id)::int as "unreadCount"
     FROM "ChatMembership" mem
     JOIN "ChatGroup" cg ON cg.id = mem."groupId" AND cg."isArchived" = false
     JOIN "ChatChannel" cc ON cc."groupId" = cg.id
     LEFT JOIN "ChannelReadCursor" crc ON crc."channelId" = cc.id AND crc."userId" = mem."userId"
     LEFT JOIN "ChannelMessage" cm ON cm."channelId" = cc.id
       AND cm."deletedAt" IS NULL
       AND cm."authorId" != mem."userId"
       AND (crc."lastReadAt" IS NULL OR cm."createdAt" > crc."lastReadAt")
     WHERE mem."userId" = $1
     GROUP BY cg.id, cg.name, cg.type
     ```
   - Return `{ total: number, byGroup: [{ groupId, groupName, groupType, unreadCount }] }`

2. Create `app/api/chat/channels/[channelId]/read/route.ts`:
   - PATCH handler with `requireRequestUser`
   - Verify channel exists via `prisma.chatChannel.findUnique`
   - Verify user is a member via `getUserGroupRole(userId, channel.groupId)`
   - Upsert ChannelReadCursor: `prisma.channelReadCursor.upsert({ where: { userId_channelId: { userId, channelId } }, update: { lastReadAt: new Date() }, create: { userId, channelId, lastReadAt: new Date() } })`
   - Return `{ ok: true }`

After completing both tasks, run: `npm run lint && npx tsc --noEmit && npm run build`

STOP after these 2 tasks. Do not proceed to Phase 1. Output the following next prompt for the user to copy-paste into a new Claude instance:

"Phase 0 complete. Paste PROMPT 2 from Blueprints/unified-chat-system.md to continue with Phase 1 (CHAT-02 + CHAT-03: Panel mode toggle + unread badge polling)."
```

---

### PROMPT 2 — Phase 1: Panel Mode Toggle

```
You are working on "The Sandbox" — a Next.js 16 App Router + Prisma v7 + Tailwind v4 educational platform at c:\AA Code\Educator marketplace\the-sandbox\.

Read CLAUDE.md first for all constraints. Read Blueprints/unified-chat-system.md for the full architecture.

Phase 0 is complete (ChannelReadCursor model + unread-count/read routes). Complete these TWO tasks only, then STOP:

**CHAT-02: Add mode toggle to ConciergePanel header**
1. Read `app/components/ConciergePanel.tsx` fully (805 lines)
2. Add imports: `MessageSquare` from lucide-react
3. Add state:
   - `panelMode: 'sandy' | 'messages'` — init from `localStorage('sandy-panel-mode')` or default `'sandy'`
   - `messagesView: 'inbox' | 'thread' | 'discover' | 'new'` — default `'inbox'`
   - `activeChannel: { channelId: string, groupId: string } | null` — default `null`
4. In the gradient header bar (the div starting around line 531 with `bg-gradient-to-r from-[#0033A0] to-purple-700`), replace the title section (the "Sandy" text + subtitle div) with a two-segment pill toggle:
   - Left pill: Bot icon + "Sandy" — active when `panelMode === 'sandy'`
   - Right pill: MessageSquare icon + "Messages" + unread badge — active when `panelMode === 'messages'`
   - Active style: `bg-white/25 text-white`; inactive: `text-white/60 hover:text-white/80`
   - Both pills: `px-3 py-1 rounded-full text-xs font-semibold transition-colors`
5. Wrap the existing Sandy content (messages area + input form, everything after the header in `panelContent`) in `{panelMode === 'sandy' && (<>...</>)}`
6. Add the Messages content area: `{panelMode === 'messages' && (<div className="flex-1 overflow-hidden bg-white flex flex-col"><p className="p-4 text-sm text-gray-500">Messages coming soon...</p></div>)}` — this is a placeholder; the real components come in Phase 2.
7. Persist `panelMode` to localStorage on change.
8. When switching to Messages, reset `messagesView` to `'inbox'` and `activeChannel` to `null`.

**CHAT-03: Unread badge polling**
1. In ConciergePanel, add `unreadCount` state (default 0)
2. Add a `useEffect` that polls `GET /api/chat/unread-count` every 30 seconds (only when panel is mounted, regardless of mode). Pass `x-demo-user-email` header from `currentUser.email`. Parse response and set `unreadCount` to `response.total`. Clean up interval on unmount.
3. Display `unreadCount` on the Messages toggle pill: if > 0, show a `<span>` with red bg + white text, `text-[10px] rounded-full px-1.5`. Show "99+" if > 99.
4. In `app/components/Header.tsx` (or `MessageButton.tsx`), find the existing unread message badge polling. Update it to also call `GET /api/chat/unread-count` and ADD that total to the existing DM unread count for the badge number. This way the header badge reflects both old DMs and new group chat unreads.

After completing both tasks, run: `npm run lint && npx tsc --noEmit && npm run build`

STOP after these 2 tasks. Do not proceed to Phase 2. Output:

"Phase 1 complete. Paste PROMPT 3 from Blueprints/unified-chat-system.md to continue with Phase 2a (CHAT-04 + CHAT-05: ChatInbox + ChatNewConversation)."
```

---

### PROMPT 3 — Phase 2a: Inbox + New Conversation

```
You are working on "The Sandbox" — a Next.js 16 App Router + Prisma v7 + Tailwind v4 educational platform at c:\AA Code\Educator marketplace\the-sandbox\.

Read CLAUDE.md first for all constraints. Read Blueprints/unified-chat-system.md for the full architecture.

Phases 0-1 are complete (schema, routes, panel toggle, polling). Complete these TWO tasks only, then STOP:

**CHAT-04: Build ChatInbox component**
1. Create `app/components/chat/ChatInbox.tsx`
2. Props: `{ onSelectChannel: (channelId: string, groupId: string) => void, onDiscover: () => void, onNewConversation: () => void }`
3. On mount: fetch `GET /api/chat/groups` (pass `x-demo-user-email` header from `useAuth()`) and `GET /api/chat/unread-count`
4. Group the results into three sections: PRIVATE (DMs), COURSE, ORG
5. For DMs: display other member's name (you'll need to fetch members — for now, use `group.name` which was set to "{User} & {User}" at creation)
6. Each row is a clickable button that calls `onSelectChannel(group.channels[0].id, group.id)` — using the first (default) channel
7. Show: icon/avatar initial (left), name + last message preview (center, truncated), timestamp + unread dot (right)
8. For last message: modify `GET /api/chat/groups` route to include `lastMessage` — add a subquery for each group's default channel's most recent non-deleted ChannelMessage (author name, content truncated to 60 chars, createdAt). Read the route at `app/api/chat/groups/route.ts` first.
9. Search bar at top: client-side filter by group name
10. Bottom: "Discover Groups →" text button calling `onDiscover()`
11. Top-right corner: `Plus` icon button calling `onNewConversation()`
12. Use `formatDistanceToNow` from `date-fns` for timestamps (add `{ addSuffix: true }`)
13. Empty state: "No conversations yet" with `MessageSquare` icon + "Start a conversation" button

**CHAT-05: Build ChatNewConversation component**
1. Create `app/components/chat/ChatNewConversation.tsx`
2. Props: `{ onCreated: (channelId: string, groupId: string) => void, onBack: () => void }`
3. Header: `ArrowLeft` button (calls `onBack`) + "New Conversation"
4. Two sections:
   a. "Send a Message" — text input that searches users via `GET /api/users?q={query}` (debounced 300ms). Show results as a list with name + role badge. On select: `POST /api/chat/groups` with `{ name: "{selected.name} & {currentUser.name}", type: "PRIVATE" }` → on success, call `onCreated(response.channels[0].id, response.id)`
   b. "Create a Group" — text input for group name + "Create" button → `POST /api/chat/groups` with `{ name, type: "PRIVATE" }` → on success, call `onCreated`
5. Loading states: show `Loader2` spinner during API calls
6. Error handling: show inline error message if create fails (e.g., duplicate group for DMs)

Now wire these into ConciergePanel:
7. Read ConciergePanel.tsx and find the Messages placeholder from Phase 1
8. Replace the placeholder with the real component rendering:
   - Import `ChatInbox` and `ChatNewConversation`
   - `messagesView === 'inbox'` → render `<ChatInbox>`
   - `messagesView === 'new'` → render `<ChatNewConversation>`
   - Wire the callbacks to update `messagesView` and `activeChannel` state

After completing both tasks, run: `npm run lint && npx tsc --noEmit && npm run build`

STOP after these 2 tasks. Output:

"Phase 2a complete. Paste PROMPT 4 from Blueprints/unified-chat-system.md to continue with Phase 2b (CHAT-06) + Phase 3a (CHAT-07: Discover Groups + ChatThread)."
```

---

### PROMPT 4 — Phase 2b + 3a: Discover Groups + Thread

```
You are working on "The Sandbox" — a Next.js 16 App Router + Prisma v7 + Tailwind v4 educational platform at c:\AA Code\Educator marketplace\the-sandbox\.

Read CLAUDE.md first for all constraints. Read Blueprints/unified-chat-system.md for the full architecture.

Phases 0-2a complete. Complete these TWO tasks only, then STOP:

**CHAT-06: Build ChatDiscoverGroups component**
1. Create `app/components/chat/ChatDiscoverGroups.tsx`
2. Props: `{ onJoin: (groupId: string) => void, onBack: () => void }`
3. On mount: fetch `GET /api/chat/groups/eligible` (returns `{ courses: ChatGroup[], orgs: ChatGroup[] }`)
4. Header: `ArrowLeft` + "Discover Groups"
5. Two sections: "Course Channels" (with `GraduationCap` icon) and "Organizations" (with `Users` icon)
6. Each row: group name + "Join" button (blue pill, `rounded-full px-3 py-1 text-xs`)
7. Join: `POST /api/chat/groups/{groupId}/join` → on success, show checkmark + call `onJoin(groupId)`
8. Empty state: `CheckCircle` icon + "You're in all available groups!"
9. Wire into ConciergePanel: `messagesView === 'discover'` → render `<ChatDiscoverGroups>`

**CHAT-07: Build ChatThread component (message list + read cursor)**
1. Create `app/components/chat/ChatThread.tsx`
2. Props: `{ channelId: string, groupId: string, onBack: () => void }`
3. On mount:
   a. Fetch `GET /api/chat/channels/{channelId}/messages?limit=50` → store as `messages[]`
   b. Fetch `GET /api/chat/groups/{groupId}` → store group details (name, type, channels, currentUserRole)
   c. Fire `PATCH /api/chat/channels/{channelId}/read` to mark as read
4. Header: `ArrowLeft` (onBack) + group name + " · #" + channel name. (Channel switcher and settings icons will be added in Phase 4 — just leave space.)
5. Message list (`div` with `role="log"`):
   - Each message: avatar initial circle (32x32, first letter of author name, blue bg for regular users, purple bg for Sandy), author name (bold, text-sm), timestamp (gray, text-xs, `format(createdAt, 'h:mm a')`), content (text-sm)
   - Sandy messages (`isSandy`): `bg-purple-50 border border-purple-100 rounded-2xl rounded-tl-sm` bubble + `Bot` icon badge (size-3, inline) next to author name
   - Deleted messages: gray italic "[Message deleted]"
   - Edited messages: "(edited)" in gray text-xs after timestamp
   - Own messages: right-aligned with `bg-blue-50` bubble
   - Crisis-flagged (crisisFlag && user is ADMIN or OWNER/MODERATOR): subtle `border-l-2 border-red-300`
6. Auto-scroll to bottom via `messagesEndRef` + `useEffect` on messages change
7. Wire into ConciergePanel: `messagesView === 'thread' && activeChannel` → render `<ChatThread>`

After completing both tasks, run: `npm run lint && npx tsc --noEmit && npm run build`

STOP after these 2 tasks. Output:

"Phase 2b + 3a complete. Paste PROMPT 5 from Blueprints/unified-chat-system.md to continue with Phase 3b (CHAT-08 + CHAT-09: Message input/send + edit/delete)."
```

---

### PROMPT 5 — Phase 3b: Message Input + Actions

```
You are working on "The Sandbox" — a Next.js 16 App Router + Prisma v7 + Tailwind v4 educational platform at c:\AA Code\Educator marketplace\the-sandbox\.

Read CLAUDE.md first for all constraints. Read Blueprints/unified-chat-system.md for the full architecture.

Phases 0-3a complete. Complete these TWO tasks only, then STOP:

**CHAT-08: Add message input + send to ChatThread**
1. Read `app/components/chat/ChatThread.tsx` (built in previous phase)
2. Add a sticky input area at the bottom of the thread:
   - `<form>` with `<textarea>` (rows=1, auto-grow max 3 rows, resize-none) + `Send` icon button
   - Placeholder: "Type a message..."
   - Enter to send (prevent default), Shift+Enter for newline
   - Disabled when `isSending` state is true
   - Send button: blue gradient (`from-[#0033A0] to-purple-700`), size-9, rounded-full
3. On submit:
   a. Optimistic insert: add a temporary message to `messages[]` with a temp ID, author = current user, createdAt = now
   b. POST to `/api/chat/channels/{channelId}/messages` with `{ content }` and `x-demo-user-email` header
   c. On success: replace temp message with the real response
   d. On error: mark temp message with error styling (red border) + "Failed to send" label + "Retry" button
   e. Auto-scroll to bottom
4. After sending, fire `PATCH /api/chat/channels/{channelId}/read` to update read cursor

**CHAT-09: Add message edit/delete actions**
1. In ChatThread, add hover actions on messages:
   - On own messages (authorId === currentUser.id): show a small action bar on hover with `Pencil` (edit) and `Trash2` (delete) icons — `absolute -top-2 right-2 bg-white shadow-sm rounded-lg border border-gray-200 flex gap-1 p-1`
   - On any message when user is OWNER or MODERATOR: show `Trash2` only
2. Edit flow:
   - Click Pencil → replace message content with an inline `<textarea>` pre-filled with content
   - "Save" and "Cancel" buttons below
   - Save: `PATCH /api/chat/channels/{channelId}/messages/{msgId}` with `{ content }`
   - On success: update message in list, show "(edited)" label
   - Cancel: revert to original content
3. Delete flow:
   - Click Trash2 → show inline confirm: "Delete this message?" with "Delete" (red) + "Cancel" buttons
   - Confirm: `DELETE /api/chat/channels/{channelId}/messages/{msgId}`
   - On success: replace message content with "[Message deleted]" in gray italic
4. Mobile: use long-press (500ms) instead of hover to show the action bar

After completing both tasks, run: `npm run lint && npx tsc --noEmit && npm run build`

STOP after these 2 tasks. Output:

"Phase 3b complete. Paste PROMPT 6 from Blueprints/unified-chat-system.md to continue with Phase 4 (CHAT-10 + CHAT-11: Channel switcher + Group settings)."
```

---

### PROMPT 6 — Phase 4: Channel Management

```
You are working on "The Sandbox" — a Next.js 16 App Router + Prisma v7 + Tailwind v4 educational platform at c:\AA Code\Educator marketplace\the-sandbox\.

Read CLAUDE.md first for all constraints. Read Blueprints/unified-chat-system.md for the full architecture.

Phases 0-3 complete. Complete these TWO tasks only, then STOP:

**CHAT-10: Build ChatChannelSwitcher**
1. Create `app/components/chat/ChatChannelSwitcher.tsx`
2. Props: `{ groupId: string, channels: Array<{ id: string, name: string, type: string, isDefault: boolean }>, activeChannelId: string, currentUserRole: string, onSelectChannel: (channelId: string) => void, onClose: () => void }`
3. Render as a dropdown/popover positioned below the `#` trigger icon:
   - Semi-transparent backdrop (click to close)
   - White card with shadow, `rounded-xl`, `border border-gray-200`
   - List of channels, each with:
     - Icon: `Hash` for GENERAL/SUBGROUP, `Megaphone` for ANNOUNCEMENTS, `Bot` for SANDY
     - Channel name
     - Active: bold text + `bg-blue-50` + left blue border
   - Click a channel → `onSelectChannel(channelId)` + `onClose()`
4. If `currentUserRole` is OWNER or MODERATOR, show "Create Channel" at bottom:
   - Click reveals inline text input + "Create" button
   - POST `/api/chat/groups/{groupId}/channels` with `{ name }`
   - On success: add to list, auto-select
5. Wire into ChatThread: add `Hash` icon button in header → toggles `showChannelSwitcher` state → renders `<ChatChannelSwitcher>` absolutely positioned below header

**CHAT-11: Build ChatGroupSettings**
1. Create `app/components/chat/ChatGroupSettings.tsx`
2. Props: `{ groupId: string, currentUserRole: string, onClose: () => void, onLeave: () => void }`
3. Render as a dropdown panel from the `MoreVertical` icon:
   - "Members" section: fetch `GET /api/chat/groups/{groupId}/members` on mount
     - Each member: avatar initial + name + role badge (OWNER=blue, MODERATOR=purple, MEMBER=gray)
     - OWNER can click a member → dropdown: "Make Moderator" / "Make Member" / "Remove" → PATCH/DELETE
   - "Mute Group" toggle: checks current mute status, POST to mute / DELETE to unmute
   - "Leave Group" button (hidden for COURSE groups): confirm → POST leave → `onLeave()`
   - OWNER only: "Archive Group" button (red): confirm → DELETE group → `onLeave()`
4. Wire into ChatThread: add `MoreVertical` icon button in header → toggles `showSettings` state → renders `<ChatGroupSettings>`

After completing both tasks, run: `npm run lint && npx tsc --noEmit && npm run build`

STOP after these 2 tasks. Output:

"Phase 4 complete. Paste PROMPT 7 from Blueprints/unified-chat-system.md to continue with Phase 5 (CHAT-12 + CHAT-13: Polling + auto-channel creation)."
```

---

### PROMPT 7 — Phase 5: Live Updates + Auto-Creation

```
You are working on "The Sandbox" — a Next.js 16 App Router + Prisma v7 + Tailwind v4 educational platform at c:\AA Code\Educator marketplace\the-sandbox\.

Read CLAUDE.md first for all constraints. Read Blueprints/unified-chat-system.md for the full architecture.

Phases 0-4 complete. Complete these TWO tasks only, then STOP:

**CHAT-12: Add 10-second polling for new messages**
1. Read `app/components/chat/ChatThread.tsx`
2. Read `app/api/chat/channels/[channelId]/messages/route.ts` — the GET handler
3. Add `after` query parameter support to the GET handler:
   - Parse `after` from searchParams (ISO date string)
   - When `after` is present, add `createdAt: { gt: new Date(after) }` to the where clause
   - When `after` is present, do NOT apply cursor pagination (no `before` param) and return messages in ascending order (oldest first) since we're appending
   - Keep the existing `before`/`limit` pagination working unchanged when `after` is absent
4. In ChatThread, add a `useEffect` with `setInterval(10000)`:
   - Only runs when `channelId` is set and component is mounted
   - Calls `GET /api/chat/channels/{channelId}/messages?after={lastMessageCreatedAt}`
   - `lastMessageCreatedAt` is the `createdAt` of the last message in the current list
   - Appends new messages to the list (dedup by ID)
   - If new messages arrived AND user was scrolled to bottom (within 50px), auto-scroll
   - If new messages arrived AND user was scrolled up, show a floating "New messages ↓" pill button at bottom of message list (click scrolls to bottom)
   - Fire read cursor update when new messages arrive and user is at bottom
5. Clean up interval on unmount or channelId change

**CHAT-13: Auto-create course ChatGroup on course creation + enrollment**
1. Read `app/api/courses/route.ts` (specifically the POST handler for course creation)
2. After the course is created, add logic to create a ChatGroup:
   ```typescript
   await prisma.chatGroup.create({
     data: {
       name: course.title,
       type: 'COURSE',
       courseId: course.id,
       createdById: user.id,
       sandyEnabled: true,
       channels: {
         create: [
           { name: 'general', type: 'GENERAL', isDefault: true, position: 0, createdById: user.id },
           { name: 'announcements', type: 'ANNOUNCEMENTS', isDefault: false, position: 1, createdById: user.id },
         ],
       },
       memberships: { create: { userId: user.id, role: 'OWNER' } },
     },
   })
   ```
   Wrap in try/catch — if it fails (e.g., group already exists due to unique constraint on courseId), log and continue.
3. Find the enrollment route (search for `CourseEnrollment` creation — likely in `/api/enrollment/route.ts` or `/api/courses/[id]/enroll/route.ts`)
4. After creating the enrollment, add:
   ```typescript
   const courseGroup = await prisma.chatGroup.findUnique({ where: { courseId } })
   if (courseGroup) {
     await prisma.chatMembership.upsert({
       where: { userId_groupId: { userId: studentId, groupId: courseGroup.id } },
       update: {},
       create: { userId: studentId, groupId: courseGroup.id, role: 'MEMBER' },
     }).catch(() => {}) // ignore if already a member
   }
   ```

After completing both tasks, run: `npm run lint && npx tsc --noEmit && npm run build`

STOP after these 2 tasks. Output:

"Phase 5 complete. Paste PROMPT 8 from Blueprints/unified-chat-system.md to continue with Phase 6 (CHAT-14: Mobile + accessibility — FINAL)."
```

---

### PROMPT 8 — Phase 6: Mobile + Accessibility (FINAL)

```
You are working on "The Sandbox" — a Next.js 16 App Router + Prisma v7 + Tailwind v4 educational platform at c:\AA Code\Educator marketplace\the-sandbox\.

Read CLAUDE.md first for all constraints. Read Blueprints/unified-chat-system.md for the full architecture.

Phases 0-5 complete. Complete this FINAL task, then STOP:

**CHAT-14: Mobile messaging experience + accessibility**
1. Read all chat components under `app/components/chat/` and `ConciergePanel.tsx`
2. Mobile behavior — the ConciergePanel already has a mobile FAB + 80vh bottom-sheet modal. When `panelMode === 'messages'`:
   - The modal should render the same Messages content (inbox → thread → etc.)
   - Ensure the thread view uses full available height within the modal (flex-1 + overflow-y-auto)
   - Back button in thread returns to inbox within the modal (does NOT close the modal)
   - Send button and message action buttons: minimum 44x44px tap targets
   - Message action bar on mobile: use long-press (500ms `onPointerDown` timer) instead of hover
3. Accessibility:
   - Message list div: `role="log"` + `aria-live="polite"` + `aria-label="Messages"`
   - Each message: `role="article"` with `aria-label="{author} at {time}: {content preview}"`
   - Send button: `aria-label="Send message"`
   - Back button: `aria-label="Back to inbox"`
   - Channel switcher: `role="listbox"`, each channel `role="option"`, active has `aria-selected="true"`
   - Group settings member list: `role="list"`, each member `role="listitem"`
   - Unread badge: `aria-label="{count} unread messages"`
   - Focus management: when thread opens, focus the message input; when inbox opens, focus the search input
4. Final check: verify the desktop vertical tab button (the "Sandy" label on the closed panel) still works correctly — it should open the panel in whichever mode was last active.

After completing this task, run: `npm run lint && npx tsc --noEmit && npm run build`

This is the FINAL prompt. The Unified Chat System is complete. All 15 tasks across 7 phases are done.

Summary of what was built:
- 1 new schema model (ChannelReadCursor)
- 2 new API routes (unread-count, read-cursor)
- 6 new UI components (ChatInbox, ChatThread, ChatChannelSwitcher, ChatGroupSettings, ChatDiscoverGroups, ChatNewConversation)
- Modified: ConciergePanel.tsx (mode toggle), Header.tsx (unified badge), messages/route.ts (after param), courses/route.ts (auto-create group), enrollment route (auto-join)
- Reused: all 15 existing /api/chat/* routes unchanged
```

---

## Success Criteria

- [ ] Toggle between Sandy and Messages in the right-rail panel on any page
- [ ] See all DMs, course channels, and group channels in the inbox
- [ ] Send and receive messages in real-time (10s polling)
- [ ] Unread badge on the Messages toggle reflects actual unread count
- [ ] Sandy auto-replies in course channels when `sandyEnabled` is true
- [ ] Create new DMs and private groups from within the panel
- [ ] Join eligible course/org groups from a discovery panel
- [ ] Edit and delete own messages; moderators can delete any message
- [ ] Switch between channels within a group
- [ ] Mobile: full-modal experience with touch-friendly targets
- [ ] Crisis detection flags messages automatically (already built — just needs to render)
