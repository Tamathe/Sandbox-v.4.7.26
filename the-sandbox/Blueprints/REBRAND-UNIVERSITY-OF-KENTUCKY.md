# Rebrand: "The Sandbox" → "University of Kentucky"

> **Status:** Complete — Implemented 2026-04-03
> **Date:** 2026-04-03
> **Goal:** Remove all product branding. The platform should feel like *the university itself*, not an app built for the university.

---

## Design Philosophy

The name "The Sandbox" creates distance between the student and their institution. It says: *you are using a product.* The rebrand says: *you are at your university.*

**Before:**
```
┌─ [CATS-AI Logo] The Sandbox
│  CATS-AI · University of Kentucky
```

**After:**
```
┌─ [UK Wildcat Mark] University of Kentucky
│  (no subtitle needed)
```

The restraint is the design. No tagline. No "powered by." No version number. Just the name and the mark — like the entrance to a campus building.

### What We Keep
- **Sandy** — She is a character, not a brand. Her name stays.
- **Sandcastle** — Feature name, not platform name. Stays.
- **CATS-AI** — Moves to footer-only attribution. Not front-and-center.

### What Changes
- Every user-visible instance of "The Sandbox" → **"University of Kentucky"**
- Every internal `sandbox-` prefix → **`uky-`**
- Logo lockup → UK Wildcat head or institutional seal
- Page titles → "University of Kentucky" or contextual ("My Courses | University of Kentucky")

---

## Blast Radius Summary

| Category | Count | Risk | Sprint |
|----------|-------|------|--------|
| UI-visible branding (header, landing, footer, modals) | ~15 strings | HIGH — users see it | 1 |
| `<title>` / meta / OpenGraph / manifest.json | ~5 files | HIGH — SEO, sharing | 1 |
| Environment variables (`NEXT_PUBLIC_APP_NAME`, URLs) | ~4 vars | HIGH — runtime | 1 |
| System prompts (AI context strings) | ~8 prompts | MEDIUM — AI behavior | 2 |
| localStorage keys (`sandbox-*` prefix) | ~72 occurrences across 30 files | MEDIUM — migration needed | 2 |
| Custom events (`sandbox-*` prefix) | ~20 events across 15 files | MEDIUM — internal only | 2 |
| Documentation (CLAUDE.md, architecture docs) | ~25 files | LOW — dev-facing | 3 |
| package.json / Vercel config / Sentry | ~5 files | LOW — infra | 3 |
| Seed data / portfolio references | ~6 files | LOW — demo data | 3 |

**Total: ~180 occurrences across ~80 files**

---

## Sprint 1: User-Visible Branding (What Students See)

*Everything a student or faculty member could read on screen.*

### 1A. Header Component
**File:** `app/components/Header.tsx`
**Line ~342:**
```tsx
// BEFORE
<div className="font-bold text-[#0033A0] text-[17px] leading-tight">The Sandbox</div>
<div className="hidden text-[10px] text-gray-400 leading-tight font-medium tracking-widest uppercase xl:block">
  CATS-AI · University of Kentucky
</div>

// AFTER
<div className="font-bold text-[#0033A0] text-[17px] leading-tight">University of Kentucky</div>
// Remove subtitle entirely — the name IS the institution
```

**Design decision:** The header text gets slightly longer. Consider:
- Abbreviating to **"UK"** with the Wildcat mark on small screens
- Or keeping **"University of Kentucky"** at a slightly smaller font size (15px)
- The CATS-AI logo (`cats-ai-logo-v2.png`) should be replaced with the UK Wildcat head mark

### 1B. Landing Page
**File:** `app/components/landing/RoleAwareLanding.tsx`

| Line | Before | After |
|------|--------|-------|
| 33 | `alt="CATS-AI"` | `alt="University of Kentucky"` |
| 36 | `The Sandbox` | `University of Kentucky` |
| 37 | `Powered by CATS-AI · University of Kentucky` | *(remove line)* |
| 48 | `© 2026 University of Kentucky · CATS-AI` | `© 2026 University of Kentucky` |
| 49 | `The Sandbox` | *(remove — redundant with header)* |
| 88 | `Welcome to The Sandbox` | `Welcome` or `Welcome to UK` |
| 136 | `The Sandbox helps you define your AI stance...` | `Define your AI stance, generate a syllabus-ready policy...` (remove subject) |
| 167 | `Join 200+ UK faculty using The Sandbox` | `Join 200+ UK faculty` |
| 197 | `...The Sandbox turns it into a live AI experience` | `...turns it into a live AI experience` (remove subject) |

**Design note:** The landing page currently sells "The Sandbox" as a product. After rebrand, it should sell the *capabilities* without naming them. The university doesn't need a product name — it needs a front door.

### 1C. Welcome Modal
**File:** `app/components/student-home/StudentHomepage.tsx` (or welcome modal component)

```
// BEFORE
"Your AI-powered study hub, built for the University of Kentucky."

// AFTER
"Your courses, deadlines, and campus — all in one place."
```

Drop "AI-powered" — the user doesn't need to know the engine. They need to know the value.

### 1D. Personal Site Footer
**File:** `app/components/personal-site/SiteFooter.tsx`

Replace any "The Sandbox" branding with `University of Kentucky` or remove platform attribution from student personal sites entirely (the student's site shouldn't advertise our platform).

### 1E. Manifest & Meta
**File:** `public/manifest.json`
```json
// BEFORE
{ "name": "The Sandbox — Course Map", "description": "AI-powered course map visualization for The Sandbox" }

// AFTER
{ "name": "University of Kentucky", "description": "Courses, campus, and AI tools for UK students and faculty" }
```

**Files:** `app/layout.tsx` or wherever `<title>` / OpenGraph meta is set
- Page title pattern: `{Page Name} | University of Kentucky`
- OG image: Should feature UK branding, not CATS-AI

### 1F. Logo Asset Swap
**Current:** `public/cats-ai-logo-v2.png`
**Action:** Add UK Wildcat mark asset. Keep CATS-AI logo for footer attribution only.

| Location | Before | After |
|----------|--------|-------|
| Header (all pages) | CATS-AI logo | UK Wildcat mark |
| Landing page | CATS-AI logo | UK Wildcat mark |
| Favicon | (check current) | UK "K" or Wildcat |
| OG share image | (check current) | UK branded |
| Footer (all pages) | — | Small "Built by CATS-AI" text (gray, subtle) |

---

## Sprint 2: Internal Code & AI Context

*Things users don't read directly, but that affect behavior.*

### 2A. Environment Variables
**Files:** `.env`, `.env.example`

| Variable | Before | After |
|----------|--------|-------|
| `NEXT_PUBLIC_APP_NAME` | `"The Sandbox"` | `"University of Kentucky"` |
| `NEXT_PUBLIC_APP_URL` | `"https://the-sandboxv2-rust.vercel.app"` | Update when custom domain is set |
| `SENTRY_PROJECT` | `the-sandbox` | `uky-platform` (or keep — Sentry is internal) |
| `STORAGE_JWT_SECRET` | `"sandbox-storage-dev-secret"` | `"uky-storage-dev-secret"` |

### 2B. localStorage Key Migration
**Scope:** ~72 occurrences across 30 files using `sandbox-` prefix

**Strategy:** Create a one-time migration utility + rename all keys.

```typescript
// app/lib/storage-migration.ts
const PREFIX_OLD = 'sandbox-';
const PREFIX_NEW = 'uky-';

export function migrateLocalStorageKeys() {
  const migrated = localStorage.getItem('uky-storage-migrated');
  if (migrated) return;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(PREFIX_OLD)) {
      const value = localStorage.getItem(key);
      localStorage.setItem(key.replace(PREFIX_OLD, PREFIX_NEW), value!);
      localStorage.removeItem(key);
    }
  }
  localStorage.setItem('uky-storage-migrated', 'true');
}
```

Call this once in `ClientProviders.tsx` on mount.

Then batch find-and-replace across all files:
- `sandbox-session-` → `uky-session-`
- `sandbox-demo-banner-` → `uky-demo-banner-`
- `sandbox-cold-start-` → `uky-cold-start-`
- `sandbox-onboarding-` → `uky-onboarding-`
- `sandbox-prefill-` → `uky-prefill-`
- `sandbox-build-` → `uky-build-`
- `sandbox-evaluator-` → `uky-evaluator-`
- `sandbox-grading-` → `uky-grading-`
- `sandbox-email-` → `uky-email-`
- `sandbox-narrator-` → `uky-narrator-`
- `sandbox-briefing-` → `uky-briefing-`
- `sandbox-note-` → `uky-note-`
- `sandbox-tour-` → `uky-tour-`
- All remaining `sandbox-*` → `uky-*`

**Key files (by occurrence count):**
1. `ChatInterface.tsx` (7)
2. `ClientProviders.tsx` (6)
3. `EvaluatorTracker.tsx` (6)
4. `SandyAmbientContext.tsx` (5)
5. `build/page.tsx` (4)
6. `useSandyNarrator.ts` (4)
7. `EmailBrief.tsx` (3)
8. `ExportModal.tsx` (3)
9. `ConciergePanel.tsx` (2)
10. Remaining 20 files (1-2 each)

### 2C. Custom Event Rename
**Scope:** ~20 custom events

Same pattern — global find-and-replace:
- `sandbox-prefill-chat` → `uky-prefill-chat`
- `sandbox-grading-open` / `sandbox-grading-close` → `uky-grading-*`
- `sandbox-course-context-changed` → `uky-course-context-changed`
- `sandbox-email-*` → `uky-email-*`
- `sandbox-briefing-ready` → `uky-briefing-ready`
- `sandbox-note-saved` → `uky-note-saved`
- `sandbox-build-sandy-nudge` → `uky-build-sandy-nudge`
- `sandbox-narrator-*` → `uky-narrator-*`
- `sandbox-evaluator-*` → `uky-evaluator-*`

**Important:** Events must match between dispatcher and listener. Use `replace_all` to ensure both sides update atomically per file.

### 2D. System Prompts
**Files with AI context strings mentioning "The Sandbox":**

| File | Context |
|------|---------|
| `app/lib/audit-report-service.ts` | `"AI education platform "The Sandbox""` |
| `app/lib/compliance-service.ts` | `"university AI platform called "The Sandbox""` |
| `app/lib/agent/tools/sandy-tools.ts` | `platform: 'The Sandbox'` |
| Sandy system prompt (various) | `"You are Sandy, the AI assistant for The Sandbox"` |

**Rename to:** `"the University of Kentucky's learning platform"` or simply `"the University of Kentucky platform"`

Sandy's identity prompt becomes:
```
"You are Sandy, the AI assistant at the University of Kentucky."
```

### 2E. Seed Data & Portfolio References
**Files:**
- `prisma/seed.ts` — `organization: 'The Sandbox'` → `'University of Kentucky'`
- `app/lib/portfolio.ts` — same
- `app/portfolio/page.tsx` — same
- `app/api/portfolio/suggestions/route.ts` — same
- `app/hooks/useAudioPlayer.ts` — `album: 'The Sandbox'` → `'University of Kentucky'`

---

## Sprint 3: Infrastructure & Documentation

*Developer-facing, no user impact.*

### 3A. Package & Project Config
| File | Change |
|------|--------|
| `package.json` | `"name": "the-sandbox"` → `"university-of-kentucky"` |
| `.vercel/project.json` | `"projectName": "the-sandbox"` → update after Vercel project rename |
| `next.config.ts` | Sentry project reference (if changed) |

**Note:** Changing the Vercel project name may affect the deployment URL. Coordinate with Vercel dashboard.

### 3B. Documentation
| File | Action |
|------|--------|
| `CLAUDE.md` | Update all ~8 references. "The Sandbox" → "University of Kentucky platform" |
| `ARCHITECTURE-OVERVIEW.md` | Update header and references |
| `ARCHITECTURE-SANDY-UNIVERSAL-AGENT.md` | Update ~10 references |
| `ARCHITECTURE-THE-COMMONS.md` | Update header |
| `SECURITY-HARDENING.md` | Update header |
| `ARCHITECTURE-CONSISTENCY-AUDIT.md` | Update reference |
| All `Blueprints/*.md` headers | Update "The Sandbox / CATS-AI" → "University of Kentucky" |

### 3C. Directory Rename (Optional / Deferred)
Current: `the-sandbox/`
Potential: `university-of-kentucky/` or `uky-platform/`

**Recommendation:** Defer this. It affects every developer's local setup, CI paths, documentation links, and muscle memory. The folder name is invisible to users. Do it if/when the repo moves to a university-owned GitHub org.

---

## Do NOT Rename (Exclusion List)

| Term | Reason |
|------|--------|
| `Sandy` | Character name, not platform brand |
| `Sandcastle` | Feature name (simulated environment rooms) |
| `SandyAmbientContext` | References Sandy, not Sandbox |
| `sandyUsageDecay` | References Sandy |
| `PromptLabSandbox` | "Sandbox" here means "safe testing environment" — generic CS term |
| `sandcastle.ts` / `sandcastle-*.tsx` | Feature module, not brand |
| `sand-dollar` / `Sand` (currency) | In-platform currency, independent brand element |

---

## Migration Safety

### localStorage Backwards Compatibility
Students with existing sessions will have `sandbox-*` keys in their browser. The migration utility (2B) handles this automatically on next visit. No data loss.

### Event Listener Sync
All custom events are dispatched and consumed within the same page lifecycle. Renaming both sides in the same commit ensures no breakage. No cross-page or cross-tab event dependencies exist.

### Vercel Deployment
The `.env` variable `NEXT_PUBLIC_APP_NAME` is read at build time. After updating, the next Vercel deploy picks it up automatically. No manual intervention needed.

### Search & Verification
After each sprint, run:
```bash
# Verify no remaining user-visible references
grep -ri "the sandbox" app/components/ --include="*.tsx" --include="*.ts"

# Verify no remaining localStorage prefixes
grep -r "sandbox-" app/ --include="*.tsx" --include="*.ts" | grep -v "Sandcastle\|Sandy\|PromptLab"

# Verify no remaining event names
grep -r "'sandbox-" app/ --include="*.tsx" --include="*.ts"
```

---

## Execution Order

```
Sprint 1 (User-Visible)     Sprint 2 (Internal Code)     Sprint 3 (Infra/Docs)
─────────────────────────    ────────────────────────     ─────────────────────
1A. Header.tsx               2A. .env variables           3A. package.json
1B. RoleAwareLanding.tsx     2B. localStorage migration   3B. All .md files
1C. Welcome modal            2C. Custom events            3C. Directory (deferred)
1D. SiteFooter.tsx           2D. System prompts
1E. manifest.json + meta     2E. Seed data
1F. Logo asset swap
```

Each sprint is independently deployable. Sprint 1 is the only one with user-visible impact.

---

## Open Questions

1. **UK logo asset** — Do we have permission to use the official UK Wildcat mark? Or should we use a neutral wordmark?
2. **Custom domain** — Is `uky.edu` subdomain available (e.g., `platform.uky.edu`, `learn.uky.edu`)? This would complete the institutional feel.
3. **CATS-AI attribution** — Footer only? Or remove entirely? CATS-AI built this — should that be visible anywhere?
4. **"Sand Dollar" currency** — Keep the name? It's charming and doesn't reference "Sandbox" directly, but it's adjacent.
5. **Email templates** — Are there any transactional emails that say "The Sandbox"? (Not found in codebase search, but could be in external service.)
