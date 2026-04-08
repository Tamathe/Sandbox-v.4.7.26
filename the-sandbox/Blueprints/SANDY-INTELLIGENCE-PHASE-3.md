# Sandy Intelligence Upgrade — Phase 3: User Preferences & Controls

**Status:** IN PROGRESS
**Phase:** 3 of 4
**Goal:** Give users control over Sandy's personality, proactivity, and response style through a `SandyPreference` model, settings UI, and prompt-level integration.

---

## Overview

Phase 3 adds the first user-facing Sandy customization:

| Feature | Problem | Fix |
|---|---|---|
| **SandyPreference schema** | Sandy has one personality for everyone — no way to adjust tone, verbosity, or proactivity level | New Prisma model storing per-user preferences with sane defaults |
| **Preferences API** | No endpoint to read/write Sandy settings | `GET/PUT /api/sandy/preferences` mirroring notification prefs pattern |
| **Settings UI** | Settings page only has notifications + account deletion | New `SandyPreferences` component on settings page with tone, proactivity, and response length controls |
| **Prompt integration** | `buildSystemPrompt()` ignores user preferences | Fetch preferences in concierge route, inject behavioral instructions into system prompt |

**One schema change (new model). One new component. Three new files.**

---

## Feature 1: SandyPreference Schema

### Design

Single model per user with JSON-flexible fields for future extensibility.

```prisma
model SandyPreference {
  id              String   @id @default(cuid())
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  tone            String   @default("balanced")    // "formal" | "balanced" | "casual"
  proactivityLevel String  @default("medium")      // "off" | "low" | "medium" | "high"
  responseLength  String   @default("standard")    // "concise" | "standard" | "detailed"
  showChips       Boolean  @default(true)          // show starter suggestion chips
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([userId])
}
```

Defaults: balanced tone, medium proactivity, standard length, chips on. These match Sandy's current behavior so existing users see no change.

---

## Feature 2: Preferences Service + API

### Service: `app/lib/sandy-preferences-service.ts`

- `getPreferences(userId)` — fetch or auto-create with defaults
- `updatePreferences(userId, patch)` — partial update

### API: `app/api/sandy/preferences/route.ts`

- `GET` — returns user's current Sandy preferences
- `PUT` — accepts partial update, returns full updated record

---

## Feature 3: Settings UI

### Component: `app/components/settings/SandyPreferences.tsx`

Three control groups:
1. **Tone** — 3 radio cards: Formal / Balanced / Casual
2. **Proactivity** — 4 radio cards: Off / Low / Medium / High
3. **Response Length** — 3 radio cards: Concise / Standard / Detailed
4. **Chips toggle** — single checkbox

Pattern follows `NotificationPreferences.tsx` — fetch on mount, optimistic local state, save button.

---

## Feature 4: Prompt Integration

### In `app/api/concierge/route.ts`

Fetch `SandyPreference` for the user. Pass to `buildSystemPrompt()`.

### In `app/lib/concierge-service.ts`

New parameter `sandyPreferences`. Inject a `## SANDY BEHAVIOR PREFERENCES` section that modifies Sandy's personality preamble:

- **Tone:** "formal" → more professional language; "casual" → warmer, shorter, uses contractions
- **Proactivity:** "off" → never surface unsolicited suggestions; "low" → only urgent items; "high" → actively suggest
- **Response length:** "concise" → 1-2 sentences max; "detailed" → fuller explanations with examples

---

## Build Order

```
Step 1: Schema + migrate
  └── prisma/schema.prisma — add SandyPreference model
  └── npx prisma migrate dev --name add-sandy-preferences
  └── npx prisma generate

Step 2: Service + API
  └── app/lib/sandy-preferences-service.ts
  └── app/api/sandy/preferences/route.ts

Step 3: Settings UI
  └── app/components/settings/SandyPreferences.tsx
  └── app/settings/page.tsx — add component

Step 4: Prompt integration
  └── app/api/concierge/route.ts — fetch prefs
  └── app/lib/concierge-service.ts — new param + section

Step 5: Type check
  └── npx tsc --noEmit
```

---

## Files Modified

| File | Changes |
|---|---|
| `prisma/schema.prisma` | New `SandyPreference` model |
| `app/lib/sandy-preferences-service.ts` | **New file** — get/update preferences |
| `app/api/sandy/preferences/route.ts` | **New file** — GET/PUT API |
| `app/components/settings/SandyPreferences.tsx` | **New file** — settings UI |
| `app/settings/page.tsx` | Add `SandyPreferences` component |
| `app/api/concierge/route.ts` | Fetch preferences, pass to buildSystemPrompt |
| `app/lib/concierge-service.ts` | New parameter + `## SANDY BEHAVIOR PREFERENCES` section |

---

## Success Criteria

| Feature | Test | Expected |
|---|---|---|
| Schema | `npx prisma migrate dev` succeeds | New model, no data loss |
| API | `GET /api/sandy/preferences` | Returns defaults for new user |
| API | `PUT /api/sandy/preferences` with `{tone:"formal"}` | Updates tone, returns full record |
| Settings UI | Visit `/settings` | Sandy Preferences card visible below notifications |
| Prompt | Set tone to "formal", ask Sandy a question | Sandy responds more professionally |
| Prompt | Set proactivity to "off" | Sandy stops surfacing unsolicited nudges |
