# ABPM Clinical Informatics Course — Sprint Runbook

A self-contained execution guide so each remaining sprint can be run in a fresh Claude Code instance without prior conversation context. Hand the relevant sprint section to a new instance verbatim.

---

## 0. Universal context (read first, every instance)

**What this is.** A board-prep course for the ABPM Clinical Informatics subspecialty exam, authored as real content to stress-test The-Sandbox learning platform. Course lives at `Material/courses/abpm-clinical-informatics/`. Mirrors the structure of `Material/courses/money-machines-markets/` exactly.

**Course slug:** `abpm-clinical-informatics`. **8 modules.** Sprints 0–5 are complete. Sprints 6–9 remain.

**Reference files to read before authoring anything** (open these every instance — they define the house style and the file shapes):
- `Material/courses/abpm-clinical-informatics/course.json`
- `Material/courses/abpm-clinical-informatics/syllabus.md`
- `Material/courses/abpm-clinical-informatics/rubrics/written-thesis.json`
- `Material/courses/abpm-clinical-informatics/rubrics/discussion-quality.json`
- `Material/courses/abpm-clinical-informatics/rubrics/voice-defense.json`
- `Material/courses/abpm-clinical-informatics/policies/policies.json`
- A complete prior module as the canonical example (recommend Module 5):
  - `Material/courses/abpm-clinical-informatics/modules/05-workflow-and-human-factors/module.json`
  - `Material/courses/abpm-clinical-informatics/modules/05-workflow-and-human-factors/lessons/03-sittig-singh-sociotechnical.md` (lesson shape + frontmatter)
  - `Material/courses/abpm-clinical-informatics/modules/05-workflow-and-human-factors/mastery-gate.json` (question shape)
  - `Material/courses/abpm-clinical-informatics/modules/05-workflow-and-human-factors/assignment.md` (assignment shape)
  - `Material/courses/abpm-clinical-informatics/modules/05-workflow-and-human-factors/concepts.json` (concept shape)
- For voice sessions: `Material/courses/abpm-clinical-informatics/modules/04-clinical-decision-support/voice-session.json`
- For study groups: `Material/courses/abpm-clinical-informatics/modules/02-clinical-data-standards/study-group-brief.md`
- For discussions: `Material/courses/abpm-clinical-informatics/modules/05-workflow-and-human-factors/discussion-prompts.md`

**House style — non-negotiable.**
- Lesson body sections in this order: **Reading** → **Concrete example** → **Uncomfortable question**. Match tone of Module 5 lessons exactly: opinionated-but-grounded, second-person to the candidate, explicit "the boards test X" callouts, named papers and authors where canonical, no emojis, no corporate hedging.
- Lesson length: ~30–45 minutes, ~1500–2500 words of body. Frontmatter required (id, title, order, estimatedMinutes, learningOutcomes, concepts).
- Mastery gates: 15 questions, mostly MCQ (4 options), 2–3 short-answer. **Every rationale must explain why wrong answers are wrong, not just why the right answer is right.** The wrong-answer rationales are the teaching surface.
- Capstones: graded by `written-thesis` rubric. 800–1600 words depending on module weight. Always include: scenario, what it must do, what it must NOT do, grading rubric reference, submission instructions, "what this is for" closing note. Always ban AI drafting (per AI Use Policy) and require PHI abstraction.
- Concepts file: one entry per concept tag used in the module's lessons + mastery gate. kebab-case IDs. Stable across modules — reuse IDs from prior modules where the concept already exists.
- Update `module.json` `lessons: []` array at the very end of the sprint with the lesson IDs in order.

**File shapes — copy from a prior module if unsure.** Do not invent new shapes. The platform reads these files; structural drift will break rendering.

**Cross-module references.** Each new module should reference prior modules where relevant (e.g., "the Sittig-Singh model from Module 5," "Friedman's theorem from Module 1," "the Five Rights from Module 4"). The cross-references reinforce the course's coherence and exercise the platform's concept-bridging surface.

**PHI policy.** Every assignment and discussion that touches a clinical case must remind the candidate that PHI must be abstracted. The PHI policy is at `policies/phi-handling.md` and is gated on `first-discussion`.

**Do NOT touch.** Sprints 0–5 files, the course root files (course.json, syllabus.md, reading-list.md), the rubrics, the policies. Each sprint adds files inside ONE module directory.

**Workflow per sprint.**
1. Read this runbook section + the universal context.
2. Read the canonical example files listed above.
3. Read the module.json stub for the module you are filling out — it has the title, summary, and learning outcomes already.
4. Use TodoWrite to track sub-tasks (one per lesson, plus mastery-gate, assignment, any extras, concepts, module.json update).
5. Write each file with the Write tool. Do not batch — write one file at a time so each is reviewable.
6. End with the module.json edit to populate `lessons: []`.
7. Report what was written and what the troubleshooting target is.

---

## Sprint 6 — Module 06: Quality, Safety, and Analytics

**Module directory:** `Material/courses/abpm-clinical-informatics/modules/06-quality-safety-analytics/`

**Module stub (already exists):** `module.json` with title "Quality, Safety, and Analytics", 5 lessons planned, prereq Module 03. Read it before authoring.

**Files to produce** (in this order):

1. `lessons/01-measure-design-and-specification.md` — what a clinical quality measure actually is (numerator, denominator, exclusions, exceptions, measurement period). NQF, CMS measures, eCQMs (electronic clinical quality measures, written in CQL — cross-reference Module 4 lesson 5). Process measures vs outcome measures vs balancing measures with clinical examples. Donabedian's structure-process-outcome trio (memorize). The boards test measure-spec literacy directly.

2. `lessons/02-registries-vs-warehouses.md` — clinical registries (purpose-built case-finding for a specific condition), data warehouses (general-purpose analytical store fed from the CDR — cross-reference Module 3), data marts, data lakes. When to build each. Governance, freshness, fitness-for-use. The boards distinguish registries from warehouses directly.

3. `lessons/03-dashboards-and-visualization.md` — quality dashboards, real-time vs near-real-time, the difference between a dashboard for executives and a dashboard for frontline teams, how to critique a dashboard for both statistical validity and frontline usability (cross-reference Module 5 usability heuristics). Tufte-style data-density principles where relevant. Common dashboard failure modes (denominator drift, vanity metrics, missing context).

4. `lessons/04-statistical-traps.md` — the high-yield analytic traps the boards quietly test: regression to the mean, Simpson's paradox, denominator drift, selection bias, immortal-time bias, confounding by indication, base-rate neglect, multiple-comparisons inflation. Each with a clinical example. Sensitivity/specificity/PPV/NPV review with the canonical low-prevalence trap. The single most-tested concept area in the analytics half of the boards.

5. `lessons/05-population-health-and-public-health-reporting.md` — population health management, risk stratification, case identification, panel management. Public health reporting (cross-reference Module 1 — public health informatics). Syndromic surveillance, electronic case reporting (eCR), reportable conditions, state immunization information systems. The Cures-Act-era push toward standardized public health reporting via FHIR.

6. `mastery-gate.json` — 15 questions. Mix of measure-spec literacy (numerator/denominator/exclusions), registry-vs-warehouse choice, dashboard critique, statistical-trap recognition (especially Simpson's paradox and immortal-time bias — these are board favorites), and population-health/public-health reporting. Include 2–3 short-answer questions. Every rationale must teach.

7. `assignment.md` — 1,000–1,400 word capstone: critique a real or published quality dashboard from the candidate's institution (or a published example). Apply the lessons from this module: measure spec accuracy, statistical validity, frontline usability, governance, denominator stability over time. Graded by written-thesis rubric. Standard PHI/AI bans.

8. `study-group-brief.md` — second study group of the course (Module 02 had the first; copy structural template). Format: synchronous drilling on measure specifications and statistical traps. Two sessions. Round 1: measure-spec speed round (read a measure description, identify numerator, denominator, exclusions). Round 2: statistical trap identification (read a stem, name the trap). Round 3: each member brings a real dashboard for the group to critique.

9. `concepts.json` — concept tags for everything in the module. Reuse `clinical-data-repository`, `cqi-and-cql`, `public-health-informatics` from prior modules. New concepts include: `clinical-quality-measure`, `numerator-denominator`, `process-vs-outcome-measure`, `balancing-measure`, `donabedian`, `ecqm`, `clinical-registry`, `data-warehouse`, `data-mart`, `data-lake`, `quality-dashboard`, `regression-to-mean`, `simpsons-paradox`, `denominator-drift`, `immortal-time-bias`, `confounding-by-indication`, `multiple-comparisons`, `population-health`, `risk-stratification`, `electronic-case-reporting`, `syndromic-surveillance`, `reportable-conditions`.

10. **Edit** `module.json` to populate the `lessons` array with the 5 lesson IDs in order.

**Troubleshooting target:** the second study group surface (does the platform handle two study groups from the same course differently?), and the cross-module concept reuse (do `clinical-data-repository` and `public-health-informatics` resolve to the prior module's definitions?).

---

## Sprint 7 — Module 07: Privacy, Security, and Policy

**Module directory:** `Material/courses/abpm-clinical-informatics/modules/07-privacy-security-policy/`

**Module stub (already exists):** prereq Module 03. 4 lessons planned. Read the stub before authoring.

**Files to produce:**

1. `lessons/01-hipaa-privacy-and-security-rules.md` — HIPAA (1996) Privacy Rule and Security Rule. Covered entities, business associates. The 18 identifiers. Minimum necessary. Permitted uses and disclosures (TPO — treatment, payment, operations). Patient rights (access, amendment, accounting of disclosures). Security Rule's three safeguard categories: administrative, physical, technical. Required vs addressable specifications. The boards test the safeguard categories directly. Memorize the structure.

2. `lessons/02-hitech-and-breach-notification.md` — HITECH Act (2009) additions on top of HIPAA. Breach notification rule — when, to whom, how fast, what to include. The 500-record threshold and HHS "Wall of Shame." Civil monetary penalty tiers. Business associate liability changes. Cross-reference Module 1 (HITECH = Meaningful Use, the same act).

3. `lessons/03-cures-act-information-blocking.md` — 21st Century Cures Act (2016). The information blocking rule. The eight exceptions: preventing harm, privacy, security, infeasibility, health IT performance, content and manner, fees, licensing. Memorize the eight names — the boards test them directly. ONC's enforcement role. What counts as information blocking and what doesn't. Cross-reference Module 3 (TEFCA, QHINs) and Module 2 (FHIR API requirements).

4. `lessons/04-security-controls-and-cyber-incidents.md` — authentication, authorization, audit, accounting (the four A's). Role-based access control. Encryption at rest and in transit. The ransomware era — Change Healthcare 2024, multiple hospital ransomware events. Downtime as a security topic (cross-reference Module 5 SAFER downtime planning). Incident response. Defense in depth as a posture rather than a technology.

5. `mastery-gate.json` — 15 questions. Heavy on the eight information-blocking exceptions (board-favorite question type), HIPAA safeguard categories, breach notification specifics, the four A's. Include scenario-style questions where the candidate has to identify whether a described situation is information blocking and which exception applies. 2–3 short answers.

6. `assignment.md` — 1,000–1,400 word capstone: a privacy/security incident response memo. Scenario: a small breach occurs at the candidate's institution (described in the assignment). The candidate writes the memo to leadership covering: what happened (per the scenario), regulatory obligations under HIPAA/HITECH/Cures, breach notification requirements, immediate response steps, longer-term remediation, and an honest assessment of whether the institution will face penalties. Graded by written-thesis rubric.

7. `discussion-prompts.md` — third discussion thread set. Three threads. Suggested topics: (1) information blocking — pick a real or hypothetical scenario where a clinician restricted data sharing for a reason they considered legitimate, and argue whether it counts as information blocking under one of the eight exceptions; (2) the HIPAA-vs-21st-Century-Cures tension (privacy and access pull against each other); (3) ransomware preparedness — what your institution actually does and what it should do.

8. `concepts.json` — new concepts: `hipaa-privacy-rule`, `hipaa-security-rule`, `covered-entity`, `business-associate`, `phi-eighteen-identifiers`, `minimum-necessary`, `tpo-treatment-payment-operations`, `administrative-safeguards`, `physical-safeguards`, `technical-safeguards`, `required-vs-addressable`, `hitech-breach-notification`, `wall-of-shame`, `cmp-tiers`, `cures-act`, `information-blocking`, `eight-exceptions`, `preventing-harm-exception`, `privacy-exception`, `security-exception`, `infeasibility-exception`, `four-As`, `rbac`, `encryption-at-rest`, `encryption-in-transit`, `ransomware`, `change-healthcare-2024`. Reuse `phi-handling`, `meaningful-use`, `hitech-act`, `cures-act-history`, `tefca`, `safer-guides`, `downtime-planning` from prior modules.

9. **Edit** `module.json` to populate `lessons` array.

**Troubleshooting target:** the third discussion-prompts surface (does the platform aggregate discussion threads across modules?), and the policy-acknowledgment gate from Sprint 0 — the PHI policy should be the one gating these discussion threads.

---

## Sprint 8 — Module 08: Leadership and Change Management

**Module directory:** `Material/courses/abpm-clinical-informatics/modules/08-leadership-change-management/`

**Module stub (already exists):** prereqs Modules 05 AND 06 (only module with two prereqs — exercises the prereq-graph surface). 4 lessons planned.

**Files to produce:**

1. `lessons/01-project-management-for-informaticists.md` — PM frameworks (PMBOK, Agile, Scrum, Kanban), when to use each in informatics work. Scope, schedule, budget, quality, risk, stakeholders, communications. Why most clinical informatics projects are closer to product management than classical PM. The Standish Group failure rate stats and what they mean for IT projects in healthcare.

2. `lessons/02-governance-and-decision-rights.md` — informatics governance structures. CMIO/CNIO/CRIO roles (cross-reference Module 1). CDS committee, EHR steering committee, clinical content committees. RACI matrices. Decision rights: who decides, who is consulted, who is informed. The pattern that clarity of decision rights matters more than the exact org chart (cross-reference Module 1 lesson 5).

3. `lessons/03-roi-and-business-cases.md` — building an ROI case for an informatics intervention without lying with numbers. Hard vs soft benefits. Direct vs avoided costs. Time horizons. The honest acknowledgment that most informatics ROI calculations are partial fictions and what to do about it. The TCO concept from Module 3 lesson 5 returns here.

4. `lessons/04-change-management-and-ethics.md` — Kotter's 8 steps, ADKAR, Lewin's three stages (unfreeze-change-refreeze). Pick the right framework for the situation. The ethical responsibilities of an informaticist who is also a clinician — patient welfare first, professional obligations to colleagues, the obligation to tell leadership the truth even when inconvenient. Cross-reference Friedman's theorem (Module 1) one more time as the closing frame.

5. `mastery-gate.json` — 15 questions. Project management framework recognition, governance structure trade-offs, ROI gotchas, change-management framework selection (Kotter vs ADKAR vs Lewin), and ethics scenarios. 2–3 short answers.

6. `assignment.md` — 1,200–1,600 word capstone: a change-management plan for a real or hypothetical EHR-related initiative at the candidate's institution. Must select and defend a named change-management framework (Kotter, ADKAR, or Lewin), apply it concretely, name the governance structure, build a rough ROI case (with explicit acknowledgment of what is hard vs soft), and address the ethics of any clinician burden the change creates. Graded by written-thesis rubric.

7. `voice-session.json` — second voice session of the course (Module 04 had the first; copy structural template). Skeptical persona: a hospital CFO who has seen "transformational" informatics projects fail before and is going to push the candidate's ROI case and change plan. 5 guided turns mapped to voice-defense rubric criteria. The candidate must hold the claim, concede honestly where the CFO is right, and articulate the ethical dimension when the CFO pushes back on clinician burden as "just the cost of change."

8. `concepts.json` — new concepts: `pmbok`, `agile-in-healthcare`, `scrum-kanban`, `standish-failure-rates`, `informatics-governance`, `cnio`, `crio`, `cds-committee`, `raci-matrix`, `decision-rights`, `roi-informatics`, `hard-vs-soft-benefits`, `tco-revisited`, `kotter-8-steps`, `adkar`, `lewin-three-stages`, `change-management`, `informatics-ethics`. Reuse `cmio-role`, `governance-structure`, `reporting-relationships`, `total-cost-of-ownership`, `friedmans-fundamental-theorem`, `sittig-singh` from prior modules.

9. **Edit** `module.json` to populate `lessons` array.

**Troubleshooting target:** the prereq graph (Module 08 requires both Module 05 AND Module 06 — does the platform enforce both?) and the second voice session surface.

---

## Sprint 9 — Final Project + Cross-Cutting Sanity Pass

**Directory:** `Material/courses/abpm-clinical-informatics/` (course root)

**Files to produce:**

1. `final-project.md` — the course final project. Scenario: design an EHR-integrated CDS module for sepsis early warning at the candidate's institution. Must include: problem statement, target population, technical architecture (cross-reference Module 3 anatomy and Module 4 CDS Hooks/FHIR/CQL stack), CDS design walked through the Five Rights (Module 4), sociotechnical design walked through the eight Sittig-Singh dimensions (Module 5), measurement and monitoring plan (Module 6), privacy/security/legal review (Module 7), governance and change management plan (Module 8), explicit Friedman's-theorem evaluation (Module 1), and a written thesis defending the design. The final project should be the longest single artifact in the course — target 2,500–3,500 words. Graded by all three rubrics (written, discussion via instructor review, voice-defense via a final defense).

2. `final-project-defense.json` — voice session for the final project defense. Skeptical persona: an external review panel (one CMIO, one CFO, one frontline physician). Multi-turn dialogue covering each module's frameworks. Graded by voice-defense rubric.

3. `concepts.json` (course-root level, NEW file) — the cross-module concept aggregator. Lists every concept ID used anywhere in the course with its canonical home module. Used by the platform's concept-bridging surface. Walk every module's concepts.json and aggregate. Format:
   ```json
   {
     "courseId": "abpm-clinical-informatics",
     "concepts": [
       { "id": "friedmans-fundamental-theorem", "homeModule": "01-foundations-of-informatics", "appearsIn": ["01-foundations-of-informatics", "04-clinical-decision-support", "08-leadership-change-management"] },
       ...
     ]
   }
   ```

4. **Sanity pass — read-only verification** (do this BEFORE writing any of the above):
   - Walk every `module.json` and verify the `lessons` array is populated and the lesson files exist.
   - Walk every `mastery-gate.json` and verify each question has all required fields.
   - Walk every `assignment.md` and verify the rubric reference resolves to a real rubric file.
   - Walk every `concepts.json` and verify no duplicate IDs across modules with conflicting definitions (the same `friedmans-fundamental-theorem` should appear in multiple modules with consistent meaning).
   - Walk every prereq chain and verify it is acyclic.
   - Report any issues found before proceeding to the final project authoring.

5. **Edit** `course.json` if needed to ensure `finalProject: "final-project"` resolves correctly (it should already be set from Sprint 0).

**Troubleshooting target:** the cross-course concept bridge (the course-root concepts.json), the final project surface, and the multi-rubric grading wiring.

---

## End-of-runbook checklist (after Sprint 9)

- [ ] 8 modules each have: module.json (populated lessons), all lessons, mastery-gate.json, assignment.md, concepts.json
- [ ] Module-specific surfaces present: Module 02 study-group-brief, Module 04 voice-session, Module 06 study-group-brief, Module 08 voice-session
- [ ] Discussion-prompts present in Modules 01, 05, 07
- [ ] Course-root concepts.json aggregator exists
- [ ] final-project.md and final-project-defense.json exist
- [ ] All rubric references resolve
- [ ] All concept IDs resolve
- [ ] All prereq chains acyclic
- [ ] No PHI in any file
- [ ] No AI-generated prose (the content is the test of the platform AND of the author's grasp of the material)

**Course total at completion:** 38 lessons, 120 mastery-gate questions, 8 capstones, 1 final project, 2 study groups, 2 voice sessions + 1 final defense, 3 discussion sets, ~250 concepts.

---

## Notes for the human running these sprints

Each sprint is one Claude Code instance. Start the instance, paste the universal context section + the relevant sprint section, and let it work. Each sprint should take roughly the same scope of effort as Sprints 1–5 (6,000–10,000 words of lesson content + structured artifacts). If an instance runs out of context, the runbook is structured so a fresh instance can pick up by reading the existing files in the partially-completed module and inferring what is left from this document.

Sprints 6, 7, 8 are independent and can in principle run in parallel in three separate instances. Sprint 9 must run last because it depends on the others being complete for the sanity pass.

---

# V2 Expansion Sprints (10–17) — Audit-Driven

V2 plan and rationale: see `AUDIT_V2_ARCHITECTURE.md` in the course root. The V1 course is complete; V2 closes the gaps the 2026-04-07 audit identified, taking the course from 8.5/10 to 9.5/10 standalone board-prep readiness.

## Sprint 10 — CLOSED (2026-04-07)

**Scope delivered:**
- New Module 9 skeleton: `modules/09-imaging-virtual-care-pgd/` with `module.json`, `concepts.json` (14 concepts), `mastery-gate.json` (10 imaging items), `lessons/01-imaging-informatics-dicom-pacs-vna.md`.
- New M2 lesson: `modules/02-clinical-data-standards/lessons/07-umls-and-the-meta-vocabulary.md` (6 new concepts: umls-metathesaurus, umls-cui, umls-semantic-network, umls-specialist-lexicon, umls-license, ctakes-metamap). Registered in `module.json`.
- New M8 lesson: `modules/08-leadership-change-management/lessons/05-healthcare-financing-and-the-payment-environment.md` (13 new concepts including fee-for-service, value-based-care, aco, macra, qpp-mips-apm, promoting-interoperability, meaningful-use-history, hospital-vbp, hospital-readmissions-reduction, bundled-payments, capitation, ffs-vs-vbc-incentive-misalignment). Registered in `module.json`.
- Extended mastery banks: `modules/02-clinical-data-standards/mastery-gate-extended.json` (10 UMLS items) and `modules/08-leadership-change-management/mastery-gate-extended.json` (10 financing items). Both modules' `module.json` now declare `masteryGateExtended: "mastery-gate-extended.json"`.
- M9 registered in `course.json` modules array.
- Root `concepts.json` updated: `totalConcepts: 288 → 321`. 33 new concept entries appended.

**Open questions resolved (from architecture doc):**
- Q4 (mastery-gate-extended.json sibling vs single file): chose sibling pattern, declared in module.json. **Platform loader must be verified to read this field before Sprint 11.**
- Q1 (snippet-reading item type): deferred to Sprint 13 (M2 standards completion) where the first snippet items will be authored.

**Cumulative state after Sprint 10:**
- Modules: 9 (target 9). Lessons: 40 (target 60). Mastery items: 150 (target 400). Concepts: 321 (target ~360).
- Critical gaps closed: imaging (partial — L1 only), UMLS, healthcare financing.
- Critical gaps remaining: telemedicine/PGHD, AI-CDS/SaMD/HTI-1.

## Sprint 11 — Handoff Prompt

Copy everything in the fenced block below into a fresh Claude Code instance.

```
You are continuing the V2 expansion of the ABPM Clinical Informatics board-prep course. Course root: `c:/Users/tsthe2/Desktop/Educator marketplace BACKUP 2026-04-07/Material/courses/abpm-clinical-informatics/`.

CONTEXT
- The V1 course (8 modules, 38 lessons, 120 items, 288 concepts) is complete. A 2026-04-07 audit identified five critical gaps; V2 closes them across Sprints 10–17.
- Sprint 10 is complete (see SPRINT_RUNBOOK.md "Sprint 10 — CLOSED" section). It created Module 9 with one lesson (imaging informatics) plus a 10-item gate, and added the UMLS lesson to M2 and the healthcare financing lesson to M8 with 10-item extended gates each. Course now has 9 modules, 40 lessons, 150 items, 321 concepts.
- Architecture: AUDIT_V2_ARCHITECTURE.md in the course root.
- House style: read `modules/05-workflow-and-human-factors/lessons/03-sittig-singh-sociotechnical.md` and `modules/02-clinical-data-standards/lessons/07-umls-and-the-meta-vocabulary.md` (Sprint 10) as canonical examples. Lesson structure: YAML frontmatter (id, title, order, estimatedMinutes, learningOutcomes, concepts) → ## Reading (dense prose, ~80–150 lines) → ## Concrete example → ## Uncomfortable question. Mastery items: full wrong-answer rationales, ABPM-style vignettes, no telegraphing.

YOUR GOAL — execute ONLY the next two tasks below, then STOP and generate the Sprint 12 handoff prompt:

TASK 1 — Finish Module 9 lessons 2 and 3
Author two new lessons in `modules/09-imaging-virtual-care-pgd/lessons/`:
- `02-telemedicine-and-virtual-care.md` — synchronous video, store-and-forward, e-consult, RPM modalities; DEA Ryan Haight Act and post-COVID flexibilities; state licensure compacts (IMLC); telehealth parity laws; originating site rules; technical requirements (HIPAA-compliant video, BAA); failure modes.
- `03-rpm-wearables-and-pghd.md` — Remote Patient Monitoring CPT codes (99453/99454/99457/99458) at the conceptual level (no need to memorize the exact numbers — name them as a family and explain the economic logic); wearables and consumer device data quality; PGHD definition and provenance/attestation problem; integrating PGHD into the EHR; FDA general wellness vs medical device line.

Add 10 new concepts to `modules/09-imaging-virtual-care-pgd/concepts.json` covering: telemedicine-modalities, ryan-haight-act, imlc-licensure-compact, telehealth-parity, store-and-forward, rpm-cpt-family, pghd-definition, pghd-provenance, fda-general-wellness, originating-site.

Append 10 new mastery items (5 telemedicine + 5 RPM/PGHD) to `modules/09-imaging-virtual-care-pgd/mastery-gate.json` (extending the existing questions array, renumbering q11–q20). Same vignette + rationale style as the Sprint 10 items.

TASK 2 — Verify the masteryGateExtended platform loader
Sprint 10 declared `masteryGateExtended` as a new sibling field in `modules/02-clinical-data-standards/module.json` and `modules/08-leadership-change-management/module.json`. Before authoring more extended banks, search the platform code (likely under `c:/Users/tsthe2/Desktop/Educator marketplace BACKUP 2026-04-07/app/` or `lib/`) for the module loader and confirm whether `masteryGateExtended` is read. If NOT read, either (a) add minimal loader support, or (b) fall back: merge the extended bank items into the canonical `mastery-gate.json` with a `set: "extended"` tag on each item, and remove the `masteryGateExtended` field from both module.json files. Record the resolution in SPRINT_RUNBOOK.md.

CONSTRAINTS
- Do NOT renumber existing concept IDs.
- Do NOT modify existing lesson prose.
- Update root `concepts.json` `totalConcepts` count and append the 10 new IDs in the same kebab-case-row pattern Sprint 10 used.
- After completing Task 1 and Task 2, append a "Sprint 11 — CLOSED" section to SPRINT_RUNBOOK.md with the same shape as the Sprint 10 closeout, then generate a Sprint 12 handoff prompt covering: M9 lessons 4 (FHIR Bulk Data + patient-facing APIs) and 5 (Digital therapeutics + FDA SaMD + Cures CDS exemption + ONC HTI-1 DSI), the M9 capstone and voice session, the forward-reference paragraph in M4 lesson 5, and 20 more mastery items. STOP after writing the handoff prompt — do not begin Sprint 12 work.

DO NOT touch any files outside the scope above.
```

## Sprint 11 — CLOSED (2026-04-07)

**Scope delivered:**
- New M9 lesson: `modules/09-imaging-virtual-care-pgd/lessons/02-telemedicine-and-virtual-care.md` (modalities, Ryan Haight, IMLC, parity, originating site, BAA, equity).
- New M9 lesson: `modules/09-imaging-virtual-care-pgd/lessons/03-rpm-wearables-and-pghd.md` (RPM CPT family + 16-day threshold, PGHD provenance/attestation, FDA general wellness, alarm fatigue, equity).
- M9 `concepts.json`: 10 new concept entries appended — `telemedicine-modalities`, `store-and-forward`, `ryan-haight-act`, `imlc-licensure-compact`, `telehealth-parity`, `originating-site`, `rpm-cpt-family`, `pghd-definition`, `pghd-provenance`, `fda-general-wellness`. Concept count: 14 → 24.
- M9 `mastery-gate.json`: 10 new items appended (q11–q15 telemedicine, q16–q20 RPM/PGHD). Same vignette + full-rationale style as Sprint 10 items. Instructions updated; q-count 10 → 20.
- Root `concepts.json`: `totalConcepts: 321 → 331`. 10 new ID rows appended.

**Open question resolved — masteryGateExtended loader (Q4 from architecture doc):**
- Searched `the-sandbox/app/**` for any reference to `masteryGateExtended`. No platform code reads the field. Loader does NOT support the sibling-file pattern.
- Resolution: **fall back (option b)**. Merged the extended bank items into the canonical `mastery-gate.json` for both M2 and M8 with `"set": "extended"` tags, renumbered to q16–q25 to avoid collisions with the existing q1–q15. Removed the `masteryGateExtended` field from both `module.json` files and deleted the standalone `mastery-gate-extended.json` files.
- Implication for V2: extended-bank items will continue to live inside the canonical `mastery-gate.json` array tagged with `set: "extended"`. No platform changes required. Sprint 12+ should follow this pattern, not the sibling-file pattern.

**Cumulative state after Sprint 11:**
- Modules: 9. Lessons: 42 (target 60). Mastery items: 170 (target 400). Concepts: 331 (target ~360).
- M2 mastery gate: 25 items (15 canonical + 10 UMLS extended). M8 mastery gate: 25 items (15 canonical + 10 financing extended). M9 mastery gate: 20 items (10 imaging + 5 telemedicine + 5 RPM/PGHD).
- Critical gaps closed: imaging (L1), telemedicine (L2), RPM/PGHD (L3), UMLS, healthcare financing.
- Critical gaps remaining: FHIR Bulk Data + patient-facing APIs, AI-CDS / FDA SaMD / Cures CDS exemption / ONC HTI-1 DSI.

## Sprint 12 — Handoff Prompt

Copy everything in the fenced block below into a fresh Claude Code instance.

```
You are continuing the V2 expansion of the ABPM Clinical Informatics board-prep course. Course root: `c:/Users/tsthe2/Desktop/Educator marketplace BACKUP 2026-04-07/Material/courses/abpm-clinical-informatics/`.

CONTEXT
- The V1 course is complete; V2 is closing audit-identified gaps across Sprints 10–17. After Sprint 11: 9 modules, 42 lessons, 170 mastery items, 331 concepts. Sprint 11 delivered M9 lessons 2 (telemedicine) and 3 (RPM/PGHD), 10 new concepts, and 10 new M9 mastery items. See SPRINT_RUNBOOK.md "Sprint 11 — CLOSED" for the full state.
- IMPORTANT — extended mastery banks: the platform loader does NOT read a `masteryGateExtended` sibling field. Sprint 11 fell back: extended items now live inside the canonical `mastery-gate.json` array with `"set": "extended"` tags and IDs continuing from where the canonical bank ends (q16 onward for M2 and M8). Use this pattern for any new extended items in Sprint 12+. Do not reintroduce the sibling-file pattern.
- Architecture: AUDIT_V2_ARCHITECTURE.md in the course root.
- House style: read `modules/09-imaging-virtual-care-pgd/lessons/02-telemedicine-and-virtual-care.md` and `lessons/03-rpm-wearables-and-pghd.md` as the latest canonical examples. Lesson structure: YAML frontmatter (id, title, order, estimatedMinutes, learningOutcomes, concepts) → ## Reading (dense prose, ~80–150 lines) → ## Concrete example → ## Uncomfortable question. Mastery items: full wrong-answer rationales, ABPM-style vignettes, no telegraphing.

YOUR GOAL — execute the Sprint 12 task list below, then STOP and generate the Sprint 13 handoff prompt:

TASK 1 — M9 lesson 4: FHIR Bulk Data and patient-facing APIs
Author `modules/09-imaging-virtual-care-pgd/lessons/04-fhir-bulk-data-and-patient-facing-apis.md`. Cover: the FHIR `$export` Bulk Data operation (Group/Patient/system level), why it exists (population-level export of large cohorts is impractical via per-patient API calls), the async kickoff → status poll → file download flow with NDJSON output, SMART Backend Services authentication for trusted server-to-server clients, and the use cases (research data extraction, ACO population analytics, payer-to-payer exchange). Then patient-facing APIs: the Cures Act API rule, the SMART on FHIR launch profile for patient apps, the USCDI (United States Core Data for Interoperability) data classes the API must expose, the difference between the certified API endpoint and the broader Patient Access API. Cross-reference Module 2 (FHIR/SMART), Module 3 (CDR/EHR architecture), and Module 7 (information blocking — patient access is the canonical case).

TASK 2 — M9 lesson 5: Digital therapeutics, FDA SaMD, Cures CDS exemption, ONC HTI-1 DSI
Author `modules/09-imaging-virtual-care-pgd/lessons/05-digital-therapeutics-fda-samd-cures-cds-exemption.md`. Cover: digital therapeutics (DTx) as a category and the named cleared products at the conceptual level; FDA Software as a Medical Device (SaMD) framework — IMDRF risk categories, 510(k) vs De Novo vs PMA pathways for software; the 21st Century Cures Act CDS exemption — the four criteria a CDS tool must meet to be NOT regulated as a device (drives a clinician review, makes the basis transparent, is not for time-critical decisions, is not for image processing/signal analysis), and how each AI-CDS product is evaluated against those criteria; ONC HTI-1 final rule (2024) Decision Support Intervention (DSI) requirements — predictive DSI source attributes ("nutrition label" / model card), the bias and fairness disclosures, and what certified EHRs must surface to clinicians. This is the most regulatorily current lesson in the course; cross-reference Module 4 (CDS) and Module 7 (Cures Act).

TASK 3 — M9 capstone assignment
Author `modules/09-imaging-virtual-care-pgd/assignment.md`: 1,200–1,600 word capstone. Scenario: the candidate is asked to design or evaluate a real or hypothetical AI-enabled clinical software product (e.g., a sepsis prediction model, a diabetic retinopathy screening tool, a radiology triage AI). Must address: which modality the product fits (imaging, virtual care, RPM, or pure CDS), where it sits on the FDA SaMD vs. Cures CDS exemption line, what HTI-1 DSI source attributes the EHR would need to surface, the data flow including any FHIR Bulk Data or patient-facing API touchpoints, the privacy/security envelope (cross-reference Module 7), and the change-management plan to deploy it (cross-reference Module 8). Graded by `written-thesis` rubric. Standard PHI/AI bans.

TASK 4 — M9 voice session
Author `modules/09-imaging-virtual-care-pgd/voice-session.json`. Skeptical persona: an FDA reviewer who has seen too many vendors claim the Cures CDS exemption when their product clearly should be SaMD. 5 guided turns mapped to voice-defense rubric criteria. Use `modules/04-clinical-decision-support/voice-session.json` as the structural template.

TASK 5 — M4 lesson 5 forward-reference paragraph
Edit `modules/04-clinical-decision-support/lessons/05-cds-knowledge-representation.md` (or whichever M4 lesson is the current closing lesson on CDS knowledge representation — check the actual filename) to add a brief forward-reference paragraph at the END of the Reading section pointing the candidate to M9 lesson 5 for the FDA SaMD / Cures CDS exemption / ONC HTI-1 DSI regulatory framework that applies when the CDS tool is AI-enabled. Do NOT modify existing M4 lesson prose; add only a single closing forward-reference paragraph clearly bracketed as such.

TASK 6 — 20 more mastery items
Append 20 new items to `modules/09-imaging-virtual-care-pgd/mastery-gate.json` (q21–q40): 10 covering FHIR Bulk Data and patient-facing APIs, 10 covering DTx/SaMD/Cures CDS exemption/HTI-1 DSI. Same vignette + full-rationale style. Update the gate's `instructions` field to reflect the expanded scope. M9 gate will then have 40 items total.

TASK 7 — Concept and root updates
Add new concept entries to `modules/09-imaging-virtual-care-pgd/concepts.json` for every new concept ID used in lessons 4–5 and the new mastery items (expect ~15–20 new). Update root `concepts.json` `totalConcepts` count and append rows for each new ID following the existing kebab-case pattern.

TASK 8 — Closeout and handoff
Append a "Sprint 12 — CLOSED" section to SPRINT_RUNBOOK.md in the same shape as Sprint 11. Then generate a Sprint 13 handoff prompt covering Module 02 standards completion (snippet-reading items, the deferred Q1 from the architecture doc, and any remaining gaps in M2 mastery coverage). STOP after writing the handoff prompt — do not begin Sprint 13 work.

CONSTRAINTS
- Do NOT renumber existing concept IDs or existing mastery items.
- Do NOT modify existing lesson prose except for the single forward-reference paragraph at the end of M4 lesson 5.
- Use the `"set": "extended"` tag pattern for any items beyond the canonical 15 — do NOT create sibling `mastery-gate-extended.json` files.
- Reuse concept IDs from prior modules where the concept already exists (e.g., `fhir`, `smart-on-fhir`, `us-core`, `cures-act`, `information-blocking` from M2/M7).

DO NOT touch any files outside the scope above.
```

