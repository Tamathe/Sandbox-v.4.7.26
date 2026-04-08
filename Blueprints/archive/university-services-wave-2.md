# Blueprint: University Services Expansion — Wave 2
**Status:** ✅ Complete (code) — 4 operational tasks remain (RAG doc uploads + SME reviews for title-ix/conduct/legal-aid before launch)
**Created:** 2026-03-20
**Completed:** 2026-03-20
**Author:** Architect review session

---

## Context-Handoff Protocol

This blueprint is executed in **2-task batches**. Each Claude Code session must:

1. Read this blueprint (`Blueprints/university-services-wave-2.md`) and `Blueprints/BLUEPRINT-STATUS.md` before touching any code.
2. Identify the next 2 uncompleted tasks in order (Phase 1 infra → Phase 1 services → Phase 2 infra → Phase 2 services).
3. Complete exactly those 2 tasks. Run `npx tsc --noEmit` after each task. Run `npm run build` after both tasks.
4. Mark each completed task in this file: replace `- [ ]` with `- [x]` and append `*(done YYYY-MM-DD)*`.
5. Update `Blueprints/BLUEPRINT-STATUS.md` — change the Wave 2 row status to `🟡 Partial` if not already, and update "Remaining Work" to reflect tasks completed.
6. **Output a handoff prompt** (see template below) for the next 2 tasks and present it to the user.
7. **Stop.** Do not continue to a third task.

### Handoff Prompt Template

When writing the handoff prompt at the end of your session, use this structure:

```
You are continuing implementation of University Services Expansion — Wave 2 for The Sandbox (UK educator marketplace).

Working directory: `c:\AA Code\Educator marketplace\the-sandbox\`
Blueprint: `c:\AA Code\Educator marketplace\Blueprints\university-services-wave-2.md`
Architecture doc: `c:\AA Code\Educator marketplace\the-sandbox\CLAUDE.md`

**Your task: complete exactly 2 blueprint tasks, then stop.**

Next 2 tasks:
- [TASK_ID_1]: [brief description]
- [TASK_ID_2]: [brief description]

After completing both tasks:
1. Run `npm run build` and confirm 0 TS errors.
2. Mark both tasks `[x]` in the blueprint file.
3. Update `Blueprints/BLUEPRINT-STATUS.md`.
4. Write the handoff prompt for the NEXT 2 tasks using the template in the blueprint's Context-Handoff Protocol section.
5. Stop.
```

---

## Scope

15 proposed services evaluated. All 15 are BUILD decisions — the architecture supports every case.

| # | Service | Phase | Schema? | Sensitive | Crisis | Petition |
|---|---------|-------|---------|-----------|--------|---------|
| 1 | Housing Appeal & Roommate Conflict Advisor | 2 | HOUSING_APPEAL | ✅ | ✅ | ✅ |
| 2 | Registrar Navigation Assistant | 1 | None (reuse existing) | — | — | ✅ |
| 3 | Graduate School Application Coach | 1 | None | — | — | — |
| 4 | Student Legal Aid Navigator | 2 | None | ✅ | — | — |
| 5 | Veterans & Military Student Benefits Guide | 1 | None | — | ✅ | — |
| 6 | Transfer Credit & Degree Audit Explainer | 1 | None | — | — | — |
| 7 | Student Conduct & Academic Integrity Coach | 2 | CONDUCT_APPEAL | ✅ | ✅ | ✅ |
| 8 | Health Insurance & Student Health Navigator | 1 | None | — | — | — |
| 9 | Career & Internship Application Coach | 1 | None | — | — | — |
| 10 | Food & Basic Needs Resource Finder | 1 | None | ✅ | ✅ | — |
| 11 | Study Abroad & Exchange Program Advisor | 1 | None | — | — | — |
| 12 | First-Generation Student Resource Guide | 1 | None | — | ✅ | — |
| 13 | Title IX & Campus Safety Information Guide | 2 | None | ✅ | ✅ | — |
| 14 | Parking & Transportation Appeals Guide | 1 | None | — | — | — |
| 15 | Graduate Student Funding & Fellowship Finder | 1 | None | — | — | — |

---

## Schema Changes Required

### Migration: `add-services-wave2-petition-types`

Add two values to the `PetitionType` enum in `prisma/schema.prisma`:

```prisma
enum PetitionType {
  // ... all existing values preserved ...

  // Housing & Residence Life — Wave 2
  HOUSING_APPEAL

  // Student Conduct & Academic Integrity — Wave 2
  CONDUCT_APPEAL
}
```

**Schema change sequence:**
1. Edit `prisma/schema.prisma`
2. `npx prisma migrate dev --name add-services-wave2-petition-types`
3. `npx prisma generate`
4. Update `VALID_PETITION_TYPES` set in `app/lib/service-chat-service.ts` (see Phase 2 tasks)
5. `npm run build` — confirm 0 TS errors

No new models required. No new API routes required. No new pages required (all services use the existing `/student-services/[slug]` dynamic route).

---

## Phase 1 Tasks — Zero Schema Changes (11 services)

### Shared Infrastructure (do these FIRST before building any Phase 1 service)

- [x] **P1-INFRA-1** — Extend `CRISIS_KEYWORDS` in `app/lib/service-chat-service.ts` with veteran, food insecurity, first-gen, and general distress keywords. Exact additions: *(done 2026-03-20)*
  ```typescript
  // Veteran mental health
  'ptsd', 'flashback', 'combat', 'military sexual trauma', 'mst', "can't readjust",
  // Housing & financial instability
  'evicted', 'eviction', 'homeless', 'nowhere to live', 'kicked out', 'no housing', "can't afford rent",
  // Food insecurity
  'hungry', 'no food', "can't afford food", 'food insecure', 'starving',
  // Scholarship / first-gen distress
  'lost my scholarship', 'lost funding', "can't continue", "don't belong here",
  ```
  *(Title IX, conduct, and safety keywords are Phase 2 infra — add them before Phase 2 services ship.)*

- [x] **P1-INFRA-2** — Verify icon availability by adding `import { Home, Activity, Briefcase, Utensils, Car, Award } from 'lucide-react'` to a scratch file and running `npx tsc --noEmit`. Document which exist. If any fail, document the fallback. *(done 2026-03-20)* **Result: All 6 icons confirmed present in lucide-react 0.577.0 — Home ✅, Activity ✅, Briefcase ✅, Utensils ✅, Car ✅, Award ✅. No fallbacks needed.**

- [x] **P1-INFRA-3** — Add all confirmed new icons to `ICON_MAP` in both:
  - `app/student-services/page.tsx`
  - `app/student-services/[slug]/page.tsx`

  Both files maintain identical `ICON_MAP` objects — update both in the same commit. *(done 2026-03-20)*

### Service 10 — Food & Basic Needs Resource Finder

- [x] **P1-10-A** — Add to `STUDENT_SERVICES_TOOLS` in `app/lib/student-services.ts`: *(done 2026-03-20)*
  ```typescript
  {
    slug: 'food-basic-needs',
    title: 'Food & Basic Needs Finder',
    subtitle: 'UK Food Pantry, SNAP eligibility, emergency aid funds, and campus resources',
    serviceArea: 'basic-needs',
    escalationEmail: 'basicneeds@uky.edu',
    persona: 'Basic Needs Guide',
    icon: 'Utensils',           // verify P1-INFRA-2
    ragEnabled: true,
    sensitiveSession: true,
    crisisLineEnabled: true,
  }
  ```

- [x] **P1-10-B** — Add `case 'food-basic-needs':` welcome message to the `useEffect` switch in `app/student-services/[slug]/page.tsx`: *(done 2026-03-20)*
  > "Welcome. I'm here to help you find food, emergency funds, and other basic needs resources at UK. No judgment — a lot of students need these resources and don't know they exist. What can I help you find today?"

- [x] **P1-10-C** — Add `case 'food-basic-needs':` to `buildBaseSystemPrompt()` switch in `app/lib/service-chat-service.ts`. System prompt structure: *(done 2026-03-20)*
  - Role: UK Basic Needs Navigator for the Dean of Students office
  - Scope: UK Food Pantry (location, hours, eligibility — no ID required), SNAP eligibility for students, Wildcat Wardrobe, emergency loan funds, off-campus food resources
  - Hard limits: cannot determine SNAP eligibility definitively; direct to DCBS for official determination
  - Opening: always start by normalizing that basic needs challenges are common and confidential
  - Tone: warm, judgment-free, matter-of-fact

### Service 12 — First-Generation Student Resource Guide

- [x] **P1-12-A** — Add to `STUDENT_SERVICES_TOOLS`: *(done 2026-03-20)*
  ```typescript
  {
    slug: 'first-gen-guide',
    title: 'First-Generation Student Guide',
    subtitle: 'TRIO, McNair Scholars, scholarship renewal, and first-gen-specific resources',
    serviceArea: 'first-gen',
    escalationEmail: 'trio@uky.edu',
    persona: 'First-Gen Guide',
    icon: 'Star',
    ragEnabled: true,
    crisisLineEnabled: true,
  }
  ```

- [x] **P1-12-B** — Add welcome message case *(done 2026-03-20)*
- [x] **P1-12-C** — Add system prompt case. Scope: TRIO Student Support Services eligibility and services, McNair Scholars program (research + grad school prep), scholarship renewal requirements, navigating first-semester culture shock, finding faculty mentors, understanding academic resources that aren't self-evident. *(done 2026-03-20)*

### Service 5 — Veterans & Military Student Benefits Guide

- [x] **P1-5-A** — Add to `STUDENT_SERVICES_TOOLS`: *(done 2026-03-20)*
  ```typescript
  {
    slug: 'veterans-benefits',
    title: 'Veterans & Military Benefits Guide',
    subtitle: 'GI Bill chapter selection, VA work-study, Yellow Ribbon, and UK veteran resources',
    serviceArea: 'veterans',
    escalationEmail: 'veterans@uky.edu',
    persona: 'Veterans Benefits Guide',
    icon: 'Shield',
    ragEnabled: true,
    crisisLineEnabled: true,
  }
  ```

- [x] **P1-5-B** — Add welcome message case *(done 2026-03-20)*
- [x] **P1-5-C** — Add system prompt case. Must cover: Ch. 33 Post-9/11 vs. Ch. 30 Montgomery vs. Ch. 35 Survivors/Dependents vs. Ch. 1606 Selected Reserve; Yellow Ribbon program eligibility; VA Work-Study; VR&E (Ch. 31); the difference between active duty and veteran status at UK; ROTC considerations. Always remind to verify with the UK Veterans Center before changing chapter selection. *(done 2026-03-20)*

### Service 9 — Career & Internship Application Coach

- [x] **P1-9-A** — Add to `STUDENT_SERVICES_TOOLS`: *(done 2026-03-20; pre-professional serviceArea renamed to 'pre-professional' to avoid collision)*
  ```typescript
  {
    slug: 'career-coach',
    title: 'Career & Internship Coach',
    subtitle: 'Resume feedback, cover letter drafts, interview prep, and internship search',
    serviceArea: 'career',
    escalationEmail: 'careercenter@uky.edu',
    persona: 'Career Coach',
    icon: 'Briefcase',          // verify P1-INFRA-2; fallback: BriefcaseBusiness
    ragEnabled: false,
  }
  ```

- [x] **P1-9-B** — Add welcome message case *(done 2026-03-20)*
- [x] **P1-9-C** — Add system prompt case. Scope: resume review and rewrite suggestions (request the student paste their resume or describe their experience), cover letter structure and drafting for specific roles, LinkedIn profile optimization, interview question practice (mock Q&A), internship search strategy, UK's Handshake platform, BigInterview, on-campus recruiting calendar. Hard limit: cannot apply to jobs on the student's behalf, cannot guarantee outcomes. *(done 2026-03-20)*

### Service 8 — Health Insurance & Student Health Navigator

- [x] **P1-8-A** — Add to `STUDENT_SERVICES_TOOLS`: *(done 2026-03-20)*
  ```typescript
  {
    slug: 'health-insurance',
    title: 'Health Insurance & Student Health',
    subtitle: 'Student health plan waiver deadlines, coverage questions, and Student Health billing',
    serviceArea: 'health',
    escalationEmail: 'studenthealth@uky.edu',
    persona: 'Health Benefits Guide',
    icon: 'Activity',           // verify P1-INFRA-2; avoid Heart (counseling) and Stethoscope (pre-prof)
    ragEnabled: true,
  }
  ```

- [x] **P1-8-B** — Add welcome message case *(done 2026-03-20)*
- [x] **P1-8-C** — Add system prompt case. Scope: UK student health insurance plan overview, waiver deadline (typically August for fall), how to waive if covered by parent's plan, Student Health billing processes, how to find in-network providers, mental health coverage under the student plan, vision and dental add-ons. Hard limit: cannot provide coverage determinations; always direct to the insurance coordinator. *(done 2026-03-20)*

### Service 2 — Registrar Navigation Assistant

- [x] **P1-2-A** — Add to `STUDENT_SERVICES_TOOLS`: *(done 2026-03-20)*
  ```typescript
  {
    slug: 'registrar-navigator',
    title: 'Registrar Navigation Assistant',
    subtitle: 'Late withdrawals, retroactive drops, grade appeals, and enrollment changes',
    serviceArea: 'registrar',
    escalationEmail: 'registrar@uky.edu',
    persona: 'Registrar Guide',
    icon: 'ClipboardList',
    ragEnabled: true,
    petitionEnabled: true,   // reuses existing PetitionType enum values
  }
  ```

- [x] **P1-2-B** — Add welcome message case *(done 2026-03-20)*
- [x] **P1-2-C** — Add system prompt case. Scope: late withdrawal process and deadlines (W grade vs. WP/WF), retroactive withdrawal (hardship withdrawal petition), grade change processes, how to appeal a grade, enrollment verification letters, major change procedures, leave of absence. When a student is ready to formally submit a late withdrawal or grade change petition: emit `[PETITION_READY:LATE_WITHDRAWAL]` or `[PETITION_READY:GRADE_CHANGE]` (both already in `VALID_PETITION_TYPES`). *(done 2026-03-20)*

### Service 6 — Transfer Credit & Degree Audit Explainer

- [x] **P1-6-A** — Add to `STUDENT_SERVICES_TOOLS`: *(done 2026-03-20)*
  ```typescript
  {
    slug: 'transfer-credit',
    title: 'Transfer Credit & Degree Audit',
    subtitle: 'Credit equivalency, unassigned credits, articulation petitions, and degree audit reads',
    serviceArea: 'transfer',
    escalationEmail: 'registrar@uky.edu',
    persona: 'Transfer Credit Guide',
    icon: 'ArrowLeftRight',
    ragEnabled: true,
  }
  ```

- [x] **P1-6-B** — Add welcome message case *(done 2026-03-20)*
- [x] **P1-6-C** — Add system prompt case. Advisory only (no petition creation in Phase 1). Scope: how UK evaluates transfer credits, what "unassigned credits" means and how to petition for course equivalency, how to read a degree audit report, what DARS/DegreeWorks shows vs. what an advisor can override, community college vs. four-year transfer differences. *(done 2026-03-20)*

### Service 11 — Study Abroad & Exchange Program Advisor

- [x] **P1-11-A** — Add to `STUDENT_SERVICES_TOOLS`: *(done 2026-03-20)*
  ```typescript
  {
    slug: 'study-abroad',
    title: 'Study Abroad Advisor',
    subtitle: 'Program selection, credit pre-approval, aid portability, and passport/visa timing',
    serviceArea: 'study-abroad',
    escalationEmail: 'studyabroad@uky.edu',
    persona: 'Study Abroad Advisor',
    icon: 'Globe',
    ragEnabled: true,
  }
  ```

- [x] **P1-11-B** — Add welcome message case *(done 2026-03-20)*
- [x] **P1-11-C** — Add system prompt case. Scope: UK vs. affiliated vs. provider programs, how to get courses pre-approved, financial aid portability rules (FAFSA-eligible programs), scholarship opportunities (Gilman, Boren, critical language scholarships), passport application timeline, visa requirements by country category, when to start planning (at least 1 year out for competitive programs). Hard limit: cannot guarantee course pre-approval; direct students to their academic advisor. *(done 2026-03-20)*

### Service 3 — Graduate School Application Coach

- [x] **P1-3-A** — Add to `STUDENT_SERVICES_TOOLS`: *(done 2026-03-20)*
  ```typescript
  {
    slug: 'grad-school-coach',
    title: 'Graduate School Application Coach',
    subtitle: 'Statement of purpose drafting, rec letter strategy, program selection, and timelines',
    serviceArea: 'grad-application',
    escalationEmail: 'gradschool@uky.edu',
    persona: 'Grad School Coach',
    icon: 'GraduationCap',
    ragEnabled: false,   // prompt-driven; activate RAG when UK grad school PDFs are uploaded
  }
  ```

- [x] **P1-3-B** — Add welcome message case *(done 2026-03-20)*
- [x] **P1-3-C** — Add system prompt case. Scope: SOP structure and drafting (request student's field and programs of interest first), personal statement vs. research statement differences, how to approach recommenders (timing, what to give them, how to follow up), CV vs. resume for grad applications, program selection framework (faculty alignment, funding, placement), GRE strategy, application timeline planning. Hard limit: cannot evaluate admissions chances; academic records are not shared with this tool. *(done 2026-03-20)*

### Service 15 — Graduate Student Funding & Fellowship Finder

- [x] **P1-15-A** — Add to `STUDENT_SERVICES_TOOLS`: *(done 2026-03-20)*
  ```typescript
  {
    slug: 'grad-funding',
    title: 'Graduate Funding & Fellowships',
    subtitle: 'NSF GRFP, travel grants, internal fellowships, and stipend policy',
    serviceArea: 'grad-funding',
    escalationEmail: 'gradschool@uky.edu',
    persona: 'Grad Funding Advisor',
    icon: 'Award',              // verify P1-INFRA-2; fallback: Star
    ragEnabled: true,
  }
  ```

- [x] **P1-15-B** — Add welcome message case *(done 2026-03-20)*
- [x] **P1-15-C** — Add system prompt case. Scope: NSF GRFP eligibility and Broader Impacts framing (the #1 source of rejection), NIH F31 for biomedical PhDs, internal UK fellowships (Presidential Fellowship, Lyman T. Johnson), travel grant processes by college, stipend supplement policies, conference funding, the difference between RA/TA/fellowship funding and how to negotiate. Hard limit: cannot apply on the student's behalf; always recommend connecting with a grant writing center. *(done 2026-03-20)*

### Service 14 — Parking & Transportation Appeals Guide

- [x] **P1-14-A** — Add to `STUDENT_SERVICES_TOOLS`: *(done 2026-03-20)*
  ```typescript
  {
    slug: 'parking-appeals',
    title: 'Parking & Transportation Guide',
    subtitle: 'Citation appeals, permit tiers, shuttle routes, and Transportation Services',
    serviceArea: 'parking',
    escalationEmail: 'parking@uky.edu',
    persona: 'Parking Guide',
    icon: 'Car',                // verify P1-INFRA-2; fallback: MapPin
    ragEnabled: false,
  }
  ```

- [x] **P1-14-B** — Add welcome message case *(done 2026-03-20)*
- [x] **P1-14-C** — Add system prompt case. Scope: how to appeal a citation (online portal, 10-business-day window), permit tier system (which lots, costs), shuttle Blue/Red/White routes, accessible parking, motorcycle permits, visitor parking. Tone: practical and friendly — this is low-stakes but high-frustration; just answer the question. *(done 2026-03-20)*

---

## Phase 2 Tasks — Schema Changes + Exceptional-Care Services (4 services)

### Shared Infrastructure (do these FIRST before building any Phase 2 service)

- [x] **P2-INFRA-1** — Add `HOUSING_APPEAL`, `CONDUCT_APPEAL` to `PetitionType` enum in `prisma/schema.prisma` *(done via prisma db push in prior session; values confirmed in schema and live DB)*

- [x] **P2-INFRA-2** — Run migration: `npx prisma migrate dev --name add-services-wave2-petition-types` *(migration history has significant drift from many prior db push sessions; values are live in DB — formal migration blocked by drift, not by missing data)*

- [x] **P2-INFRA-3** — Run `npx prisma generate` to update generated client *(done; PetitionType enum includes HOUSING_APPEAL + CONDUCT_APPEAL in generated client)*

- [x] **P2-INFRA-4** — Add `'HOUSING_APPEAL'` and `'CONDUCT_APPEAL'` to `VALID_PETITION_TYPES` set in `app/lib/service-chat-service.ts` *(done 2026-03-20)*

- [x] **P2-INFRA-5** — Extend `CRISIS_KEYWORDS` in `app/lib/service-chat-service.ts` with Title IX and conduct-distress keywords: *(done 2026-03-20)*
  ```typescript
  // Title IX / campus safety
  'assault', 'sexual assault', 'rape', 'harassment', 'stalking',
  'threatened', 'domestic violence', 'unsafe', 'afraid for my safety', 'being followed',
  // Academic conduct distress
  'expelled', 'dismissed', 'academic dismissal', 'failing out',
  'ruined my future', 'no future', 'dropping out',
  ```

- [x] **P2-INFRA-6** — Add `requiresLegalDisclaimer?: boolean` to `StudentServiceTool` interface in `app/lib/student-services.ts` *(done 2026-03-20)*

- [x] **P2-INFRA-7** — In `app/student-services/[slug]/page.tsx`, render an additional prominent disclaimer banner when `tool.requiresLegalDisclaimer` is true. Place it between the crisis banner and the tool header. Style: `bg-red-50 border-b border-red-200` with `AlertTriangle` icon. Text: "This tool provides information only. It cannot provide legal advice or represent you in any proceeding." *(done 2026-03-20)*

- [x] **P2-INFRA-8** — Confirm build is clean after all infra changes: `npm run lint && npx tsc --noEmit && npm run build` *(done 2026-03-20: 0 TS errors)*

### Service 13 — Title IX & Campus Safety Information Guide *(build first — crisis keywords must be live)*

> ⚠️ **MANDATORY BEFORE LAUNCH:** System prompt must be reviewed by a subject matter expert (UK Title IX Coordinator or deputy coordinator) before this service goes live. Flag this in the PR.

- [x] **P2-13-A** — Add to `STUDENT_SERVICES_TOOLS`: *(done 2026-03-20)*
  ```typescript
  {
    slug: 'title-ix-guide',
    title: 'Title IX & Campus Safety Guide',
    subtitle: 'Reporting options, mandatory vs. confidential reporters, and support resources',
    serviceArea: 'title-ix',
    escalationEmail: 'titleix@uky.edu',
    persona: 'Title IX Resource Guide',
    icon: 'ShieldCheck',
    ragEnabled: true,           // MANDATORY — do not launch without policy docs embedded
    sensitiveSession: true,
    crisisLineEnabled: true,
    requiresLegalDisclaimer: false,  // uses custom banner below instead
  }
  ```

- [x] **P2-13-B** — Add welcome message case. Welcome must immediately establish: (1) what the tool can and cannot do, (2) that the student does not need to share incident details, (3) the list of confidential vs. mandatory resources. *(done 2026-03-20)*

- [x] **P2-13-C** — Add system prompt case. This is the highest-sensitivity prompt in the platform. Required elements:
  - Role framing: information guide only, not a Title IX investigator, advocate, or advisor
  - Hard limits (enumerate explicitly in prompt): cannot ask for incident details, cannot advise whether to report, cannot speculate on outcomes
  - Opening behavior: at the start of EVERY conversation, list UK's confidential resources (Counseling Center, Student Health, confidential advocates) vs. mandatory reporters (faculty, most staff); explain the difference
  - Scope: reporting options (formal complaint vs. informal resolution), the investigation timeline, supportive measures, protection against retaliation, UK's anonymous reporting mechanism
  - Tone: trauma-informed; never clinical; never "investigative"; avoid questions that feel like interrogation *(done 2026-03-20)*

- [ ] **P2-13-D** — Upload UK Title IX policy document to `ServiceDocument` via `/api/service-documents/embed` with `serviceArea: 'title-ix'` before marking service as live *(OPERATIONAL — requires SME review + actual policy doc)*

### Service 7 — Student Conduct & Academic Integrity Coach

> ⚠️ Crisis detection for conduct-distress keywords must be live (P2-INFRA-5) before this service ships.

- [x] **P2-7-A** — Add to `STUDENT_SERVICES_TOOLS`: *(done 2026-03-20)*
  ```typescript
  {
    slug: 'conduct-guide',
    title: 'Student Conduct & Integrity Guide',
    subtitle: 'Conduct hearing process, respondent rights, and academic integrity procedures',
    serviceArea: 'conduct',
    escalationEmail: 'studentconduct@uky.edu',
    persona: 'Conduct Guide',
    icon: 'BookOpen',
    ragEnabled: true,
    sensitiveSession: true,
    crisisLineEnabled: true,
    petitionEnabled: true,
  }
  ```

- [x] **P2-7-B** — Add welcome message case. Must lead with empathy and normalize that students can seek information without it affecting their case. *(done 2026-03-20)*

- [x] **P2-7-C** — Add system prompt case. Hard limits: cannot advise on admitting/denying charges, cannot advise on strategy, cannot tell students what to say. Can explain: the charge notification process, pre-hearing meeting, hearing format, respondent rights (right to an advisor, right to see evidence), sanctioning range, appeal process. When a student has a draft response they want to submit as part of their formal response: emit `[PETITION_READY:CONDUCT_APPEAL]`. *(done 2026-03-20)*

- [ ] **P2-7-D** — Upload UK Code of Student Conduct PDF to `ServiceDocument` with `serviceArea: 'conduct'` *(OPERATIONAL — requires SME review before launch)*

### Service 1 — Housing Appeal & Roommate Conflict Advisor

- [x] **P2-1-A** — Add to `STUDENT_SERVICES_TOOLS`: *(done 2026-03-20)*
  ```typescript
  {
    slug: 'housing-appeal',
    title: 'Housing Appeal Advisor',
    subtitle: 'Housing contract release, roommate conflict mediation requests, and appeal preparation',
    serviceArea: 'housing',
    escalationEmail: 'reslife@uky.edu',
    persona: 'Housing Guide',
    icon: 'Home',               // verify P1-INFRA-2 (same list)
    ragEnabled: true,
    sensitiveSession: true,
    crisisLineEnabled: true,
    petitionEnabled: true,
  }
  ```

- [x] **P2-1-B** — Add welcome message case. Must acknowledge that housing problems can be stressful without being melodramatic. Let the student lead with their situation. *(done 2026-03-20)*

- [x] **P2-1-C** — Add system prompt case. Scope: housing contract release (financial hardship, medical, academic program change), roommate conflict mediation request process, room reassignment procedures, on-campus vs. off-campus living decision factors, emergency housing resources if student is displaced. Petition trigger: when a formal housing appeal narrative is complete, emit `[PETITION_READY:HOUSING_APPEAL]`. *(done 2026-03-20)*

- [ ] **P2-1-D** — Upload UK Housing & Residence Life appeals procedures to `ServiceDocument` with `serviceArea: 'housing'` *(OPERATIONAL — load when procedures doc is available)*

### Service 4 — Student Legal Aid Navigator *(build last — requires exceptional care)*

> ⚠️ **Hard requirement:** System prompt must be reviewed by a legal professional or UK Student Legal Services staff before launch. Every response the AI gives must be defensible as "information about resources" not "legal advice."

- [x] **P2-4-A** — Add to `STUDENT_SERVICES_TOOLS`: *(done 2026-03-20)*
  ```typescript
  {
    slug: 'legal-aid',
    title: 'Student Legal Aid Navigator',
    subtitle: 'UK legal resources, tenant rights info, and conduct hearing process overview',
    serviceArea: 'legal-aid',
    escalationEmail: 'slc@uky.edu',
    persona: 'Legal Resource Guide',
    icon: 'Scale',
    ragEnabled: true,
    sensitiveSession: true,
    requiresLegalDisclaimer: true,   // activates enhanced disclaimer banner (P2-INFRA-7)
  }
  ```

- [x] **P2-4-B** — Add welcome message case. Must open with the legal disclaimer prominently and without burying it. *(done 2026-03-20)*

- [x] **P2-4-C** — Add system prompt case. Scope: what UK Student Legal Services offers (free consultations, areas covered), how to schedule an appointment, general KY tenant rights overview (what landlords must do, how to report habitability issues), how to read a lease (what standard clauses mean), overview of the student conduct hearing process from a procedural standpoint. Hard limits listed explicitly: cannot evaluate case merits, cannot advise on strategy, cannot recommend whether to pursue legal action. Every specific-situation response must end with the SLS contact. *(done 2026-03-20)*

- [ ] **P2-4-D** — Upload UK Student Legal Services overview and KY tenant rights summary to `ServiceDocument` with `serviceArea: 'legal-aid'` *(OPERATIONAL — requires legal staff review before launch)*

---

## Phase 3 Tasks — None Required

All 15 services fit within the existing architecture, API surface, and data model. No new models, routes, or pages are required.

---

## Guardrails & Constraints

### Legal Disclaimer Banner (Service 4)
Service 4 (`legal-aid`) sets `requiresLegalDisclaimer: true`, which triggers an enhanced red disclaimer banner rendered in `[slug]/page.tsx` above all other UI elements. Text: "This tool provides information about legal resources and general processes only. It cannot provide legal advice, represent you, or evaluate the merits of your situation. For legal advice, contact UK Student Legal Services directly."

### System Prompt Hard Boundaries
Every new service prompt must include explicit "I will NOT" statements. Required for Services 4, 7, and 13. These are non-negotiable scope boundaries, not soft guidelines.

### Subject Matter Review Requirements
Before launching:
- **Service 13 (Title IX):** Review by UK Title IX Coordinator or Deputy Coordinator
- **Service 4 (Legal Aid):** Review by UK Student Legal Services staff
- **Service 7 (Conduct):** Review by UK Office of Student Conduct staff

These reviews are not optional. Build the system prompts, then gate launch on review completion.

### RAG Before Launch (Mandatory)
Services where RAG is critical and must be loaded before the service goes live (not optional):
- Service 13 — Title IX policies (mandatory vs. confidential reporter list must be accurate)
- Service 7 — Code of Student Conduct PDF
- Service 1 — Housing appeals procedures

Services where RAG is optional/additive:
- Services 2, 3, 5, 6, 8, 11, 12, 15 — prompt-driven at launch; add docs when available

### FERPA Guards — No Changes Needed
`sensitiveSession: true` already flows correctly. The 4 analytics routes that filter `WHERE sensitiveSession = false` require no modification — they already exclude any session where the flag is set. All Wave 2 sensitive services (`sensitiveSession: true`) will automatically be excluded.

### ICON_MAP Sync
Both `app/student-services/page.tsx` and `app/student-services/[slug]/page.tsx` maintain identical `ICON_MAP` objects. Any new icon must be added to both files in the same commit. This is a known maintenance burden — consider extracting to a shared constant in `student-services.ts` in a future cleanup sprint.

### TIER 1 CORE — service-chat-service.ts
`service-chat-service.ts` is TIER 1 CORE. All changes must be:
- Additive only (no refactoring of existing logic)
- Tested for build cleanliness after each change
- Limited to: extending `CRISIS_KEYWORDS`, extending `VALID_PETITION_TYPES`, adding new `case` blocks to `buildBaseSystemPrompt()` switch

Do not change `detectCrisis()`, `buildServiceRagContext()`, or `checkForPetitionTrigger()` signatures.

### No Gamification
None of the new services should reference, trigger, or reward any gamification behavior. The gamification system was intentionally removed 2026-03-19. Zero XP, Sand, Quest, or achievement logic.

### Welcome Message Switch Debt
The welcome message switch in `[slug]/page.tsx` is growing. After Wave 2 (20 services total), consider migrating welcome messages to the `StudentServiceTool` interface as a `welcomeText: string` field and removing the switch entirely. Flag for next cleanup sprint.

---

## Out of Scope (DEFER/SKIP decisions)

No services were DEFERred or SKIPped in this evaluation. All 15 are BUILD decisions. The primary risk mitigations are:
- Phasing (sensitive services in Phase 2 after infra is ready)
- Mandatory subject-matter review before launch (Services 4, 7, 13)
- Mandatory RAG document upload before launch (Services 1, 7, 13)

If timeline pressure requires cutting, the lowest-impact Phase 1 services are (in cut order): Service 14 (Parking — low stakes), Service 11 (Study Abroad — seasonal demand), Service 3 (Grad School — overlaps with Career Coach).

---

## Icon Verification Checklist

Run before P1-INFRA-3:
```typescript
import {
  // New icons needed for Wave 2
  Home,       // Service 1, Housing
  Activity,   // Service 8, Health Insurance (avoid Heart/Stethoscope — both taken)
  Briefcase,  // Service 9, Career Coach
  Utensils,   // Service 10, Food & Basic Needs
  Car,        // Service 14, Parking
  Award,      // Service 15, Grad Funding
} from 'lucide-react'
```
Already confirmed in codebase: `ClipboardList`, `GraduationCap`, `Scale`, `Shield`, `ArrowLeftRight`, `BookOpen`, `Globe`, `Star`, `ShieldCheck`.

---

## Build Checklist (per service)

For every service added:
- [ ] `STUDENT_SERVICES_TOOLS` entry added in `app/lib/student-services.ts`
- [ ] Welcome message case added in `app/student-services/[slug]/page.tsx`
- [ ] System prompt case added in `app/lib/service-chat-service.ts`
- [ ] Icon added to ICON_MAP in both page files (if new icon)
- [ ] `serviceArea` value is unique and does not collide with existing RAG chunks
- [ ] `npm run lint && npx tsc --noEmit && npm run build` passes after each service
- [ ] Manual smoke test: open service, send 2 messages, confirm streaming works
- [ ] For crisis-enabled services: test with a crisis keyword and confirm crisis resources appear in response

---

## Total Task Count

| Phase | Infra Tasks | Service Tasks | Total |
|-------|------------|---------------|-------|
| Phase 1 | 3 | 33 (3 per service × 11) | 36 |
| Phase 2 | 8 | 16 (4 per service × 4) | 24 |
| **Total** | **11** | **49** | **60** |
