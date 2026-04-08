# "What Brings You Here?" — Intent Capture & Routing

## Overview

Immediately after a user confirms their profile during signup, ask one focused question: what are they trying to accomplish? The answer routes them to the most relevant first experience rather than dropping everyone on the same generic homepage. This single question dramatically improves activation — the user's first tool interaction is contextually relevant to their actual goal.

---

## The Question

Shown as a full-screen interstitial between profile confirmation and the homepage. One question, visual card-style options.

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│   One last thing, Heath —                            │
│   what brings you to The Sandbox today?             │
│                                                      │
│  ┌──────────────────┐  ┌──────────────────────────┐  │
│  │  📚               │  │  🔍                       │  │
│  │  I want tools     │  │  I want to browse        │  │
│  │  for a specific   │  │  what's available        │  │
│  │  course           │  │                          │  │
│  └──────────────────┘  └──────────────────────────┘  │
│                                                      │
│  ┌──────────────────┐  ┌──────────────────────────┐  │
│  │  💬               │  │  🚀                       │  │
│  │  A colleague      │  │  Just exploring —        │  │
│  │  recommended a    │  │  show me something       │  │
│  │  specific tool    │  │  interesting             │  │
│  └──────────────────┘  └──────────────────────────┘  │
│                                                      │
│                              [ Skip for now → ]      │
└──────────────────────────────────────────────────────┘
```

---

## Intent Options by Role

### Educator intents

| Option | Label | Route destination |
|---|---|---|
| `course-tools` | "I want tools for a specific course" | Course setup flow → tool finder filtered by subject |
| `browse` | "I want to browse what's available" | Tools catalog with educator filter |
| `referred` | "A colleague recommended a specific tool" | Tool search + direct open |
| `explore` | "Just exploring — show me something interesting" | Featured/trending tools with educator tags |

### Student intents

| Option | Label | Route destination |
|---|---|---|
| `assignment` | "I have an assignment I need help with" | Study tools → assignment assistant |
| `browse` | "I want to see what tools are available" | Student tools catalog |
| `referred` | "My professor recommended a tool" | Tool search + direct open |
| `explore` | "Just exploring" | Featured tools with student tags |

### Admin intents

| Option | Label | Route destination |
|---|---|---|
| `overview` | "I want to see platform activity" | Admin dashboard |
| `tool-review` | "I need to review submitted tools" | Tool moderation queue |
| `browse` | "I want to see what tools are available" | Full tools catalog |

---

## Routing Logic

### `course-tools` (Educator)

Redirect to: `/tools?intent=course&courseId={firstCourseId}`

If courses were imported during onboarding, pre-select the first course. Sandy concierge auto-opens with prompt:
> "I see you teach TEK-100. Would you like me to suggest tools that would work well for that course?"

### `assignment` (Student)

Redirect to: `/tools?intent=assignment`

Sandy opens with:
> "What's the assignment about? I can point you to the most useful tools."

### `referred`

Show a single search input:
```
What tool were you looking for?
[ search tools...                    ]
```
Route to tool detail page if match found.

### `browse`

Redirect to: `/tools` with role-appropriate default filters applied.

### `explore`

Redirect to: `/tools?view=featured` — highlighted/trending tools, no filters.

### `skip`

Redirect to: `/` (homepage) — standard "Start Here" banner shown.

---

## Database Storage

Store intent to enable platform analytics and personalization.

```prisma
model User {
  // existing fields
  onboardingIntent     String?   // "course-tools" | "browse" | "referred" | "explore" | "assignment" | "overview" | "tool-review"
  onboardingIntentSetAt DateTime?
}
```

This data feeds:
- **Activation funnel analytics** — which intents convert to tool usage?
- **Homepage personalization** — returning users see a homepage tuned to their original intent
- **Sandy's first prompt** — concierge uses stored intent to open the conversation intelligently on return visits

---

## API Route

### `POST /api/onboarding/set-intent`

```json
// Request
{
  "intent": "course-tools"
}

// Response
{
  "redirectUrl": "/tools?intent=course&courseId=cld123abc"
}
```

---

## Skip Handling

"Skip for now" is always visible and never hidden. Users who skip land on `/` with the standard "Start Here" banner.

On their second session, if `onboardingIntent` is null, Sandy can ask:
> "I don't think we've talked about what you're hoping to get from The Sandbox. Want me to point you in a direction?"

---

## Analytics Events

| Event | Trigger |
|---|---|
| `onboarding_intent_shown` | Interstitial rendered |
| `onboarding_intent_selected` | User clicks an option |
| `onboarding_intent_skipped` | User clicks "Skip for now" |
| `onboarding_intent_routed` | User arrives at destination |

Time between `intent_selected` and `onboarding_intent_routed` should be < 300ms.

---

## Design Notes

- Cards are large tap targets (important for mobile) — minimum 120×120px
- Icons are decorative, not informational — label text must stand alone
- No "correct answer" framing — all options are equally prominent
- Skip link is present but visually de-emphasized (not hidden)
- One question, no follow-up questions on this screen

---

## Related Documents

- `onboarding-magic-signup-core.md` — overall flow and where this step fits
- `onboarding-course-import.md` — how courses available in `course-tools` routing are imported
