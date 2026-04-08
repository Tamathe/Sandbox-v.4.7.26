# LLM Profile Enrichment Engine

## Overview

When a user enters their university email, the enrichment engine attempts to discover who they are from publicly available university data before they fill out a single form field. The engine returns a structured profile with a confidence score that determines how the UI presents the result.

---

## Data Sources

Sources are queried in priority order. Each has a reliability tier.

| Source | Tier | What it provides | Access method |
|---|---|---|---|
| UK People Directory | Primary | Name, title, department, phone | HTTP scrape / public search |
| College faculty pages | Primary | Title, bio, research interests, courses taught | HTTP scrape per college |
| UK Course Catalog | Secondary | Courses where they are listed as instructor | Public catalog search |
| ORCID | Secondary | Research interests, publications | Public REST API |
| LinkedIn | Tertiary | Role, department, tenure | Requires user permission |

**For students specifically:**
- UK directory often shows name + college
- Email prefix patterns (e.g. `firstname.lastname.student`) signal student status
- Enrolled courses are not public — do not attempt to fetch

---

## Enrichment Pipeline

```
email input
     │
     ├── 1. Parse name from email prefix
     │        heath.price@uky.edu → "Heath Price"
     │
     ├── 2. Query UK People Directory
     │        Search by name + domain
     │        Extract: title, department, office, phone
     │
     ├── 3. Classify role from title
     │        "Professor", "Instructor", "Lecturer" → EDUCATOR
     │        "Director", "Dean", "Provost" → ADMIN (flag for manual review)
     │        No faculty match → STUDENT (tentative)
     │
     ├── 4. Fetch college faculty page (if EDUCATOR)
     │        Find bio paragraph → extract interests via LLM
     │        Find course listings → extract course codes
     │
     ├── 5. Query ORCID by name (optional, async)
     │        Returns research keywords if profile exists
     │
     └── 6. Score confidence and return
```

---

## Confidence Scoring

Each field carries an individual confidence value. The overall profile confidence is the weighted average.

### Confidence Levels

**High (≥ 0.8)**
- Name confirmed in directory
- Department confirmed
- Role unambiguous from title
- At least one course found

Presentation: "We found you ✓" — full profile shown, user just confirms.

**Medium (0.5 – 0.79)**
- Name found but department unclear, or
- Role is ambiguous (e.g. "Researcher" could be faculty or grad student), or
- Courses found but match is uncertain

Presentation: "Here's what we found — does this look right?" — partial profile with flagged uncertain fields highlighted in yellow.

**Low (< 0.5)**
- Name not found in directory, or
- Email prefix doesn't clearly parse to a person name (e.g. `te-lab@uky.edu`)

Presentation: "We couldn't find your profile yet" — blank form with helpful copy, no false claims.

---

## LLM Prompt — Interest Extraction

When a faculty bio is found, send it to Claude Haiku for interest extraction:

```
System: You extract academic interests from faculty bios. Return a JSON array of
        short interest tags (2-4 words each, title case). Maximum 8 tags.
        Only include things explicitly mentioned or clearly implied by the bio.

User: Bio text: """
      Dr. Heath Price is an Associate Professor in the College of Engineering's
      TEK program. His work focuses on entrepreneurship education, technology
      transfer, and applying AI tools in experiential learning environments.
      """

Response: ["Entrepreneurship Education", "Technology Transfer",
           "AI in Education", "Experiential Learning"]
```

---

## LLM Prompt — Role Classification

When a title is ambiguous, send to Haiku:

```
System: Classify this university person's role. Return exactly one of:
        EDUCATOR, STUDENT, ADMIN, UNKNOWN.
        EDUCATOR = faculty, instructor, professor, lecturer, teaching staff
        ADMIN = administrator, director, dean, provost, staff (non-teaching)
        STUDENT = student, graduate student, doctoral candidate
        UNKNOWN = cannot determine

User: Title: "Graduate Research Associate"
      Department: "Computer Science"

Response: STUDENT
```

---

## API Contract

### `POST /api/onboarding/enrich`

**Request:**
```json
{
  "email": "heath.price@uky.edu"
}
```

**Response:**
```json
{
  "confidence": "high",
  "confidenceScore": 0.91,
  "profile": {
    "name": { "value": "Heath Price", "confidence": 1.0, "source": "uk-directory" },
    "title": { "value": "Associate Professor", "confidence": 0.95, "source": "uk-directory" },
    "department": { "value": "TEK", "confidence": 0.9, "source": "uk-directory" },
    "college": { "value": "College of Engineering", "confidence": 0.9, "source": "uk-directory" },
    "role": { "value": "EDUCATOR", "confidence": 0.95, "source": "title-inference" }
  },
  "courses": [
    { "code": "TEK-100", "name": "Introduction to Entrepreneurship", "source": "catalog", "confidence": 0.8 }
  ],
  "interests": [
    { "tag": "Entrepreneurship Education", "source": "bio-extraction" },
    { "tag": "AI in Education", "source": "bio-extraction" }
  ],
  "sources": ["uk-directory", "college-faculty-page", "course-catalog"],
  "enrichmentDurationMs": 2340
}
```

---

## Caching

Enrichment results are cached per email for **24 hours**. This prevents repeated scraping on page refresh or if the user restarts the flow.

Cache key: `onboarding:enrich:{email_hash}`
Storage: Redis or in-memory (depending on deployment tier)

If UK directory data changes, the cache miss on next day will re-enrich automatically.

---

## Error Handling

| Scenario | Behavior |
|---|---|
| UK directory unreachable | Fall back to name parse only, confidence = low |
| LLM extraction fails | Return profile without interests, log error |
| Name parse ambiguous (initials, nickname) | Confidence = low, show blank form |
| Rate limited by source | Use cached result or degrade gracefully |

---

## Privacy & Transparency

- Only query **publicly available** sources — no access to registrar, Banner, or internal HR data
- Show the user exactly where each piece of data came from ("sourced from UK People Directory")
- Every field is editable — nothing is locked in
- Offer "start fresh instead" link that bypasses enrichment entirely
- Enrichment source and confidence stored on user record for audit purposes

---

## Related Documents

- `onboarding-magic-signup-core.md` — overall flow and pages
- `onboarding-streaming-profile-reveal.md` — how enrichment results stream to the UI
- `onboarding-interests-autosuggest.md` — interest tag generation and display
