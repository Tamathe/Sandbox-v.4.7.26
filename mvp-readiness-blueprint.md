# The Sandbox — MVP Readiness Blueprint
**Status:** Pre-demo polish sprint | **Date:** 2026-03-15
**Audience:** Engineering team / Codex handoff

---

## What This Is

This document captures the findings from the MVP readiness review of The Sandbox ahead of the university stakeholder demo. It is not a feature spec — it is a polish sprint. The platform is functionally complete. The goal is to close the gaps between "it works" and "it makes a great first impression in a live demo."

---

## What's Already Done (Do Not Re-implement)

| Feature | Status | Notes |
|---|---|---|
| Rate limiting on `/api/chat` | ✅ Done | Sliding-window 20 req/min, module-scope `rateLimitMap` |
| Service Bot admin audit section | ✅ Done | "Deployed Service Bots" in `app/admin/page.tsx` |
| Service Bot transactional constraints | ✅ Done | `transactionalConstraint` + `firstResponseGuidance` in `service-bot-prompt.ts` |
| ELI5 "Explain Simpler" button | ✅ Done | `handleELI5` + Lightbulb render in `ChatInterface.tsx` |
| Service Bot API fields | ✅ Done | `isOfficialService`, `serviceProtocol`, `escalationEmail` persisted in tools route |
| Social seed data (upvotes, comments, favorites, bounties) | ✅ Done | 16 upvotes, 8 comments, 9 favorites, bounties already seeded |

---

## What Needs Doing — Polish Sprint

Changes are grouped by category. All are low-risk. No new API routes, no new Prisma migrations.

### 🐛 Bug Fixes (Must Fix Before Demo)

#### 1. Garbled characters in admin panel
**File:** `app/admin/page.tsx`

Three encoding artifacts will render as visible garbage in the browser:
- `Â·` (line 256) — should be `·`
- `â˜… Featured` (line 344) — should be `★ Featured` (or use the `Star` lucide icon already imported)
- `â€¢` (line 354) — should be `·` or a JSX `•`

This is the admin panel — the first place a university stakeholder will click.

---

### 👤 Demo Data Fixes (High Impact, Zero DB Changes)

#### 2. Home page: two admin personas have empty dashboards
**File:** `app/page.tsx`

`EDUCATOR_PROFILES` only has an entry for `heath.price@uky.edu`. When logged in as Dr. DiPaola (Provost) or Eric Monday (Finance & Administration) — two of the most important demo personas — they fall into `GENERIC_EDUCATOR` which has `recentActivity: []`. The "Recent Student Activity" section doesn't render at all.

**Fix:** Add named `EDUCATOR_PROFILES` entries for `bob.dipaola@uky.edu` and `eric.monday@uky.edu` with realistic data.

#### 3. Home page: `maya.johnson@uky.edu` is dead code
**File:** `app/page.tsx`

`STUDENT_PROFILES` has a rich entry keyed to `maya.johnson@uky.edu` — a user who is not in `DEMO_USERS` in auth-context and can never be selected. The `ian.mcclure.student@uky.edu` entry (the actual 1L student demo user) has weaker data (fewer sessions, no streak).

**Fix:** Replace the `maya.johnson` key with `ian.mcclure.student@uky.edu`. Update the profile body to match Ian's persona (1L JD, law school tools).

#### 4. Rename "Alex Admin"
**File:** `app/lib/auth-context.tsx`

The platform admin user is literally named "Alex Admin." University stakeholders will notice. All other demo users have real-feeling names (Dr. Robert DiPaola, Eric Monday, Heath Price).

**Fix:** Change `name: 'Alex Admin'` to `name: 'Alex Thompson'`.

---

### 🧭 UX Discoverability Fixes

#### 5. User switcher is buried in the header dropdown
**File:** `app/components/Header.tsx`

The "Switch Demo User" section sits at the bottom of the avatar dropdown, below a 9-item "Quick Access" list. In a live demo, a stakeholder who opens the dropdown will see Open Builder, Bounties, Datasets, Publish Tool, Analytics, Portfolio, My Avatar, Service Bots, Admin Panel — and only then the role switcher. This creates dead air and confusion.

**Fix:**
- Reorder the dropdown: "Switch Demo User" first, divider, "Quick Access" second (both in desktop and mobile versions)
- Add a small `Demo` label or `6 roles` pill next to the ChevronDown icon in the avatar button so users know switching is possible before they open it

#### 6. Build hero requires stakeholders to know what to type
**File:** `app/components/BuildHubHero.tsx`

The educator home page's flagship "What do you want to teach today?" textarea is the most powerful first impression — but it requires the user to type something meaningful. Stakeholders in a conference room will hesitate.

**Fix:** Add 3 clickable quick-fill chip buttons between the textarea and the existing Support Section template cards:
- "Cross-exam simulator for 2L Evidence students"
- "Organic chemistry tutor for pre-med students"
- "Case analysis coach for MBA strategy"

One click prefills the input and submits — the builder opens pre-seeded.

---

### 🌱 Seed Data Gaps

#### 7. No Message records — messaging feature is completely empty
**File:** `prisma/seed.ts`

The `/messages` route is linked from the header dropdown. Currently zero `Conversation` or `Message` records exist. Any stakeholder who clicks it sees an empty state.

**Fix:** Seed 2 direct message threads using the existing `Conversation`, `ConversationParticipant`, and `Message` models (read schema for exact field names before writing):
- Thread 1: Heath Price → Ian McClure — a note about the Evidence Simulator
- Thread 2: Heath Price → Tiana The — a note about the Socratic Debate tool

#### 8. Only one course — platform looks like a pilot
**File:** `prisma/seed.ts`

A single course (TEK-100) makes the Courses page feel sparse. The platform supports cross-college use cases but the seed data only demonstrates one.

**Fix:** Add 2 more courses using the existing `prisma.course.upsert` pattern from TEK-100:
- CS 215 "Intro to Programming" (College of Engineering) — with 2 CourseMaterial records and a CourseToolLink to the CS 215 Python Tutor tool
- BIO 201 "Human Anatomy" (College of Medicine) — with 2 CourseMaterial records and a CourseToolLink to the Patient Interview Practice tool

---

## Verification Checklist

Before calling the sprint done:

- [ ] `cd the-sandbox && npx tsc --noEmit` — clean build, zero errors
- [ ] Admin panel renders without any garbled characters (`Â·`, `â˜…`, `â€¢`)
- [ ] Switch to Dr. DiPaola → home page shows "Recent Student Activity" feed (not blank)
- [ ] Switch to Ian McClure → home page shows rich 1L profile data (not the old weak entry)
- [ ] Switch to Alex Thompson → role badge shows ADMIN (name change only, email unchanged)
- [ ] Avatar dropdown opens → "Switch Demo User" is the first visible section
- [ ] Build Hub educator hero → 3 chip prompts visible, clicking one opens the builder
- [ ] `/messages` page → at least 2 conversations visible for Heath Price
- [ ] `/courses` page → 3 courses listed (TEK-100, CS 215, BIO 201)
- [ ] Re-run `npm run db:seed` after any seed.ts changes (seed is idempotent via `upsert`)

---

## Files Touched Summary

| File | Changes |
|---|---|
| `app/admin/page.tsx` | Fix 3 garbled character encoding artifacts |
| `app/page.tsx` | Add DiPaola + Monday profiles; fix maya.johnson key → ian.mcclure.student |
| `app/lib/auth-context.tsx` | Rename `Alex Admin` → `Alex Thompson` |
| `app/components/Header.tsx` | Reorder dropdown sections; add Demo pill to avatar button |
| `app/components/BuildHubHero.tsx` | Add 3 quick-fill prompt chips |
| `prisma/seed.ts` | Add 2 Message threads + 2 new Courses |

**No new files. No new API routes. No new Prisma migrations.**
