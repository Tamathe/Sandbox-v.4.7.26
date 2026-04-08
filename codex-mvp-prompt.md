# Codex Task — The Sandbox MVP Demo Polish
**Repo:** `the-sandbox/` (Next.js 16 App Router, TypeScript, Tailwind CSS v4, Prisma v7, PostgreSQL)

---

## Context

The Sandbox is an AI-powered educational tool marketplace for the University of Kentucky. Before touching any code, read `the-sandbox/CLAUDE.md` in full — it is the authoritative source of truth for architecture, file structure, data models, and patterns. Do not deviate from patterns described there.

**Critical constraints:**
- Prisma client is always imported from `app/lib/prisma.ts` — never instantiate `PrismaClient` directly
- Auth is mock: the `x-demo-user-email` request header identifies the current user
- No new npm packages
- No new Prisma migrations — no schema changes required for any task below
- Do not refactor, restructure, or rename any existing files
- Do not modify any file not listed in a task below

---

## Task 1 — Fix Garbled Characters in Admin Panel

**File:** `the-sandbox/app/admin/page.tsx`

**Problem:** Three UTF-8 encoding artifacts are present that will render as visible garbage in the browser. The admin panel is the first page university stakeholders will visit.

**Exact replacements:**

1. Find: `By {tool.creator?.name} Â· {tool.category}` → Replace: `By {tool.creator?.name} · {tool.category}`
   - The `Â·` is a garbled interpunct. Replace with a plain `·` character.

2. Find the string `â˜… Featured` (inside the Featured badge span) → Replace with `★ Featured`
   - Or, since `Star` is already imported from `lucide-react`, replace the emoji with: `<Star className="w-2.5 h-2.5 inline-block" /> Featured`

3. Find: `<span className="text-xs text-gray-300">â€¢</span>` → Replace: `<span className="text-xs text-gray-300">·</span>`
   - The `â€¢` is a garbled bullet. A plain `·` matches the visual intent.

**Do not** change any other content or structure in the file.

---

## Task 2 — Home Page Synthetic Data Fixes

**File:** `the-sandbox/app/page.tsx`

Read the entire file before making changes. Understand the `STUDENT_PROFILES` and `EDUCATOR_PROFILES` data structures and the `buildUpcomingDue` helper before writing new entries.

### 2a — Fix the dead student profile key

The `STUDENT_PROFILES` map has an entry keyed to `'maya.johnson@uky.edu'`. This email is not in `DEMO_USERS` (in `app/lib/auth-context.tsx`) and can never be triggered during a demo. The current `'ian.mcclure.student@uky.edu'` entry has weaker data.

**Do this:**
- Delete the `'ian.mcclure.student@uky.edu'` entry entirely
- Change the key of the `'maya.johnson@uky.edu'` entry to `'ian.mcclure.student@uky.edu'`
- Update the profile body to match Ian McClure's persona: `year: '1L', major: 'Juris Doctor'`
- Keep all other fields (streak, sessions, scores, recent sessions, upcoming due) — they already reference law tools which is correct for Ian

### 2b — Add educator profiles for admin users

The `EDUCATOR_PROFILES` map only has an entry for `'heath.price@uky.edu'`. When logged in as Dr. DiPaola or Eric Monday, the page shows `GENERIC_EDUCATOR` which has `recentActivity: []` — the "Recent Student Activity" section doesn't render at all.

**Add two new entries to `EDUCATOR_PROFILES`:**

```ts
'bob.dipaola@uky.edu': {
  title: 'President, University of Kentucky',
  toolsPublished: 0,
  activeStudents: 1240,
  totalSessions: 4872,
  avgScore: 84,
  recentActivity: [
    { student: 'I. McClure', tool: 'LAW 756: Evidence Rules Simulator', date: '2 hours ago', score: 87 },
    { student: 'T. The', tool: 'Socratic Philosophy Debate Partner', date: '4 hours ago', score: 89 },
    { student: 'A. Patel', tool: 'CS 215: Python Tutor', date: 'Yesterday', score: 91 },
  ],
},
'eric.monday@uky.edu': {
  title: 'Executive Vice President for Finance & Administration',
  toolsPublished: 0,
  activeStudents: 847,
  totalSessions: 3214,
  avgScore: 83,
  recentActivity: [
    { student: 'M. Chen', tool: 'MBA 640: Strategy Coach', date: '1 hour ago', score: 85 },
    { student: 'J. Williams', tool: 'Business Case Analyzer', date: '3 hours ago', score: 82 },
    { student: 'S. Park', tool: 'HIST 300: Primary Source Analyzer', date: 'Yesterday', score: 88 },
  ],
},
```

Place these entries inside the existing `EDUCATOR_PROFILES` object alongside the `'heath.price@uky.edu'` entry.

---

## Task 3 — Rename Placeholder Admin User

**File:** `the-sandbox/app/lib/auth-context.tsx`

Find the demo user object where `email: 'admin@uky.edu'`. Change only the `name` field:

- **Before:** `name: 'Alex Admin'`
- **After:** `name: 'Alex Thompson'`

Do not change the email, role, department, college, or any other field. The email `admin@uky.edu` must remain unchanged — it is used as a lookup key throughout the codebase.

---

## Task 4 — Header Dropdown: Surface the User Switcher

**File:** `the-sandbox/app/components/Header.tsx`

Read the full file before making changes. The desktop avatar dropdown and the mobile menu both have two sections: "Quick Access" and "Switch Demo User." Currently Quick Access appears first, pushing the role switcher to the bottom where it's hard to find during a live demo.

### 4a — Desktop dropdown (lines ~261–314)

Reorder the two sections so "Switch Demo User" appears first:
1. The "Switch Demo User" label + user buttons block
2. The `<div className="border-t border-gray-100 my-1" />` divider
3. The "Quick Access" label + quick link buttons block

### 4b — Mobile menu (lines ~419–448)

Apply the same reorder to the mobile menu — "Switch Demo User" block before the "Quick Access" block.

### 4c — Avatar button: add a `Demo` label

In the avatar `<button>` element (the one that opens the dropdown), add a small pill immediately before the `<ChevronDown>` icon:

```tsx
<span className="hidden sm:inline-flex items-center text-[10px] font-bold text-gray-400 border border-gray-200 rounded-full px-1.5 py-0.5">
  Demo
</span>
```

This signals to demo viewers that role-switching is available before they even open the dropdown.

---

## Task 5 — Build Hero Quick-Fill Prompt Chips

**File:** `the-sandbox/app/components/BuildHubHero.tsx`

Read the full file before making changes. Identify:
- The textarea element and its associated state variable (likely `input` or similar)
- The submit handler function name (likely `handleBuild` or similar)
- The location of the "Support Section" template cards that appear below the textarea — do NOT modify or duplicate those

**What to add:**

Between the closing of the textarea container and the start of the Support Section, insert a row of 3 clickable quick-fill chips:

```tsx
<div className="flex flex-wrap gap-2 mt-3 mb-4">
  {[
    'Cross-exam simulator for 2L Evidence students',
    'Organic chemistry tutor for pre-med students',
    'Case analysis coach for MBA strategy',
  ].map((suggestion) => (
    <button
      key={suggestion}
      type="button"
      onClick={() => {
        // Use whatever state setter and submit function exist in this component
        setInput(suggestion)
        // If the submit function accepts a string directly, call it with the suggestion
        // Otherwise set state and let the user press Enter/Build
      }}
      className="text-xs bg-white/20 text-white border border-white/30 rounded-full px-3 py-1 hover:bg-white/30 transition-colors cursor-pointer"
    >
      {suggestion}
    </button>
  ))}
</div>
```

**Important:** Read the component's state and event handler names first. The `setInput` and submit function names above are placeholders — use the actual names from the file. If the component automatically navigates on state change, just call the submit function directly. If not, set the state value and let the user click Build.

---

## Task 6 — Seed Data: Messages and Additional Courses

**File:** `the-sandbox/prisma/seed.ts`

**Read first:** Read `the-sandbox/prisma/schema.prisma` and search for the `Conversation`, `ConversationParticipant`, and `Message` models to confirm exact field names before writing any seed code. Also read the existing TEK-100 course creation block in seed.ts to match the exact `upsert` pattern.

**Important:** Upvotes (16), Comments (8), Favorites (9), and Bounties are already seeded. Do NOT add more of these — that would create duplicates on re-seed.

### 6a — Seed 2 direct message threads

At the end of the seed function (after the existing data), add 2 seeded `Conversation` + `ConversationParticipant` + `Message` records using `upsert` where possible to keep the seed idempotent.

The conversations should be between existing seeded users (resolve their IDs from users already created earlier in the seed):
- **Thread 1:** Heath Price (`heath.price@uky.edu`) and Ian McClure (`ian.mcclure.student@uky.edu`)
  - Message 1 (from Heath): "Ian, the LAW 756 Evidence Simulator now has a new module on Hearsay Exceptions. Try it before the exam next week — it's the most common area where 1Ls lose points."
  - Message 2 (from Ian): "Thanks Prof. Price! I've been struggling with FRE 803. Will use it tonight."

- **Thread 2:** Heath Price (`heath.price@uky.edu`) and Tiana The (`tiana.the@uky.edu`)
  - Message 1 (from Heath): "Tiana, I added a new Socratic Debate session focused on poststructuralist theory — it should connect well with your ENG 420 paper."
  - Message 2 (from Tiana): "Perfect timing. I've been trying to articulate the difference between Derrida and Foucault's approach. Will give it a try."

### 6b — Seed 2 additional courses

Add 2 more course records using the exact same `prisma.course.upsert` pattern as TEK-100. Match the field structure exactly — `courseCode`, `title`, `description`, `instructorId`, `isPublic`. Then add `CourseMaterial` records and `CourseToolLink` records for each.

Use `heath.price` as the instructor for both (his `id` is already resolved earlier in the seed).

**CS 215:**
```
courseCode: 'CS-215'
title: 'Introduction to Programming'
description: 'Foundational programming concepts using Python. Students learn variables, loops, functions, and object-oriented design through hands-on projects.'
isPublic: true
```
- Add 2 CourseMaterial records (moduleNumber 1 and 2) with brief lecture content on variables/loops and functions/OOP
- Add a CourseToolLink to the tool named `'CS 215: Python Tutor'` (find its ID by looking up the tool by name)

**BIO 201:**
```
courseCode: 'BIO-201'
title: 'Human Anatomy and Physiology'
description: 'Survey of human body systems including musculoskeletal, cardiovascular, and nervous systems. Emphasis on clinical application and patient communication.'
isPublic: true
```
- Add 2 CourseMaterial records (moduleNumber 1 and 2) with brief lecture content on body systems and clinical communication
- Add a CourseToolLink to the tool named `'Patient Interview Practice'` (find its ID by looking up the tool by name)

Use `upsert` with `where: { courseCode: 'CS-215' }` etc. to keep the seed idempotent.

---

## Verification Checklist (run before finishing)

- [ ] `cd the-sandbox && npx tsc --noEmit` — zero TypeScript errors
- [ ] No new files created
- [ ] Only the 6 files listed above were modified
- [ ] Admin panel (`/admin`): no garbled characters visible, renders cleanly
- [ ] Home page as Dr. DiPaola: "Recent Student Activity" section renders with 3 activity items
- [ ] Home page as Ian McClure: profile shows `year: '1L'`, `major: 'Juris Doctor'`, rich session history
- [ ] Header avatar button shows "Demo" pill label
- [ ] Header dropdown opens → "Switch Demo User" section is visible first
- [ ] Build page (`/build`) → 3 chip prompts are visible below the textarea
- [ ] After `npm run db:seed`: `/messages` as Heath Price shows 2 conversations
- [ ] After `npm run db:seed`: `/courses` lists 3 courses (TEK-100, CS 215, BIO 201)
