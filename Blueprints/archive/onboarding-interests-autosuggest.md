# Interests Auto-Suggest System

## Overview

During onboarding profile confirmation, the system pre-populates a set of interest tags derived from the user's department, title, and faculty bio. These are displayed as toggleable chips — the user taps to keep or remove suggestions, and can add their own. This is dramatically lower friction than asking users to type interests from scratch, and the pre-populated suggestions signal that the platform already understands their context.

---

## Why This Matters

Interest tags drive two downstream systems:

1. **Tool recommendations** — the tools catalog uses interests to surface relevant tools on the homepage and in Sandy's suggestions
2. **Peer discovery** — the platform can surface other educators with overlapping interests for sharing/collaboration

Getting quality interests at onboarding, rather than leaving the field blank forever, activates both systems from day one.

---

## Suggestion Sources (Priority Order)

### 1. Bio extraction (highest quality)
If a faculty bio was found during enrichment, Claude Haiku extracts interest tags directly from the bio text. These are the most specific and accurate.

```
Input bio:  "Dr. Price's work focuses on entrepreneurship education,
             technology transfer, and applying AI tools in experiential
             learning environments."

Output:     ["Entrepreneurship Education", "Technology Transfer",
             "AI in Education", "Experiential Learning"]
```

### 2. Department taxonomy mapping (fallback)
If no bio is available, map the user's department to a predefined interest taxonomy.

```typescript
const DEPARTMENT_INTERESTS: Record<string, string[]> = {
  "TEK": ["Entrepreneurship", "Innovation", "Technology Commercialization"],
  "Computer Science": ["Programming", "Algorithms", "Software Engineering", "AI/ML"],
  "Law": ["Legal Research", "Contracts", "Constitutional Law", "Legal Writing"],
  "English": ["Writing", "Literature", "Rhetoric", "Composition"],
  "Biology": ["Life Sciences", "Research Methods", "Lab Skills"],
  "Psychology": ["Behavioral Science", "Research Methods", "Counseling"],
  // ...
};
```

### 3. Title-based inference (broad fallback)
If no department match, derive interests from title keywords.

```typescript
const TITLE_INTERESTS: Record<string, string[]> = {
  "professor": ["Teaching", "Research", "Academic Writing"],
  "instructor": ["Teaching", "Curriculum Design"],
  "librarian": ["Research Methods", "Information Literacy", "Citation"],
  "counselor": ["Student Support", "Advising"],
};
```

---

## Chip UI Design

```
┌──────────────────────────────────────────────────────────┐
│  Your interests                                          │
│  (we found these from your profile — adjust as needed)  │
│                                                          │
│  [✓ Entrepreneurship Education]  [✓ Technology Transfer]│
│  [✓ AI in Education]  [  Experiential Learning]         │
│  [  Research Methods]                                    │
│                                                          │
│  + Add your own                                          │
│                                                          │
│  Suggestions you might like:                            │
│  [+ Assessment Design] [+ Course Design] [+ EdTech]     │
└──────────────────────────────────────────────────────────┘
```

### Chip states

| State | Visual | Meaning |
|---|---|---|
| Selected (enriched) | Blue fill, white text, ✓ | LLM-suggested, user accepted |
| Deselected (enriched) | White fill, grey border | LLM-suggested, user removed |
| Selected (manual) | Blue fill, white text, ✓ | User added themselves |
| Suggested (not yet accepted) | Dashed border, blue text | Platform-suggested, tap to add |

---

## "Suggestions You Might Like" Section

Below the enriched tags, show 3–5 additional suggestions the user hasn't seen yet. These come from a taxonomy of common interests for their role/department.

Logic:
1. Take the full department taxonomy list for the user's department
2. Remove any tags already shown (to avoid duplicates)
3. Show top 5 by frequency (most common among educators in same department)
4. If fewer than 5, supplement with popular cross-department educator interests

```typescript
const POPULAR_EDUCATOR_INTERESTS = [
  "Assessment Design",
  "Course Design",
  "Active Learning",
  "EdTech",
  "Student Engagement",
  "Flipped Classroom",
  "Universal Design for Learning",
  "Project-Based Learning",
];
```

---

## "Add Your Own" Input

A free-text input with autocomplete from the full interest taxonomy.

```
+ Add your own
[ type an interest...      ]
  ↓
  Assessment Design
  Asynchronous Learning
  Audio Learning
```

**Autocomplete behavior:**
- Matches from the full canonical interest list (case-insensitive prefix match)
- Allows free-form entries not in the list (stored with `source: "free-form"`)
- Pressing Enter or clicking a suggestion adds the chip immediately

---

## Data Model

```prisma
model UserInterest {
  id        String   @id @default(cuid())
  userId    String
  tag       String
  source    String   // "bio-extraction" | "department-taxonomy" | "title-inference" | "manual" | "free-form"
  accepted  Boolean  @default(true)  // false = was suggested, user removed it
  addedAt   DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, tag])
  @@index([userId])
}
```

Storing `accepted: false` entries (suggestions the user removed) is valuable: it prevents the same suggestion from re-appearing and helps train better suggestion models over time.

---

## API Routes

### `POST /api/onboarding/interests`

Save final interest selections after profile confirmation.

```json
// Request
{
  "interests": [
    { "tag": "Entrepreneurship Education", "source": "bio-extraction" },
    { "tag": "AI in Education", "source": "bio-extraction" },
    { "tag": "Assessment Design", "source": "manual" }
  ],
  "rejected": [
    { "tag": "Technology Transfer", "source": "bio-extraction" }
  ]
}
```

### `GET /api/onboarding/interest-suggestions?department=TEK&role=EDUCATOR`

Returns ranked suggestions for the "you might like" section.

```json
{
  "suggestions": [
    "Assessment Design",
    "Course Design",
    "EdTech",
    "Active Learning",
    "Project-Based Learning"
  ]
}
```

---

## Using Interests Downstream

### Tool recommendations
```typescript
// When building tool recommendation query
const userInterests = await getUserInterests(userId);
const tools = await db.tool.findMany({
  where: {
    tags: { hasSome: userInterests.map(i => i.tag) }
  },
  orderBy: { /* rank by tag overlap count */ }
});
```

### Sandy's context
Include top 5 interests in Sandy's system prompt for all sessions:
```
User interests: Entrepreneurship Education, AI in Education, Assessment Design
```

### Homepage personalization
Tools with 2+ matching tags are surfaced in a "Picked for you" section on the homepage.

---

## Post-Onboarding Management

Users can edit interests at any time from their profile settings:
- Route: `/profile/interests`
- Same chip UI, same autocomplete
- Changes take effect immediately in tool recommendations and Sandy context

---

## Related Documents

- `onboarding-magic-signup-core.md` — where interest selection fits in the flow
- `onboarding-llm-enrichment-engine.md` — how interests are extracted from bio text
- `marketplace-personalization.md` — how interests drive tool ranking and homepage
