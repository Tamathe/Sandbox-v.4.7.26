# Student Services Hub — Architecture Blueprint
### The Sandbox / CATS-AI / University of Kentucky
### Derived from: UKY Site Intelligence Swarm Report (2026-03-19)
### Status: 🟡 Ready for Implementation

---

## Dual-Role Evaluation

### Role 1: Master Software Architect
### Role 2: Head of UX Strategy & Campus Culture

---

## Remark Evaluations

---

### Remark 1 — ISSS Immigration Compliance (Complexity: 9/10)

**Architect's Technical Solution:**
The immigration domain requires a RAG-first architecture. The existing `DocumentChunk` + `CourseMaterial` pgvector pipeline (used for Faculty Avatar) is the correct foundation. Build a parallel `ServiceDocument` model (distinct from `CourseMaterial` — not course-scoped) that chunks and embeds ISSS policy PDFs, USCIS regulation excerpts, and UK-specific CPT/OPT guidance. Wire these as retrieval context into a dedicated `chat-service` path gated by `tool.isOfficialService = true`. Add a `ISSS_NAVIGATOR` slug to the existing Campus Navigator collection in `app/lib/campus-navigator.ts`.

For state tracking: OPT/CPT applications are multi-session workflows. Add a lightweight `ServiceCaseSession` model (see Schema section) to persist checklist state across visits without storing raw immigration status in PII-sensitive fields.

The existing `Tool` model already has `isOfficialService`, `serviceProtocol`, and `escalationEmail` fields — use these, not a new model.

**Strategist's UX Impact:**
This is the highest institutional-trust moment in the platform. Sandy must drop her casual tone entirely here. Use a distinct `personaName: "ISSS Navigator"` with a formal but warm voice. Open with: "I can help you understand your status and next steps — I'm not a lawyer, and for anything that affects your visa status you should confirm with an ISSS advisor." This disclaimer is both legally protective and trust-building. No gamification scaffolding. No streaks. Pure professional mode.

The 24/7 availability is the killer feature — most SEVIS violations happen when a student panics at 11pm before a deadline and can't reach anyone. This tool is the safety net.

**FERPA/PII note:** Do NOT store visa type, I-20 dates, or SEVIS ID numbers in the DB. Chat history is ephemeral in the tool session (already the case in ToolSession/ChatMessage). Remind students in the welcome message not to enter their SEVIS ID.

---

### Remark 2 — DRC Documentation Readiness Checker (Complexity: 9/10)

**Architect's Technical Solution:**
The existing `Petition` model with `PetitionType` enum is the correct backing store — but the enum is missing disability-related petition types. Add `DRC_INITIAL_AFFILIATION`, `DRC_ACCOMMODATION_RENEWAL`, `DRC_ESA_REQUEST`, `DRC_EXAM_SCHEDULING` to `PetitionType`. The DRC checker tool itself is a guided wizard flow, not a free-form chat — implement as a `SIMULATION` ToolType with a structured system prompt that follows a decision tree: disability category → documentation type → provider requirements → deadline calculation.

The ESA hard deadline (January 5) is date-sensitive — wire the system prompt to include `new Date().toISOString()` injection so the AI can calculate whether a student is past the deadline and route them to the escalation email.

**Strategist's UX Impact:**
Students accessing this tool are often in their first week of college, already overwhelmed, and discovering for the first time that their high school IEP/504 is rejected. This is a fragile moment. The tool must lead with empathy: "Getting accommodations at UK is a different process than high school — let me walk you through exactly what you need."

Never use the phrase "you must get a new evaluation" without immediately explaining that UK has resources to help with costs (Counseling Center can provide some documentation). The tool should feel like a knowledgeable older student walking alongside them, not a checklist.

**FERPA/PII note:** Disability category and accommodation type are protected health information. Sessions flagged with `tool.isOfficialService = true` should not surface in educator dashboards or analytics exports. Add a `sensitiveSession` boolean to `ToolSession` (see Schema section).

---

### Remark 3 — SAP Appeal Coach (Financial Aid, Complexity: 8/10)

**Architect's Technical Solution:**
This is where the existing `Petition` model pays off most. Add `SAP_APPEAL`, `FINANCIAL_AID_APPEAL`, `COA_BUDGET_APPEAL`, `UNUSUAL_CIRCUMSTANCES`, `INCOME_REDUCTION`, `UNUSUAL_ENROLLMENT_HISTORY` to `PetitionType`. The SAP Appeal Coach should be a `SIMULATION` tool that runs a structured intake, then pre-populates a `Petition` record with `formData` containing the student's answers.

This creates a genuine workflow artifact — the student can return to their in-progress appeal, the petition routes to the financial aid office email (`escalationEmail` on the Tool record), and the appeal narrative draft is stored in `Petition.formData.narrativeDraft`.

The existing appeal infrastructure at `/api/petitions/` already handles routing. Add `routeTo: 'financial-aid'` logic in the petition router.

**Strategist's UX Impact:**
Students accessing SAP Appeal are often in their lowest moment — they've lost financial aid and their enrollment is at risk. The AI must never minimize this. The tool should open with: "Losing financial aid is serious, and the appeal process can feel overwhelming. I'll guide you through it step by step."

The income reduction appeal and unusual circumstances paths are especially sensitive (job loss, divorce, death). The AI should ask about these in plain English, not bureaucratic language, and offer the option to pause and save progress at any point. Do not require completing the appeal in one session.

---

### Remark 4 — Pre-Professional Track Advisor (Career Center, Complexity: 8/10)

**Architect's Technical Solution:**
Eight distinct pre-professional tracks (pre-med, pre-law, pre-dental, pre-vet, pre-optometry, pre-pharmacy, pre-PA, pre-OT/PT) each require track-specific knowledge that cannot be effectively held in a single system prompt. Use the `ServiceDocument` RAG model (same as Remark 1) to embed pre-professional advising guides for each track. The tool detects the student's track from context or explicitly asks, then retrieves the relevant guide chunks for the response.

The existing `User.program` field can pre-populate the track selection. Wire `personalContext` injection from the user profile into the system prompt — if a student's `program` is "PRE-MED", the tool opens knowing this.

Implement as a Campus Navigator tool with `slug: 'pre-professional-advisor'`.

**Strategist's UX Impact:**
Pre-professional students are among the most high-achieving, high-anxiety students on campus. They have a five-year horizon in their heads at all times. The tool should respect this. Lead with the semester-by-semester action plan rather than general encouragement. Students don't want warmth — they want the MCAT timeline and the exact number of shadowing hours.

The "major change navigator" insight (from the Registrar agent) cross-cuts here — many pre-med students are biology majors who may want to double-major in chemistry. The tool should surface this proactively.

---

### Remark 5 — Counseling Intake Navigator (Health & Wellness, Complexity: 8/10)

**Architect's Technical Solution:**
This tool must be the most architecturally simple and the most carefully constrained. DO NOT build a mental health screening tool that persists results. The tool is a pre-TRACS preparation assistant only — it helps students articulate what they're experiencing, understand their care options (Let's Talk vs. group vs. individual), and prepare for the phone call.

Implement as a `CHATBOT` ToolType with a system prompt that is explicitly bounded: "I'm here to help you understand UK's counseling options and prepare for your intake call. I'm not a therapist and I won't remember this conversation."

Critical: wire an immediate crisis detection pattern. If the student's message contains crisis language (not a full sentiment model — just keyword heuristics in the system prompt), the AI must surface the crisis line (859-257-8701, press 1) and the National Crisis Line (988) before any other response.

**Strategist's UX Impact:**
This tool exists at the intersection of the highest student need and the highest risk of harm if done wrong. The UX mandate is: be a calm, knowledgeable friend, not a clinical intake form. Never ask "rate your depression on a scale of 1–10." Use plain language. Use "feeling overwhelmed" not "symptoms."

The single most valuable UX improvement this tool provides is eliminating the barrier of "I don't know what to say when they answer the TRACS line." Prepare students for that specific phone call. The tool should end with: "Here's what you can say when you call TRACS: [suggested opening]."

**FERPA/PII note:** Mental health disclosures in chat are the most sensitive data category. The `ToolSession` for this tool must never surface in educator analytics. `sensitiveSession: true`. Consider a separate `retentionDays: 30` override on chat messages for this tool.

---

## Brittle / Redundant Code Identified

| Location | Issue | Resolution |
|---|---|---|
| `app/lib/sandcastle.ts` | `sandCost: number` fields on all 27 entries — gamification engine removed, these are dead weight | Leave for now; strip in a dedicated cleanup sprint |
| `app/lib/campus-navigator.ts` | Tools defined as static data, not DB records — no session tracking, no analytics, no rating | Migrate to `isOfficialService: true` Tool records in seed; keep `.ts` as the type definition + metadata file |
| `app/api/campus-navigator/` | Confirm this route exists and uses `requireRequestUser` | Audit in Task 1 |
| `Petition.formData: Json` | Untyped — any shape can be stored | Add Zod schema validation in the petition route for each PetitionType |
| `Tool.serviceProtocol: String?` | Exists but appears unused in any route or component | Wire to chat-service to inject protocol context into official service tool system prompts |

---

## Schema Changes Required

```prisma
// Add to PetitionType enum:
enum PetitionType {
  // existing...
  LATE_WITHDRAWAL
  GRADE_CHANGE
  NAME_UPDATE
  ENROLLMENT_CERTIFICATION
  ACADEMIC_RENEWAL
  COURSE_OVERLOAD
  GRADUATION_APPLICATION
  MAJOR_CHANGE
  LEAVE_OF_ABSENCE
  // NEW:
  SAP_APPEAL
  FINANCIAL_AID_APPEAL
  COA_BUDGET_APPEAL
  UNUSUAL_CIRCUMSTANCES
  INCOME_REDUCTION
  UNUSUAL_ENROLLMENT_HISTORY
  DRC_INITIAL_AFFILIATION
  DRC_ACCOMMODATION_RENEWAL
  DRC_ESA_REQUEST
  DRC_EXAM_SCHEDULING
  ISSS_INQUIRY
}

// Add to ToolSession model:
model ToolSession {
  // ...existing fields...
  sensitiveSession Boolean @default(false) // true = exclude from educator/admin analytics
}

// New model: ServiceDocument (parallel to CourseMaterial but for official service RAG)
model ServiceDocument {
  id           String          @id @default(cuid())
  serviceArea  String          // "isss" | "drc" | "financial-aid" | "registrar" | "career"
  title        String
  content      String          @db.Text
  sourceUrl    String?
  fileType     String          @default("text/plain")
  embeddedAt   DateTime?
  createdAt    DateTime        @default(now())
  updatedAt    DateTime        @updatedAt
  chunks       ServiceChunk[]

  @@index([serviceArea])
}

// New model: ServiceChunk (RAG chunks for ServiceDocument, parallel to DocumentChunk)
model ServiceChunk {
  id          String          @id @default(cuid())
  documentId  String
  document    ServiceDocument @relation(fields: [documentId], references: [id], onDelete: Cascade)
  serviceArea String          // denormalized for fast per-service similarity search
  chunkIndex  Int
  content     String
  tokenCount  Int
  embedding   Unsupported("vector(1536)")?
  createdAt   DateTime        @default(now())

  @@index([documentId])
  @@index([serviceArea])
}
```

---

## New Tool Collection: Student Services Hub

```typescript
// app/lib/student-services.ts
export const STUDENT_SERVICES_TOOLS = [
  {
    slug: 'isss-navigator',
    title: 'Immigration & Visa Navigator',
    subtitle: 'F-1 / J-1 status, OPT/CPT, I-20, tax filing',
    serviceArea: 'isss',
    escalationEmail: 'isss@uky.edu',
    persona: 'ISSS Navigator',
    icon: 'Plane',  // lucide-react
    ragEnabled: true,
  },
  {
    slug: 'drc-readiness',
    title: 'Disability Accommodations Guide',
    subtitle: 'Documentation requirements, affiliation, ESA requests',
    serviceArea: 'drc',
    escalationEmail: 'drc@uky.edu',
    persona: 'DRC Guide',
    icon: 'Accessibility',
    ragEnabled: false, // system-prompt driven; no RAG for MVP
  },
  {
    slug: 'financial-aid-appeal',
    title: 'Financial Aid Appeal Coach',
    subtitle: 'SAP, income reduction, unusual circumstances, COA budget',
    serviceArea: 'financial-aid',
    escalationEmail: 'financialaid@uky.edu',
    persona: 'Aid Navigator',
    icon: 'DollarSign',
    ragEnabled: false,
    petitionEnabled: true, // creates Petition record on completion
  },
  {
    slug: 'pre-professional-advisor',
    title: 'Pre-Professional Track Advisor',
    subtitle: 'Pre-med, pre-law, pre-dental, pre-vet, and 4 more tracks',
    serviceArea: 'career',
    escalationEmail: 'careercenter@uky.edu',
    persona: 'Pre-Prof Advisor',
    icon: 'Stethoscope',
    ragEnabled: true,
  },
  {
    slug: 'counseling-navigator',
    title: 'Counseling & Wellness Guide',
    subtitle: 'Understand your options and prepare for your intake call',
    serviceArea: 'counseling',
    escalationEmail: 'counseling@uky.edu',
    persona: 'Wellness Guide',
    icon: 'Heart',
    sensitiveSession: true,
    crisisLineEnabled: true,
  },
]
```

Route: `/student-services/[slug]`

---

## Implementation Plan

> **Execution Protocol:**
> - Run `npm run lint && npx tsc --noEmit && npm run build` after every 2 tasks
> - Stop and request human review after every 2 tasks before proceeding
> - After any schema migration, run `npx prisma migrate dev --name <name> && npx prisma generate && npm run build`
> - After completing Tasks 1–4 (schema + data layer), output the **Context Handoff Prompt** below before continuing

---

### Task 1 — Schema Migration: Extend PetitionType + Add sensitiveSession + ServiceDocument

**What:** Add 10 new petition types to the enum. Add `sensitiveSession Boolean @default(false)` to `ToolSession`. Add `ServiceDocument` and `ServiceChunk` models.

**Files to modify:**
- `prisma/schema.prisma`

**Migration name:** `student-services-hub-foundation`

**Instruction:**
Edit `prisma/schema.prisma`:
1. Add to `PetitionType` enum: `SAP_APPEAL`, `FINANCIAL_AID_APPEAL`, `COA_BUDGET_APPEAL`, `UNUSUAL_CIRCUMSTANCES`, `INCOME_REDUCTION`, `UNUSUAL_ENROLLMENT_HISTORY`, `DRC_INITIAL_AFFILIATION`, `DRC_ACCOMMODATION_RENEWAL`, `DRC_ESA_REQUEST`, `DRC_EXAM_SCHEDULING`, `ISSS_INQUIRY`
2. Add `sensitiveSession Boolean @default(false)` to `ToolSession` model
3. Add `ServiceDocument` and `ServiceChunk` models as specified above
4. Run: `npx prisma migrate dev --name student-services-hub-foundation`
5. Run: `npx prisma generate`

**Build check:** `npm run lint && npx tsc --noEmit && npm run build`

---

### Task 2 — Analytics Guard: Exclude sensitiveSession from educator/admin routes

**What:** Any route that surfaces chat messages or session details to educators/admins must filter out `sensitiveSession: true` sessions.

**Files to modify:**
- `app/api/analytics/` routes (platform + student)
- `app/api/dashboard/route.ts`
- `app/api/students/` routes

**Instruction:**
In every DB query that returns `ToolSession` records to non-student roles, add `where: { sensitiveSession: false }` (or wrap in `AND`). Add a comment: `// sensitiveSession: false — exclude counseling/disability/immigration sessions per FERPA policy`.

**Build check:** `npm run lint && npx tsc --noEmit && npm run build`

> **STOP — Request human review before proceeding to Task 3.**

---

### Task 3 — New lib file: `app/lib/student-services.ts`

**What:** Define the 5 Student Services Hub tool definitions as a typed catalog (parallel to `app/lib/campus-navigator.ts`).

**Files to create:**
- `app/lib/student-services.ts`

**Instruction:**
Create `app/lib/student-services.ts` with the `STUDENT_SERVICES_TOOLS` array defined above. Export a `StudentServiceTool` TypeScript interface. Include `serviceArea`, `slug`, `title`, `subtitle`, `escalationEmail`, `persona`, `icon`, `ragEnabled`, `sensitiveSession`, `crisisLineEnabled`, `petitionEnabled` fields. All fields optional except `slug`, `title`, `serviceArea`.

---

### Task 4 — New API route: `/api/student-services/[slug]/route.ts`

**What:** Thin API route that: (1) calls `requireStudentUser`, (2) looks up the service tool definition by slug, (3) resolves the system prompt (with optional RAG retrieval from `ServiceChunk` if `ragEnabled: true`), (4) streams Claude Haiku response, (5) saves `ToolSession` with `sensitiveSession` flag.

**Files to create:**
- `app/api/student-services/[slug]/route.ts`

**Instruction:**
Model this route on `app/api/chat/route.ts`. Key differences:
- Auth: `requireStudentUser` (students only — no educator can access on behalf of)
- Session creation: include `sensitiveSession: toolDef.sensitiveSession ?? false`
- Crisis detection: if `crisisLineEnabled` and message contains crisis keywords, prepend crisis line info to system prompt (do not block the response — surface crisis resources within the reply)
- RAG: if `ragEnabled`, run similarity search on `ServiceChunk` table filtered by `serviceArea`, inject top 5 chunks into system prompt
- Escalation footer: append `"If you need to speak with someone directly: [escalationEmail]"` to every system prompt
- Business logic in `app/lib/service-chat-service.ts` (thin route → lib pattern per CLAUDE.md)

**Build check:** `npm run lint && npx tsc --noEmit && npm run build`

> **STOP — Request human review before proceeding to Task 5.**
> **OUTPUT CONTEXT HANDOFF PROMPT (see bottom of this document)**

---

### Task 5 — New page: `app/student-services/[slug]/page.tsx`

**What:** Student-facing page for each service tool. Reuses `ChatInterface` component. Shows service area header (title, subtitle, escalation email, service hours). Professional mode only — no gamification UI.

**Files to create:**
- `app/student-services/[slug]/page.tsx`
- `app/student-services/page.tsx` (index — grid of 5 service cards)

**Instruction:**
`page.tsx` (index): Render a grid of `StudentServiceCard` components (inline, no new component file needed for MVP). Each card: icon (lucide-react), title, subtitle, `Link` to `/student-services/[slug]`. UK blue (#0033A0) accent. Add a header banner: "These tools are powered by AI. Always confirm critical decisions with the relevant UK office."

`[slug]/page.tsx`: Fetch the tool definition from `STUDENT_SERVICES_TOOLS`. Render `ChatInterface` with `apiPath="/api/student-services/[slug]"`. Show escalation email in a sticky footer strip: "Need to speak with someone? → [email]". If `crisisLineEnabled`, add crisis line in amber banner at top.

---

### Task 6 — Petition creation: wire Financial Aid Appeal Coach to Petition model

**What:** When a student completes the Financial Aid Appeal Coach flow (the AI detects the conversation has reached a "ready to submit" state), create a `Petition` record with the appropriate type and pre-populated `formData`.

**Files to modify:**
- `app/lib/service-chat-service.ts`
- `app/api/student-services/[slug]/route.ts`

**Instruction:**
In `service-chat-service.ts`, add a `checkForPetitionTrigger(messages, toolDef)` function. For the `financial-aid-appeal` slug: scan the last assistant message for a "submit appeal" signal phrase (defined in the system prompt — instruct Claude to output `[PETITION_READY:{type}]` marker when the narrative is complete, same pattern as `[COURSE_KB_ID:]` used in `chat-service.ts`). When detected: create a `Petition` record via Prisma, set `status: SUBMITTED`, populate `formData` with the key–value pairs extracted from the conversation. Return the petition ID in the SSE stream so the UI can show a "Your appeal draft has been saved" confirmation.

**Build check:** `npm run lint && npx tsc --noEmit && npm run build`

> **STOP — Request human review before proceeding to Task 7.**

---

### Task 7 — Service RAG pipeline: `/api/service-documents/embed` route

**What:** Admin-only route that accepts a service document (text or PDF), chunks it, embeds via Voyage AI, and stores in `ServiceChunk` with `serviceArea` tag.

**Files to create:**
- `app/api/service-documents/embed/route.ts`
- `app/api/service-documents/route.ts` (CRUD)

**Instruction:**
Model on `/api/avatar/deploy/route.ts` (the existing RAG embed pipeline). Key differences:
- Auth: `requireAdminUser` only
- Target model: `ServiceDocument` + `ServiceChunk` instead of `CourseMaterial` + `DocumentChunk`
- `serviceArea` param: one of `isss | drc | financial-aid | registrar | career | counseling`
- No course scoping — documents are platform-wide
- Chunk size: 512 tokens, 50-token overlap (same as avatar pipeline)
- After embedding, set `ServiceDocument.embeddedAt = new Date()`

---

### Task 8 — Campus Navigator: add Pre-Professional Advisor entry

**What:** Extend the existing Campus Navigator collection with the Pre-Professional Track Advisor. This gives it the existing Campus Navigator UI/UX rather than building a new page.

**Files to modify:**
- `app/lib/campus-navigator.ts`
- `app/api/campus-navigator/` (verify auth guard exists)

**Instruction:**
Add `pre-professional-advisor` to the Campus Navigator tool definitions. System prompt should: (1) open by asking the student their target pre-professional track, (2) once detected, fetch the appropriate `ServiceChunk` records for that track via RAG, (3) generate a semester-by-semester action plan. Verify `/api/campus-navigator/route.ts` calls `requireRequestUser` — if not, fix it.

**Build check:** `npm run lint && npx tsc --noEmit && npm run build`

> **STOP — Request human review before proceeding to Task 9.**

---

### Task 9 — Header nav: add Student Services link for STUDENT role

**What:** Add "Services" nav item to `app/components/Header.tsx` for STUDENT role only, linking to `/student-services`.

**Files to modify:**
- `app/components/Header.tsx`

**Instruction:**
Locate the STUDENT role nav section in `Header.tsx`. Add a `Link` to `/student-services` with a `LifeBuoy` icon (lucide-react). Label: "Services". Position: after "Tools", before any profile/settings links. Full 4-role visual test required after this change (ADMIN, EDUCATOR, STUDENT, REGISTRAR) — confirm nav items are role-gated correctly.

---

### Task 10 — Sandy ProactiveConfig: wire concierge awareness for /student-services

**What:** When Sandy detects the user is on `/student-services/*`, she should proactively offer to help find the right tool for their situation.

**Files to modify:**
- `app/components/ClientProviders.tsx` (where ProactiveConfig is set per route)

**Instruction:**
In `ClientProviders.tsx`, add a route match for `/student-services`. Set `ProactiveConfig` to: `{ triggerMessage: "I can help you find the right service tool for your situation. What are you dealing with — financial aid, advising, health, disability services, or something else?", delayMs: 8000 }`. Do NOT trigger Sandy on `/student-services/[slug]` pages (the tool chat is already active — Sandy would be intrusive).

**Build check:** `npm run lint && npx tsc --noEmit && npm run build`

> **STOP — Final review before shipping. Run full build + linting one final time.**

---

## Context Handoff Prompt

> Output this prompt after completing Tasks 1–4, to hand off to a new Claude context:

```
You are continuing implementation of the Student Services Hub sprint for The Sandbox (University of Kentucky AI tool marketplace).

**What has been completed (Tasks 1–4):**
- Schema migrated: PetitionType enum extended with SAP_APPEAL, FINANCIAL_AID_APPEAL, COA_BUDGET_APPEAL, UNUSUAL_CIRCUMSTANCES, INCOME_REDUCTION, UNUSUAL_ENROLLMENT_HISTORY, DRC_INITIAL_AFFILIATION, DRC_ACCOMMODATION_RENEWAL, DRC_ESA_REQUEST, DRC_EXAM_SCHEDULING, ISSS_INQUIRY
- ToolSession.sensitiveSession Boolean added — filters these sessions from educator/admin analytics routes
- app/lib/student-services.ts created — 5 tool definitions (isss-navigator, drc-readiness, financial-aid-appeal, pre-professional-advisor, counseling-navigator)
- app/api/student-services/[slug]/route.ts created — thin auth → lib → stream pattern, sensitiveSession flag, crisis detection, RAG stub
- app/lib/service-chat-service.ts created — business logic for service tools

**What still needs to be done (Tasks 5–10):**
See blueprint: c:\AA Code\Educator marketplace\Blueprints\student-services-hub-architecture.md

**Critical constraints (do not violate):**
- Tailwind v4: no @apply, utility classes only in JSX
- Prisma v7: PrismaPg adapter, import from ../generated/prisma
- Icons: lucide-react ONLY
- Auth: every route.ts MUST call requireRequestUser before any DB access
- Routes thin: auth → parse → call lib → return
- sensitiveSession: true sessions must NEVER surface in educator/admin dashboard or analytics

**Build command:** npm run lint && npx tsc --noEmit && npm run build
**Schema change sequence:** Edit schema → npx prisma migrate dev --name <name> → npx prisma generate → npm run build

**Next task:** Task 5 — New page app/student-services/[slug]/page.tsx
**Execution rule:** Run build check after every 2 tasks. Stop and ask for review after every 2 tasks.
```

---

## Blueprint Status

> **✅ All 10 tasks complete — 2026-03-19. Build: 149 pages, 0 TS errors.**

| Task | Description | Status |
|---|---|---|
| 1 | Schema migration: PetitionType + sensitiveSession + ServiceDocument | ✅ Complete |
| 2 | Analytics guard: exclude sensitiveSession from educator routes | ✅ Complete |
| 3 | `app/lib/student-services.ts` definition file | ✅ Complete |
| 4 | `/api/student-services/[slug]` route + service-chat-service.ts | ✅ Complete |
| 5 | `/student-services/[slug]/page.tsx` + index page | ✅ Complete |
| 6 | Petition creation: Financial Aid Appeal → Petition model | ✅ Complete |
| 7 | Service RAG pipeline: `/api/service-documents/embed` | ✅ Complete |
| 8 | Campus Navigator: Pre-Professional Advisor entry | ✅ Complete |
| 9 | Header nav: Services link for STUDENT role | ✅ Complete |
| 10 | Sandy ProactiveConfig for /student-services | ✅ Complete |

---

*Blueprint authored: 2026-03-19 — based on UKY site intelligence swarm (8 agents, Financial Aid 8/10, Registrar 8/10, Advising 8/10, Student Life/DRC 9/10, Career Center 8/10, Health & Wellness 8/10, Libraries 8/10, ISSS 9/10)*
