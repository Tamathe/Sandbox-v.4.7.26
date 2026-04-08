# Blueprint 3: "Just Study" Smart Launcher — One Tap, Zero Decisions

> **Sprint Scope:** Replace the generic "Study" Quick Action Chip with a context-aware smart launcher that auto-selects the right study tool and mode based on the student's current priorities — one tap to start studying, no mode selection screen.
> **Depends On:** Blueprint 2 (Flashcard Quick Review) for the SR quick-review path. Can be built without it — just routes SR cards to Study Buddy flashcard mode instead.
> **Estimated Size:** Small (half sprint)
> **Deploy Order:** 3 of 10

---

## Context

The student homepage has Quick Action Chips (Study, My Library, Quiz, Help) that are **static** — they don't change based on the student's situation. When a student taps "Study," they navigate to the Hub or Study Buddy and face a **7-mode selection screen** (Tutor, Quiz, Flashcards, Socratic, Teach-Back, Debate, Essay Coach). This is a paradox of choice for a student who "just wants to study."

The platform already knows:
- Which concepts are weak (ConceptState mastery < 50%)
- Which assignments are due soon (StakeItems with urgency)
- Which flashcards need review (FlashcardState SR scheduling)
- Which exams are approaching (stakes with exam-type assignments)
- Which courses need the most attention (enrollment + mastery data)

Sandy has all this context — the smart launcher just needs to surface it as a **one-tap shortcut** that bypasses mode selection.

### Key Files to Modify

| File | Change |
|------|--------|
| `app/components/student-home/QuickActionChips.tsx` | Replace static "Study" chip with smart "Study [Course]" chip |
| `app/components/student-home/StudentHomepage.tsx` | Compute smart study target from existing data |
| `app/lib/student-home-data.ts` | Add `computeSmartStudyTarget()` function |

### Key Files to Read

| File | Why |
|------|-----|
| `app/components/StudyBuddyInterface.tsx` | Study Buddy's mode selection + launch params |
| `app/lib/sr-scheduler.ts` | Due concept counts |
| `app/lib/student-context-api.ts` | Weak/strong concepts per course |
| `app/api/analytics/student/sr-nudge/route.ts` | SR nudge data shape |

---

## Feature: Smart Study Target Computation

### What

A function that analyzes the student's current academic state and returns a single recommended study action with the optimal tool, mode, and context pre-selected.

### Decision Tree

```typescript
export interface SmartStudyTarget {
  label: string           // "Study Evidence" or "Review Flashcards"
  sublabel: string        // "Exam in 2 days" or "5 cards due"
  action: SmartStudyAction
  urgency: 'critical' | 'high' | 'normal'
}

type SmartStudyAction =
  | { type: 'flashcard-quick-review' }                          // → opens FlashcardQuickReview widget
  | { type: 'exam-prep'; courseId: string; courseName: string } // → opens Study Buddy in Exam Prep mode
  | { type: 'tutor'; courseId: string; courseName: string; concept: string }  // → opens Study Buddy in Tutor mode focused on weak concept
  | { type: 'quiz'; courseId: string; courseName: string }      // → opens Study Buddy in Quiz mode
  | { type: 'general-study' }                                    // → opens Hub (fallback)

export function computeSmartStudyTarget(
  stakes: StakeItem[],
  srDueCount: number,
  enrollments: EnrolledCourse[],
  weakConcepts: { courseCode: string; concept: string; mastery: number }[]
): SmartStudyTarget | null {

  // Priority 1: SR flashcards due (≥3 cards) → Quick Review
  // Rationale: Quick wins maintain SR schedule, < 5 minutes
  if (srDueCount >= 3) {
    return {
      label: 'Review Flashcards',
      sublabel: `${srDueCount} cards due`,
      action: { type: 'flashcard-quick-review' },
      urgency: 'normal'
    }
  }

  // Priority 2: Exam within 3 days → Exam Prep mode
  // Rationale: Highest-stakes deadline, needs targeted prep
  const urgentExam = stakes.find(s =>
    s.daysLeft <= 3 && s.daysLeft >= 0 &&
    s.title?.toLowerCase().match(/exam|midterm|final|quiz/)
  )
  if (urgentExam) {
    return {
      label: `Study ${urgentExam.courseCode}`,
      sublabel: `Exam ${urgentExam.dueLabel}`,
      action: { type: 'exam-prep', courseId: urgentExam.courseId, courseName: urgentExam.courseCode },
      urgency: 'critical'
    }
  }

  // Priority 3: Assignment due within 3 days → Tutor mode on weakest concept in that course
  const urgentAssignment = stakes.find(s => s.daysLeft <= 3 && s.daysLeft >= 0)
  if (urgentAssignment) {
    const weakInCourse = weakConcepts.find(c => c.courseCode === urgentAssignment.courseCode)
    return {
      label: `Study ${urgentAssignment.courseCode}`,
      sublabel: `${urgentAssignment.title} — ${urgentAssignment.dueLabel}`,
      action: weakInCourse
        ? { type: 'tutor', courseId: urgentAssignment.courseId, courseName: urgentAssignment.courseCode, concept: weakInCourse.concept }
        : { type: 'quiz', courseId: urgentAssignment.courseId, courseName: urgentAssignment.courseCode },
      urgency: 'high'
    }
  }

  // Priority 4: Course with weakest mastery → Tutor mode on weakest concept
  if (weakConcepts.length > 0) {
    const weakest = weakConcepts.sort((a, b) => a.mastery - b.mastery)[0]
    const enrollment = enrollments.find(e => e.courseCode === weakest.courseCode)
    return {
      label: `Study ${weakest.courseCode}`,
      sublabel: `${weakest.concept} needs work`,
      action: { type: 'tutor', courseId: enrollment?.id || '', courseName: weakest.courseCode, concept: weakest.concept },
      urgency: 'normal'
    }
  }

  // Priority 5: Any enrolled course → Quiz mode on first course
  if (enrollments.length > 0) {
    return {
      label: `Study ${enrollments[0].courseCode}`,
      sublabel: 'General review',
      action: { type: 'quiz', courseId: enrollments[0].id, courseName: enrollments[0].courseCode },
      urgency: 'normal'
    }
  }

  // No courses → null (don't show chip)
  return null
}
```

### Quick Action Chip Modification

In `QuickActionChips.tsx`, replace the static "Study" chip:

**Current:**
```tsx
{ label: 'Study', icon: 'book-open', href: '/hub' }
```

**New:**
```tsx
// If smartTarget exists, show contextual chip
// If not, fall back to generic "Study" → /hub

{smartTarget ? {
  label: smartTarget.label,
  sublabel: smartTarget.sublabel,
  icon: smartTarget.urgency === 'critical' ? 'flame' : 'book-open',
  // Color: critical = red bg, high = amber bg, normal = default
  urgencyColor: smartTarget.urgency,
  onClick: () => handleSmartStudy(smartTarget.action)
} : {
  label: 'Study',
  icon: 'book-open',
  href: '/hub'
}}
```

### Action Handlers

```typescript
function handleSmartStudy(action: SmartStudyAction) {
  switch (action.type) {
    case 'flashcard-quick-review':
      // Open the FlashcardQuickReview modal (from Blueprint 2)
      // If Blueprint 2 not yet built, fall back to Sandy prefill:
      // dispatch sandy-prefill with "Review my due flashcards"
      setShowQuickReview(true)
      break

    case 'exam-prep':
      // Navigate to Study Buddy with pre-selected Exam Prep mode + course
      // URL: /study-buddy?mode=exam-prep&courseId={id}
      // Study Buddy should accept these query params to skip mode selection
      router.push(`/courses/${action.courseId}?tool=study-buddy&mode=exam-prep`)
      break

    case 'tutor':
      // Navigate to Study Buddy with Tutor mode + pre-focused concept
      router.push(`/courses/${action.courseId}?tool=study-buddy&mode=tutor&concept=${encodeURIComponent(action.concept)}`)
      break

    case 'quiz':
      // Navigate to Study Buddy with Quiz mode
      router.push(`/courses/${action.courseId}?tool=study-buddy&mode=quiz`)
      break

    case 'general-study':
      router.push('/hub')
      break
  }
}
```

### Study Buddy Query Param Support

Modify `StudyBuddyInterface.tsx` to accept URL query params that skip the mode selection screen:

```typescript
// Read query params on mount
const searchParams = useSearchParams()
const preselectedMode = searchParams.get('mode')      // 'exam-prep' | 'tutor' | 'quiz' | etc.
const preselectedConcept = searchParams.get('concept') // Optional focus concept

// If preselectedMode is valid, skip the mode selection screen
// and jump directly to the chat screen with that mode active
useEffect(() => {
  if (preselectedMode && VALID_MODES.includes(preselectedMode)) {
    setSelectedMode(preselectedMode)
    setScreen('chat')  // Skip mode selection
    // If concept provided, inject it into the initial Sandy message
  }
}, [preselectedMode])
```

---

## Chip Visual Treatment

The smart study chip should stand out slightly from other Quick Action Chips when urgency is high:

- **Critical** (exam in ≤3 days): Red-tinted background, Flame icon, subtle pulse animation
- **High** (assignment in ≤3 days): Amber-tinted background, BookOpen icon
- **Normal** (general study): Default chip style, BookOpen icon

The chip shows two lines:
```
┌──────────────────────┐
│ 📖 Study Evidence    │
│    Exam in 2 days    │
└──────────────────────┘
```

Other chips remain single-line. The smart study chip is always the **first** chip in the row (leftmost, most visible on mobile).

---

## What This Does NOT Do

- Does not remove the mode selection screen from Study Buddy (that remains for students who navigate there directly)
- Does not change Study Buddy's internal logic (just pre-selects the mode)
- Does not add new AI calls (all data already fetched on homepage load)
- Does not add new study modes (uses existing 7 modes)

---

## Success Criteria

A student can go from opening the homepage to **actively studying the right thing** in **one tap and under 3 seconds** — with the platform having made the tool/mode/concept decision for them based on their actual academic situation.
