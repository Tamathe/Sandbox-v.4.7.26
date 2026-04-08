// ─── Communication Seed Data ──────────────────────────────────
// Seeds 8 communication templates and 3 example drafts for Morgan
// Rivera (STAFF). Idempotent: deletes existing data before re-creating.

import { prisma } from '../prisma'

// ── Template Definitions ────────────────────────────────────

const SEED_TEMPLATES = [
  {
    name: 'Campus Maintenance Notice',
    type: 'campus-wide',
    category: 'operations',
    subject: 'Scheduled Maintenance: [System/Location] — [Date]',
    body: `Dear University of Kentucky community,

We want to let you know about upcoming maintenance that may affect your [work/studies].

**What:** [Description]
**When:** [Day, Date, Time Range]
**Impact:** [What will be unavailable/affected]
**Action Needed:** [What users should do]

[Alternative arrangements, if any]

If you have questions, please contact [Office] at [email/phone].

Thank you for your patience as we work to improve our campus infrastructure.

Best regards,
[Your Name]
[Title]`,
    tone: 'professional',
    audience: 'All faculty, staff, and students',
    sortOrder: 1,
  },
  {
    name: 'Weather Closure',
    type: 'crisis',
    category: 'crisis',
    subject: 'UK Campus [Closure/Delayed Opening] — [Date]',
    body: `The University of Kentucky campus will be [closed/operating on a delayed schedule] on [Day, Date] due to [weather condition].

**Status:** [Closed / 2-hour delay / etc.]
**Effective:** [Time] on [Date]
**Expected Resumption:** [Time/Date]

**Essential Personnel:** Report as directed by your supervisor.
**Remote Work:** Employees with remote work arrangements may work from home.
**Classes:** All [in-person/online] classes are [cancelled/continuing].

Monitor uk.edu and @universityofky for updates. Sign up for UK Alert at [link].

Stay safe, Wildcats.`,
    tone: 'urgent',
    audience: 'All faculty, staff, and students',
    sortOrder: 2,
  },
  {
    name: 'Faculty/Staff Achievement',
    type: 'department',
    category: 'events',
    subject: 'Congratulations to [Name] — [Achievement]',
    body: `We are pleased to announce that [Name], [Title] in the [Department/College], has [achievement description].

[1-2 sentences of context about the achievement and its significance.]

[Quote from the honoree or their department head, if available.]

Please join us in congratulating [Name] on this outstanding accomplishment.

[Optional: reception/celebration details]`,
    tone: 'celebratory',
    audience: 'Department or college',
    sortOrder: 3,
  },
  {
    name: 'Policy Change Announcement',
    type: 'campus-wide',
    category: 'operations',
    subject: 'Updated Policy: [Policy Name] ([Policy Number]) — Effective [Date]',
    body: `Dear colleagues,

We are writing to inform you of changes to [Policy Number — Policy Name], effective [Date].

**Key Changes:**
- [Change 1]
- [Change 2]
- [Change 3]

**Why This Change:** [Brief explanation]

**What This Means for You:** [Practical impact]

The full updated policy is available at [link]. If you have questions, please contact [Responsible Office] at [email].

[Transition provisions, if any]`,
    tone: 'formal',
    audience: 'All faculty and staff',
    sortOrder: 4,
  },
  {
    name: 'Student Deadline Reminder',
    type: 'student-facing',
    category: 'academic',
    subject: 'Reminder: [Deadline Name] — [Date]',
    body: `Hey Wildcats,

Quick reminder that the deadline for [action] is **[Day, Date at Time]**.

**What you need to do:** [Specific action]
**Where:** [Link or location]
**Questions?** Contact [Office] at [email] or stop by [location].

Don't wait until the last minute — [encouraging note].

Go Cats!`,
    tone: 'warm',
    audience: 'All students',
    sortOrder: 5,
  },
  {
    name: 'Executive Status Update',
    type: 'executive-brief',
    category: 'operations',
    subject: '[Topic] — Status Update for [Date]',
    body: `**[Topic] — Status Update**

**Bottom Line:** [1 sentence summary]

**Key Metrics:**
- [Metric 1]: [Value] ([trend])
- [Metric 2]: [Value] ([trend])

**Progress Since Last Update:**
- [Item 1]
- [Item 2]

**Decisions Needed:**
- [Decision 1]: [Options + recommendation]

**Next Steps:**
- [Action] — [Owner] — [Due date]`,
    tone: 'professional',
    audience: 'Executive leadership',
    sortOrder: 6,
  },
  {
    name: 'Event Announcement',
    type: 'campus-wide',
    category: 'events',
    subject: "You're Invited: [Event Name] — [Date]",
    body: `The University of Kentucky invites you to [Event Name].

**When:** [Day, Date, Time]
**Where:** [Location]
**RSVP:** [Link or instructions]

[2-3 sentences about the event: what it is, who's presenting/hosting, why attend.]

[Special instructions: parking, dress code, dietary accommodations, etc.]

We hope to see you there!

For questions, contact [Name] at [email].`,
    tone: 'warm',
    audience: 'Varies',
    sortOrder: 7,
  },
  {
    name: 'Social Media — Event Promotion',
    type: 'social-media',
    category: 'events',
    subject: '',
    body: `Twitter: [Event Name] is [date]! [1 exciting detail]. Register: [link] #UKY #[topic]

Instagram: [Event Name] is coming! [2-3 sentences]. Link in bio. #UniversityOfKentucky #[topic] #Wildcats

LinkedIn: The University of Kentucky is hosting [Event Name] on [date]. [2-3 professional sentences about impact/speakers]. Register: [link]`,
    tone: 'engaging',
    audience: 'External / public',
    sortOrder: 8,
  },
]

// ── Example Drafts ──────────────────────────────────────────

function yesterday(): Date {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  d.setHours(14, 30, 0, 0)
  return d
}

function hoursAgo(n: number): Date {
  return new Date(Date.now() - n * 60 * 60_000)
}

// ── Main Seed Function ──────────────────────────────────────

/**
 * Seed communication templates and example drafts for Morgan Rivera.
 * Idempotent — deletes all existing templates and Morgan's drafts
 * before re-creating.
 */
export async function seedCommunicationData(): Promise<void> {
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

  // 2. Clear existing data for idempotency
  await Promise.all([
    prisma.staffCommunicationTemplate.deleteMany({}),
    prisma.staffCommunication.deleteMany({ where: { authorId: uid } }),
  ])

  // 3. Seed templates
  await prisma.staffCommunicationTemplate.createMany({
    data: SEED_TEMPLATES.map((t) => ({
      name: t.name,
      type: t.type,
      description: getTemplateDescription(t.name),
      subject: t.subject,
      body: t.body,
      tone: t.tone,
      audience: t.audience,
      category: t.category,
      sortOrder: t.sortOrder,
      source: 'simulated',
    })),
  })

  // 4. Seed example drafts

  // Draft A: Canvas Maintenance — SENT (yesterday)
  const sentAt = yesterday()
  await prisma.staffCommunication.create({
    data: {
      authorId: uid,
      type: 'campus-wide',
      status: 'sent',
      subject: 'Scheduled Maintenance: Canvas LMS — Saturday, March 29',
      body: `Dear University of Kentucky community,

We want to let you know about scheduled maintenance on Canvas LMS this weekend.

**What:** Canvas LMS system maintenance and performance upgrades
**When:** Saturday, March 29, 2:00 AM – 6:00 AM ET
**Impact:** Canvas will be unavailable during this window. This includes course pages, assignments, grades, and discussion boards.
**Action Needed:** Please plan accordingly — save any in-progress work before 2:00 AM Saturday.

We've scheduled this maintenance during a low-usage window to minimize disruption. All course content and submissions will be preserved.

If you have questions, please contact UK IT Service Desk at 859-218-HELP (4357) or helpdesk@uky.edu.

Thank you for your patience as we work to improve our learning technology infrastructure.

Best regards,
Morgan Rivera
Director of Academic Operations`,
      audienceDesc: 'All faculty, staff, and students',
      tone: 'professional',
      distributionList: ['all-campus@uky.edu', 'faculty-senate@uky.edu', 'student-government@uky.edu'],
      originalPrompt: 'Draft a campus-wide notice about Canvas maintenance this Saturday from 2-6am.',
      revisionCount: 1,
      revisionHistory: [
        {
          timestamp: new Date(sentAt.getTime() - 2 * 60 * 60_000).toISOString(),
          changes: 'Added IT Service Desk contact information',
          promptUsed: 'Add the IT help desk contact info',
        },
      ],
      approvalChain: [
        {
          userId: null,
          name: 'Direct Supervisor',
          role: 'Supervisor',
          status: 'approved',
          reviewedAt: new Date(sentAt.getTime() - 60 * 60_000).toISOString(),
        },
        {
          userId: null,
          name: 'VP Communications',
          role: 'VP Communications',
          status: 'approved',
          reviewedAt: new Date(sentAt.getTime() - 30 * 60_000).toISOString(),
        },
      ],
      sentAt,
      source: 'sandy',
    },
  })

  // Draft B: Parking Lot Restriping — DRAFT (ready for demo)
  await prisma.staffCommunication.create({
    data: {
      authorId: uid,
      type: 'campus-wide',
      status: 'draft',
      subject: 'Parking Update: Lot 5 Closed March 31 – April 4 for Restriping',
      body: `Dear University of Kentucky community,

Lot 5 (adjacent to the College of Engineering) will be closed from Monday, March 31 through Friday, April 4 for scheduled restriping and maintenance.

**What you need to know:**
- Lot 5 will be fully closed during this period — no parking available
- **Alternative parking:** Lot 12 (behind the Student Center) will have overflow capacity
- The campus shuttle will add an extra stop at Lot 12 during this week

We've scheduled this work during spring break to minimize disruption. If you typically park in Lot 5 and will be on campus during break, please plan to use Lot 12.

Questions? Contact Facilities Management at facilities@uky.edu or 859-257-1000.

Thank you for your patience as we improve our campus parking facilities.

Best regards,
Morgan Rivera
Director of Academic Operations`,
      audienceDesc: 'All faculty, staff, and students',
      tone: 'professional',
      distributionList: ['all-campus@uky.edu', 'engineering-faculty@uky.edu'],
      originalPrompt: 'Draft a campus-wide notice about the Lot 5 parking restriping during spring break. It starts Monday March 31 and runs through Friday April 4. Faculty and staff should use Lot 12 as an alternative.',
      revisionCount: 0,
      complianceFlags: [
        {
          policy: 'AR 1:3',
          policyTitle: 'University Communications',
          reason: 'Campus-wide announcements should be reviewed by University Communications for brand consistency.',
          severity: 'info',
        },
      ],
      approvalChain: [
        {
          userId: null,
          name: 'Direct Supervisor',
          role: 'Supervisor',
          status: 'pending',
          reviewedAt: null,
        },
        {
          userId: null,
          name: 'VP Communications',
          role: 'VP Communications',
          status: 'pending',
          reviewedAt: null,
        },
      ],
      source: 'sandy',
    },
  })

  // Draft C: Dr. Chen NSF Grant — PENDING REVIEW
  await prisma.staffCommunication.create({
    data: {
      authorId: uid,
      type: 'department',
      status: 'pending-review',
      subject: 'Congratulations to Dr. Sarah Chen — NSF CAREER Award',
      body: `We are thrilled to announce that Dr. Sarah Chen, Associate Professor of Computer Science in the College of Engineering, has been awarded a prestigious National Science Foundation (NSF) CAREER Award for her research on "Scalable Privacy-Preserving Machine Learning for Healthcare Applications."

The five-year, $750,000 grant will fund Dr. Chen's lab to develop new federated learning techniques that allow hospitals to train AI models collaboratively without sharing sensitive patient data. This work has the potential to accelerate medical AI adoption while maintaining the highest standards of patient privacy.

"This award validates the incredible work our team has been doing at the intersection of AI and healthcare," said Dr. Chen. "We're excited to push the boundaries of what's possible while keeping patient trust at the center of everything we do."

Dr. Chen joined UK in 2021 and has published over 40 peer-reviewed papers. She directs the Privacy-Aware Computing Lab and teaches CS 471 (Machine Learning) and CS 690 (Advanced Topics in Privacy).

Please join us in congratulating Dr. Chen on this outstanding achievement. A reception in her honor will be held Friday, April 11 at 3:00 PM in the Davis Marksbury Building Atrium.`,
      audienceDesc: 'College of Engineering faculty and staff',
      tone: 'celebratory',
      distributionList: ['engineering-all@uky.edu', 'cs-faculty@uky.edu'],
      originalPrompt: 'Write a congratulations announcement for Dr. Sarah Chen who just won an NSF CAREER Award for her privacy-preserving ML research. $750K over 5 years. She is in CS, College of Engineering.',
      revisionCount: 0,
      approvalChain: [
        {
          userId: null,
          name: 'Dean of Engineering',
          role: 'Supervisor',
          status: 'pending',
          reviewedAt: null,
        },
      ],
      source: 'sandy',
      createdAt: hoursAgo(3),
    },
  })

  console.log('[communication-seed] Seeded 8 templates + 3 example drafts for Morgan Rivera')
}

// ── Helpers ─────────────────────────────────────────────────

function getTemplateDescription(name: string): string {
  const descriptions: Record<string, string> = {
    'Campus Maintenance Notice': 'Use for planned system or facilities maintenance affecting campus operations.',
    'Weather Closure': 'Use for weather-related campus closures, delays, or schedule changes.',
    'Faculty/Staff Achievement': 'Announce awards, grants, publications, or other faculty/staff accomplishments.',
    'Policy Change Announcement': 'Communicate new or updated university policies to faculty and staff.',
    'Student Deadline Reminder': 'Remind students of upcoming deadlines for registration, financial aid, or academic actions.',
    'Executive Status Update': 'Brief leadership on project progress, key metrics, and decisions needed.',
    'Event Announcement': 'Promote upcoming campus events, lectures, workshops, or celebrations.',
    'Social Media — Event Promotion': 'Generate platform-specific social media posts for event promotion.',
  }
  return descriptions[name] ?? 'General communication template.'
}
