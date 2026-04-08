# Architecture: Tiana Feature Suite — Staff Intelligence Tools

> **Status:** Proposed — ready for prioritization
> **Date:** 2026-03-24
> **Origin:** Meeting transcript with Tiana S. (Executive Communications, UK)
> **Scope:** 7 new tools/features targeting staff productivity, institutional intelligence, and email-driven workflows

---

## Context

Tiana S. works in Executive Communications at the University of Kentucky. Her day is defined by email overload (278+ emails since Monday), context switching across civil rights investigations, shared governance, policy changes, committee work, and event coordination. She cannot articulate her own job description because the work is scattered across 10 years of email. Copilot can't help. Deloitte's team restructuring proposal missed what her team actually does because they didn't look at the email.

These 7 features address the gap between **what institutional knowledge systems think staff do** and **what staff actually do** — and they all feed the One Brain.

---

## Feature 1: AI Resume Builder (from Email & Institutional Data)

> "I wish I could ask Copilot to build my resume based on what you've learned through my email."

### The Problem

Staff members can't articulate their full professional story. Awards arrive via email and are forgotten. Committee appointments are buried in threads. Accomplishments span years and multiple systems. Current resume tools require manual input — but the data already exists.

### Design

**Sandy Interview Mode** tool in the Write Room collection. Sandy conducts a guided interview, but unlike the current Resume Builder (which starts from scratch), this one **pre-loads institutional context** from connected data sources.

**Data Sources (phased):**
| Phase | Source | What It Yields |
|---|---|---|
| 1 (MVP) | User-pasted email excerpts + Sandy interview | Structured resume sections from conversational input |
| 2 | Sandbox activity history (tools used, courses taught, committees) | Auto-populated professional activity |
| 3 | Email integration (MS Graph / institutional API) | Awards, committee appointments, project mentions, recognition |
| 4 | Document scan (uploaded PDFs, old resumes) | Gap detection + merge |

**Sandy's Interview Flow:**
1. **Intake**: "Let's build your resume. I can see you're in [role] and you've been involved in [X committees, Y tools built]. Before I pull that in — what's the occasion? New job? Promotion packet? Annual review?"
2. **Context pull**: Sandy pulls all known Sandbox activity for this user (courses owned, tools built, committee memberships from staff data, policy documents authored)
3. **Gap detection**: "I can see committee work and policy navigation, but I don't have visibility into your email yet. Can you paste any emails about awards, recognitions, or major projects?"
4. **Synthesis**: Sandy drafts resume sections, organized by impact (not chronology)
5. **Refinement**: "This section says 'managed communications.' Based on what you've told me, it should say 'Led crisis communications for OCR investigation while coordinating shared governance restructuring.' Want me to make it specific?"

**Output:** Downloadable resume (PDF via html-to-pdf) + structured JSON stored in user profile for future updates.

**Key Differentiator:** Not generic. Sandy uses specifics from institutional data to fight the "sounds like everyone" problem.

### Files

| Type | Path |
|---|---|
| Page | `app/write-room/institutional-resume/page.tsx` |
| Hook | `app/hooks/useInstitutionalResume.ts` |
| Service | `app/lib/institutional-resume-service.ts` |
| Preflight | `app/lib/institutional-resume-preflight.ts` |
| API (4) | `app/api/write-room/institutional-resume/{preflight,interview,generate,refine}/route.ts` |

### Preflight Data

```typescript
interface InstitutionalResumePreflight {
  user: { name, role, department, title }
  sandboxActivity: {
    coursesOwned: { title, semester, studentCount }[]
    toolsBuilt: { name, useCount }[]
    committeeMemberships: { name, role, since }[]    // from staff data
    policiesAuthored: number                          // from policy navigator
  }
  existingResume?: string  // if previously generated
}
```

### Sandy System Prompt (excerpt)

```
You are Sandy, helping build a resume from institutional data.
Your job is to make this person's work SPECIFIC and COMPELLING.
Never use generic phrases like "managed communications" or "facilitated meetings."
Always ask for the specific impact: How many people? What changed? What was at stake?
If the user says "I handled OCR investigations," push for: "How many? What was the outcome? Who else was involved?"
The goal is a resume that could only belong to THIS person.
```

---

## Feature 2: Smart Email Triage (Name-Mention Detection)

> "Show me all those emails where they say my name and ask for something."

### The Problem

Staff are CC'd on hundreds of emails for "awareness." Buried in those threads are action items where their name is mentioned in the body — not tagged, not in the To/CC line — just referenced mid-paragraph. These get missed because they look like every other FYI email.

### Design

This extends the existing email/task pipeline on the student homepage (InboxPreview → Sandy Briefing → Tasks) to add **name-mention scanning** for staff.

**How It Works:**
1. Email data arrives (via existing `/api/assistant/email/inbox` pipeline or MS Graph integration)
2. New service scans email bodies for the user's name (first, last, full, known aliases)
3. When found, extracts the surrounding sentence(s) and classifies intent:
   - **ACTION_REQUESTED** — "Tiana, can you draft the response?"
   - **FYI_MENTION** — "Tiana's team will handle comms"
   - **QUESTION** — "Has Tiana reviewed this?"
   - **RECOGNITION** — "Great work by Tiana on the..."
4. ACTION_REQUESTED and QUESTION items get promoted to the task queue with high priority
5. Staff homepage briefing includes: "You were mentioned by name in 3 emails today — 2 need action"

### Files

| Type | Path |
|---|---|
| Service | `app/lib/assistant/email-mention-service.ts` |
| API | `app/api/assistant/email/mentions/route.ts` |
| Component | `app/components/staff/EmailMentionAlert.tsx` |
| Integration | `app/lib/staff/briefing-service.ts` (add mention data to daily briefing) |

### Service Interface

```typescript
interface EmailMention {
  emailId: string
  from: string
  subject: string
  mentionType: 'ACTION_REQUESTED' | 'FYI_MENTION' | 'QUESTION' | 'RECOGNITION'
  excerpt: string        // surrounding 2 sentences
  confidence: number     // 0-1
  suggestedAction?: string
}

async function scanForMentions(
  emails: Email[],
  userName: { first: string, last: string, aliases?: string[] }
): Promise<EmailMention[]>
```

### Classification Logic

**Phase 1 (no LLM):** Regex scan for name variants → extract surrounding sentences → keyword classification:
- ACTION: "can you", "please", "need you to", "could you", "would you", "your turn"
- QUESTION: "has [name]", "did [name]", "will [name]", "?""
- RECOGNITION: "great work", "thanks to", "kudos", "shout out"
- FYI: everything else

**Phase 2 (with LLM):** Haiku batch classification for ambiguous cases (confidence < 0.6).

### Integration with Existing Systems

- **Staff Daily Briefing**: Add `mentionAlerts` section to `BriefingData` interface
- **Sandy Concierge**: Page context on staff homepage includes mention summary
- **Task Pipeline**: ACTION_REQUESTED mentions auto-create tasks with "Reply to [sender]" action

---

## Feature 3: Team Structure Analyzer

> "I would love if something could go into all of my materials and think about how to structure the team based on what we do."

### The Problem

When leadership (or consultants like Deloitte) proposes team restructuring, they work from org charts and job descriptions — not from what people actually do. Tiana's exec comms team was described as handling "blogs, op-eds, presentations and speeches" when they actually handle civil rights investigations, shared governance, and policy changes. The real work lives in email and institutional activity, not in HR descriptions.

### Design

A **Sandy-powered analysis tool** in the Data Desk collection. Upload team activity data (email exports, meeting calendars, project lists) and Sandy produces a functional map of what the team actually does.

**Sandy Interview Flow:**
1. **Team setup**: "Who's on your team? Give me names and official titles."
2. **Data intake**: User pastes/uploads: email volume by category, meeting calendars, project lists, or just describes it conversationally
3. **Activity mapping**: Sandy categorizes activities into functional domains (communications, compliance, governance, crisis response, etc.)
4. **Gap analysis**: "Your team spends ~40% of capacity on compliance-related work, but that's not reflected in any job title. Three people overlap on event coordination but nobody owns stakeholder communications."
5. **Structure proposal**: Sandy generates 2-3 restructuring options with rationale
6. **Onboarding doc**: Bonus output — "Based on this analysis, here's what a new team member would need to know in their first 30 days"

### Files

| Type | Path |
|---|---|
| Page | `app/data-desk/team-analyzer/page.tsx` |
| Hook | `app/hooks/useTeamAnalyzer.ts` |
| Service | `app/lib/team-analyzer-service.ts` |
| Preflight | `app/lib/team-analyzer-preflight.ts` |
| API (3) | `app/api/data-desk/team-analyzer/{preflight,interview,generate}/route.ts` |

### Output Structure

```typescript
interface TeamAnalysis {
  functionalDomains: {
    name: string           // e.g., "Crisis & Compliance"
    activities: string[]
    teamMembers: string[]
    estimatedCapacity: string  // e.g., "~40%"
  }[]
  gaps: string[]              // unowned or under-resourced areas
  overlaps: string[]          // multiple people doing the same thing
  proposedStructures: {
    name: string              // e.g., "Option A: Function-Based"
    description: string
    pros: string[]
    cons: string[]
  }[]
  onboardingGuide: string     // markdown
}
```

---

## Feature 4: Contract Streamliner

> "A tool to streamline the way that you do contracts."

### The Problem

University contract workflows involve boilerplate-heavy documents, multiple review cycles, and manual tracking. Staff spend time on formatting and routing rather than substance.

### Design

A **Sandy Interview Mode** tool in the Write Room collection. Sandy guides the user through contract creation by asking about the key terms, pulling from institutional templates, and generating a draft with proper UK formatting and compliance language.

**Sandy Interview Flow:**
1. **Contract type**: "What kind of contract? Service agreement, MOU, vendor, consulting, speaker engagement, facilities use?"
2. **Parties**: "Who are the parties? Is this with an external vendor or internal department?"
3. **Key terms**: Sandy asks about scope, duration, compensation, deliverables, termination clauses — adapting questions to contract type
4. **Compliance check**: Sandy flags common compliance requirements (procurement thresholds, insurance requirements, FERPA clauses for data-sharing agreements)
5. **Draft generation**: Produces formatted contract with UK boilerplate, highlighted blanks for legal review
6. **Revision loop**: "Legal will want to review Section 4 (indemnification). Want me to flag that section and add a review note?"

### Files

| Type | Path |
|---|---|
| Page | `app/write-room/contract-drafter/page.tsx` |
| Hook | `app/hooks/useContractDrafter.ts` |
| Service | `app/lib/contract-drafter-service.ts` |
| Preflight | `app/lib/contract-drafter-preflight.ts` |
| API (4) | `app/api/write-room/contract-drafter/{preflight,interview,generate,refine}/route.ts` |
| Templates | `app/lib/contract-templates/` — per-type boilerplate fragments |

### Contract Types

| Type | Key Clauses |
|---|---|
| Service Agreement | Scope, deliverables, payment schedule, insurance, termination |
| MOU | Purpose, responsibilities, duration, non-binding language |
| Vendor Agreement | Procurement compliance, SLA, data handling, renewal |
| Consulting | Hourly/fixed rate, IP ownership, conflict of interest |
| Speaker/Event | Honorarium, travel, recording rights, cancellation |
| Facilities Use | Space, dates, setup/teardown, liability, AV requirements |
| Data Sharing | FERPA, data classification, retention, breach notification |

### Output

```typescript
interface ContractDraft {
  type: string
  parties: { name: string, role: string }[]
  sections: { title: string, content: string, needsReview: boolean }[]
  complianceFlags: string[]
  markdown: string
  reviewNotes: string[]
}
```

---

## Feature 5: Sentiment Analysis Tool (Twitter/X Spaces)

> "A tool to pick up sentiment analysis on Twitter space."

### The Problem

University communications teams need to monitor public sentiment around institutional topics — especially during live Twitter/X Spaces events (town halls, crisis responses, policy announcements). Current tools are expensive, generic, and don't integrate with institutional context.

### Design

A **Data Desk collection** tool. User provides a Twitter/X Space URL, transcript, or pasted text, and Sandy analyzes sentiment, key themes, stakeholder concerns, and recommended responses.

**Sandy Interview Flow:**
1. **Input**: "Paste the transcript, thread URL, or key quotes from the Twitter Space."
2. **Context**: "What's the institutional context? Is this about a policy change, crisis, event, or general discussion?"
3. **Analysis**: Sandy produces sentiment breakdown, key themes, notable quotes, and stakeholder mapping
4. **Response drafting**: "Based on the concerns raised, here are 3 talking points your team should prepare."

### Files

| Type | Path |
|---|---|
| Page | `app/data-desk/sentiment-analyzer/page.tsx` |
| Hook | `app/hooks/useSentimentAnalyzer.ts` |
| Service | `app/lib/sentiment-analyzer-service.ts` |
| Preflight | `app/lib/sentiment-analyzer-preflight.ts` |
| API (3) | `app/api/data-desk/sentiment-analyzer/{preflight,interview,generate}/route.ts` |

### Output Structure

```typescript
interface SentimentAnalysis {
  overallSentiment: 'positive' | 'mixed' | 'negative' | 'neutral'
  sentimentScore: number  // -1 to 1
  themes: {
    topic: string
    sentiment: 'positive' | 'mixed' | 'negative'
    frequency: number
    keyQuotes: string[]
  }[]
  stakeholderMap: {
    group: string          // e.g., "students", "faculty", "community"
    sentiment: string
    primaryConcerns: string[]
  }[]
  notableQuotes: {
    text: string
    sentiment: string
    significance: string   // why this quote matters
  }[]
  recommendedResponses: {
    concern: string
    talkingPoint: string
    tone: string           // e.g., "empathetic", "factual", "proactive"
  }[]
  executiveSummary: string
}
```

### Integration

- **UKNow**: Cross-reference sentiment topics with UKNow articles for institutional context
- **Staff Communications**: Feed talking points into Announcement Drafter
- **Sandy Concierge**: When staff are on the communications page, Sandy can reference recent sentiment analyses

---

## Feature 6: File & Folder Name Cleaner

> "A tool to shorten folder and file names and then essentially clean them up using a naming convention."

### The Problem

Institutional file systems are chaos. Files named `Final_FINAL_v3_TianaEdits_03242026 (1).docx` across thousands of folders. No naming conventions. Finding anything requires remembering when you saved it, not what it's called. Migration, onboarding, and handoffs are painful because nobody can navigate someone else's files.

### Design

A **utility tool** (standalone, not collection-based). User describes their naming convention preferences or picks from presets, then uploads a file/folder list (or pastes paths). Sandy generates a rename map.

**Sandy Interview Flow:**
1. **Input**: "Paste your file/folder list, or describe the mess."
2. **Convention**: "What naming convention do you want? I have presets: kebab-case-with-dates, department-project-version, or describe your own."
3. **Preview**: Sandy generates a before/after rename table
4. **Refinement**: "These 4 files look like duplicates. Want me to flag them? Also, 'Final_FINAL_v3' and 'Final_v3_TianaEdits' might be the same document."
5. **Export**: Downloadable rename script (PowerShell/bash) or CSV mapping

### Files

| Type | Path |
|---|---|
| Page | `app/tools/file-cleaner/page.tsx` |
| Service | `app/lib/file-cleaner-service.ts` |
| API (2) | `app/api/tools/file-cleaner/{analyze,generate}/route.ts` |
| Component | `app/components/tools/FileCleanerPreview.tsx` |

### Naming Convention Presets

| Preset | Pattern | Example |
|---|---|---|
| Date-First | `YYYY-MM-DD_department_description` | `2026-03-24_execcomms_ocr-response-draft` |
| Project-Based | `project_type_version` | `shared-governance_minutes_v2` |
| Department-Archive | `dept_year_category_name` | `execcomms_2026_policy_ferpa-update` |
| Custom | User-defined with Sandy's help | Whatever they describe |

### Output

```typescript
interface FileCleanerResult {
  renames: {
    original: string
    proposed: string
    flags: ('duplicate' | 'too-long' | 'special-chars' | 'no-date')[]
  }[]
  duplicateCandidates: { files: string[], similarity: number }[]
  summary: string          // "47 files renamed, 3 duplicates flagged, 12 dates normalized"
  script: string           // PowerShell or bash rename commands
  convention: string       // description of applied convention
}
```

---

## Feature 7: Room Reservation / EMS Intelligence Layer

> "Meet at Big Blue is what we currently use. It's our EMS system and it's bad."

### The Problem

"Meet at Big Blue" (UK's Event Management System) is convoluted and outdated. Reserving a room requires navigating a clunky interface, checking availability across buildings, and manually coordinating AV needs, catering, and setup. There's no intelligence — it doesn't know that your recurring meeting always needs a projector, or that the room you want is available 30 minutes later.

### Design

An **intelligence layer** that sits over room/event data (scraped or API-integrated from Meet at Big Blue) and makes Sandy the interface. This is the pattern Tiana validated: **take a dumb institutional database and give it a brain.**

**Sandy Interview Flow:**
1. **Intent**: "I need a room for a committee meeting next Thursday, 10 people, need a projector."
2. **Smart search**: Sandy queries available rooms matching capacity + AV + building preference + time
3. **Recommendation**: "Room 301 in the Admin building is available 2-4 PM and has the projector. But if you can shift to 2:30, Room 210 (which you've used 3 times before) opens up."
4. **Booking**: Sandy submits the reservation (when API integration exists) or generates the booking details for manual entry
5. **Recurring intelligence**: "You book this room every month. Want me to reserve it for the rest of the semester?"

### Files

| Type | Path |
|---|---|
| Page | `app/rooms/page.tsx` |
| Service | `app/lib/room-reservation-service.ts` |
| Data | `app/lib/room-data.ts` — synthetic room/building inventory for demo |
| API (3) | `app/api/rooms/{search,book,history}/route.ts` |
| Component | `app/components/rooms/RoomFinder.tsx` |
| Component | `app/components/rooms/RoomCard.tsx` |
| Sandy integration | Page context in `concierge-service.ts` |

### Data Model (no schema change for MVP)

For demo, use synthetic data in `room-data.ts`. For production, scrape or API-connect to Meet at Big Blue.

```typescript
interface Room {
  id: string
  name: string           // "Room 301"
  building: string       // "Whitehall Classroom Building"
  capacity: number
  amenities: string[]    // ['projector', 'whiteboard', 'video-conf', 'av-system']
  floor: number
  imageUrl?: string
}

interface RoomSlot {
  roomId: string
  date: string           // ISO date
  startTime: string      // "14:00"
  endTime: string        // "16:00"
  available: boolean
}

interface Booking {
  roomId: string
  userId: string
  date: string
  startTime: string
  endTime: string
  purpose: string
  attendees: number
  amenitiesRequested: string[]
  recurring?: { frequency: 'weekly' | 'biweekly' | 'monthly', until: string }
}
```

### Sandy Intelligence Features

- **Preference learning**: Track which rooms/buildings the user prefers
- **Conflict detection**: "You have a meeting at 1:30 in the Main Building — Room 301 is a 12-minute walk. Want something closer?"
- **Smart alternatives**: When preferred room is taken, suggest similar rooms ranked by match score
- **Recurring patterns**: Detect monthly/weekly bookings and offer to auto-reserve
- **Event coordination**: "This is a 50-person event. Want me to also check catering availability?"

---

## Cross-Cutting Concerns

### The Intelligence Layer Pattern

Features 1, 2, 3, and 7 all follow the same pattern that Tiana validated:

> **Take an existing institutional system (email, EMS, org charts, HR) → add Sandy as the intelligence layer → surface insights that were always there but never accessible.**

This pattern is replicable. Every "dumb database" at UK is a candidate:
- BB Involved (700+ student orgs) — mentioned in meeting, future candidate
- DegreeWorks — already partially covered by Academic Pathfinder
- Meet at Big Blue (EMS) — Feature 7
- Email (M365) — Features 1, 2, 3
- HR/job descriptions — Feature 3

### Shared Infrastructure Needs

| Need | Status | Used By |
|---|---|---|
| Sandy Interview Mode pattern | Built (SandyInterviewPanel) | Features 1, 3, 4, 5 |
| Email data pipeline | Partially built (assistant/email) | Features 1, 2 |
| PDF generation | Built (pdf-extract.ts for input) — need html-to-pdf for output | Features 1, 4 |
| File upload/paste | Built (multiple tools) | Features 3, 5, 6 |
| Staff briefing integration | Built (briefing-service.ts) | Features 2, 7 |
| Concierge page context | Built (concierge-service.ts) | All features |

### Collection Mapping

| Feature | Collection | Rationale |
|---|---|---|
| 1. Institutional Resume | Write Room | Document generation from data |
| 2. Email Mention Triage | Staff Tools (new) | Staff workflow, extends briefing |
| 3. Team Analyzer | Data Desk | Analytical output from data input |
| 4. Contract Drafter | Write Room | Document generation with templates |
| 5. Sentiment Analyzer | Data Desk | Analytical output from text input |
| 6. File Cleaner | Standalone utility | Not a Sandy Interview — batch operation |
| 7. Room Reservation | Standalone page | Full page experience, not a tool card |

### Build Priority (Suggested)

| Priority | Feature | Why |
|---|---|---|
| 1 | Email Mention Triage (#2) | Extends existing infrastructure, immediate daily value, low effort |
| 2 | Institutional Resume (#1) | Emotionally resonant, demo-ready, validates the "email as data source" pattern |
| 3 | Contract Drafter (#4) | Write Room pattern is proven, high staff value |
| 4 | Sentiment Analyzer (#5) | Data Desk pattern is proven, comms team need |
| 5 | Team Analyzer (#3) | Compelling but needs more data input maturity |
| 6 | File Cleaner (#6) | Useful but utility-grade — good for a community-built tool |
| 7 | Room Reservation (#7) | Highest impact long-term but needs EMS integration or scraping |

---

## Design Principles (from the conversation)

1. **Trust through transparency**: Always show the source. Tiana said "I like to be able to see that original source just to double check it." Every AI-generated output should link back to the data it came from.

2. **Specific over generic**: The resume builder must produce text that "could only belong to THIS person." If Sandy outputs "managed communications," it has failed.

3. **Solve once, share with everyone**: If one person builds a great contract template or naming convention, it should be available to all 70,000 users through the Hub.

4. **Don't make me maintain it**: Tiana doesn't keep notes on what she does. The system must derive insights from existing activity, not require new habits.

5. **Brevity**: "It talks too much. I've asked you to condense this." Sandy's outputs in these tools should be concise. Lead with the deliverable, not the explanation.
