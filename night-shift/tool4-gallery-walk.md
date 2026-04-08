# Tool 4: Gallery Walk

You are building **Gallery Walk** for The Sandbox platform at `c:\AA Code\Educator marketplace\the-sandbox\`. Full sprint — schema, lib, API, pages, hub card.

## Constraints (READ FIRST)
- Read `CLAUDE.md` before writing any code.
- Tailwind v4: no `@apply`, utility classes only
- Icons: lucide-react ONLY
- Every API route MUST call `requireRequestUser` first
- Business logic in `app/lib/`, not routes
- Prisma: import from `../generated/prisma`, use singleton from `app/lib/prisma.ts`
- Page pattern: PageHeader, `max-w-6xl`, `border-2 border-gray-200 rounded-2xl` cards, `font-extrabold` headings
- Auth via `x-demo-user-email`

## What You Are Building
Gallery Walk is a digital critique studio. An instructor opens an exhibit, students submit their work (text-based: a short story draft, an essay paragraph, a design brief, a code snippet, an argument outline), peers leave sticky-note style feedback on each piece, and AI (Haiku) synthesizes the critique themes for each work into a "Curator's Note."

This replaces the awkward in-class gallery walk where students physically walk around to see printed work. Now it's async, anonymous feedback is optional, and every piece gets a synthesized AI critique.

**Audience:** Creative writing, arts, design, architecture, English composition, philosophy, any course involving student work critique
**UI Vibe:** Clean museum aesthetic. White walls. Generous whitespace. Minimal. Almost Notion-like but with a gallery feel. Works displayed in a clean masonry-ish grid. Sticky notes are yellow-100 with a slight rotation (-1deg or 1deg) to feel tactile. The "Curator's Note" uses a serif-style italic font and is set apart visually.

---

## Step 1: Schema Changes

Add to `prisma/schema.prisma`:

```prisma
model GalleryExhibit {
  id           String             @id @default(cuid())
  title        String             // e.g. "Short Story Drafts — Week 4"
  prompt       String             // The assignment prompt or description
  accessCode   String             @unique
  status       GalleryStatus      @default(OPEN)
  anonymous    Boolean            @default(false)  // If true, submitter names hidden from peers
  hostId       String
  host         User               @relation("GalleryHost", fields: [hostId], references: [id])
  works        GalleryWork[]
  createdAt    DateTime           @default(now())
}

model GalleryWork {
  id            String         @id @default(cuid())
  exhibitId     String
  exhibit       GalleryExhibit @relation(fields: [exhibitId], references: [id], onDelete: Cascade)
  authorId      String
  author        User           @relation("GalleryAuthor", fields: [authorId], references: [id])
  title         String         // Title of their work
  content       String         // The work itself (text)
  notes         GalleryNote[]
  curatorNote   String?        // AI-synthesized critique
  curatorNoteAt DateTime?
  createdAt     DateTime       @default(now())
}

model GalleryNote {
  id        String      @id @default(cuid())
  workId    String
  work      GalleryWork @relation(fields: [workId], references: [id], onDelete: Cascade)
  authorId  String
  author    User        @relation("GalleryNoteAuthor", fields: [authorId], references: [id])
  content   String      // The sticky note text (1-3 sentences)
  createdAt DateTime    @default(now())
}

enum GalleryStatus {
  OPEN
  CRITIQUING
  COMPLETE
}
```

Add back-relations to User:
```
galleryExhibitsHosted  GalleryExhibit[] @relation("GalleryHost")
galleryWorks           GalleryWork[]    @relation("GalleryAuthor")
galleryNotes           GalleryNote[]    @relation("GalleryNoteAuthor")
```

Run:
```
cd the-sandbox && npx prisma db push && npx prisma generate
```

---

## Step 2: Lib Files

### `app/lib/gallery/gallery-service.ts`

- `generateAccessCode()` — e.g. `GALL-712`, unique in DB
- `createExhibit(hostId, title, prompt, anonymous)` — create GalleryExhibit, return it
- `getExhibit(exhibitId, userId)` — return exhibit with works (each with notes — if anonymous=true, hide author name from notes unless it's the viewer's own note; hide work author name if anonymous=true), `isHost` bool, `myWork` record or null
- `listExhibitsForUser(userId)` — exhibits hosted or submitted to
- `submitWork(exhibitId, authorId, title, content)` — throws if status is not OPEN, throws if user already submitted, creates GalleryWork, fire-and-forget calls `generateCuratorNote`
- `generateCuratorNote(workId)` — fetch work + exhibit prompt, call Haiku: "You are an insightful art/writing critic. Here is the assignment prompt: {prompt}. A student submitted this work titled '{title}': {content}. Write a brief curator's note (3-4 sentences) synthesizing the most interesting aspects of this work and one specific suggestion for strengthening it. Write in third person, present tense, in a gallery-card style." Save to `curatorNote`, set `curatorNoteAt`.
- `addNote(workId, authorId, content)` — throws if status is COMPLETE, throws if author is the work's own author, create GalleryNote
- `deleteNote(noteId, userId)` — throws if user is not the note author, delete note
- `advanceStatus(exhibitId, hostId, newStatus)` — throws if not host, updates status (OPEN → CRITIQUING → COMPLETE only valid transitions). When advancing to COMPLETE, fire-and-forget `regenerateAllCuratorNotes(exhibitId)` which re-runs generateCuratorNote for all works that now have notes (so the curator note incorporates peer feedback themes too).
- `regenerateAllCuratorNotes(exhibitId)` — for each work in exhibit, fetch its notes, if there are notes, re-call Haiku with: "Here is the original assignment: {prompt}. Here is the work: {content}. Here are peer feedback notes: {notes joined as bullets}. Write a 3-4 sentence curator's note synthesizing the peer feedback themes and what this work does well. One specific actionable improvement suggestion." Save to curatorNote.

### `app/lib/gallery/index.ts` — re-export

---

## Step 3: API Routes

### `app/api/gallery/exhibits/route.ts`
- `GET` — requireRequestUser → listExhibitsForUser
- `POST` — requireRequestUser → parse `{ title, prompt, anonymous }` → createExhibit → return

### `app/api/gallery/exhibits/[exhibitId]/route.ts`
- `GET` — requireRequestUser → getExhibit → 404 if null

### `app/api/gallery/exhibits/[exhibitId]/works/route.ts`
- `POST` — requireRequestUser → parse `{ title, content }` → submitWork → return work

### `app/api/gallery/exhibits/[exhibitId]/works/[workId]/notes/route.ts`
- `POST` — requireRequestUser → parse `{ content }` → addNote → return note
- `DELETE` (with `?noteId=`) — requireRequestUser → deleteNote → return `{ ok: true }`

### `app/api/gallery/exhibits/[exhibitId]/status/route.ts`
- `POST` — requireRequestUser → parse `{ status }` → advanceStatus → return exhibit

---

## Step 4: Pages

### `app/gallery/page.tsx` — Hub
'use client'.

Layout:
- PageHeader: title="Gallery Walk", subtitle="Share your work. Gather critique. Grow."
- "How It Works": 3 steps (Open an Exhibit → Submit Your Work → Leave Sticky Notes)
- Buttons: "Open an Exhibit" → `/gallery/new`, "Join with Code" → inline input
- Grid of ExhibitCard components: title, prompt snippet, work count, note count, status badge, "Enter" button

### `app/gallery/new/page.tsx` — Create
'use client'. Form:
- Title
- Prompt / Assignment description (textarea)
- Anonymous toggle: checkbox "Hide student names from peers"
- Submit → POST → redirect to `/gallery/[exhibitId]`

### `app/gallery/[exhibitId]/page.tsx` — Main exhibit view
'use client'. Polls GET `/api/gallery/exhibits/[exhibitId]` every 10 seconds.

**Museum aesthetic:**
- Header: exhibit title (`font-extrabold text-3xl`), prompt in a subtle gray box, access code
- Status and host controls: host sees status-advance buttons ("Open for Critiques" → "Close Exhibit")

**Works grid:** 2-column masonry-ish layout (use `columns-2 gap-6` in Tailwind). Each work is a card:
- Work title (`font-bold text-lg`)
- Author name (or "Anonymous" if exhibit.anonymous)
- Work content in a `prose` style text area with max-height and scroll
- **Curator's Note:** if present, shown in a box with `italic text-sm text-gray-600` and a small `BookOpen` or `Feather` icon, labeled "Curator's Note". If not yet present and work is loaded: "Curator's note being written..."
- **Sticky notes section:** Below the work content. Notes displayed as small cards with `bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm rotate-[-0.5deg]` or `rotate-[0.5deg]` alternating. Author name (or Anonymous) at bottom. Small X button (only shown if it's your note).
- **Add note form:** If status is CRITIQUING or OPEN, and it's not your own work: small textarea + "Leave Note" button

**If user hasn't submitted + status is OPEN:**
Floating "Submit Your Work →" button at the bottom of the page (sticky bottom bar).

### `app/gallery/[exhibitId]/submit/page.tsx` — Submit work
'use client'. Shows the assignment prompt. Form:
- Work Title
- Content: large textarea (min-height 200px) — "Paste or type your work here"
- Submit → POST → redirect back to `/gallery/[exhibitId]`

---

## Step 5: Hub Card

In `app/hub/page.tsx`:
```
{
  title: 'Gallery Walk',
  description: 'Share drafts, gather peer feedback, get AI critique.',
  icon: Frame,
  color: 'bg-stone-50 border-stone-200',
  href: '/gallery',
  roles: ['EDUCATOR', 'ADMIN', 'STUDENT'],
}
```

(Import Frame from lucide-react)

---

## Step 6: Verify

Run `npm run build`. Fix all TypeScript errors. Build must pass 0 errors.

If build fails after 3 fix attempts, write `night-shift-blockers.md` and STOP.
