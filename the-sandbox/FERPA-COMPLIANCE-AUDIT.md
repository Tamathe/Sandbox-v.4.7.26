# FERPA Compliance Audit — University of Kentucky

**Audit Date:** 2026-03-25
**Platform:** University of Kentucky — AI-Powered Campus Operating System
**Institution:** University of Kentucky
**Scope:** All student education records, PII fields, access controls, third-party data sharing, and compliance infrastructure

---

## 1. PII Inventory — User Model

| Field | Type | Classification | Notes |
|-------|------|---------------|-------|
| `name` | String | PII | Full name |
| `email` | String | PII | Institutional email (@uky.edu) |
| `sisStudentId` | String? | Restricted | Banner SIS student ID |
| `program` | String? | Education Record | Degree program code |
| `catalogYear` | String? | Education Record | Academic catalog year |
| `department` | String? | Institutional | Organizational unit |
| `college` | String? | Institutional | College/school affiliation |
| `bio` | String? | Personal | User-authored biography |
| `personalContext` | String? | Restricted | Free-text personal narrative |
| `avatarUrl` | String? | Personal | Profile photo URL |
| `passwordHash` | String? | Auth Credential | Bcryptjs hash (cost 12) |
| `lastSeenAt` | DateTime | Behavioral | Last platform activity |
| `lastPath` | String? | Behavioral | Last route visited |
| `onboardingIntent` | String? | Behavioral | Inferred user goal |
| `studyGroup` | String? | Research | A/B test assignment |

---

## 2. Student Education Records (60+ Models)

### Grades & Submissions

| Model | Key Fields | Guard |
|-------|-----------|-------|
| **GradebookEntry** | studentId, aiScore, facultyScore, feedback, status | `requireCourseOwner` |
| **Submission** | studentId, assignmentId, textContent, fileUrl | `requireCourseOwner` |
| **TranscriptRecord** | studentId, courseCode, credits, grade, gradePoints | `requireRegistrarUser` |

### Degree & Academic Planning

| Model | Key Fields | Guard |
|-------|-----------|-------|
| **DegreeAuditResult** | studentId, percentComplete, totalCredits, requirementResults, chainOfThought | `requireRegistrarUser` (own-data check for students) |
| **Petition** | studentId, type, status, formData, decision, decisionReason | `requireRegistrarUser` |
| **DegreePlan** | studentId, programId, plannedCourses | `requireRequestUser` (own data) |
| **CourseEnrollment** | studentId, courseId, enrolledAt | `requireRequestUser` |

### Learning Analytics

| Model | Key Fields | Guard |
|-------|-----------|-------|
| **StudentProfile** | riskScore, learningVelocity, dominantBloomLevel, avgCognitiveLoad | `requireRequestUser` (own data) |
| **StudentConceptMastery** | conceptId, effectiveMastery, bloomHighWater | `requireRequestUser` |
| **StudentDomainModality** | domain, preferredModality, confidenceScore | `requireRequestUser` |
| **ToolSession** | score, conceptsMastered, conceptsStruggling, sessionDuration | `requireRequestUser` |
| **FlashcardState** | stabilityFactor, nextReviewAt, bloomHighWater, missedReviews | `requireRequestUser` |
| **ConceptState** | stabilityFactor, nextReviewAt, bloomHighWater | `requireRequestUser` |

### Intervention & Support

| Model | Key Fields | Guard |
|-------|-----------|-------|
| **InterventionLog** | studentId, reason, actionTaken, outcome | `requireEducatorUser` |
| **StudentNote** | authorId, studentId, content, isPrivate | `requireEducatorUser` |
| **OfficeHoursQuestion** | studentId, content, resolved | `requireRequestUser` |
| **WellnessEntry** | toolSlug, data (mood/habits/sleep/symptoms), aiInsight | `requireStudentUser` (own data only) |

### Communication

| Model | Key Fields | Guard |
|-------|-----------|-------|
| **ChannelMessage** | authorId, content, crisisFlag | `requireRequestUser` |
| **Message** | senderId, content | `requireRequestUser` |
| **DiscussionPost** | authorId, content | `requireRequestUser` |

### Portfolio & Research

| Model | Key Fields | Guard |
|-------|-----------|-------|
| **PortfolioItem** | userId, title, skills, isVerified | `requireRequestUser` |
| **ResearchSession** | userId, title, notes | `requireRequestUser` |
| **LectureDebrief** | userId, topicsCovered, feedbackForInstructor | `requireRequestUser` |

---

## 3. Access Control Assessment

### Auth Guard Functions (server-auth.ts)

| Guard | Who Can Access | Cache |
|-------|---------------|-------|
| `requireRequestUser` | Any authenticated user | 60s LRU |
| `requireStudentUser` | STUDENT only (not Educator/Admin) | 60s LRU |
| `requireEducatorUser` | EDUCATOR or ADMIN | 60s LRU |
| `requireStaffOrAdminUser` | STAFF or ADMIN | 60s LRU |
| `requireRegistrarUser` | REGISTRAR or ADMIN | 60s LRU |
| `requireAdminUser` | ADMIN only | 60s LRU |
| `requireCourseOwner` | Course creator or ADMIN | 60s LRU |
| `requireToolOwner` | Tool creator or ADMIN | 60s LRU |
| `requireDepartmentEditor` | Department editor or ADMIN | 60s LRU |

### Correctly Scoped Routes

- `GET /api/students/me/degree-audit` — returns authenticated user's audit only
- `GET /api/courses/[id]/my-grades` — personal grades in enrolled course only
- `GET /api/study/[toolId]/context` — personal learning context only
- `GET /api/registrar/student-360/[studentId]` — requires `requireRegistrarUser`
- `GET /api/registrar/degree-audit/[studentId]` — registrar/admin or own-data check

### Areas Requiring Review

| Route | Concern | Priority |
|-------|---------|----------|
| `/api/analytics/faculty` | May expose cross-course student data | MEDIUM |
| Tool session analytics | Educator access scope unclear | MEDIUM |
| Student suspension metadata | `suspendedReason` returned in error response | LOW |

---

## 4. Consent Tracking Infrastructure

### User-Level Consent Fields

| Field | Purpose | Version Tracked |
|-------|---------|----------------|
| `tosAcceptedAt` | Terms of Service acceptance | `acceptedTosVersion` |
| `dataConsentAt` | Data collection consent | `acceptedConsentVersion` |
| `ferpaAckAt` | FERPA rights acknowledgment | `acceptedFerpaVersion` |

### Granular Consent Categories (UserConsentCategory)

| Category | Purpose | Revocable |
|----------|---------|-----------|
| `analytics` | Behavioral data collection | Yes (`revokedAt`) |
| `ai-personalization` | AI uses learning profile for tutoring | Yes |
| `email-communications` | Email notifications and digests | Yes |

### Compliance Models

| Model | Purpose | Status |
|-------|---------|--------|
| `ConsentVersion` | Publish new TOS/FERPA versions; users prompted to re-accept | Active |
| `ComplianceApproval` | Data access request workflow | Schema defined |
| `ComplianceDelegation` | Delegate data access (e.g., to parent/advisor) | Schema defined |
| `ComplianceException` | Emergency access grants (crisis waiver) | Schema defined |
| `DataClassification` | Tag data assets by sensitivity level | Schema defined |
| `AccessReview` | Quarterly access review cycle | Schema defined |
| `DataRetentionPolicy` | Define retention periods per data category | Schema defined, **not enforced by cron** |

---

## 5. Third-Party Data Sharing

### Anthropic Claude (AI Chat & Analysis)

**Data sent in system prompts:**
- Student name (for personalization)
- Learning profile: weak/strong concepts, risk score, cognitive load, Bloom level
- Course enrollment, recent session scores
- Personal context (if provided by user)

**Sensitivity:** HIGH — includes PII + education records
**Mitigation:** Anthropic API, data processed per Anthropic's terms
**Action needed:** Execute formal Data Processing Agreement (DPA) with Anthropic

### OpenAI (Embeddings)

**Data sent:**
- Document chunk text (course materials, policies, news articles)
- **NOT sent:** student names, IDs, grades, or personal data

**Sensitivity:** MEDIUM — institutional content only
**Action needed:** DPA with OpenAI; planned migration to Azure OpenAI Service

### Resend (Email)

**Data sent:**
- Recipient email address, name
- Email body (may contain grades, task descriptions, petition decisions)

**Sensitivity:** HIGH — email bodies contain PII
**Mitigation:** Falls back to console.log if API key not configured
**Action needed:** DPA with Resend; ensure email body minimization

---

## 6. Audit Trail

### ComplianceAuditLog
Tracks: userId, action (accept-tos, accept-consent, accept-ferpa, bulk-tos-reset), ipAddress, userAgent, timestamp.
**Retention:** Indefinite (no TTL). **Status:** Active.

### AdminAuditLog
Tracks: adminId, action, targetType, targetId, metadata, timestamp.
**Retention:** Indefinite. **Status:** Active.

### SessionTelemetry
Tracks: userId, eventType, payload (explicitly NO PII), timestamp.
**Purpose:** Behavioral analytics for research. **Status:** Active.

### Gap: No student-facing audit log
Students cannot currently view who accessed their education records.

---

## 7. Data Retention

### Current State

| Data Type | Retention | Cleanup Method |
|-----------|----------|---------------|
| Chat sessions | Indefinite | None |
| Tool sessions | Indefinite | None |
| Channel messages | Soft delete (deletedAt) | No purge |
| Wellness entries | Indefinite | None |
| Sandy execution traces | Indefinite | None |
| Compliance audit logs | Indefinite | None (correct for compliance) |
| Consent records | Indefinite | None (correct for compliance) |

### DataRetentionPolicy Model
Schema defined with `retentionDays`, `action` (anonymize/delete/archive), and `active` flag.
**Status:** No cron job enforces these policies. Framework exists but is not wired.

### Recommended Retention Schedule

| Data Type | Recommended Retention | Action |
|-----------|----------------------|--------|
| Chat/tool sessions | 2 years | Archive, then anonymize |
| Channel messages | 1 year | Soft delete, purge after 90 days |
| Wellness entries | 1 year | Delete (sensitive health data) |
| Sandy traces | 6 months | Delete (debug telemetry) |
| Student notes | 7 years | Archive (education record) |
| Grades/transcripts | 7 years | Archive (education record) |
| Compliance logs | 7 years | Immutable (regulatory) |
| Petitions | 7 years | Archive (education record) |

---

## 8. FERPA Compliance Training Infrastructure

| Model | Purpose | Status |
|-------|---------|--------|
| `ComplianceTrainingModule` | Training content (FERPA, data-privacy, HIPAA, Title IX) | Schema active |
| `ComplianceTrainingCompletion` | Track who completed training | Schema active |
| `FerpaTrainingAttempt` | Quiz attempts for FERPA training | Schema active |
| `FerpaTrainingReminder` | Auto-reminders to complete training | Schema active |
| `FerpaIncident` | Report FERPA violations (severity, resolution) | Schema active |
| FERPA Reminder Cron | Weekly Monday 8 AM reminder emails | Active |

---

## 9. Identified Gaps & Recommendations

### Critical (Pre-Deployment)

| # | Gap | Recommendation |
|---|-----|---------------|
| 1 | **No data export endpoint** | Add `GET /api/students/me/export` — ZIP of all personal data |
| 2 | **No data deletion endpoint** | Add `DELETE /api/students/me` — soft-delete + 7-year archive |
| 3 | **Retention policies not enforced** | Wire `DataRetentionPolicy` to a daily cron job |
| 4 | **No Anthropic DPA** | Execute formal Data Processing Agreement |
| 5 | **Consent revocation incomplete** | When `revokedAt` set, halt AI personalization + emails for that user |
| 6 | **Student name in AI prompts** | Document as "legitimate educational interest" or add opt-out |

### Important (Within 90 Days)

| # | Gap | Recommendation |
|---|-----|---------------|
| 7 | **No student audit log view** | Add `GET /api/students/me/audit-log` — who accessed my data |
| 8 | **chainOfThought visible to registrar** | Strip AI reasoning from student-facing degree audit views |
| 9 | **Analytics route scoping** | Verify `/api/analytics/faculty` is course-scoped, not institution-wide |
| 10 | **Sensitive field encryption** | At-rest encryption for `personalContext`, `WellnessEntry.data`, `StudentNote.content` |

### Nice-to-Have

| # | Gap | Recommendation |
|---|-----|---------------|
| 11 | **Immutable audit logs** | Add hash chain to ComplianceAuditLog (tamper detection) |
| 12 | **Breach notification template** | Document incident response procedures |
| 13 | **Permission matrix documentation** | Publish role-to-data access mapping |

---

## 10. Summary

**Strengths:**
- Comprehensive consent tracking infrastructure (3 tiers + granular categories)
- Auth guards on every API route (CLAUDE.md enforces this as mandatory)
- FERPA training module with quiz, reminders, and incident reporting
- Compliance delegation and exception models for edge cases
- AdminAuditLog and ComplianceAuditLog provide baseline audit trail

**Weaknesses:**
- Data retention policies defined but not enforced
- No student-facing data export or deletion
- Student PII sent to Anthropic without formal DPA
- No at-rest encryption for sensitive fields
- Consent revocation doesn't halt dependent features

**Overall Assessment:** The compliance infrastructure is **well-designed** and more comprehensive than most university platforms at this stage. The primary gaps are **operational** (wiring the cron enforcement, executing DPAs) rather than **architectural** (the models and frameworks exist).
