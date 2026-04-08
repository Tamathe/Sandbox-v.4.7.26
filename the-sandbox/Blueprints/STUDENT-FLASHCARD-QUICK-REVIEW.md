# Blueprint 2: Standalone Flashcard Quick Review Widget

> **Sprint Scope:** Build a lightweight, non-conversational flashcard review widget that can be launched directly from the homepage study-action nudge — flip cards, rate difficulty, done. No Sandy chat overhead.
> **Depends On:** Nothing — uses existing `FlashcardState` model and SR scheduler.
> **Estimated Size:** Small (half sprint)
> **Deploy Order:** 2 of 10 — no prerequisites

---

## Context

Sandy's study-action nudge on the homepage says "3 flashcards due — 5-minute review." Currently, tapping "[Review Now]" opens Sandy's sidebar and auto-sends a message to start a conversational review. This involves:

1. Sandy sidebar opens (bottom sheet on mobile)
2. API call to Claude to generate conversational flashcard content (2-5 seconds)
3. Student reads Sandy's prose around each card
4. Student types/taps responses
5. Sandy processes and moves to next card

For **3 flashcards that take 5 minutes**, this conversational overhead is excessive. The student wants: see card → flip → rate → next card → done. That's Anki, not a tutor session.

The `FlashcardState` model already has full SM-2 state (interval, easeFactor, nextReviewAt, quality). The `sr-scheduler.ts` already computes due concepts. We just need a lightweight UI that reads and writes this data without going through Sandy.

### Key Files to Create

| File | Purpose |
|------|---------|
| `app/components/student-home/FlashcardQuickReview.tsx` | **New:** flip-card review widget (modal or inline) |
| `app/api/flashcards/due/route.ts` | **New:** GET — fetch due flashcards for current user |
| `app/api/flashcards/review/route.ts` | **New:** POST — submit quality rating, update SM-2 state |

### Key Files to Read/Reuse

| File | Why |
|------|-----|
| `app/lib/sr-scheduler.ts` | SM-2 scheduling logic (`getDueConcepts`, `computeNextReview`) |
| `app/components/student-home/SandyBriefing.tsx` | Study-action nudge trigger to modify |
| `app/components/student-home/StudentHomepage.tsx` | Integration point |
| `prisma/schema.prisma` | `FlashcardState` model (existing) |
| `app/api/study/[toolId]/flashcard-review/route.ts` | Existing flashcard review endpoint (reuse logic) |
| `app/api/analytics/student/sr-nudge/route.ts` | Existing SR nudge endpoint (due count) |

---

## Feature: Flashcard Quick Review

### What

A modal overlay (or inline expandable card) that shows due flashcards one at a time with a flip animation and SM-2 quality buttons. No Sandy, no chat, no AI calls during the review itself.

### UI Flow

```
┌─────────────────────────────────────────────────┐
│  QUICK REVIEW                    3 cards · ~2 min│
│  ─────────────────────────────────────────────── │
│                                                   │
│  ┌─────────────────────────────────────────────┐ │
│  │                                             │ │
│  │     What are the exceptions to the          │ │
│  │     hearsay rule under FRE 803?             │ │
│  │                                             │ │
│  │              [ Tap to flip ]                │ │
│  │                                             │ │
│  └─────────────────────────────────────────────┘ │
│                                                   │
│  Card 1 of 3            Evidence (LAW 756)       │
│                                                   │
│  ● ● ○  (progress dots)                         │
└─────────────────────────────────────────────────┘

[After flip:]

┌─────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────┐ │
│  │                                             │ │
│  │  Present sense impression, excited          │ │
│  │  utterance, then-existing mental/physical   │ │
│  │  condition, statements for medical          │ │
│  │  diagnosis, recorded recollection,          │ │
│  │  business records, public records...        │ │
│  │                                             │ │
│  └─────────────────────────────────────────────┘ │
│                                                   │
│  How well did you know this?                     │
│                                                   │
│  [Again]  [Hard]  [Good]  [Easy]                 │
│   (red)   (amber) (green) (blue)                 │
│                                                   │
│  ● ● ○                                           │
└─────────────────────────────────────────────────┘
```

### Data Types

```typescript
// Types for the quick review widget
interface QuickReviewCard {
  id: string                    // FlashcardState.id
  conceptName: string           // The concept being tested
  courseCode: string             // For display context
  front: string                 // Question/prompt
  back: string                  // Answer
  interval: number              // Current SM-2 interval (days)
  easeFactor: number            // Current ease factor
  lapses: number                // Number of times forgotten
}

// Quality rating maps to SM-2 quality scores
type ReviewQuality = 'again' | 'hard' | 'good' | 'easy'
// again = 1, hard = 3, good = 4, easy = 5

interface ReviewSubmission {
  flashcardId: string
  quality: ReviewQuality
  reviewedAt: string            // ISO timestamp
  responseTimeMs: number        // Time from flip to rating (for analytics)
}
```

### API: GET /api/flashcards/due

Fetch due flashcards for the authenticated student:

```typescript
// Reuse logic from sr-scheduler.ts getDueConcepts()
// But return full card content, not just counts

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '10')

  // Query FlashcardState where nextReviewAt <= now, ordered by nextReviewAt ASC
  const dueCards = await prisma.flashcardState.findMany({
    where: {
      userId: auth.user.id,
      nextReviewAt: { lte: new Date() }
    },
    orderBy: { nextReviewAt: 'asc' },
    take: limit,
    include: {
      // Include concept info for front/back content
      // The exact relation depends on how FlashcardState links to concept data
    }
  })

  return NextResponse.json({ cards: dueCards, total: dueCards.length })
})
```

### API: POST /api/flashcards/review

Submit a quality rating and update SM-2 state:

```typescript
export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireRequestUser(req)
  if (isAuthFailure(auth)) return auth.response

  const { flashcardId, quality, reviewedAt, responseTimeMs } = await req.json()

  // Map quality label to SM-2 numeric score
  const qualityScore = { again: 1, hard: 3, good: 4, easy: 5 }[quality]

  // Compute next review using existing sr-scheduler.ts logic
  const nextReview = computeNextReview(currentState, qualityScore)

  // Update FlashcardState
  await prisma.flashcardState.update({
    where: { id: flashcardId },
    data: {
      quality: qualityScore,
      interval: nextReview.interval,
      easeFactor: nextReview.easeFactor,
      nextReviewAt: nextReview.nextReviewAt,
      reviews: { increment: 1 },
      lapses: quality === 'again' ? { increment: 1 } : undefined,
      reviewedAt: new Date(reviewedAt)
    }
  })

  return NextResponse.json({ success: true, nextReviewAt: nextReview.nextReviewAt })
})
```

### Component: FlashcardQuickReview.tsx

```typescript
interface FlashcardQuickReviewProps {
  onClose: () => void
  onComplete: (stats: { reviewed: number; again: number; good: number }) => void
}

// State machine: loading → reviewing → complete
// reviewing substates: front (showing question) → back (showing answer + quality buttons)

// Key behaviors:
// - Flip animation: CSS transform rotateY(180deg) with transition-transform duration-500
// - Progress dots: filled circles for reviewed, empty for remaining
// - Keyboard support: Space to flip, 1-4 for quality rating
// - Swipe support (mobile): swipe up to flip
// - Auto-advance: after rating, 300ms pause then next card
// - Complete screen: "All caught up! 3 cards reviewed. Next review: tomorrow."
```

### Integration with Homepage

Modify the study-action nudge in `SandyBriefing.tsx`:

**Current behavior:**
- "3 flashcards due" → `[Review Now]` → dispatches `sandy-prefill` event → opens Sandy sidebar

**New behavior:**
- "3 flashcards due" → `[Review Now]` → opens `FlashcardQuickReview` modal overlay
- Add small secondary link: "or review with Sandy →" for students who prefer the conversational experience

In `StudentHomepage.tsx`:
```tsx
const [showQuickReview, setShowQuickReview] = useState(false)

// Pass setter to SandyBriefing
<SandyBriefing
  ...
  onFlashcardReview={() => setShowQuickReview(true)}
/>

{showQuickReview && (
  <FlashcardQuickReview
    onClose={() => setShowQuickReview(false)}
    onComplete={(stats) => {
      setShowQuickReview(false)
      // Optionally refresh SR nudge count
    }}
  />
)}
```

### Completion Screen

After all due cards are reviewed:

```
┌─────────────────────────────────────────────────┐
│  ✓ ALL CAUGHT UP                                 │
│                                                   │
│  3 cards reviewed                                │
│  1 needs more practice · 2 solid                 │
│                                                   │
│  Next review: tomorrow at ~9 AM                  │
│                                                   │
│  [Done]              [Study more with Sandy →]   │
└─────────────────────────────────────────────────┘
```

### Card Content Generation

The `FlashcardState` model stores SM-2 scheduling state but may not store the actual question/answer text directly. Two approaches:

1. **If FlashcardState has a relation to a concept/content model**: Use the related content for front/back.
2. **If flashcard content is generated dynamically by Sandy**: Pre-generate and cache front/back text on the FlashcardState model. Add two optional fields:

```prisma
model FlashcardState {
  // ... existing fields ...
  frontText   String?   // Cached question text
  backText    String?   // Cached answer text
}
```

If neither exists, generate content on the `/api/flashcards/due` call using Haiku (one batch call for all due cards — not per-card). Cache the result so subsequent reviews don't need AI calls.

---

## What This Does NOT Do

- Does not replace Study Buddy's flashcard mode (that remains for deeper learning sessions)
- Does not add new concepts to the SR system (that's Study Buddy's job)
- Does not require Sandy/Claude during the review itself (zero AI calls during flip-rate-next)
- Does not change the SR scheduling algorithm (reuses `sr-scheduler.ts` exactly)

---

## Success Criteria

A student can go from "3 flashcards due" nudge tap to "All caught up" in **under 2 minutes** with **zero AI wait time** during the review. The entire interaction should feel as fast as Anki.
