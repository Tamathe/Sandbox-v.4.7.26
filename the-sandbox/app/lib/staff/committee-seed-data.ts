// ─── Committee Seed Data ──────────────────────────────────────
// Seeds 5 committees for Morgan Rivera with past meetings, minutes,
// action items, and one "ready for demo" meeting without minutes.
// Idempotent — deletes existing committee data before re-creating.

import { prisma } from '../prisma'
import { Prisma } from '../../generated/prisma'

// ── Date helpers ─────────────────────────────────────────────

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60_000)
}

function daysFromNow(n: number): Date {
  return new Date(Date.now() + n * 24 * 60 * 60_000)
}

function today(hour = 10, minute = 0): Date {
  const d = new Date()
  d.setHours(hour, minute, 0, 0)
  return d
}

// ── Committee definitions ────────────────────────────────────

interface CommitteeDef {
  id: string
  name: string
  description: string
  type: string
  cadence: string
  meetingDay: string
  meetingTime: string
  meetingLocation: string
  members: Array<{ name: string; email: string; role: string; userId?: string | null }>
  agendaTemplate: string | null
}

const COMMITTEES: CommitteeDef[] = [
  {
    id: 'committee-sacscoc',
    name: 'SACSCOC Accreditation Workgroup',
    description: 'Cross-functional team preparing the University of Kentucky\'s SACSCOC reaffirmation submission. Tracks compliance reports, faculty credentials, and student outcomes documentation.',
    type: 'compliance',
    cadence: 'weekly',
    meetingDay: 'Thursday',
    meetingTime: '10:00 AM',
    meetingLocation: 'Whitehall 201',
    members: [
      { name: 'Morgan Rivera', email: 'morgan.rivera@uky.edu', role: 'chair' },
      { name: 'Dr. Amanda Walsh', email: 'walsh@uky.edu', role: 'member' },
      { name: 'Sarah Chen', email: 'chen@uky.edu', role: 'member' },
      { name: 'Dr. James Foster', email: 'foster@uky.edu', role: 'member' },
      { name: 'Lisa Park', email: 'park@uky.edu', role: 'member' },
      { name: 'Dr. Robert Kim', email: 'kim@uky.edu', role: 'member' },
    ],
    agendaTemplate: 'Review of previous action items\nCollege compliance report status\nFaculty credentials update\nStudent outcomes data review\nTimeline and deadline check',
  },
  {
    id: 'committee-academic-ops',
    name: 'Academic Operations Team',
    description: 'Weekly coordination meeting for the Provost\'s Office academic operations team. Covers scheduling, resource allocation, enrollment management, and cross-departmental coordination.',
    type: 'operations',
    cadence: 'weekly',
    meetingDay: 'Tuesday',
    meetingTime: '2:00 PM',
    meetingLocation: 'Main Building 310',
    members: [
      { name: 'Morgan Rivera', email: 'morgan.rivera@uky.edu', role: 'chair' },
      { name: 'Dr. Patricia Owens', email: 'owens@uky.edu', role: 'member' },
      { name: 'Mark Thompson', email: 'thompson@uky.edu', role: 'member' },
      { name: 'Jennifer Liu', email: 'liu@uky.edu', role: 'secretary' },
      { name: 'Dean William Hayes', email: 'hayes@uky.edu', role: 'ex-officio' },
    ],
    agendaTemplate: 'Enrollment dashboard review\nScheduling conflicts\nResource requests\nCross-department coordination items\nUpcoming deadlines',
  },
  {
    id: 'committee-space',
    name: 'Space Allocation Committee',
    description: 'Biweekly committee that reviews and approves campus space requests, renovations, and reallocation proposals.',
    type: 'facilities',
    cadence: 'biweekly',
    meetingDay: 'Wednesday',
    meetingTime: '9:00 AM',
    meetingLocation: 'Facilities Building 104',
    members: [
      { name: 'Morgan Rivera', email: 'morgan.rivera@uky.edu', role: 'chair' },
      { name: 'Jake Martinez', email: 'martinez@uky.edu', role: 'member' },
      { name: 'Dr. Susan Park', email: 'spark@uky.edu', role: 'member' },
      { name: 'Tom Bradley', email: 'bradley@uky.edu', role: 'member' },
    ],
    agendaTemplate: 'Active construction/renovation updates\nNew space requests\nReallocation proposals\nMaintenance priorities',
  },
  {
    id: 'committee-budget',
    name: 'Budget Review Board',
    description: 'Monthly board that reviews departmental budgets, approves reallocations, and monitors spending against targets. Chaired by VP Finance with Morgan as operations lead.',
    type: 'finance',
    cadence: 'monthly',
    meetingDay: 'Monday',
    meetingTime: '1:00 PM',
    meetingLocation: 'Administration Building 500',
    members: [
      { name: 'Morgan Rivera', email: 'morgan.rivera@uky.edu', role: 'chair' },
      { name: 'VP David Chen', email: 'dchen@uky.edu', role: 'ex-officio' },
      { name: 'Dean Priya Patel', email: 'patel@uky.edu', role: 'member' },
      { name: 'Dean Robinson', email: 'robinson@uky.edu', role: 'member' },
      { name: 'CFO Linda Torres', email: 'torres@uky.edu', role: 'member' },
      { name: 'Dr. Michael Brown', email: 'mbrown@uky.edu', role: 'member' },
      { name: 'Sandra Wells', email: 'wells@uky.edu', role: 'secretary' },
    ],
    agendaTemplate: 'Budget vs. actuals review\nReallocation requests\nNew expenditure approvals\nCapital project updates\nFiscal year planning',
  },
  {
    id: 'committee-hr-hiring',
    name: 'HR Hiring Committee',
    description: 'Reviews and approves faculty and staff hiring requests, position classifications, and salary exceptions.',
    type: 'hr',
    cadence: 'as-needed',
    meetingDay: 'Tuesday',
    meetingTime: '10:00 AM',
    meetingLocation: 'HR Suite 220',
    members: [
      { name: 'Morgan Rivera', email: 'morgan.rivera@uky.edu', role: 'chair' },
      { name: 'Carol Stevens', email: 'stevens@uky.edu', role: 'member' },
      { name: 'Dr. Angela Davis', email: 'adavis@uky.edu', role: 'member' },
      { name: 'HR Director Nina Patel', email: 'npatel@uky.edu', role: 'member' },
      { name: 'VP Academic Affairs Rep', email: 'vpaa-rep@uky.edu', role: 'ex-officio' },
    ],
    agendaTemplate: null,
  },
]

// ── Past meeting data ────────────────────────────────────────

// SACSCOC Meeting #10 (2 weeks ago)
const SACSCOC_MEETING_10_MINUTES = `# SACSCOC Accreditation Workgroup — Meeting Minutes
**Date:** Thursday, ${daysAgo(14).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}, 10:00 AM – 11:15 AM
**Location:** Whitehall 201
**Chair:** Morgan Rivera

## Attendance
| Present | Absent |
|---------|--------|
| Morgan Rivera (Chair) | — |
| Dr. Amanda Walsh (Nursing) | |
| Sarah Chen (Institutional Research) | |
| Dr. James Foster (Education) | |
| Lisa Park (VP Academic Affairs Office) | |
| Dr. Robert Kim (Engineering) | |

## Agenda & Discussion

### 1. Submission Timeline Review
Morgan presented the updated SACSCOC submission timeline. The final report is due March 26. All college compliance reports must be submitted to Morgan by March 20 for review.

### 2. College Compliance Report Status
- Engineering: Complete and reviewed. Minor formatting edits needed.
- Education: Dr. Foster reported 90% complete. Faculty credentials section pending.
- Nursing: Dr. Walsh reported significant gaps in student outcomes data. Needs IR data.
- Arts & Sciences: Complete. Lisa confirmed VP office review is done.

### 3. Quality Assurance Process
The committee discussed implementing a peer-review process for each college's report before final submission.

**MOTION:** Implement peer-review pairing for all college compliance reports.
**Moved by:** Dr. Foster | **Seconded by:** Lisa Park
**Vote:** Unanimous (6-0) | **Motion carried.**

## Action Items
| # | Action | Owner | Due | Priority |
|---|--------|-------|-----|----------|
| 1 | Complete Education compliance report | Dr. Foster | ${daysAgo(10).toISOString().split('T')[0]} | High |
| 2 | Distribute submission checklist to all colleges | Lisa Park | ${daysAgo(10).toISOString().split('T')[0]} | Medium |
| 3 | Begin faculty credentials update for Nursing | Dr. Walsh | ${daysAgo(3).toISOString().split('T')[0]} | High |
| 4 | Request student outcomes data from IR | Sarah Chen | ${daysAgo(7).toISOString().split('T')[0]} | High |

## Decisions
| # | Decision | Vote | Context |
|---|----------|------|---------|
| 1 | Implement peer-review pairing for compliance reports | Unanimous | Quality assurance before submission |

---
*Minutes prepared by Sandy AI. Reviewed by: Morgan Rivera*`

// SACSCOC Meeting #11 (last week)
const SACSCOC_MEETING_11_MINUTES = `# SACSCOC Accreditation Workgroup — Meeting Minutes
**Date:** Thursday, ${daysAgo(7).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}, 10:00 AM – 10:50 AM
**Location:** Whitehall 201
**Chair:** Morgan Rivera

## Attendance
| Present | Absent |
|---------|--------|
| Morgan Rivera (Chair) | — |
| Dr. Amanda Walsh (Nursing) | |
| Sarah Chen (Institutional Research) | |
| Dr. James Foster (Education) | |
| Lisa Park (VP Academic Affairs Office) | |
| Dr. Robert Kim (Engineering) | |

## Agenda & Discussion

### 1. Review of Previous Action Items
- ✅ Dr. Foster submitted Education compliance report (complete — peer-reviewed by Dr. Kim)
- ✅ Lisa distributed the submission checklist (complete)
- ⏳ Dr. Walsh: Faculty credentials update for Nursing (in progress — 4 CVs still missing)
- ⏳ Sarah: Student outcomes data request to IR (submitted request, awaiting response)

### 2. Nursing Report Progress
Dr. Walsh presented the current state. Two critical gaps remain:
- **Faculty Credentials (Section 3.2):** 4 of 12 faculty members are missing current CVs. Dr. Walsh has contacted each directly.
- **Student Outcomes (Section 4.1):** Data request was submitted to IR 3 days ago. Sarah followed up; IR expects to deliver by end of this week.

Morgan expressed concern about the tight timeline. The submission deadline is next Wednesday (March 26).

### 3. Engineering Report Final Review
Dr. Kim walked through the Engineering report. All sections complete. One minor inconsistency in the research expenditure table was flagged and corrected during the meeting.

**MOTION:** Approve Engineering compliance report for final submission.
**Moved by:** Dr. Kim | **Seconded by:** Dr. Foster
**Vote:** Unanimous (6-0) | **Motion carried.**

### 4. Next Steps
Morgan will compile all approved reports into the master document this weekend. Outstanding items (Nursing) must be complete by Monday at the latest to allow time for final formatting.

## Action Items
| # | Action | Owner | Due | Priority |
|---|--------|-------|-----|----------|
| 1 | Update faculty credentials section (3.2) with remaining CVs | Dr. Walsh | ${daysAgo(0).toISOString().split('T')[0]} | High |
| 2 | Request student outcomes data from IR — follow up daily | Sarah Chen | ${daysAgo(1).toISOString().split('T')[0]} | Critical |
| 3 | Compile all approved reports into master document | Morgan Rivera | ${daysFromNow(1).toISOString().split('T')[0]} | High |
| 4 | Peer-review Nursing report once complete | Dr. Foster | ${daysFromNow(2).toISOString().split('T')[0]} | Medium |

## Decisions
| # | Decision | Vote | Context |
|---|----------|------|---------|
| 1 | Approved Engineering compliance report for submission | Unanimous | All sections complete, minor edit resolved |

---
*Minutes prepared by Sandy AI. Reviewed by: Morgan Rivera*`

// Academic Ops Meeting #23 (last week)
const ACAD_OPS_MEETING_23_MINUTES = `# Academic Operations Team — Meeting Minutes
**Date:** Tuesday, ${daysAgo(5).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}, 2:00 PM – 3:00 PM
**Location:** Main Building 310
**Chair:** Morgan Rivera

## Attendance
| Present | Absent |
|---------|--------|
| Morgan Rivera (Chair) | Dean William Hayes (travel) |
| Dr. Patricia Owens | |
| Mark Thompson | |
| Jennifer Liu (Secretary) | |

## Agenda & Discussion

### 1. Fall Enrollment Projections
Mark presented updated Fall 2026 enrollment projections. Overall enrollment up 3.2% from last year. Nursing and Computer Science programs are at capacity. Engineering has 15 open seats.

### 2. Summer Course Scheduling Conflicts
Three scheduling conflicts identified for Summer Session 2:
- BIO 301 and CHEM 310 share the same lab space on MWF 10-12
- Two sections of ENG 101 assigned to the same room
Jennifer will coordinate with the Registrar's office.

### 3. Advising Week Preparation
Advising week begins April 7. Morgan reminded the team that each college needs to submit their advising schedules by March 28.

## Action Items
| # | Action | Owner | Due | Priority |
|---|--------|-------|-----|----------|
| 1 | Resolve summer scheduling conflicts with Registrar | Jennifer Liu | ${daysFromNow(3).toISOString().split('T')[0]} | High |
| 2 | Submit advising week schedules (all colleges) | Dr. Owens | ${daysFromNow(5).toISOString().split('T')[0]} | Medium |
| 3 | Prepare enrollment dashboard for Dean Hayes briefing | Mark Thompson | ${daysFromNow(2).toISOString().split('T')[0]} | Medium |

## Decisions
| # | Decision | Vote | Context |
|---|----------|------|---------|
| 1 | Cap Nursing and CS programs for Fall 2026 at current levels | By consensus | Programs at capacity; no additional sections approved |

---
*Minutes prepared by Sandy AI. Reviewed by: Morgan Rivera*`

// Space Allocation Meeting #8 (10 days ago)
const SPACE_MEETING_8_MINUTES = `# Space Allocation Committee — Meeting Minutes
**Date:** Wednesday, ${daysAgo(10).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}, 9:00 AM – 9:45 AM
**Location:** Facilities Building 104
**Chair:** Morgan Rivera

## Attendance
| Present | Absent |
|---------|--------|
| Morgan Rivera (Chair) | — |
| Jake Martinez | |
| Dr. Susan Park | |
| Tom Bradley | |

## Agenda & Discussion

### 1. Patterson Hall East Wing Repair
Jake reported the water leak has been repaired ($3,200 from maintenance reserve). He recommends a full plumbing inspection of the east wing — last inspected in 2019.

**MOTION:** Approve plumbing inspection of Patterson Hall east wing, estimated cost $8,500.
**Moved by:** Jake Martinez | **Seconded by:** Tom Bradley
**Vote:** 4-0 | **Motion carried.**

### 2. Chemistry Lab Renovation Request
Dr. Park presented the Chemistry department's request for lab renovation in Chem-Phys 204. Estimated cost $45,000. The committee requested a detailed scope document before approval.

### 3. Classroom Technology Upgrade — Phase 2
Tom presented Phase 2 of the classroom technology upgrade. 12 classrooms remaining. Budget allocated. Installation scheduled for summer break.

## Action Items
| # | Action | Owner | Due | Priority |
|---|--------|-------|-----|----------|
| 1 | Schedule Patterson Hall plumbing inspection | Jake Martinez | ${daysFromNow(5).toISOString().split('T')[0]} | High |
| 2 | Submit detailed scope document for Chem-Phys 204 | Dr. Susan Park | ${daysFromNow(10).toISOString().split('T')[0]} | Medium |
| 3 | Finalize Phase 2 installation schedule | Tom Bradley | ${daysFromNow(7).toISOString().split('T')[0]} | Medium |

## Decisions
| # | Decision | Vote | Context |
|---|----------|------|---------|
| 1 | Approved Patterson Hall plumbing inspection ($8,500) | 4-0 | Last inspected 2019, post water leak |

---
*Minutes prepared by Sandy AI. Reviewed by: Morgan Rivera*`

// Budget Review Meeting #6 (3 weeks ago)
const BUDGET_MEETING_6_MINUTES = `# Budget Review Board — Meeting Minutes
**Date:** Monday, ${daysAgo(21).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}, 1:00 PM – 2:30 PM
**Location:** Administration Building 500
**Chair:** Morgan Rivera

## Attendance
| Present | Absent |
|---------|--------|
| Morgan Rivera (Chair) | Dr. Michael Brown (sabbatical) |
| VP David Chen | |
| Dean Priya Patel | |
| Dean Robinson | |
| CFO Linda Torres | |
| Sandra Wells (Secretary) | |

## Agenda & Discussion

### 1. Q3 Budget vs. Actuals
CFO Torres presented the Q3 budget report. Overall spending is 2.1% under budget. Engineering travel is over by $8,200 due to 3 unplanned conference trips. Dean Patel proposed reallocation from equipment savings ($43K remaining).

**MOTION:** Approve $8,200 reallocation from Engineering equipment budget to travel.
**Moved by:** Dean Patel | **Seconded by:** Dean Robinson
**Vote:** 5-0 | **Motion carried.**

### 2. Capital Project Updates
The Science Building renovation is on schedule. Phase 1 completion expected April 30. $12M of $15M budget committed.

### 3. FY2027 Planning Timeline
VP Chen outlined the FY2027 planning timeline. Department budget requests due May 1. Board presentation June 15.

## Action Items
| # | Action | Owner | Due | Priority |
|---|--------|-------|-----|----------|
| 1 | Process Engineering travel reallocation | CFO Torres | ${daysAgo(14).toISOString().split('T')[0]} | High |
| 2 | Distribute FY2027 budget request templates | Sandra Wells | ${daysAgo(7).toISOString().split('T')[0]} | Medium |
| 3 | Prepare Science Building Phase 1 status report | Dean Robinson | ${daysFromNow(7).toISOString().split('T')[0]} | Medium |

## Decisions
| # | Decision | Vote | Context |
|---|----------|------|---------|
| 1 | Approved $8,200 Engineering travel reallocation | 5-0 | From equipment savings |
| 2 | Set FY2027 department budget requests deadline: May 1 | By consensus | VP Chen's timeline |

---
*Minutes prepared by Sandy AI. Reviewed by: Morgan Rivera*`

// HR Hiring Meeting #4 (6 days ago)
const HR_MEETING_4_MINUTES = `# HR Hiring Committee — Meeting Minutes
**Date:** Tuesday, ${daysAgo(6).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}, 10:00 AM – 10:40 AM
**Location:** HR Suite 220
**Chair:** Morgan Rivera

## Attendance
| Present | Absent |
|---------|--------|
| Morgan Rivera (Chair) | VP Academic Affairs Rep (scheduling conflict) |
| Carol Stevens | |
| Dr. Angela Davis | |
| HR Director Nina Patel | |

## Agenda & Discussion

### 1. Position Request Review
Three position requests in queue:
1. **Adjunct Instructor, Biology** — enrollment growth justification. Most urgent: need to post by April 7 for Fall coverage.
2. **Research Associate, Engineering** — grant-funded (NSF). 2-year term.
3. **IT Support Specialist** — backfill for retirement.

### 2. Biology Adjunct Discussion
Carol presented the enrollment data supporting the Biology adjunct request. Fall sections are at 98% capacity. Without an additional instructor, 2 sections would need to be canceled.

**MOTION:** Approve Biology Adjunct Instructor position for immediate posting.
**Moved by:** Carol Stevens | **Seconded by:** Dr. Davis
**Vote:** 4-0 | **Motion carried.**

### 3. Engineering Research Associate
Grant funding confirmed by NSF. Standard classification review needed. HR Director Patel will expedite.

**MOTION:** Approve Engineering Research Associate position pending classification review.
**Moved by:** Dr. Davis | **Seconded by:** Morgan Rivera
**Vote:** 4-0 | **Motion carried.**

## Action Items
| # | Action | Owner | Due | Priority |
|---|--------|-------|-----|----------|
| 1 | Post Biology Adjunct position to UK Jobs portal | Carol Stevens | ${daysFromNow(2).toISOString().split('T')[0]} | Critical |
| 2 | Complete classification review for Engineering RA | Nina Patel | ${daysFromNow(5).toISOString().split('T')[0]} | High |
| 3 | Draft IT Support Specialist posting for next meeting | Carol Stevens | ${daysFromNow(8).toISOString().split('T')[0]} | Medium |

## Decisions
| # | Decision | Vote | Context |
|---|----------|------|---------|
| 1 | Approved Biology Adjunct position for posting | 4-0 | Enrollment growth — 98% section capacity |
| 2 | Approved Engineering RA pending classification | 4-0 | NSF grant-funded, 2-year term |

---
*Minutes prepared by Sandy AI. Reviewed by: Morgan Rivera*`

// ── Main Seed Function ──────────────────────────────────────

/**
 * Seed committee data for Morgan Rivera.
 * Idempotent — deletes existing committee data before re-creating.
 */
export async function seedCommitteeData(): Promise<void> {
  // 1. Upsert Morgan Rivera
  const morgan = await prisma.user.upsert({
    where: { email: 'morgan.rivera@uky.edu' },
    update: {},
    create: {
      email: 'morgan.rivera@uky.edu',
      name: 'Morgan Rivera',
      role: 'STAFF',
      department: "Provost's Office",
      college: 'Administration',
    },
  })

  const uid = morgan.id

  // 2. Clear existing committee data for idempotency
  // Action items first (no FK cascade), then meetings, then committees
  await prisma.committeeActionItem.deleteMany({})
  await prisma.committeeMeeting.deleteMany({})
  await prisma.committee.deleteMany({})

  // 3. Create committees
  for (const def of COMMITTEES) {
    await prisma.committee.create({
      data: {
        id: def.id,
        name: def.name,
        description: def.description,
        type: def.type,
        chairId: uid,
        members: def.members as unknown as Prisma.InputJsonValue,
        cadence: def.cadence,
        meetingDay: def.meetingDay,
        meetingTime: def.meetingTime,
        meetingLocation: def.meetingLocation,
        agendaTemplate: def.agendaTemplate,
        source: 'simulated',
      },
    })
  }

  // 4. Create past meetings with minutes

  // ── SACSCOC: Meeting #10 (2 weeks ago)
  const sacsMtg10 = await prisma.committeeMeeting.create({
    data: {
      committeeId: 'committee-sacscoc',
      meetingNumber: 10,
      date: daysAgo(14),
      location: 'Whitehall 201',
      duration: 75,
      formattedMinutes: SACSCOC_MEETING_10_MINUTES,
      attendees: {
        present: ['Morgan Rivera (Chair)', 'Dr. Amanda Walsh', 'Sarah Chen', 'Dr. James Foster', 'Lisa Park', 'Dr. Robert Kim'],
        absent: [],
      },
      agendaItems: [
        { title: 'Submission Timeline Review', discussion: 'Final report due March 26.' },
        { title: 'College Compliance Report Status', discussion: 'Engineering complete, Education 90%, Nursing gaps, A&S complete.' },
        { title: 'Quality Assurance Process', discussion: 'Peer-review pairing for all reports.' },
      ],
      actionItems: [
        { action: 'Complete Education compliance report', ownerName: 'Dr. Foster', due: daysAgo(10).toISOString().split('T')[0], priority: 'high' },
        { action: 'Distribute submission checklist', ownerName: 'Lisa Park', due: daysAgo(10).toISOString().split('T')[0], priority: 'medium' },
        { action: 'Begin faculty credentials update for Nursing', ownerName: 'Dr. Walsh', due: daysAgo(3).toISOString().split('T')[0], priority: 'high' },
        { action: 'Request student outcomes data from IR', ownerName: 'Sarah Chen', due: daysAgo(7).toISOString().split('T')[0], priority: 'high' },
      ],
      decisions: [
        { decision: 'Implement peer-review pairing for compliance reports', vote: 'Unanimous', context: 'Quality assurance before submission' },
      ],
      status: 'finalized',
      distributionStatus: 'distributed',
      distributedAt: daysAgo(13),
      generatedBy: 'sandy',
      source: 'simulated',
    },
  })

  // SACSCOC #10 action items (2 complete, 2 carried forward)
  await prisma.committeeActionItem.createMany({
    data: [
      { committeeId: 'committee-sacscoc', meetingId: sacsMtg10.id, action: 'Complete Education compliance report', ownerName: 'Dr. Foster', dueDate: daysAgo(10), priority: 'high', status: 'complete', completedAt: daysAgo(11) },
      { committeeId: 'committee-sacscoc', meetingId: sacsMtg10.id, action: 'Distribute submission checklist', ownerName: 'Lisa Park', dueDate: daysAgo(10), priority: 'medium', status: 'complete', completedAt: daysAgo(11) },
      { committeeId: 'committee-sacscoc', meetingId: sacsMtg10.id, action: 'Begin faculty credentials update for Nursing', ownerName: 'Dr. Walsh', dueDate: daysAgo(3), priority: 'high', status: 'in-progress', notes: 'Collecting remaining CVs from 4 faculty' },
      { committeeId: 'committee-sacscoc', meetingId: sacsMtg10.id, action: 'Request student outcomes data from IR', ownerName: 'Sarah Chen', dueDate: daysAgo(7), priority: 'high', status: 'in-progress', notes: 'Request submitted, awaiting IR response' },
    ],
  })

  // ── SACSCOC: Meeting #11 (1 week ago)
  const sacsMtg11 = await prisma.committeeMeeting.create({
    data: {
      committeeId: 'committee-sacscoc',
      meetingNumber: 11,
      date: daysAgo(7),
      location: 'Whitehall 201',
      duration: 50,
      formattedMinutes: SACSCOC_MEETING_11_MINUTES,
      attendees: {
        present: ['Morgan Rivera (Chair)', 'Dr. Amanda Walsh', 'Sarah Chen', 'Dr. James Foster', 'Lisa Park', 'Dr. Robert Kim'],
        absent: [],
      },
      agendaItems: [
        { title: 'Review of Previous Action Items', discussion: '2 complete, 2 in progress.' },
        { title: 'Nursing Report Progress', discussion: 'Faculty credentials and student outcomes gaps.' },
        { title: 'Engineering Report Final Review', discussion: 'Complete, minor formatting fix resolved.' },
        { title: 'Next Steps', discussion: 'Compile master document this weekend.' },
      ],
      actionItems: [
        { action: 'Update faculty credentials section (3.2)', ownerName: 'Dr. Walsh', due: daysAgo(0).toISOString().split('T')[0], priority: 'high' },
        { action: 'Request student outcomes data from IR — follow up daily', ownerName: 'Sarah Chen', due: daysAgo(1).toISOString().split('T')[0], priority: 'critical' },
        { action: 'Compile all approved reports into master document', ownerName: 'Morgan Rivera', due: daysFromNow(1).toISOString().split('T')[0], priority: 'high' },
        { action: 'Peer-review Nursing report once complete', ownerName: 'Dr. Foster', due: daysFromNow(2).toISOString().split('T')[0], priority: 'medium' },
      ],
      previousActionReview: [
        { action: 'Complete Education compliance report', owner: 'Dr. Foster', status: 'complete', notes: 'Peer-reviewed by Dr. Kim' },
        { action: 'Distribute submission checklist', owner: 'Lisa Park', status: 'complete', notes: null },
        { action: 'Faculty credentials update for Nursing', owner: 'Dr. Walsh', status: 'in-progress', notes: '4 CVs still missing' },
        { action: 'Student outcomes data from IR', owner: 'Sarah Chen', status: 'in-progress', notes: 'Request submitted, awaiting response' },
      ],
      decisions: [
        { decision: 'Approved Engineering compliance report for submission', vote: 'Unanimous', context: 'All sections complete, minor edit resolved', movedBy: 'Dr. Kim', secondedBy: 'Dr. Foster' },
      ],
      status: 'finalized',
      distributionStatus: 'distributed',
      distributedAt: daysAgo(6),
      generatedBy: 'sandy',
      source: 'simulated',
    },
  })

  // SACSCOC #11 action items (all open — these carry into today's meeting)
  await prisma.committeeActionItem.createMany({
    data: [
      { committeeId: 'committee-sacscoc', meetingId: sacsMtg11.id, action: 'Update faculty credentials section (3.2)', ownerName: 'Dr. Walsh', dueDate: today(), priority: 'high', status: 'in-progress', notes: '4 CVs collected, integrating into report' },
      { committeeId: 'committee-sacscoc', meetingId: sacsMtg11.id, action: 'Request student outcomes data from IR', ownerName: 'Sarah Chen', dueDate: daysAgo(1), priority: 'critical', status: 'open', notes: 'IR data delivery expected today' },
      { committeeId: 'committee-sacscoc', meetingId: sacsMtg11.id, action: 'Compile all approved reports into master document', ownerName: 'Morgan Rivera', dueDate: daysFromNow(1), priority: 'high', status: 'open' },
      { committeeId: 'committee-sacscoc', meetingId: sacsMtg11.id, action: 'Peer-review Nursing report once complete', ownerName: 'Dr. Foster', dueDate: daysFromNow(2), priority: 'medium', status: 'open' },
    ],
  })

  // ── SACSCOC: Meeting #12 (TODAY) — NO MINUTES (ready for demo)
  await prisma.committeeMeeting.create({
    data: {
      committeeId: 'committee-sacscoc',
      meetingNumber: 12,
      date: today(10, 0),
      location: 'Whitehall 201',
      duration: null,
      rawNotes: null,
      formattedMinutes: null,
      status: 'draft',
      generatedBy: 'sandy',
      source: 'simulated',
    },
  })

  // ── Academic Ops: Meeting #22 (2 weeks ago)
  await prisma.committeeMeeting.create({
    data: {
      committeeId: 'committee-academic-ops',
      meetingNumber: 22,
      date: daysAgo(12),
      location: 'Main Building 310',
      duration: 55,
      formattedMinutes: '*(Abbreviated minutes — see meeting #23 for latest)*',
      status: 'finalized',
      distributionStatus: 'distributed',
      distributedAt: daysAgo(11),
      source: 'simulated',
    },
  })

  // ── Academic Ops: Meeting #23 (last week)
  const acadMtg23 = await prisma.committeeMeeting.create({
    data: {
      committeeId: 'committee-academic-ops',
      meetingNumber: 23,
      date: daysAgo(5),
      location: 'Main Building 310',
      duration: 60,
      formattedMinutes: ACAD_OPS_MEETING_23_MINUTES,
      attendees: {
        present: ['Morgan Rivera (Chair)', 'Dr. Patricia Owens', 'Mark Thompson', 'Jennifer Liu (Secretary)'],
        absent: ['Dean William Hayes (travel)'],
      },
      actionItems: [
        { action: 'Resolve summer scheduling conflicts with Registrar', ownerName: 'Jennifer Liu', due: daysFromNow(3).toISOString().split('T')[0], priority: 'high' },
        { action: 'Submit advising week schedules', ownerName: 'Dr. Owens', due: daysFromNow(5).toISOString().split('T')[0], priority: 'medium' },
        { action: 'Prepare enrollment dashboard for Dean Hayes', ownerName: 'Mark Thompson', due: daysFromNow(2).toISOString().split('T')[0], priority: 'medium' },
      ],
      decisions: [
        { decision: 'Cap Nursing and CS for Fall 2026', vote: 'By consensus', context: 'Programs at capacity' },
      ],
      status: 'finalized',
      distributionStatus: 'distributed',
      distributedAt: daysAgo(4),
      source: 'simulated',
    },
  })

  await prisma.committeeActionItem.createMany({
    data: [
      { committeeId: 'committee-academic-ops', meetingId: acadMtg23.id, action: 'Resolve summer scheduling conflicts with Registrar', ownerName: 'Jennifer Liu', dueDate: daysFromNow(3), priority: 'high', status: 'open' },
      { committeeId: 'committee-academic-ops', meetingId: acadMtg23.id, action: 'Submit advising week schedules', ownerName: 'Dr. Owens', dueDate: daysFromNow(5), priority: 'medium', status: 'open' },
      { committeeId: 'committee-academic-ops', meetingId: acadMtg23.id, action: 'Prepare enrollment dashboard for Dean Hayes', ownerName: 'Mark Thompson', dueDate: daysFromNow(2), priority: 'medium', status: 'open' },
    ],
  })

  // ── Space Allocation: Meeting #8 (10 days ago)
  const spaceMtg8 = await prisma.committeeMeeting.create({
    data: {
      committeeId: 'committee-space',
      meetingNumber: 8,
      date: daysAgo(10),
      location: 'Facilities Building 104',
      duration: 45,
      formattedMinutes: SPACE_MEETING_8_MINUTES,
      attendees: {
        present: ['Morgan Rivera (Chair)', 'Jake Martinez', 'Dr. Susan Park', 'Tom Bradley'],
        absent: [],
      },
      actionItems: [
        { action: 'Schedule Patterson Hall plumbing inspection', ownerName: 'Jake Martinez', due: daysFromNow(5).toISOString().split('T')[0], priority: 'high' },
        { action: 'Submit Chem-Phys 204 scope document', ownerName: 'Dr. Susan Park', due: daysFromNow(10).toISOString().split('T')[0], priority: 'medium' },
        { action: 'Finalize Phase 2 installation schedule', ownerName: 'Tom Bradley', due: daysFromNow(7).toISOString().split('T')[0], priority: 'medium' },
      ],
      decisions: [
        { decision: 'Approved Patterson Hall plumbing inspection ($8,500)', vote: '4-0', context: 'Last inspected 2019' },
      ],
      status: 'finalized',
      distributionStatus: 'distributed',
      distributedAt: daysAgo(9),
      source: 'simulated',
    },
  })

  await prisma.committeeActionItem.createMany({
    data: [
      { committeeId: 'committee-space', meetingId: spaceMtg8.id, action: 'Schedule Patterson Hall plumbing inspection', ownerName: 'Jake Martinez', dueDate: daysFromNow(5), priority: 'high', status: 'open' },
      { committeeId: 'committee-space', meetingId: spaceMtg8.id, action: 'Submit Chem-Phys 204 scope document', ownerName: 'Dr. Susan Park', dueDate: daysFromNow(10), priority: 'medium', status: 'open' },
      { committeeId: 'committee-space', meetingId: spaceMtg8.id, action: 'Finalize Phase 2 installation schedule', ownerName: 'Tom Bradley', dueDate: daysFromNow(7), priority: 'medium', status: 'open' },
    ],
  })

  // ── Budget Review: Meeting #6 (3 weeks ago)
  const budgetMtg6 = await prisma.committeeMeeting.create({
    data: {
      committeeId: 'committee-budget',
      meetingNumber: 6,
      date: daysAgo(21),
      location: 'Administration Building 500',
      duration: 90,
      formattedMinutes: BUDGET_MEETING_6_MINUTES,
      attendees: {
        present: ['Morgan Rivera (Chair)', 'VP David Chen', 'Dean Priya Patel', 'Dean Robinson', 'CFO Linda Torres', 'Sandra Wells (Secretary)'],
        absent: ['Dr. Michael Brown (sabbatical)'],
      },
      actionItems: [
        { action: 'Process Engineering travel reallocation', ownerName: 'CFO Torres', due: daysAgo(14).toISOString().split('T')[0], priority: 'high' },
        { action: 'Distribute FY2027 budget request templates', ownerName: 'Sandra Wells', due: daysAgo(7).toISOString().split('T')[0], priority: 'medium' },
        { action: 'Prepare Science Building Phase 1 status report', ownerName: 'Dean Robinson', due: daysFromNow(7).toISOString().split('T')[0], priority: 'medium' },
      ],
      decisions: [
        { decision: 'Approved $8,200 Engineering travel reallocation', vote: '5-0', context: 'From equipment savings' },
        { decision: 'FY2027 budget requests due May 1', vote: 'By consensus', context: 'VP Chen timeline' },
      ],
      status: 'finalized',
      distributionStatus: 'distributed',
      distributedAt: daysAgo(20),
      source: 'simulated',
    },
  })

  await prisma.committeeActionItem.createMany({
    data: [
      { committeeId: 'committee-budget', meetingId: budgetMtg6.id, action: 'Process Engineering travel reallocation', ownerName: 'CFO Torres', dueDate: daysAgo(14), priority: 'high', status: 'complete', completedAt: daysAgo(12) },
      { committeeId: 'committee-budget', meetingId: budgetMtg6.id, action: 'Distribute FY2027 budget request templates', ownerName: 'Sandra Wells', dueDate: daysAgo(7), priority: 'medium', status: 'complete', completedAt: daysAgo(8) },
      { committeeId: 'committee-budget', meetingId: budgetMtg6.id, action: 'Prepare Science Building Phase 1 status report', ownerName: 'Dean Robinson', dueDate: daysFromNow(7), priority: 'medium', status: 'open' },
    ],
  })

  // ── HR Hiring: Meeting #4 (6 days ago)
  const hrMtg4 = await prisma.committeeMeeting.create({
    data: {
      committeeId: 'committee-hr-hiring',
      meetingNumber: 4,
      date: daysAgo(6),
      location: 'HR Suite 220',
      duration: 40,
      formattedMinutes: HR_MEETING_4_MINUTES,
      attendees: {
        present: ['Morgan Rivera (Chair)', 'Carol Stevens', 'Dr. Angela Davis', 'HR Director Nina Patel'],
        absent: ['VP Academic Affairs Rep (scheduling conflict)'],
      },
      actionItems: [
        { action: 'Post Biology Adjunct position to UK Jobs portal', ownerName: 'Carol Stevens', due: daysFromNow(2).toISOString().split('T')[0], priority: 'critical' },
        { action: 'Complete classification review for Engineering RA', ownerName: 'Nina Patel', due: daysFromNow(5).toISOString().split('T')[0], priority: 'high' },
        { action: 'Draft IT Support Specialist posting', ownerName: 'Carol Stevens', due: daysFromNow(8).toISOString().split('T')[0], priority: 'medium' },
      ],
      decisions: [
        { decision: 'Approved Biology Adjunct position for posting', vote: '4-0', context: 'Enrollment growth — 98% section capacity' },
        { decision: 'Approved Engineering RA pending classification', vote: '4-0', context: 'NSF grant-funded, 2-year term' },
      ],
      status: 'finalized',
      distributionStatus: 'distributed',
      distributedAt: daysAgo(5),
      source: 'simulated',
    },
  })

  await prisma.committeeActionItem.createMany({
    data: [
      { committeeId: 'committee-hr-hiring', meetingId: hrMtg4.id, action: 'Post Biology Adjunct position to UK Jobs portal', ownerName: 'Carol Stevens', dueDate: daysFromNow(2), priority: 'critical', status: 'open' },
      { committeeId: 'committee-hr-hiring', meetingId: hrMtg4.id, action: 'Complete classification review for Engineering RA', ownerName: 'Nina Patel', dueDate: daysFromNow(5), priority: 'high', status: 'open' },
      { committeeId: 'committee-hr-hiring', meetingId: hrMtg4.id, action: 'Draft IT Support Specialist posting', ownerName: 'Carol Stevens', dueDate: daysFromNow(8), priority: 'medium', status: 'open' },
    ],
  })

  console.log('[committee-seed] Seeded 5 committees, 9 meetings, and action items for Morgan Rivera')
}
