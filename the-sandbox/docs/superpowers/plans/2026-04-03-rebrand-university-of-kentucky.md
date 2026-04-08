# Rebrand: "The Sandbox" to "University of Kentucky" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all product branding so the platform feels like the university itself, not an app built for the university.

**Architecture:** Three sprints — Sprint 1 rewrites user-visible strings (header, landing, meta, logo), Sprint 2 migrates internal code (localStorage `sandbox-*` → `uky-*`, custom events, system prompts, seed data), Sprint 3 updates documentation and infrastructure. Each sprint is independently deployable.

**Tech Stack:** Next.js 16, TypeScript, Tailwind v4, Prisma

**Blueprint:** `Blueprints/REBRAND-UNIVERSITY-OF-KENTUCKY.md`

**Exclusion list (DO NOT rename):** Sandy, Sandcastle, SandyAmbientContext, sandyUsageDecay, PromptLabSandbox, sandcastle.ts / sandcastle-*.tsx, sand-dollar / Sand (currency — already deleted)

---

## Sprint 1: User-Visible Branding

### Task 1: Header Component — App Name & Logo

**Files:**
- Modify: `app/components/Header.tsx:331-346`

- [ ] **Step 1: Update logo alt text and app name**

Change lines 333-345 in `Header.tsx`:

```tsx
// BEFORE (lines 331-346)
            <div className="size-9 rounded-lg overflow-hidden bg-white">
              <Image
                src="/cats-ai-logo-v2.png"
                alt="CATS-AI"
                width={192}
                height={192}
                className="object-contain w-full h-full"
              />
            </div>
          </Link>
          <Link href="/" className="flex flex-col">
            <div className="font-bold text-[#0033A0] text-[17px] leading-tight">The Sandbox</div>
            <div className="hidden text-[10px] text-gray-400 leading-tight font-medium tracking-widest uppercase xl:block">
              CATS-AI · University of Kentucky
            </div>
          </Link>

// AFTER
            <div className="size-9 rounded-lg overflow-hidden bg-white">
              <Image
                src="/uk-wildcat-mark.png"
                alt="University of Kentucky"
                width={192}
                height={192}
                className="object-contain w-full h-full"
              />
            </div>
          </Link>
          <Link href="/" className="flex flex-col justify-center">
            <div className="font-bold text-[#0033A0] text-[15px] leading-tight">University of Kentucky</div>
          </Link>
```

Key changes: logo src → `uk-wildcat-mark.png`, alt → `"University of Kentucky"`, app name text → `"University of Kentucky"` at 15px (slightly smaller to fit), subtitle line removed entirely, `flex-col justify-center` to vertically center without subtitle.

- [ ] **Step 2: Add placeholder logo asset**

Create `public/uk-wildcat-mark.png` — for now, copy the existing logo as a placeholder. The real UK Wildcat mark will be swapped in when obtained.

```bash
cp public/cats-ai-logo-v2.png public/uk-wildcat-mark.png
```

- [ ] **Step 3: Verify header renders correctly**

```bash
cd 'c:/AA Code/Educator marketplace/the-sandbox' && npm run dev
```

Open `http://localhost:3000` and verify: header shows "University of Kentucky" with no subtitle, logo renders. Check all 4 demo users.

- [ ] **Step 4: Commit**

```bash
git add app/components/Header.tsx public/uk-wildcat-mark.png
git commit -m "rebrand: update header — 'The Sandbox' → 'University of Kentucky', swap logo"
```

---

### Task 2: Landing Page — Full Rebrand

**Files:**
- Modify: `app/components/landing/RoleAwareLanding.tsx:27-214`

- [ ] **Step 1: Update LandingShell (header + footer)**

Lines 31-51 — update logo, remove product names:

```tsx
// BEFORE (lines 32-38)
          <div className="size-10 rounded-xl overflow-hidden bg-white border border-gray-100">
            <Image src="/cats-ai-logo-v2.png" alt="CATS-AI" width={40} height={40} className="object-contain w-full h-full" />
          </div>
          <div>
            <div className="font-bold text-uk-blue text-lg leading-tight">The Sandbox</div>
            <div className="text-[10px] text-gray-400 font-medium tracking-widest uppercase">Powered by CATS-AI · University of Kentucky</div>
          </div>

// AFTER
          <div className="size-10 rounded-xl overflow-hidden bg-white border border-gray-100">
            <Image src="/uk-wildcat-mark.png" alt="University of Kentucky" width={40} height={40} className="object-contain w-full h-full" />
          </div>
          <div>
            <div className="font-bold text-uk-blue text-lg leading-tight">University of Kentucky</div>
          </div>
```

```tsx
// BEFORE (lines 47-50)
      <footer className="border-t border-gray-100 px-6 py-4 flex items-center justify-between text-xs text-gray-400">
        <span>© 2026 University of Kentucky · CATS-AI</span>
        <span className="text-uk-blue font-medium">The Sandbox</span>
      </footer>

// AFTER
      <footer className="border-t border-gray-100 px-6 py-4 flex items-center justify-between text-xs text-gray-400">
        <span>© 2026 University of Kentucky</span>
        <span className="text-uk-blue font-medium">Built by CATS-AI</span>
      </footer>
```

- [ ] **Step 2: Update Fork Screen (role picker)**

Line 88 — welcome heading:

```tsx
// BEFORE
            Welcome to <span className="text-uk-blue">The Sandbox</span>

// AFTER
            Welcome
```

- [ ] **Step 3: Update Faculty Landing**

Line 136 — remove product name from description:

```tsx
// BEFORE
            The Sandbox helps you define your AI stance, generate a syllabus-ready policy, and scan assignments for AI vulnerability — all in one sitting.

// AFTER
            Define your AI stance, generate a syllabus-ready policy, and scan assignments for AI vulnerability — all in one sitting.
```

Line 167 — social proof:

```tsx
// BEFORE
          <p className="text-sm text-gray-400 mb-4">Join 200+ UK faculty using The Sandbox</p>

// AFTER
          <p className="text-sm text-gray-400 mb-4">Join 200+ UK faculty</p>
```

- [ ] **Step 4: Update Student Landing**

Line 197 — feature description:

```tsx
// BEFORE
            { icon: Wand2, color: 'bg-violet-100 text-violet-700', title: 'Build study tools in minutes', body: 'Describe what you want to practice and The Sandbox turns it into a live AI experience — no code needed.' },

// AFTER
            { icon: Wand2, color: 'bg-violet-100 text-violet-700', title: 'Build study tools in minutes', body: 'Describe what you want to practice and it turns into a live AI experience — no code needed.' },
```

- [ ] **Step 5: Verify landing page renders**

Open `http://localhost:3000` while logged out. Check fork screen, faculty landing, student landing. Verify no "The Sandbox" text visible.

- [ ] **Step 6: Commit**

```bash
git add app/components/landing/RoleAwareLanding.tsx
git commit -m "rebrand: landing page — remove all 'The Sandbox' product branding"
```

---

### Task 3: Layout Metadata — Title & Description

**Files:**
- Modify: `app/layout.tsx:12-17`

- [ ] **Step 1: Update metadata**

```tsx
// BEFORE (lines 12-17)
export const metadata: Metadata = {
  title: 'The Sandbox | CATS-AI',
  description:
    'The Sandbox is the AI-powered learning operating system for the University of Kentucky — built by CATS-AI for students, educators, and staff.',
  manifest: '/manifest.json',
}

// AFTER
export const metadata: Metadata = {
  title: 'University of Kentucky',
  description:
    'Courses, campus, and AI tools for UK students, educators, and staff.',
  manifest: '/manifest.json',
}
```

- [ ] **Step 2: Commit**

```bash
git add app/layout.tsx
git commit -m "rebrand: page title and meta description → University of Kentucky"
```

---

### Task 4: Web App Manifest

**Files:**
- Modify: `public/manifest.json`

- [ ] **Step 1: Update manifest**

```json
{
  "name": "University of Kentucky",
  "short_name": "UK",
  "description": "Courses, campus, and AI tools for UK students and faculty",
  "start_url": "/hub",
  "display": "standalone",
  "theme_color": "#0033A0",
  "background_color": "#ffffff",
  "orientation": "any",
  "icons": [
    {
      "src": "/uk-wildcat-mark.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/uk-wildcat-mark.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

- [ ] **Step 2: Commit**

```bash
git add public/manifest.json
git commit -m "rebrand: manifest.json → University of Kentucky"
```

---

### Task 5: Onboarding Modal

**Files:**
- Modify: `app/components/OnboardingModal.tsx:70`

- [ ] **Step 1: Update welcome text**

```tsx
// BEFORE (line 70)
              You&apos;re in The Sandbox, {firstName}.

// AFTER
              Welcome, {firstName}.
```

- [ ] **Step 2: Commit**

```bash
git add app/components/OnboardingModal.tsx
git commit -m "rebrand: onboarding modal — remove 'The Sandbox' from welcome"
```

---

### Task 6: Personal Site Footer

**Files:**
- Modify: `app/components/personal-site/SiteFooter.tsx:64`

- [ ] **Step 1: Update footer credit**

```tsx
// BEFORE (line 64)
            <span className="text-xs text-white/15 tracking-widest uppercase">Built on The Sandbox</span>

// AFTER
            <span className="text-xs text-white/15 tracking-widest uppercase">University of Kentucky</span>
```

- [ ] **Step 2: Commit**

```bash
git add app/components/personal-site/SiteFooter.tsx
git commit -m "rebrand: personal site footer — remove 'The Sandbox'"
```

---

### Task 7: Evaluator Pages — Logo & Branding

**Files:**
- Modify: `app/evaluate/page.tsx:26-27`
- Modify: `app/evaluate/summary/page.tsx:466-469`

- [ ] **Step 1: Update evaluator entry page logo**

```tsx
// BEFORE (app/evaluate/page.tsx lines 26-27)
          src="/cats-ai-logo-v2.png"
          alt="CATS-AI"

// AFTER
          src="/uk-wildcat-mark.png"
          alt="University of Kentucky"
```

- [ ] **Step 2: Update evaluator summary print header**

```tsx
// BEFORE (app/evaluate/summary/page.tsx lines 466-469)
        <Image src="/cats-ai-logo-v2.png" alt="CATS-AI" width={48} height={48} />
        <div>
          <h1 className="text-xl font-extrabold text-uk-blue">THE SANDBOX</h1>
          <p className="text-sm text-gray-500">AI-Powered University Platform — Evaluator Summary</p>
        </div>

// AFTER
        <Image src="/uk-wildcat-mark.png" alt="University of Kentucky" width={48} height={48} />
        <div>
          <h1 className="text-xl font-extrabold text-uk-blue">UNIVERSITY OF KENTUCKY</h1>
          <p className="text-sm text-gray-500">AI-Powered University Platform — Evaluator Summary</p>
        </div>
```

- [ ] **Step 3: Commit**

```bash
git add app/evaluate/page.tsx app/evaluate/summary/page.tsx
git commit -m "rebrand: evaluator pages — swap logo and heading"
```

---

### Task 8: Sprint 1 Verification

- [ ] **Step 1: Run grep to verify no remaining user-visible references**

```bash
cd 'c:/AA Code/Educator marketplace/the-sandbox'
grep -ri "The Sandbox" app/components/ --include="*.tsx" --include="*.ts" | grep -v "Sandcastle\|PromptLabSandbox\|// \|/\*\|\.md"
```

Expected: zero results in UI-facing component strings (system prompts in `lib/` are Sprint 2).

- [ ] **Step 2: Run grep for remaining CATS-AI logo references**

```bash
grep -r "cats-ai-logo" app/ --include="*.tsx" --include="*.ts"
```

Expected: zero results (all should now use `uk-wildcat-mark.png`).

- [ ] **Step 3: Run build check**

```bash
npm run lint && npx tsc --noEmit && npm run build
```

Expected: clean build, no errors.

- [ ] **Step 4: Commit verification pass**

```bash
git add -A
git commit -m "rebrand: Sprint 1 complete — all user-visible branding updated"
```

---

## Sprint 2: Internal Code & AI Context

### Task 9: localStorage Migration Utility

**Files:**
- Create: `app/lib/storage-migration.ts`
- Modify: `app/components/ClientProviders.tsx:50`

- [ ] **Step 1: Create migration utility**

Create `app/lib/storage-migration.ts`:

```typescript
const PREFIX_OLD = 'sandbox-'
const PREFIX_NEW = 'uky-'
const MIGRATION_FLAG = 'uky-storage-migrated'

export function migrateLocalStorageKeys(): void {
  if (typeof window === 'undefined') return
  if (localStorage.getItem(MIGRATION_FLAG)) return

  const keysToMigrate: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(PREFIX_OLD)) {
      keysToMigrate.push(key)
    }
  }

  for (const key of keysToMigrate) {
    const value = localStorage.getItem(key)
    if (value !== null) {
      localStorage.setItem(key.replace(PREFIX_OLD, PREFIX_NEW), value)
      localStorage.removeItem(key)
    }
  }

  localStorage.setItem(MIGRATION_FLAG, 'true')
}
```

- [ ] **Step 2: Wire migration into ClientProviders**

Add import at top of `ClientProviders.tsx`:

```typescript
import { migrateLocalStorageKeys } from '../lib/storage-migration'
```

Add call at the beginning of the first `useEffect` that runs on mount (inside the main `ClientProvidersInner` component), or add a new effect:

```typescript
useEffect(() => {
  migrateLocalStorageKeys()
}, [])
```

- [ ] **Step 3: Update ONBOARDING_KEY constant**

```typescript
// BEFORE (line 50)
const ONBOARDING_KEY = 'sandbox-onboarding-done';

// AFTER
const ONBOARDING_KEY = 'uky-onboarding-done';
```

- [ ] **Step 4: Commit**

```bash
git add app/lib/storage-migration.ts app/components/ClientProviders.tsx
git commit -m "rebrand: add localStorage migration utility (sandbox-* → uky-*)"
```

---

### Task 10: Rename All localStorage Keys

**Files (batch find-and-replace `sandbox-` → `uky-` in string literals):**

This task is a mechanical find-and-replace. For each file below, replace every `'sandbox-` string literal with `'uky-`. Do NOT rename Sandy, Sandcastle, or PromptLabSandbox references.

**Files to update (grouped by directory):**

**app/components/:**
- `ClientProviders.tsx` — `sandbox-onboarding-done` (done in Task 9), `sandbox-cold-start-`
- `ChatInterface.tsx:195` — `sandbox-prefill-chat`
- `ConciergePanel.tsx:182-183` — `sandbox-build-sandy-nudge`, `sandbox-studio-sandy-nudge`
- `EvaluatorInsightCallout.tsx:7` — `sandbox-evaluator-dismissed-callouts`
- `EvaluatorTour.tsx:9` — `sandbox-evaluator-tour`
- `EvaluatorTracker.tsx:9-11` — `sandbox-evaluator-start-time`, `sandbox-evaluator-progress`, `sandbox-evaluator-dismissed-callouts`
- `NotebookWidget.tsx:34` — `sandbox-note-saved`
- `PlatformAnnouncementBanner.tsx:25` — `sandbox-dismissed-announcements`
- `SandyCenter.tsx:175` — `sandbox-note-saved`
- `BuilderLayout.tsx:266-268` — `sb-first-build-complete` (keep — `sb-` is not `sandbox-`)
- `concierge/concierge-utils.ts:64` — `sandbox-course-context`
- `concierge/useSandyNarrator.ts:4-6` — `sandbox-narrator-act`, `sandbox-narrator-visited-acts`, `sandbox-narrator-greeted`
- `concierge/SandyAmbientContext.tsx:179-196,368` — `sandbox-course-context-changed`, `sandbox-briefing-ready`, `sandbox-note-saved`
- `courses/GradebookTab.tsx:54` — `sandbox-gradebook-ai-banner-dismissed`
- `courses/GradingPanel.tsx:239,253` — `sandbox-grading-open`, `sandbox-grading-close`
- `faculty-home/DaySummary.tsx:7` — `sandbox-day-summary-dismissed`
- `faculty-home/FacultyHomepage.tsx:233-234,336,624,640` — `sandbox-sandy-tool`, `sandbox-briefing-ready`, `sandbox-sandy-prefill`
- `faculty-home/QuickActionsStrip.tsx:28` — `sandbox-sandy-tool`
- `faculty-home/RecommendationTable.tsx:35` — `sandbox-sandy-tool`
- `briefing/EmailBrief.tsx:318,475,482` — `sandbox-email-reclassify`, `sandbox-email-snooze`, `sandbox-email-bookmark`
- `student-home/AnnouncementsBanner.tsx:12` — `sandbox-dismissed-announcements`
- `student-home/StudentHomepage.tsx:246` — `sandbox-briefing-ready`
- `ai-literacy/InlinePolicyLite.tsx:126` — `sandbox-last-policy-name`
- `ai-literacy/QuickStartWizard.tsx:381` — `sandbox-last-policy-name`

**app/lib/:**
- `cold-start.ts:13-14` — `sandbox-cold-start-`, `sandbox-cold-start-complete-`
- `auth-context.tsx:49,89,90,150,161,245,257,266` — `sandbox-created-users`, `sandbox-evaluator-mode`, `sandbox-evaluator-start-time`, `sandbox-original-admin`, `sandbox-demo-user-email`
- `auth-jwt.ts:3` — `sandbox-session` (cookie name)
- `azure-blob-storage.ts:15` — `sandbox-audio` (container name — keep or rename based on Azure config)
- `evaluator-session-log.ts:1` — `sandbox-evaluator-session-log`
- `i18n/locale-context.tsx:41` — `sandbox-locale`
- `playground-export.ts:92` — `sandbox-export`
- `presence-context.tsx:124,328` — `sandbox-contacts-`, `sandbox-presence`
- `course-map/plugin-registry.ts:10` — `sandbox-course-map-plugins`
- `course-map/sharing-service.ts:119-120` — `sandbox-course-map-share-links`, `sandbox-course-map-shared-users`
- `messages/attachment-service.ts:29,87` — `sandbox-audio` (container name — keep or rename based on Azure config)

**app/ pages:**
- `analytics/faculty/page.tsx:381,527` — `sandbox-demo-banner-dismissed`
- `build/page.tsx:81,157` — `sandbox-build-prompt`
- `courses/page.tsx:420,431` — `sandbox-course-context`, `sandbox-course-context-changed`
- `courses/[id]/course-map/components/useCourseMapCanvas.ts:161` — `sandbox-perf-profiler`
- `courses/[id]/course-map/page.tsx:1705` — `sandbox-perf-profiler`
- `evaluate/page.tsx:16,68,149` — `sandbox-evaluator-start-time`, `sandbox-evaluator-mode`
- `evaluate/summary/page.tsx:18-23,188,935` — `sandbox-evaluator-start-time`, `sandbox-evaluator-progress`, `sandbox-evaluator-roi`, `sandbox-evaluator-branding`, `sandbox-evaluator-summary-visits`, `sandbox-evaluator-wishlist`, `sandbox-evaluator-nps`
- `onboard/page.tsx:895,1088,1328` — `sandbox-sandy-intent-prompt`, `sandbox-last-policy-name`, `sandbox-just-onboarded`
- `page.tsx:27,29,32,35,56` — `sandbox-just-onboarded`, `sandbox-courses-imported`, `sandbox-sandy-intent-prompt`
- `publish/page.tsx:692` — `sandbox-build-complete`
- `tools/[id]/page.tsx:1271` — `sandbox-prefill-chat`

**app/hooks/:**
- `useAgentProfiles.ts:9` — `sandbox-agent-profile-change`

- [ ] **Step 1: Batch rename all `sandbox-` string literals to `uky-`**

Use find-and-replace across all files listed above. For each file, replace `'sandbox-` with `'uky-` in string literal contexts. Also replace `"sandbox-` with `"uky-` for template literals.

**IMPORTANT exceptions — DO NOT rename:**
- `sb-first-build-complete` (uses `sb-` prefix, not `sandbox-`)
- `sandbox-audio` in `azure-blob-storage.ts` and `messages/attachment-service.ts` (Azure container name — renaming requires Azure-side change, defer)
- `sandbox-session` in `auth-jwt.ts` (cookie name — renaming logs out all real-auth users; defer or add backwards compat reading)

**For `sandbox-session` cookie:** Add backwards-compatible reading — check for `uky-session` first, then fall back to `sandbox-session`:

```typescript
// auth-jwt.ts — update COOKIE_NAME
export const COOKIE_NAME = 'uky-session'
export const LEGACY_COOKIE_NAME = 'sandbox-session'
```

Then update `getSessionFromCookie()` to check both:
```typescript
const token = cookies.get(COOKIE_NAME)?.value || cookies.get(LEGACY_COOKIE_NAME)?.value
```

And update `proxy.ts` similarly to read both cookie names.

- [ ] **Step 2: Verify no remaining sandbox- localStorage keys**

```bash
grep -rn "'sandbox-" app/ --include="*.tsx" --include="*.ts" | grep -v "Sandcastle\|PromptLabSandbox\|sandbox-audio\|// \|/\*"
```

Expected: zero results (except `sandbox-audio` container names if deferred).

- [ ] **Step 3: Run build check**

```bash
npm run lint && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "rebrand: rename all sandbox-* localStorage keys and custom events to uky-*"
```

---

### Task 11: Environment Variables

**Files:**
- Modify: `.env`
- Modify: `.env.example`

- [ ] **Step 1: Update .env**

```bash
# BEFORE
NEXT_PUBLIC_APP_NAME="The Sandbox"
STORAGE_JWT_SECRET="sandbox-storage-dev-secret"

# AFTER
NEXT_PUBLIC_APP_NAME="University of Kentucky"
STORAGE_JWT_SECRET="uky-storage-dev-secret"
```

Note: `NEXT_PUBLIC_APP_URL` stays as-is until a custom domain is set up. `SENTRY_PROJECT` is internal — can defer.

- [ ] **Step 2: Update .env.example**

Update `EMAIL_FROM`, `SENTRY_PROJECT`, and `NEXT_PUBLIC_APP_URL` comments.

- [ ] **Step 3: Commit**

```bash
git add .env .env.example
git commit -m "rebrand: environment variables — app name → University of Kentucky"
```

**IMPORTANT: Also update `NEXT_PUBLIC_APP_NAME` on Vercel dashboard after deploy.**

---

### Task 12: System Prompts

**Files:**
- Modify: `prisma/tool-catalog.ts` (~10 occurrences)
- Modify: any `app/lib/` files with "The Sandbox" in AI prompt strings

- [ ] **Step 1: Update tool-catalog.ts**

Replace all "The Sandbox" references in system prompts, descriptions, welcome messages:

| Line | Before | After |
|------|--------|-------|
| 609 | `coach on The Sandbox` | `coach at the University of Kentucky` |
| 628 | `introduction to The Sandbox` | `introduction to the platform` |
| 629 | `understand what The Sandbox is` | `understand what the platform offers` |
| 636 | `guide for The Sandbox - UK's educational AI tool marketplace` | `guide at the University of Kentucky` |
| 637 | `Welcome to The Sandbox` | `Welcome` |
| 640 | `What is The Sandbox, exactly?` | `What can I do here?` |
| 646 | `purpose of The Sandbox` | `purpose of the platform` |
| 650 | `orientation to The Sandbox platform` | `orientation to the platform` |
| 663 | `coach for The Sandbox` | `coach at the University of Kentucky` |
| 677 | `tools on The Sandbox` | `tools on the platform` |

- [ ] **Step 2: Search for and update remaining system prompt references**

```bash
grep -rn "The Sandbox" app/lib/ --include="*.ts" | grep -v "node_modules\|\.d\.ts"
```

Update each occurrence:
- `app/lib/audit-report-service.ts` — `"AI education platform "The Sandbox""` → `"the University of Kentucky's AI education platform"`
- `app/lib/compliance-service.ts` — `"university AI platform called "The Sandbox""` → `"the University of Kentucky's AI platform"`
- `app/lib/agent/tools/sandy-tools.ts` — `platform: 'The Sandbox'` → `platform: 'University of Kentucky'`
- Sandy system prompts: `"You are Sandy, the AI assistant for The Sandbox"` → `"You are Sandy, the AI assistant at the University of Kentucky"`

- [ ] **Step 3: Commit**

```bash
git add prisma/tool-catalog.ts app/lib/
git commit -m "rebrand: system prompts — The Sandbox → University of Kentucky"
```

---

### Task 13: Seed Data & Portfolio References

**Files:**
- Modify: `prisma/seed.ts:622,657,4516,4529`
- Modify: `app/lib/portfolio.ts:103`
- Modify: `app/hooks/useAudioPlayer.ts:322`
- Modify: `scripts/seed-university-systems.ts:381`

- [ ] **Step 1: Update seed.ts**

Replace `organization: 'The Sandbox'` → `organization: 'University of Kentucky'` on lines 4516 and 4529.

Replace descriptive text on lines 622 and 657 — change "The Sandbox should not only ship" to "The platform should not only ship".

- [ ] **Step 2: Update portfolio.ts**

Line 103: `organization: 'The Sandbox'` → `organization: 'University of Kentucky'`

- [ ] **Step 3: Update useAudioPlayer.ts**

Line 322: `album: 'The Sandbox'` → `album: 'University of Kentucky'`

- [ ] **Step 4: Update seed-university-systems.ts**

Line 381: Replace "Lessons from The Sandbox" → "Lessons from UK's AI Platform"

- [ ] **Step 5: Commit**

```bash
git add prisma/seed.ts app/lib/portfolio.ts app/hooks/useAudioPlayer.ts scripts/seed-university-systems.ts
git commit -m "rebrand: seed data and portfolio — The Sandbox → University of Kentucky"
```

---

### Task 14: Sprint 2 Verification

- [ ] **Step 1: Full grep verification**

```bash
# Verify no remaining user-facing "The Sandbox"
grep -ri "The Sandbox" app/ --include="*.tsx" --include="*.ts" | grep -v "Sandcastle\|PromptLabSandbox\|node_modules\|// \|/\*"

# Verify no remaining sandbox- prefixes (except exclusions)
grep -rn "'sandbox-" app/ --include="*.tsx" --include="*.ts" | grep -v "sandbox-audio"

# Verify no remaining sandbox- custom events
grep -rn "'sandbox-" app/ --include="*.tsx" --include="*.ts" | grep "Event"
```

Expected: zero results for all three.

- [ ] **Step 2: Run full build**

```bash
npm run lint && npx tsc --noEmit && npm run build
```

- [ ] **Step 3: Commit Sprint 2 completion**

```bash
git add -A
git commit -m "rebrand: Sprint 2 complete — all internal sandbox-* references migrated to uky-*"
```

---

## Sprint 3: Infrastructure & Documentation

### Task 15: Package & Project Config

**Files:**
- Modify: `package.json:2`

- [ ] **Step 1: Update package name**

```json
// BEFORE
"name": "the-sandbox"

// AFTER
"name": "university-of-kentucky"
```

Note: `.vercel/project.json` — do NOT modify this file directly. It must be updated via the Vercel dashboard. Changing it locally will cause deployment issues.

- [ ] **Step 2: Commit**

```bash
git add package.json
git commit -m "rebrand: package.json name → university-of-kentucky"
```

---

### Task 16: CLAUDE.md Updates

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update the 3 "The Sandbox" references**

Line 67: `**The Sandbox** — The AI-powered operating system` → `**University of Kentucky** — The AI-powered operating system`

Line 841: `Students build professional brand sites served from The Sandbox` → `Students build professional brand sites served from the platform`

Line 983 (Branding section):
```markdown
// BEFORE
- App name: "The Sandbox" by CATS-AI
- Logo: `public/cats-ai-logo-v2.png`

// AFTER
- App name: "University of Kentucky"
- Logo: `public/uk-wildcat-mark.png`
- Attribution: "Built by CATS-AI" (footer only)
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "rebrand: CLAUDE.md — update branding references"
```

---

### Task 17: Architecture & Blueprint Docs (Batch)

**Files:** ~41 .md files in `Blueprints/` and repo root

- [ ] **Step 1: Batch find-and-replace in all .md files**

This is a mechanical replacement across documentation files. Replace `"The Sandbox"` with `"University of Kentucky"` or `"the platform"` depending on context:

- In feature descriptions/context sections: `"The Sandbox"` → `"the platform"` (reads more naturally)
- In headers/titles: `"The Sandbox"` → `"University of Kentucky"`
- Skip `REBRAND-UNIVERSITY-OF-KENTUCKY.md` itself (it documents the before/after)

```bash
# Count remaining .md files with "The Sandbox"
grep -rl "The Sandbox" Blueprints/ *.md ARCHITECTURE-*.md PLATFORM-*.md SECURITY-*.md SANDCASTLE-*.md AUDIO_SUITE_ARCHITECTURE.md SYSTEM-INTERDEPENDENCIES.md FERPA-COMPLIANCE-AUDIT.md PRESENTATION-SUMMARY.md 2>/dev/null | grep -v REBRAND | wc -l
```

- [ ] **Step 2: Commit**

```bash
git add '*.md' 'Blueprints/*.md'
git commit -m "rebrand: documentation — batch update The Sandbox → University of Kentucky across 40+ .md files"
```

---

### Task 18: Final Verification & Cleanup

- [ ] **Step 1: Comprehensive grep**

```bash
# Any remaining "The Sandbox" anywhere
grep -ri "The Sandbox" . --include="*.tsx" --include="*.ts" --include="*.json" --include="*.md" | grep -v "node_modules\|.next\|REBRAND-UNIVERSITY" | head -20

# Any remaining cats-ai-logo references
grep -r "cats-ai-logo" . --include="*.tsx" --include="*.ts" --include="*.json" | grep -v "node_modules\|.next"
```

- [ ] **Step 2: Full build verification**

```bash
npm run lint && npx tsc --noEmit && npm run build
```

- [ ] **Step 3: Manual smoke test**

Open `http://localhost:3000` and check:
1. Landing page (logged out) — "University of Kentucky", correct logo
2. Student homepage (Tiana) — no "Sandbox" visible
3. Faculty homepage (Katie) — no "Sandbox" visible  
4. Admin homepage (Heath) — no "Sandbox" visible
5. Staff homepage (Morgan) — no "Sandbox" visible
6. Header on every page — "University of Kentucky"
7. `/site/kaylee-daniel` — footer says "University of Kentucky"

- [ ] **Step 4: Update REBRAND blueprint status**

In `Blueprints/REBRAND-UNIVERSITY-OF-KENTUCKY.md`, change line 3:

```markdown
// BEFORE
> **Status:** Blueprint — Not Yet Started

// AFTER
> **Status:** Complete — Implemented 2026-04-03
```

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "rebrand: complete — University of Kentucky branding across all 3 sprints"
```

---

## Post-Deploy Checklist (Manual)

These items require manual action outside the codebase:

- [ ] **Vercel:** Update `NEXT_PUBLIC_APP_NAME` env var to `"University of Kentucky"`
- [ ] **Vercel:** Consider renaming project in dashboard (affects `.vercel/project.json`)
- [ ] **Logo:** Replace `public/uk-wildcat-mark.png` with official UK Wildcat mark when obtained
- [ ] **Custom domain:** Configure `platform.uky.edu` or similar when available
- [ ] **Memory:** Update `MEMORY.md` project description
