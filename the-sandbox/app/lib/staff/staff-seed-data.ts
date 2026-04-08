// ─── Staff Seed Data ──────────────────────────────────────────
// Demo data for Morgan Rivera (STAFF — Director of Academic Operations)
// Seeds: user, calendar, emails, rules, tasks, action items, insights, budgets, alerts

import { prisma } from '../prisma'

// ─── Helpers ─────────────────────────────────────────────────

function weekday(dayOffset: number, hour: number, minute = 0): Date {
  const now = new Date()
  const currentDay = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((currentDay + 6) % 7))
  monday.setHours(hour, minute, 0, 0)
  monday.setDate(monday.getDate() + dayOffset)
  return monday
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000)
}

function today(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function daysFromNow(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + n)
  d.setHours(17, 0, 0, 0)
  return d
}

// ─── Main Seed Function ──────────────────────────────────────

export async function seedStaffData() {
  // 1. Upsert Morgan Rivera
  const morgan = await prisma.user.upsert({
    where: { email: 'morgan.rivera@uky.edu' },
    update: { name: 'Morgan Rivera', role: 'STAFF', department: "Provost's Office", college: 'Administration', title: 'Director of Academic Operations', isAdvisor: true },
    create: {
      email: 'morgan.rivera@uky.edu',
      name: 'Morgan Rivera',
      role: 'STAFF',
      department: "Provost's Office",
      college: 'Administration',
      title: 'Director of Academic Operations',
      isAdvisor: true,
    },
  })

  const uid = morgan.id

  // 2. Clear existing data for idempotency
  await Promise.all([
    prisma.assistantCalendarEvent.deleteMany({ where: { userId: uid } }),
    prisma.assistantEmail.deleteMany({ where: { userId: uid } }),
    prisma.assistantRule.deleteMany({ where: { userId: uid } }),
    prisma.assistantTask.deleteMany({ where: { userId: uid } }),
    prisma.assistantActionLog.deleteMany({ where: { userId: uid } }),
    prisma.staffActionItem.deleteMany({ where: { assigneeId: uid } }),
    prisma.staffBriefingInsight.deleteMany({ where: { userId: uid } }),
    prisma.staffBudgetSnapshot.deleteMany({ where: { userId: uid } }),
    prisma.staffBriefingDismissal.deleteMany({ where: { userId: uid } }),
    prisma.staffAlert.deleteMany({}),
  ])

  await Promise.all([
    seedCalendar(uid),
    seedEmails(uid),
    seedRules(uid),
    seedTasks(uid),
    seedActionItems(uid),
    seedInsights(uid),
    seedBudgets(uid),
    seedAlerts(),
  ])

  console.log('[Staff Seed] Morgan Rivera data seeded successfully')
}

// ─── Calendar Events ─────────────────────────────────────────

async function seedCalendar(userId: string) {
  const events = [
    // Monday
    { title: 'Facilities Planning Meeting', startTime: weekday(0, 9, 30), endTime: weekday(0, 10, 30), location: 'Admin Bldg 204', category: 'meeting' },
    { title: 'Budget Review — College of Engineering', startTime: weekday(0, 13, 0), endTime: weekday(0, 14, 0), location: 'Engineering Dean Suite', category: 'meeting' },
    { title: 'Check-in with Provost', startTime: weekday(0, 15, 0), endTime: weekday(0, 15, 30), location: 'Main Bldg 300', category: 'meeting' },
    { title: 'Lunch', startTime: weekday(0, 12, 0), endTime: weekday(0, 13, 0), category: 'personal' },
    // Tuesday
    { title: 'HR Hiring Committee', startTime: weekday(1, 10, 0), endTime: weekday(1, 11, 0), location: 'HR Conference Room', category: 'meeting' },
    { title: 'Academic Operations Team Meeting', startTime: weekday(1, 14, 0), endTime: weekday(1, 15, 0), location: 'Admin Bldg 204', category: 'meeting' },
    { title: 'School pickup', startTime: weekday(1, 16, 0), endTime: weekday(1, 16, 30), category: 'personal' },
    // Wednesday
    { title: 'Space Allocation Committee', startTime: weekday(2, 9, 0), endTime: weekday(2, 10, 0), location: 'Whitehall 201', category: 'meeting' },
    { title: 'Vendor Demo — New LMS Module', startTime: weekday(2, 11, 0), endTime: weekday(2, 12, 0), location: 'IT Training Room', category: 'meeting' },
    { title: 'Gym', startTime: weekday(2, 17, 0), endTime: weekday(2, 18, 0), category: 'personal' },
    // Thursday
    { title: 'SACSCOC Prep Meeting', startTime: weekday(3, 10, 0), endTime: weekday(3, 11, 0), location: 'Whitehall 201', category: 'meeting', attendees: ['walsh@uky.edu', 'chen@uky.edu', 'foster@uky.edu', 'park@uky.edu', 'kim@uky.edu'] },
    { title: 'Student Affairs Liaison', startTime: weekday(3, 13, 0), endTime: weekday(3, 14, 0), location: 'Student Center 302', category: 'meeting' },
    // Friday
    { title: 'Weekly Wrap-up with VP Finance', startTime: weekday(4, 9, 0), endTime: weekday(4, 10, 0), location: 'Finance Suite', category: 'meeting' },
    { title: 'Lunch & Learn — AI in Higher Ed', startTime: weekday(4, 12, 0), endTime: weekday(4, 13, 0), location: 'Faculty Club', category: 'meeting' },
    { title: 'Focus Time', startTime: weekday(4, 13, 0), endTime: weekday(4, 17, 0), category: 'admin' },
  ]

  await prisma.assistantCalendarEvent.createMany({
    data: events.map(e => ({
      userId,
      title: e.title,
      startTime: e.startTime,
      endTime: e.endTime,
      location: e.location ?? null,
      category: e.category,
      attendees: e.attendees ?? [],
      source: 'simulated',
    })),
  })
}

// ─── Emails ──────────────────────────────────────────────────

async function seedEmails(userId: string) {
  const now = new Date()
  const emails = [
    {
      fromAddress: 'provost@uky.edu', fromName: 'Provost Williams',
      subject: 'Need accreditation docs by Wednesday',
      body: 'Morgan, the SACSCOC submission deadline is Wednesday. I need all college compliance reports signed and on my desk by 5 PM. Nursing is still pending — can you follow up with Dr. Walsh? Thanks, Provost Williams',
      category: 'urgent', isRead: false,
      receivedAt: new Date(now.getTime() - 2 * 3600_000),
    },
    {
      fromAddress: 'dean.patel@uky.edu', fromName: 'Dean Patel (Engineering)',
      subject: 'Budget concern — travel overrun in Engineering',
      body: 'Morgan, our travel budget is over by about $8,200 this quarter. The AI research cluster had 3 unplanned conference trips. I\'d like to propose a reallocation from our equipment savings ($43K remaining). Can we discuss at Monday\'s budget review? — Dean Patel',
      category: 'department', isRead: false,
      receivedAt: new Date(now.getTime() - 5 * 3600_000),
    },
    {
      fromAddress: 'facilities@uky.edu', fromName: 'Jake Torres (Facilities)',
      subject: 'Patterson Hall water leak — resolved, cost implications',
      body: 'Hi Morgan, the water leak in Patterson Hall east wing has been repaired. Estimated repair cost: $3,200 from the maintenance reserve. No classes were disrupted. However, I recommend we schedule a full plumbing inspection of the east wing — it was last inspected in 2019. Let me know if you\'d like me to get a quote. — Jake',
      category: 'department', isRead: true,
      receivedAt: new Date(now.getTime() - 8 * 3600_000),
    },
    {
      fromAddress: 'hr.director@uky.edu', fromName: 'Carol Haynes (HR)',
      subject: '3 position requests pending your review',
      body: 'Morgan, we have 3 position requests in queue awaiting your classification review: 1) Adjunct Instructor, Biology (enrollment growth), 2) Research Associate, Engineering (grant-funded), 3) IT Support Specialist (backfill). Biology is the most urgent as they need to post by April 7 for Fall coverage. — Carol',
      category: 'admin', isRead: false,
      receivedAt: new Date(now.getTime() - 24 * 3600_000),
    },
    {
      fromAddress: 'student.affairs@uky.edu', fromName: 'Student Affairs Office',
      subject: 'Financial aid complaint — needs escalation',
      body: 'Director Rivera, we\'ve received complaints from 3 students regarding financial aid disbursement delays exceeding 15 business days. This requires coordination between the Bursar and Financial Aid offices. We\'re routing to you for escalation. Students affected: T. Williams, M. Chen, A. Johnson. — Student Affairs',
      category: 'urgent', isRead: false,
      receivedAt: new Date(now.getTime() - 4 * 3600_000),
    },
    {
      fromAddress: 'it.services@uky.edu', fromName: 'IT Services',
      subject: 'Canvas maintenance window — Saturday March 29',
      body: 'Campus notification: Canvas LMS will be unavailable Saturday March 29, 2:00-6:00 AM EST for scheduled maintenance. Please ensure no critical assignment deadlines fall during this window. — IT Services',
      category: 'admin', isRead: true,
      receivedAt: new Date(now.getTime() - 48 * 3600_000),
    },
    {
      fromAddress: 'vendor@pearson.com', fromName: 'Pearson Education',
      subject: 'Contract renewal — MyLab integration terms attached',
      body: 'Dear Ms. Rivera, attached please find the renewal terms for the University of Kentucky\'s MyLab integration. The proposed rate is $48,600/year, reflecting an 8% increase from the current $45,000 rate. We\'d welcome the opportunity to discuss. Contract expires April 30. — Pearson Account Management',
      category: 'external', isRead: false,
      receivedAt: new Date(now.getTime() - 72 * 3600_000),
    },
    {
      fromAddress: 'chronicle@chronicle.com', fromName: 'Chronicle of Higher Education',
      subject: 'Weekly Digest: AI in Higher Ed, Title IX Updates',
      body: 'This week in higher education: AI adoption at scale — which institutions are leading? New Title IX guidelines effective July 1. Enrollment trends: community colleges see 5% rebound. And more...',
      category: 'newsletter', isRead: true,
      receivedAt: new Date(now.getTime() - 36 * 3600_000),
    },
    {
      fromAddress: 'dean.robinson@uky.edu', fromName: 'Dean Robinson (A&S)',
      subject: 'Guest speaker coordination — Dr. Yamamoto visit',
      body: 'Morgan, Dr. Yamamoto (MIT) has confirmed her campus visit for April 15. She\'ll need: a seminar room for ~50 people, lunch reservation for 8, and an A/V setup for her presentation. Can your office handle logistics? Budget comes from our visiting speaker fund. — Dean Robinson',
      category: 'department', isRead: false,
      receivedAt: new Date(now.getTime() - 6 * 3600_000),
    },
  ]

  await prisma.assistantEmail.createMany({
    data: emails.map(e => ({
      userId,
      fromAddress: e.fromAddress,
      fromName: e.fromName,
      toAddresses: ['morgan.rivera@uky.edu'],
      subject: e.subject,
      body: e.body,
      snippet: e.body.slice(0, 200),
      category: e.category,
      isRead: e.isRead,
      receivedAt: e.receivedAt,
      source: 'simulated',
    })),
  })
}

// ─── Rules ───────────────────────────────────────────────────

async function seedRules(userId: string) {
  await prisma.assistantRule.createMany({
    data: [
      { userId, naturalText: 'No meetings before 9am', ruleType: 'scheduling-constraint', structured: { beforeHour: 9 }, isActive: true },
      { userId, naturalText: 'Keep Friday afternoons free after 1pm', ruleType: 'calendar-block', structured: { dayOfWeek: 5, startTime: '13:00', endTime: '17:00', recurrence: 'weekly' }, isActive: true },
      { userId, naturalText: 'Block Monday 12-1pm for lunch', ruleType: 'calendar-block', structured: { dayOfWeek: 1, startTime: '12:00', endTime: '13:00', recurrence: 'weekly' }, isActive: true },
    ],
  })
}

// ─── Tasks ───────────────────────────────────────────────────

async function seedTasks(userId: string) {
  await prisma.assistantTask.createMany({
    data: [
      { userId, title: 'Review Nursing compliance report', dueAt: daysFromNow(3), status: 'pending', source: 'sandy' },
      { userId, title: 'Prepare budget reallocation memo for Engineering', dueAt: daysFromNow(5), status: 'pending', source: 'sandy' },
      { userId, title: 'Schedule vendor demo follow-up', status: 'pending', source: 'sandy' },
      { userId, title: 'Send updated parking plan to Facilities', dueAt: daysFromNow(7), status: 'pending', source: 'sandy' },
    ],
  })
}

// ─── Action Items ────────────────────────────────────────────

async function seedActionItems(userId: string) {
  const items = [
    // P0 — Critical
    {
      type: 'document-review', priority: 'P0',
      title: 'SACSCOC Compliance Report — Nursing',
      description: 'Annual compliance report for the College of Nursing requires your signature. The accreditation team has flagged 2 areas that need narrative updates before submission. Deadline: Wednesday.',
      department: 'Nursing', deadline: daysFromNow(3),
      metadata: { documentType: 'accreditation', pages: 47, flaggedSections: ['Faculty Credentials', 'Student Outcomes'] },
    },
    {
      type: 'escalation', priority: 'P0',
      title: 'Student Financial Aid Processing Delay',
      description: '3 students have reported financial aid disbursement delays exceeding 15 business days. Student Affairs routed to you as it may require coordination between Bursar and Financial Aid offices.',
      department: 'Student Affairs', deadline: daysFromNow(1),
      metadata: { affectedStudents: 3, routedBy: 'Student Affairs', daysSinceReport: 4 },
    },
    // P1 — High
    {
      type: 'purchase-approval', priority: 'P1',
      title: 'PO #4821 — Lab Equipment for Chemistry',
      description: 'Dr. Sarah Martinez is requesting a spectrophotometer ($2,400) for the organic chemistry teaching lab. This is a replacement for a unit that failed inspection last month.',
      amount: 2400, department: 'Chemistry', deadline: daysFromNow(5),
      metadata: { poNumber: '4821', vendor: 'Fisher Scientific', accountCode: 'AS-EQUIP-2026', isReplacement: true },
    },
    {
      type: 'purchase-approval', priority: 'P1',
      title: 'PO #4835 — Conference Travel for 4 Faculty',
      description: 'College of Education requesting group travel approval for AERA conference in April. 4 faculty presenting papers. Total: $8,800 ($2,200 per person).',
      amount: 8800, department: 'Education', deadline: daysFromNow(4),
      metadata: { poNumber: '4835', travelers: 4, conference: 'AERA 2026', perPerson: 2200 },
    },
    {
      type: 'hr-action', priority: 'P1',
      title: 'Position Request — Adjunct Instructor, Biology',
      description: 'Department of Biology requesting a new adjunct position for Fall 2026 to cover intro sections due to enrollment growth (+15% in BIO 101). Needs classification review and salary band confirmation.',
      department: 'Biology', deadline: daysFromNow(8),
      metadata: { positionType: 'adjunct', reason: 'enrollment-growth', enrollmentDelta: '+15%' },
    },
    {
      type: 'budget-review', priority: 'P1',
      title: 'Q3 Budget Variance — College of Engineering',
      description: 'Engineering has overspent travel budget by $8,200 (12% over allocation). Primary driver: 3 unplanned conference trips for the new AI research cluster. Dean Patel requests a reallocation from equipment savings.',
      amount: 8200, department: 'Engineering',
      metadata: { category: 'travel', percentOver: 12, proposedResolution: 'reallocation from equipment' },
    },
    // P2 — Medium
    {
      type: 'room-request', priority: 'P2',
      title: 'Room Request — 30-Person Seminar, TTh 2-3:30pm',
      description: 'History Department needs a seminar room with A/V for Fall 2026 graduate seminar. Preferred: Patterson Hall or White Hall. 30 students, needs projector and recording capability.',
      department: 'History', deadline: daysFromNow(23),
      metadata: { capacity: 30, days: 'TTh', time: '2:00-3:30pm', semester: 'Fall 2026', avRequired: true },
    },
    {
      type: 'document-review', priority: 'P2',
      title: 'Vendor Contract Renewal — Pearson LMS Module',
      description: 'Annual renewal for Pearson MyLab integration. Current rate: $45,000/year. Pearson proposing 8% increase to $48,600. Contract expires April 30. IT recommends negotiating or exploring alternatives.',
      amount: 48600, deadline: daysFromNow(23),
      metadata: { vendor: 'Pearson', currentRate: 45000, proposedRate: 48600, increasePercent: 8 },
    },
    {
      type: 'purchase-approval', priority: 'P2',
      title: 'PO #4812 — Office Supplies Quarterly Order',
      description: "Routine quarterly office supply order for Provost's Office. Standard items: paper, toner, pens, folders. Same order as last quarter.",
      amount: 340, department: "Provost's Office",
      metadata: { poNumber: '4812', isRoutine: true, frequency: 'quarterly' },
    },
    // P3 — Low
    {
      type: 'custom', priority: 'P3',
      title: 'Parking Lot Restriping — Schedule Review',
      description: 'Facilities is planning to restripe Lot 5 (near Engineering) over Spring Break. No cost to your budget — just need acknowledgment that the timing works for your units.',
      department: 'Facilities',
      metadata: { facilityArea: 'Lot 5', scheduledDate: 'Spring Break 2026' },
    },
    {
      type: 'custom', priority: 'P3',
      title: 'Newsletter — Chronicle of Higher Education Weekly',
      description: "This week's highlights: AI in higher education, new Title IX guidelines, enrollment trends nationally. Sandy flagged the AI article as relevant to your vendor evaluation.",
      metadata: { source: 'Chronicle of Higher Education', flaggedArticle: 'AI in Higher Education' },
    },
    {
      type: 'custom', priority: 'P3',
      title: 'FYI — Emergency Notification System Test',
      description: 'UK Public Safety will test the new emergency notification system on Wednesday at 10am. 30-second test tone across all campus buildings. No action needed.',
      metadata: { testDate: daysFromNow(3).toISOString(), duration: '30 seconds' },
    },
  ]

  await prisma.staffActionItem.createMany({
    data: items.map(item => ({
      assigneeId: userId,
      type: item.type,
      priority: item.priority,
      title: item.title,
      description: item.description,
      amount: item.amount ?? null,
      department: item.department ?? null,
      deadline: item.deadline ?? null,
      metadata: item.metadata,
      status: 'pending',
      source: 'simulated',
    })),
  })
}

// ─── Briefing Insights ───────────────────────────────────────

async function seedInsights(userId: string) {
  const d = today()

  const insights = [
    {
      category: 'enrollment', title: 'Fall 2026 Enrollment Update',
      narrative: "Fall 2026 applications are up 3.2% compared to this date last year (14,847 vs 14,388). Engineering saw the biggest jump (+8.1%), driven by the new AI & Machine Learning track. Nursing applications are down slightly (-1.8%), consistent with national trends.",
      delta: '+3.2%', sentiment: 'positive',
      dataPoints: { current: 14847, previous: 14388, byCollege: { Engineering: '+8.1%', 'Arts & Sciences': '+2.4%', Nursing: '-1.8%', Education: '+4.0%' } },
    },
    {
      category: 'budget', title: 'Mid-Quarter Budget Status',
      narrative: "You're 67% through Q3 and 61% through discretionary budget across your 4 colleges — slightly ahead of pace. One flag: Engineering travel is 12% over allocation. All other categories are within 5% of target.",
      delta: '61% spent', sentiment: 'neutral',
      dataPoints: { quarterProgress: 0.67, budgetProgress: 0.61, flagged: ['Engineering-Travel'] },
    },
    {
      category: 'hr', title: 'Open Positions Summary',
      narrative: '7 positions are currently in the hiring pipeline across your units. 2 have been posted for over 30 days without sufficient applicants (Biology adjunct, IT support specialist). HR recommends refreshing the postings or expanding the search.',
      delta: '7 open', sentiment: 'neutral',
      dataPoints: { total: 7, stale: 2, newest: 'Engineering — Research Associate (posted yesterday)' },
    },
    {
      category: 'facilities', title: 'Facilities Update',
      narrative: 'Patterson Hall water leak (reported Friday) has been repaired. Estimated repair cost: $3,200 from the maintenance reserve. No classes were disrupted. Facilities recommends a plumbing inspection of the east wing — last inspected 2019.',
      delta: '$3,200 repair', sentiment: 'neutral',
      dataPoints: { location: 'Patterson Hall', cost: 3200, lastInspection: '2019' },
    },
    {
      category: 'campus', title: 'Campus Safety — Weekend Summary',
      narrative: 'Quiet weekend. 2 minor incidents (bike theft near Library, false fire alarm in Kirwan Tower). No injuries or significant property damage. Emergency notification system test scheduled for Wednesday.',
      delta: '2 minor', sentiment: 'positive',
      dataPoints: { incidents: 2, severity: 'minor' },
    },
    {
      category: 'compliance', title: 'SACSCOC Deadline Approaching',
      narrative: "The Nursing compliance report is due Wednesday. 2 sections still need narrative updates: Faculty Credentials and Student Outcomes. Dr. Walsh in Nursing has drafted updates — they need your review and signature.",
      delta: '3 days left', sentiment: 'negative',
      dataPoints: { completionPercent: 85, blockedBy: 'Your signature' },
    },
  ]

  await prisma.staffBriefingInsight.createMany({
    data: insights.map(i => ({
      userId,
      category: i.category,
      title: i.title,
      narrative: i.narrative,
      delta: i.delta,
      sentiment: i.sentiment,
      dataPoints: i.dataPoints,
      briefingDate: d,
      isRead: false,
      source: 'simulated',
    })),
  })
}

// ─── Budget Snapshots ────────────────────────────────────────

async function seedBudgets(userId: string) {
  const d = today()

  const budgets = [
    {
      unitName: 'College of Engineering', fiscalYear: 'FY2026',
      totalBudget: 520000, spent: 338000, committed: 42000, remaining: 140000, burnRate: 0.73,
      categories: {
        personnel: { budget: 280000, spent: 196000, remaining: 84000 },
        travel: { budget: 65000, spent: 73200, remaining: -8200 },
        equipment: { budget: 95000, spent: 52000, remaining: 43000 },
        operations: { budget: 80000, spent: 16800, remaining: 63200 },
      },
      variances: [{ category: 'travel', amount: 8200, direction: 'over', percentOver: 12.6 }],
    },
    {
      unitName: 'College of Arts & Sciences', fiscalYear: 'FY2026',
      totalBudget: 680000, spent: 387000, committed: 28000, remaining: 265000, burnRate: 0.61,
      categories: {
        personnel: { budget: 380000, spent: 253000, remaining: 127000 },
        travel: { budget: 85000, spent: 48000, remaining: 37000 },
        equipment: { budget: 120000, spent: 62000, remaining: 58000 },
        operations: { budget: 95000, spent: 24000, remaining: 71000 },
      },
      variances: [],
    },
    {
      unitName: 'College of Nursing', fiscalYear: 'FY2026',
      totalBudget: 310000, spent: 198000, committed: 15000, remaining: 97000, burnRate: 0.69,
      categories: {
        personnel: { budget: 180000, spent: 126000, remaining: 54000 },
        travel: { budget: 35000, spent: 22000, remaining: 13000 },
        equipment: { budget: 55000, spent: 38000, remaining: 17000 },
        operations: { budget: 40000, spent: 12000, remaining: 28000 },
      },
      variances: [],
    },
    {
      unitName: 'College of Education', fiscalYear: 'FY2026',
      totalBudget: 290000, spent: 174000, committed: 19000, remaining: 97000, burnRate: 0.67,
      categories: {
        personnel: { budget: 165000, spent: 115000, remaining: 50000 },
        travel: { budget: 40000, spent: 21000, remaining: 19000 },
        equipment: { budget: 45000, spent: 22000, remaining: 23000 },
        operations: { budget: 40000, spent: 16000, remaining: 24000 },
      },
      variances: [],
    },
  ]

  await prisma.staffBudgetSnapshot.createMany({
    data: budgets.map(b => ({
      userId,
      unitName: b.unitName,
      fiscalYear: b.fiscalYear,
      totalBudget: b.totalBudget,
      spent: b.spent,
      committed: b.committed,
      remaining: b.remaining,
      burnRate: b.burnRate,
      categories: b.categories,
      variances: b.variances,
      snapshotDate: d,
      source: 'simulated',
    })),
  })
}

// ─── Alerts ──────────────────────────────────────────────────

async function seedAlerts() {
  await prisma.staffAlert.createMany({
    data: [
      {
        scope: 'campus-wide', alertType: 'maintenance', severity: 'info',
        title: 'Canvas LMS Maintenance — Saturday March 29',
        body: 'Canvas will be unavailable Saturday March 29, 2:00-6:00 AM EST for scheduled maintenance. Faculty should ensure all assignment deadlines are not set during this window.',
        expiresAt: daysFromNow(6), isActive: true, source: 'simulated',
      },
      {
        scope: 'campus-wide', alertType: 'safety', severity: 'info',
        title: 'Emergency Notification System Test — Wednesday 10am',
        body: 'UK Public Safety will conduct a 30-second test of the new emergency notification system on Wednesday at 10:00 AM. Test tones will sound in all campus buildings. No action required.',
        expiresAt: daysFromNow(3), isActive: true, source: 'simulated',
      },
      {
        scope: 'department', targetDept: "Provost's Office", alertType: 'deadline', severity: 'warning',
        title: 'SACSCOC Submission Deadline — March 26',
        body: "All college compliance reports must be signed and submitted by 5:00 PM on Wednesday. Nursing report is pending your signature. Engineering and Education reports are complete.",
        expiresAt: daysFromNow(3), isActive: true, source: 'simulated',
      },
    ],
  })
}
