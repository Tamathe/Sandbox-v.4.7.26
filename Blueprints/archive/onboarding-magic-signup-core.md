# Magic Signup — Core Onboarding Flow

## Overview

Replace the traditional "fill out a form" account creation with an LLM-powered enrichment experience. The user provides only their university email address; the system discovers who they are, builds a profile, and presents it for confirmation — all before a single field is manually typed.

---

## Flow Diagram

```
[Landing Page]
     │
     ▼
[Email Entry]  ──→  validate @uky.edu domain
     │
     ▼
[Enrichment Engine]  ──→  searches public university data
     │
     ├── High confidence  ──→  [Full Profile Preview]
     ├── Medium confidence ──→  [Partial Profile Preview + gaps flagged]
     └── Low confidence   ──→  [Blank Form with "we couldn't find you" message]
     │
     ▼
[Editable Profile Confirmation]
     │
     ▼
[Role Confirmation]  ──→  inferred role shown, user confirms or changes
     │
     ▼
[Intent Capture]  ──→  "What brings you here?" (see: intent-routing.md)
     │
     ▼
[Account Created]  ──→  redirect to Homepage with "Start Here" prompt
```

---

## Page 1 — Email Entry

Minimal UI. One field. Strong value proposition copy.

```
┌──────────────────────────────────────────────────┐
│                                                  │
│   Welcome to The Sandbox                         │
│   UK's AI-powered educational tool marketplace   │
│                                                  │
│   Enter your UK email to get started             │
│   [ heath.price@uky.edu              ]           │
│                                [ Continue → ]    │
│                                                  │
│   Already have an account? Sign in               │
└──────────────────────────────────────────────────┘
```

**Validation rules:**
- Must be `@uky.edu` domain (or configured university domain)
- Check if email already exists in DB → redirect to sign-in with message
- Normalize to lowercase before lookup

---

## Page 2 — Enrichment in Progress

Do not show a blank spinner. Show active progress — makes the intelligence visible.

```
┌──────────────────────────────────────────────────┐
│   Setting up your profile...                     │
│                                                  │
│   ✓  Identifying heath.price@uky.edu             │
│   ✓  Searching UK faculty directory              │
│   ⟳  Finding your courses...                     │
│   ·  Checking department affiliation             │
│   ·  Suggesting interests                        │
└──────────────────────────────────────────────────┘
```

Steps are revealed sequentially as each enrichment source resolves. See `onboarding-streaming-profile-reveal.md` for streaming architecture.

---

## Page 3 — Profile Confirmation

Show what was found. Everything is editable inline. Nothing is locked.

```
┌──────────────────────────────────────────────────┐
│   We found you  ✓                        ✎ Edit  │
│                                                  │
│   Name        Heath Price                        │
│   Title       Associate Professor                │
│   College     College of Engineering             │
│   Department  Technology, Entrepreneurship &     │
│               Knowledge                          │
│   Role        Educator                           │
│                                                  │
│   Courses found:                                 │
│   [TEK-100] [TEK-201]  + Add course              │
│                                                  │
│   Interests:                                     │
│   [✓ Entrepreneurship] [✓ Technology]            │
│   [  AI Tools] [  Assessment]  + More            │
│                                                  │
│   [ Edit anything above ]  [ This looks right → ]│
└──────────────────────────────────────────────────┘
```

**Key UX principles:**
- Confident framing ("We found you") but with an easy escape hatch
- Show the source: small "sourced from UK faculty directory" footnote builds trust
- Interests are toggle chips, not a text field — lower friction
- "Edit anything above" opens all fields inline, no separate edit page

---

## Page 4 — Account Created + Landing

After confirmation, the user lands on the homepage. A one-time welcome banner appears at the top:

```
┌──────────────────────────────────────────────────┐
│  Welcome, Heath. Your profile is ready.          │
│  → Start Here: find your first tool              │  [dismiss]
└──────────────────────────────────────────────────┘
```

The "Start Here" CTA routes based on intent captured in the previous step.

---

## Database Changes

### New fields on `User` model

```prisma
model User {
  // existing fields...
  onboardingCompleted   Boolean   @default(false)
  onboardingCompletedAt DateTime?
  enrichmentSource      String?   // "uk-directory", "manual", "partial"
  enrichmentConfidence  String?   // "high", "medium", "low"
  title                 String?
  department            String?
  college               String?
}
```

### New `UserInterest` relation

```prisma
model UserInterest {
  id        String   @id @default(cuid())
  userId    String
  tag       String
  source    String   // "enrichment" | "manual"
  user      User     @relation(fields: [userId], references: [id])
}
```

---

## API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/onboarding/check-email` | POST | Validate email, check if account exists |
| `/api/onboarding/enrich` | POST | Trigger LLM enrichment, return profile data |
| `/api/onboarding/create-account` | POST | Create user record from confirmed profile |

---

## Related Documents

- `onboarding-llm-enrichment-engine.md` — how enrichment works, data sources, confidence scoring
- `onboarding-streaming-profile-reveal.md` — real-time streaming UI architecture
- `onboarding-intent-routing.md` — "What brings you here?" post-signup routing
- `onboarding-interests-autosuggest.md` — interest tag generation logic
- `onboarding-course-import.md` — auto course container creation for educators
