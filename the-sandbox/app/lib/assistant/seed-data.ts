// ─── Assistant Seed Data ─────────────────────────────────────
// Realistic demo data for Katie Thompson (educator), Tiana The (student),
// and Heath Price (admin). Seeds calendar, email, rules, and tasks.

import { prisma } from '../prisma'

// ─── Helpers ─────────────────────────────────────────────────

function weekday(dayOffset: number, hour: number, minute = 0): Date {
  // Returns a date in the current week (Mon=0 offset) at the given time
  const now = new Date()
  const currentDay = now.getDay() // 0=Sun
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((currentDay + 6) % 7)) // find this Monday
  monday.setHours(hour, minute, 0, 0)
  monday.setDate(monday.getDate() + dayOffset)
  return monday
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000)
}

// ─── Main Seed Function ──────────────────────────────────────

export async function seedAssistantData() {
  // Lookup demo users
  const katie = await prisma.user.findUnique({ where: { email: 'katie.thompson@uky.edu' } })
  const tiana = await prisma.user.findUnique({ where: { email: 'tiana.the.student@uky.edu' } })
  const admin = await prisma.user.findUnique({ where: { email: 'heath.price@uky.edu' } })

  if (!katie || !tiana || !admin) {
    throw new Error('Demo users not found. Run main seed first.')
  }

  // Clear existing assistant data for idempotency
  await Promise.all([
    prisma.assistantCalendarEvent.deleteMany({ where: { userId: { in: [katie.id, tiana.id, admin.id] } } }),
    prisma.assistantEmail.deleteMany({ where: { userId: { in: [katie.id, tiana.id, admin.id] } } }),
    prisma.assistantRule.deleteMany({ where: { userId: { in: [katie.id, tiana.id, admin.id] } } }),
    prisma.assistantTask.deleteMany({ where: { userId: { in: [katie.id, tiana.id, admin.id] } } }),
    prisma.assistantActionLog.deleteMany({ where: { userId: { in: [katie.id, tiana.id, admin.id] } } }),
  ])

  await Promise.all([
    seedKatieCalendar(katie.id),
    seedKatieEmails(katie.id),
    seedKatieRules(katie.id),
    seedKatieTasks(katie.id),
    seedTianaCalendar(tiana.id),
    seedTianaEmails(tiana.id),
    seedTianaTasks(tiana.id),
    seedAdminCalendar(admin.id),
  ])

  return { seeded: true, users: ['katie.thompson', 'tiana.the.student', 'heath.price'] }
}

// ─── Katie Thompson: Calendar (~20 events) ──────────────────

async function seedKatieCalendar(userId: string) {
  const events = [
    // Monday
    { title: 'TEK-100 Lecture — Module 7: Multi-Modal AI', startTime: weekday(0, 10, 0), endTime: weekday(0, 10, 50), category: 'lecture', attendees: [] },
    { title: 'Department Meeting', startTime: weekday(0, 13, 0), endTime: weekday(0, 14, 0), category: 'admin', attendees: ['carol.chen@uky.edu', 'david.wright@uky.edu'], location: 'Whitehall 210' },
    { title: 'Student Check-in: Sarah Kim', startTime: weekday(0, 15, 0), endTime: weekday(0, 15, 30), category: 'meeting', attendees: ['sarah.kim@uky.edu'] },

    // Tuesday
    { title: '1:1 with TA (Jamie)', startTime: weekday(1, 11, 0), endTime: weekday(1, 11, 30), category: 'meeting', attendees: ['jamie.ortiz@uky.edu'] },
    { title: 'Office Hours', startTime: weekday(1, 14, 0), endTime: weekday(1, 15, 30), category: 'office-hours', attendees: [] },
    { title: "Kid's Dentist Appointment", startTime: weekday(1, 16, 0), endTime: weekday(1, 17, 0), category: 'personal', attendees: [] },

    // Wednesday
    { title: 'TEK-100 Lecture — Module 7 continued', startTime: weekday(2, 10, 0), endTime: weekday(2, 10, 50), category: 'lecture', attendees: [] },
    { title: 'Curriculum Committee', startTime: weekday(2, 13, 0), endTime: weekday(2, 14, 0), category: 'admin', attendees: ['provost@uky.edu', 'carol.chen@uky.edu'], location: 'Main Building 305' },
    { title: 'Faculty Senate', startTime: weekday(2, 15, 0), endTime: weekday(2, 16, 0), category: 'admin', attendees: [], location: 'Memorial Hall' },

    // Thursday
    { title: 'Coffee with Dean Robinson', startTime: weekday(3, 9, 0), endTime: weekday(3, 9, 30), category: 'meeting', attendees: ['dean.robinson@uky.edu'], location: 'Common Grounds Café' },
    { title: 'TEK-100 Module 4 Review Session', startTime: weekday(3, 11, 0), endTime: weekday(3, 12, 0), category: 'lecture', attendees: [], description: 'Extra review session for Module 4 — Hallucination Detection. Several students struggling with fact-checking exercises.' },
    { title: 'Office Hours', startTime: weekday(3, 14, 0), endTime: weekday(3, 15, 30), category: 'office-hours', attendees: [] },
    { title: 'Student Check-in: Marcus Johnson', startTime: weekday(3, 15, 30), endTime: weekday(3, 16, 0), category: 'meeting', attendees: ['marcus.johnson@uky.edu'] },
    { title: 'Guest Speaker Prep Call', startTime: weekday(3, 16, 30), endTime: weekday(3, 17, 0), category: 'meeting', attendees: ['dr.martinez@stanford.edu'], location: 'Zoom' },

    // Friday
    { title: 'TEK-100 Lecture — Module 8 Preview', startTime: weekday(4, 10, 0), endTime: weekday(4, 10, 50), category: 'lecture', attendees: [] },
    { title: 'Research Group Lunch', startTime: weekday(4, 12, 0), endTime: weekday(4, 13, 0), category: 'meeting', attendees: ['jamie.ortiz@uky.edu', 'sarah.kim@uky.edu'], location: 'Blazer Dining' },
    { title: 'Focus Time (blocked)', startTime: weekday(4, 13, 0), endTime: weekday(4, 17, 0), category: 'personal', attendees: [], description: 'Protected time for grading and research. No meetings.' },

    // Next week preview
    { title: 'TEK-100 Lecture — Module 8: The AI Agent Director', startTime: weekday(7, 10, 0), endTime: weekday(7, 10, 50), category: 'lecture', attendees: [] },
    { title: 'Accreditation Review Meeting', startTime: weekday(7, 14, 0), endTime: weekday(7, 15, 30), category: 'admin', attendees: ['provost@uky.edu', 'dean.robinson@uky.edu'], location: 'Admin Building 102' },
    { title: 'Office Hours', startTime: weekday(8, 14, 0), endTime: weekday(8, 15, 30), category: 'office-hours', attendees: [] },
    { title: 'Dr. Stack Research Sync', startTime: weekday(9, 11, 0), endTime: weekday(9, 11, 30), category: 'meeting', attendees: ['dr.stack@uky.edu'], location: 'Zoom' },
  ]

  await prisma.assistantCalendarEvent.createMany({
    data: events.map(e => ({
      userId,
      title: e.title,
      startTime: e.startTime,
      endTime: e.endTime,
      category: e.category,
      attendees: e.attendees,
      location: e.location ?? null,
      description: e.description ?? null,
      source: 'simulated',
      isAllDay: false,
    })),
  })
}

// ─── Katie Thompson: Emails (~18 emails) ─────────────────────

async function seedKatieEmails(userId: string) {
  const now = new Date()
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000)

  const thread1 = 'thread-guest-speaker'

  const emails = [
    // Urgent
    {
      fromAddress: 'dean.robinson@uky.edu', fromName: 'Dean Robinson',
      subject: 'URGENT: Accreditation Self-Study Materials Needed',
      body: 'Katie,\n\nThe SACSCOC review team has moved up their visit. I need your TEK-100 assessment data and course learning outcomes by end of next week. Can you pull together the following:\n\n1. Student learning outcomes mapped to program goals\n2. Assessment results from the last two semesters\n3. Any curriculum changes and their rationale\n\nThis is high priority. Let me know if you need support from the assessment office.\n\nBest,\nDean Robinson',
      snippet: 'The SACSCOC review team has moved up their visit. I need your TEK-100 assessment data...',
      category: 'urgent', receivedAt: hoursAgo(2), isRead: false,
    },

    // Student emails
    {
      fromAddress: 'tiana.the.student@uky.edu', fromName: 'Tiana The',
      subject: 'Module 4 Hallucination Hunt — Extension?',
      body: "Dear Dr. Thompson,\n\nI hope this email finds you well. I'm reaching out about the Module 4 Hallucination Hunt assignment that's due this Friday. I've been working through the fact-checking exercises but I'm finding the source verification section really challenging — especially the lateral reading part.\n\nI scored a 60% on the practice exam and I've been reviewing the material, but I think a couple of extra days would help me submit something I'm actually proud of. I have a solid draft already — I just need more time on the verification analysis.\n\nThank you for considering this.\n\nBest regards,\nTiana The",
      snippet: "I'm reaching out about the Module 4 Hallucination Hunt assignment...",
      category: 'student', receivedAt: hoursAgo(4), isRead: false,
    },
    {
      fromAddress: 'sarah.kim@uky.edu', fromName: 'Sarah Kim',
      subject: 'Office Hours Tomorrow — Quick Question',
      body: "Hi Dr. Thompson,\n\nI'm planning to come to your office hours tomorrow. I have a question about the data visualization project — specifically about which statistical test to use for my dataset. It's a comparative analysis with three groups.\n\nWanted to give you a heads up so you can point me in the right direction. Thanks!\n\nSarah",
      snippet: "I'm planning to come to your office hours tomorrow...",
      category: 'student', receivedAt: hoursAgo(6), isRead: false,
    },
    {
      fromAddress: 'marcus.johnson@uky.edu', fromName: 'Marcus Johnson',
      subject: 'Module 4 Fact-Check the AI — Need Help',
      body: "Dr. Thompson,\n\nI'm working on the Fact-Check the AI assignment and I'm stuck on the source verification part. I found three hallucinated citations in the AI summary but I can't figure out how to verify the statistical claims. The AI said '67% of universities have adopted AI policies' — I can't find that stat anywhere but it sounds plausible. Is that the point? How do I distinguish between real-but-hard-to-find and completely fabricated?\n\nI know you're holding a review session Thursday — I'll be there. Just wanted to flag this in advance.\n\nThanks,\nMarcus",
      snippet: "I'm working on the Fact-Check the AI assignment and stuck on source verification...",
      category: 'student', receivedAt: hoursAgo(18), isRead: true,
    },

    // Department / Admin
    {
      fromAddress: 'carol.chen@uky.edu', fromName: 'Carol Chen',
      subject: 'Budget Deadline Reminder — March 28',
      body: "Hi Katie,\n\nJust a reminder that departmental budget requests for next fiscal year are due by March 28. If you need any new equipment, software licenses, or conference travel funding for your lab, please submit your requests through the portal.\n\nLet me know if you have questions about the process.\n\nBest,\nCarol\nDepartment Administrator",
      snippet: 'Departmental budget requests for next fiscal year are due by March 28...',
      category: 'admin', receivedAt: hoursAgo(24), isRead: true,
    },
    {
      fromAddress: 'faculty.senate@uky.edu', fromName: 'Faculty Senate',
      subject: 'Committee Nomination — Curriculum Review',
      body: "Dear Dr. Thompson,\n\nYou have been nominated to serve on the Undergraduate Curriculum Review Committee for the 2026-2027 academic year. This committee meets biweekly and reviews proposals for new courses and program modifications.\n\nPlease respond by April 5 to accept or decline this nomination.\n\nFaculty Senate Office",
      snippet: 'You have been nominated to serve on the Curriculum Review Committee...',
      category: 'admin', receivedAt: hoursAgo(48), isRead: true,
    },

    // TA threads
    {
      fromAddress: 'jamie.ortiz@uky.edu', fromName: 'Jamie Ortiz',
      subject: 'Grading Rubric Question — Assignment 4',
      body: "Hey Dr. Thompson,\n\nI'm grading Assignment 4 and I have a question about the rubric. Several students used a different methodology than what was covered in lecture, but they got valid results. Should I give full credit for the methodology section or dock points for not following the prescribed approach?\n\nI want to be consistent across all submissions. Let me know your preference.\n\nThanks,\nJamie",
      snippet: "I'm grading Assignment 4 and have a question about the rubric...",
      category: 'department', receivedAt: hoursAgo(8), isRead: false,
    },
    {
      fromAddress: 'jamie.ortiz@uky.edu', fromName: 'Jamie Ortiz',
      subject: 'Lab Supply Request',
      body: "Dr. Thompson,\n\nWe're running low on a few items for next week's lab session:\n- USB drives (pack of 20)\n- Whiteboard markers (assorted colors)\n- Printed handouts for the network topology exercise\n\nCan I go ahead and order through the department account, or do you need to approve first?\n\nJamie",
      snippet: "We're running low on a few items for next week's lab session...",
      category: 'department', receivedAt: hoursAgo(12), isRead: true,
    },

    // Guest speaker thread (3 emails)
    {
      fromAddress: 'dr.martinez@stanford.edu', fromName: 'Dr. Elena Martinez',
      subject: 'RE: Guest Lecture — AI Ethics in Education',
      body: "Katie,\n\nThat works for me. April 10th at 2pm EST via Zoom sounds great. I can prepare a 30-minute talk on responsible AI deployment in educational settings, followed by Q&A.\n\nCould you send me a brief description of your students' background so I can calibrate the content?\n\nLooking forward to it!\nElena",
      snippet: 'April 10th at 2pm EST via Zoom sounds great...',
      category: 'external', receivedAt: hoursAgo(20), threadId: thread1, isRead: true,
    },
    {
      fromAddress: 'katie.thompson@uky.edu', fromName: 'Katie Thompson',
      subject: 'RE: Guest Lecture — AI Ethics in Education',
      body: "Elena,\n\nPerfect, thank you! The students are a mix of juniors and seniors in an educational technology program. Most have some exposure to AI concepts but limited hands-on experience with ethics frameworks.\n\nI'll send calendar invites and the Zoom link by end of week.\n\nBest,\nKatie",
      snippet: 'The students are a mix of juniors and seniors in educational technology...',
      category: 'external', receivedAt: hoursAgo(19), threadId: thread1, isRead: true,
    },
    {
      fromAddress: 'dr.martinez@stanford.edu', fromName: 'Dr. Elena Martinez',
      subject: 'RE: Guest Lecture — AI Ethics in Education',
      body: "Great — that helps a lot. I'll make sure to include concrete case studies they can relate to. Could you also share any specific topics or readings they've covered recently? I want to build on what they already know rather than repeat it.\n\nTalk soon,\nElena",
      snippet: "I'll make sure to include concrete case studies...",
      category: 'external', receivedAt: hoursAgo(5), threadId: thread1, isRead: false,
    },

    // IT notice
    {
      fromAddress: 'it-services@uky.edu', fromName: 'UK IT Services',
      subject: 'Scheduled Maintenance — Canvas LMS (March 25, 2-4am)',
      body: "Faculty and Staff,\n\nCanvas LMS will undergo scheduled maintenance on Tuesday, March 25 between 2:00 AM and 4:00 AM EST. During this window, the system will be unavailable.\n\nPlease plan any assignment deadlines accordingly. If you have assignments due during this window, we recommend extending the deadline by a few hours.\n\nUK Information Technology Services",
      snippet: 'Canvas LMS will undergo scheduled maintenance on Tuesday, March 25...',
      category: 'admin', receivedAt: hoursAgo(36), isRead: true,
    },

    // Newsletters
    {
      fromAddress: 'newsletter@chronicle.com', fromName: 'Chronicle of Higher Education',
      subject: 'This Week: How AI Is Reshaping Faculty Workloads',
      body: "THE CHRONICLE OF HIGHER EDUCATION\n\nThis Week's Top Stories:\n\n1. How AI Is Reshaping Faculty Workloads — And Why Institutions Need Policies Now\n2. The Student Mental Health Crisis: New Data from 500 Campuses\n3. Opinion: Why We Need to Rethink General Education Requirements\n\nRead more at chronicle.com",
      snippet: 'This Week: How AI Is Reshaping Faculty Workloads...',
      category: 'newsletter', receivedAt: hoursAgo(30), isRead: true,
    },
    {
      fromAddress: 'digest@acm.org', fromName: 'ACM TechNews',
      subject: 'ACM TechNews: March 20 Digest',
      body: "ACM TECHNEWS — March 20, 2026\n\n- New Framework for Evaluating AI-Generated Educational Content\n- NSF Announces $50M in Grants for Computing Education Research\n- Study: Students Using AI Tutors Show 23% Improvement in Problem-Solving\n\nRead the full digest at technews.acm.org",
      snippet: 'New Framework for Evaluating AI-Generated Educational Content...',
      category: 'newsletter', receivedAt: hoursAgo(42), isRead: true,
    },

    // External collaborator
    {
      fromAddress: 'r.patel@gatech.edu', fromName: 'Dr. Raj Patel',
      subject: 'Conference Paper Deadline — SIGCSE 2027',
      body: "Katie,\n\nJust a heads up — the SIGCSE 2027 paper deadline is May 15. I think we have a strong case study with our collaborative AI tutoring research. Are you still interested in co-authoring?\n\nIf so, I can draft the methodology section if you handle the results and discussion. We should aim to have a draft by end of April.\n\nLet me know,\nRaj",
      snippet: "SIGCSE 2027 paper deadline is May 15. Are you still interested in co-authoring?",
      category: 'external', receivedAt: hoursAgo(52), isRead: true,
    },
  ]

  await prisma.assistantEmail.createMany({
    data: emails.map(e => ({
      userId,
      fromAddress: e.fromAddress,
      fromName: e.fromName,
      toAddresses: ['katie.thompson@uky.edu'],
      subject: e.subject,
      body: e.body,
      snippet: e.snippet,
      category: e.category,
      receivedAt: e.receivedAt,
      isRead: e.isRead ?? false,
      threadId: e.threadId ?? null,
      source: 'simulated',
    })),
  })
}

// ─── Katie Thompson: Rules ───────────────────────────────────

async function seedKatieRules(userId: string) {
  const rules = [
    {
      naturalText: 'No meetings before 10am',
      ruleType: 'scheduling-constraint',
      structured: { type: 'time-block', beforeHour: 10, recurrence: 'daily', description: 'No meetings scheduled before 10:00 AM' },
    },
    {
      naturalText: 'Keep Friday afternoons free',
      ruleType: 'calendar-block',
      structured: { type: 'recurring-block', dayOfWeek: 5, startTime: '13:00', endTime: '17:00', recurrence: 'weekly', description: 'Friday afternoons blocked for focus time' },
    },
    {
      naturalText: 'Office hours are Tuesdays and Thursdays 2-4pm',
      ruleType: 'calendar-preference',
      structured: { type: 'recurring-slot', daysOfWeek: [2, 4], startTime: '14:00', endTime: '16:00', recurrence: 'weekly', description: 'Regular office hours' },
    },
  ]

  await prisma.assistantRule.createMany({
    data: rules.map(r => ({
      userId,
      naturalText: r.naturalText,
      ruleType: r.ruleType,
      structured: r.structured,
      isActive: true,
    })),
  })
}

// ─── Katie Thompson: Tasks ───────────────────────────────────

async function seedKatieTasks(userId: string) {
  const now = new Date()
  const daysFromNow = (d: number) => {
    const date = new Date(now)
    date.setDate(date.getDate() + d)
    date.setHours(17, 0, 0, 0)
    return date
  }

  const tasks = [
    { title: 'Review Module 4 submissions — 8 students below passing', dueAt: daysFromNow(3) },
    { title: 'Review accreditation self-study materials', dueAt: daysFromNow(7) },
    { title: 'Build Module 4 supplemental tool (hallucination detection practice)', dueAt: daysFromNow(2) },
    { title: 'Send Zoom link to Dr. Martinez for guest lecture', dueAt: daysFromNow(5) },
    { title: 'Respond to curriculum committee nomination', dueAt: daysFromNow(14) },
  ]

  await prisma.assistantTask.createMany({
    data: tasks.map(t => ({
      userId,
      title: t.title,
      dueAt: t.dueAt,
      status: 'pending',
      source: 'sandy',
    })),
  })
}

// ─── Tiana The: Calendar (~8 events) ─────────────────────────

async function seedTianaCalendar(userId: string) {
  const events = [
    // TEK-100 schedule
    { title: 'TEK-100: Module 7 — Multi-Modal AI', startTime: weekday(0, 10, 0), endTime: weekday(0, 10, 50), category: 'lecture' },
    { title: 'TEK-100: Module 7 continued', startTime: weekday(2, 10, 0), endTime: weekday(2, 10, 50), category: 'lecture' },
    { title: 'TEK-100: Module 4 Review Session', startTime: weekday(3, 11, 0), endTime: weekday(3, 12, 0), category: 'lecture', description: 'Extra review for hallucination detection — bring questions' },
    { title: 'TEK-100: Module 8 Preview', startTime: weekday(4, 10, 0), endTime: weekday(4, 10, 50), category: 'lecture' },
    // Law schedule
    { title: 'Constitutional Law', startTime: weekday(0, 13, 0), endTime: weekday(0, 14, 15), category: 'lecture' },
    { title: 'Legal Writing Workshop', startTime: weekday(1, 13, 0), endTime: weekday(1, 14, 0), category: 'lecture' },
    { title: 'Constitutional Law', startTime: weekday(2, 13, 0), endTime: weekday(2, 14, 15), category: 'lecture' },
    { title: 'TEK-100 Study Group', startTime: weekday(2, 18, 0), endTime: weekday(2, 19, 30), category: 'meeting', location: 'W.T. Young Library Room 204', description: 'Study group for Module 4 fact-checking with Marcus and Sarah' },
    { title: 'Constitutional Law', startTime: weekday(4, 13, 0), endTime: weekday(4, 14, 15), category: 'lecture' },
    { title: 'Office Hours — Dr. Thompson', startTime: weekday(1, 14, 0), endTime: weekday(1, 14, 30), category: 'office-hours' },
    { title: 'Mock Trial Practice', startTime: weekday(3, 17, 0), endTime: weekday(3, 19, 0), category: 'meeting', location: 'Courtroom 1' },
  ]

  await prisma.assistantCalendarEvent.createMany({
    data: events.map(e => ({
      userId,
      title: e.title,
      startTime: e.startTime,
      endTime: e.endTime,
      category: e.category ?? 'lecture',
      attendees: [],
      location: e.location ?? null,
      description: e.description ?? null,
      source: 'simulated',
      isAllDay: false,
    })),
  })
}

// ─── Tiana The: Emails (~14 emails) ─────────────────────────

async function seedTianaEmails(userId: string) {
  const now = new Date()
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000)

  const threadStudyGroup = 'thread-study-group-mod4'

  const emails = [
    // Professor — class announcement
    {
      fromAddress: 'katie.thompson@uky.edu', fromName: 'Dr. Katie Thompson',
      subject: 'TEK-100: Module 4 Review Session Added (Thursday)',
      body: "Hi everyone,\n\nI've added an extra review session for Module 4 (Hallucination Detection) this Thursday from 11am–12pm. Several students have flagged the source verification exercises as especially challenging, so we'll work through examples together.\n\nBring your practice exam attempts — we'll do a live walkthrough of the lateral reading technique.\n\nThe Hallucination Hunt assignment deadline remains Friday at 11:59pm. If you need a short extension, email me directly.\n\nSee you there,\nDr. Thompson",
      snippet: "I've added an extra review session for Module 4 this Thursday from 11am–12pm...",
      category: 'department', receivedAt: hoursAgo(3), isRead: false,
    },

    // Professor — reply to extension request
    {
      fromAddress: 'katie.thompson@uky.edu', fromName: 'Dr. Katie Thompson',
      subject: 'RE: Module 4 Hallucination Hunt — Extension?',
      body: "Hi Tiana,\n\nThank you for reaching out and for being upfront about where you're struggling. The lateral reading section trips up a lot of students — you're not alone.\n\nI can give you until Sunday 11:59pm. Please come to Thursday's review session if you can — I think it'll help with exactly the parts you're finding challenging.\n\nKeep up the good work.\n\nBest,\nDr. Thompson",
      snippet: 'I can give you until Sunday 11:59pm. Please come to Thursday\'s review session...',
      category: 'department', receivedAt: hoursAgo(2), isRead: false,
    },

    // Study group thread
    {
      fromAddress: 'marcus.johnson@uky.edu', fromName: 'Marcus Johnson',
      subject: 'Study group Wed — still on?',
      body: "Hey Tiana & Sarah,\n\nAre we still meeting Wednesday at 6pm in Young Library Room 204? I need help with the source verification section — I found three hallucinated citations but I can't tell if the statistical claims are real or fabricated.\n\nAlso I booked the room until 7:30 so we have plenty of time.\n\nMarcus",
      snippet: 'Are we still meeting Wednesday at 6pm in Young Library Room 204?',
      category: 'student', receivedAt: hoursAgo(8), threadId: threadStudyGroup, isRead: true,
    },
    {
      fromAddress: 'sarah.kim@uky.edu', fromName: 'Sarah Kim',
      subject: 'RE: Study group Wed — still on?',
      body: "I'm in! I'll bring my notes from the practice exam. I scored an 82 so I can help with the fact-checking part.\n\nTiana — want to split up the review topics? I can cover claim verification if you handle the lateral reading walkthrough?\n\nSee you both at 6!\nSarah",
      snippet: "I'm in! I'll bring my notes from the practice exam...",
      category: 'student', receivedAt: hoursAgo(6), threadId: threadStudyGroup, isRead: true,
    },

    // Mock Trial captain
    {
      fromAddress: 'alex.rivera@uky.edu', fromName: 'Alex Rivera',
      subject: 'Mock Trial — Witness Prep This Thursday',
      body: "Team,\n\nReminder that we have witness prep this Thursday from 5–7pm in Courtroom 1. Tiana, you're doing direct examination of the expert witness this round — please review the case packet pages 24-31 before practice.\n\nAlso: regionals are April 12th. Make sure your suits are clean.\n\nAlex Rivera\nMock Trial President",
      snippet: 'Witness prep this Thursday from 5–7pm in Courtroom 1...',
      category: 'student', receivedAt: hoursAgo(10), isRead: true,
    },

    // Financial Aid
    {
      fromAddress: 'financialaid@uky.edu', fromName: 'UK Financial Aid Office',
      subject: 'Action Required: FAFSA Verification Documents',
      body: "Dear Tiana The,\n\nYour 2026-2027 FAFSA application has been selected for verification. Please submit the following documents to your myUK portal by April 15:\n\n1. Federal tax return transcript (or IRS Data Retrieval)\n2. W-2 forms for all employers\n3. Verification worksheet (attached to your myUK portal)\n\nFailure to complete verification by the deadline may delay your financial aid package for Fall 2026.\n\nIf you have questions, schedule an appointment at financialaid.uky.edu or visit us in Funkhouser Building, Room 128.\n\nUK Financial Aid Office",
      snippet: 'Your FAFSA application has been selected for verification...',
      category: 'urgent', receivedAt: hoursAgo(14), isRead: false,
    },

    // Academic advisor
    {
      fromAddress: 'jennifer.wade@uky.edu', fromName: 'Dr. Jennifer Wade',
      subject: 'Fall 2026 Registration — Advising Hold',
      body: "Hi Tiana,\n\nYou have an advising hold on your account that needs to be cleared before Fall 2026 registration opens on April 7. Please schedule a 20-minute appointment with me through myUK before then.\n\nI'd also like to discuss your progress in the pre-law track and talk about whether you want to add the Legal Studies minor — it only requires 3 more courses based on what you've already taken.\n\nLooking forward to catching up.\n\nBest,\nDr. Jennifer Wade\nAcademic Advisor, College of Arts & Sciences",
      snippet: 'You have an advising hold that needs to be cleared before Fall registration...',
      category: 'urgent', receivedAt: hoursAgo(20), isRead: false,
    },

    // Career Services
    {
      fromAddress: 'careercenter@uky.edu', fromName: 'UK Career Center',
      subject: 'Pre-Law Career Fair — April 3',
      body: "Dear Pre-Law Students,\n\nThe annual Pre-Law Career Fair is next Thursday, April 3, from 1–4pm in the Gatton Student Center Ballroom.\n\n15 law schools and 8 legal employers will be represented, including:\n- UK College of Law\n- Vanderbilt Law School\n- Stites & Harbison LLP\n- Kentucky Attorney General's Office\n- Legal Aid of the Bluegrass\n\nBring copies of your resume and dress professionally. RSVP at careers.uky.edu/events.\n\nUK Career Center",
      snippet: 'Pre-Law Career Fair next Thursday, April 3, from 1–4pm...',
      category: 'admin', receivedAt: hoursAgo(26), isRead: true,
    },

    // Constitutional Law professor
    {
      fromAddress: 'prof.harrison@uky.edu', fromName: 'Professor Harrison',
      subject: 'Con Law: Chapter 14 Reading Guide Posted',
      body: "Class,\n\nI've posted the reading guide for Chapter 14 (Due Process) on Canvas. This is a dense chapter — I recommend starting early.\n\nPay special attention to the distinction between substantive and procedural due process. The cases to focus on are:\n- Mathews v. Eldridge (1976)\n- Washington v. Glucksberg (1997)\n- Obergefell v. Hodges (2015)\n\nWe'll cold-call on these Wednesday. Be ready.\n\nProfessor Harrison",
      snippet: "I've posted the reading guide for Chapter 14 (Due Process)...",
      category: 'department', receivedAt: hoursAgo(30), isRead: true,
    },

    // Library
    {
      fromAddress: 'library@uky.edu', fromName: 'UK Libraries',
      subject: 'Interlibrary Loan Ready for Pickup',
      body: "Dear Tiana The,\n\nYour interlibrary loan request is ready for pickup at the W.T. Young Library Circulation Desk:\n\n  \"Constitutional Interpretation: Textual Meaning, Original Intent, and Judicial Review\" — Whittington, Keith E.\n\nThis item is available for 21 days. You may renew once.\n\nPickup hours: Mon–Fri 8am–10pm, Sat–Sun 10am–6pm.\n\nUK Libraries",
      snippet: 'Your interlibrary loan request is ready for pickup...',
      category: 'admin', receivedAt: hoursAgo(34), isRead: true,
    },

    // Student org newsletter
    {
      fromAddress: 'sga@uky.edu', fromName: 'Student Government Association',
      subject: 'SGA Weekly: Mental Health Resources + Spring Events',
      body: "THE WEEKLY WILDCAT — March 30, 2026\n\nThis Week:\n1. Free counseling sessions available through CAPS — schedule at uky.edu/counseling\n2. Spring Concert announcement coming Monday — follow @uksga on Instagram\n3. Library extended hours during finals prep: open until 2am starting April 14\n4. Student Legal Services: free 30-min consultations for lease/contract questions\n\nUpcoming Events:\n- Pre-Law Career Fair: April 3, Gatton Ballroom\n- Spring Fling: April 5, The 90\n- Study Abroad Info Session: April 8, Whitehall Auditorium\n\nSGA — Your Voice. Your University.",
      snippet: 'Free counseling sessions, spring concert, library extended hours...',
      category: 'newsletter', receivedAt: hoursAgo(40), isRead: true,
    },

    // Roommate
    {
      fromAddress: 'maya.chen@uky.edu', fromName: 'Maya Chen',
      subject: 'Apartment lease renewal — need to decide by Friday',
      body: "Hey Tiana,\n\nOur landlord emailed about the lease renewal. If we want to keep the apartment for next year, we need to sign by this Friday. Rent goes up $50/month but it's still cheaper than anything else near campus.\n\nAre you staying? I'm in if you are. Let me know so I can respond.\n\nAlso I ate the last of your granola bars, sorry. I'll replace them tomorrow.\n\nMaya",
      snippet: 'Lease renewal — need to sign by Friday. Rent goes up $50/month...',
      category: 'student', receivedAt: hoursAgo(5), isRead: false,
    },

    // IT Services
    {
      fromAddress: 'it-services@uky.edu', fromName: 'UK IT Services',
      subject: 'Password Expiring in 7 Days',
      body: "Dear Tiana The,\n\nYour UK LinkBlue password will expire in 7 days. Please update your password at myuk.uky.edu before it expires to avoid losing access to Canvas, email, and campus Wi-Fi.\n\nPassword requirements: 12+ characters, one uppercase, one number, one special character. Cannot reuse your last 10 passwords.\n\nUK Information Technology Services",
      snippet: 'Your LinkBlue password will expire in 7 days...',
      category: 'admin', receivedAt: hoursAgo(48), isRead: true,
    },

    // Dining survey
    {
      fromAddress: 'dining@uky.edu', fromName: 'UK Dining',
      subject: 'Tell us what you think — Spring Dining Survey',
      body: "Hi Wildcats!\n\nWe want to hear from you! Take our 3-minute Spring Dining Survey for a chance to win a $25 dining credit.\n\nWe're especially looking for feedback on:\n- Late-night dining options at The 90\n- New menu items at Blazer Dining\n- Mobile ordering experience\n\nSurvey link: dining.uky.edu/survey (open until April 7)\n\nUK Dining Services",
      snippet: 'Take our 3-minute Spring Dining Survey for a chance to win $25...',
      category: 'newsletter', receivedAt: hoursAgo(56), isRead: true,
    },
  ]

  await prisma.assistantEmail.createMany({
    data: emails.map(e => ({
      userId,
      fromAddress: e.fromAddress,
      fromName: e.fromName,
      toAddresses: ['tiana.the.student@uky.edu'],
      subject: e.subject,
      body: e.body,
      snippet: e.snippet,
      category: e.category,
      receivedAt: e.receivedAt,
      isRead: e.isRead ?? false,
      threadId: e.threadId ?? null,
      source: 'simulated',
    })),
  })
}

// ─── Tiana The: Tasks ────────────────────────────────────────

async function seedTianaTasks(userId: string) {
  const now = new Date()
  const daysFromNow = (d: number) => {
    const date = new Date(now)
    date.setDate(date.getDate() + d)
    date.setHours(23, 59, 0, 0)
    return date
  }

  await prisma.assistantTask.createMany({
    data: [
      { userId, title: 'TEK-100: Finish Hallucination Hunt assignment (Module 4)', dueAt: daysFromNow(3), status: 'pending', source: 'sandy' },
      { userId, title: 'TEK-100: Review spaced repetition concepts (3 overdue)', dueAt: daysFromNow(-1), status: 'pending', source: 'sandy' },
      { userId, title: 'Read Chapter 14 — Due Process (cold-call Wednesday)', dueAt: daysFromNow(2), status: 'pending', source: 'sandy' },
      { userId, title: 'Prepare moot court brief — direct examination outline', dueAt: daysFromNow(10), status: 'pending', source: 'sandy' },
      { userId, title: 'Submit FAFSA verification documents', dueAt: daysFromNow(16), status: 'pending', source: 'manual' },
      { userId, title: 'Schedule advising appointment (registration hold)', dueAt: daysFromNow(5), status: 'pending', source: 'sandy' },
      { userId, title: 'Reply to Maya about lease renewal', dueAt: daysFromNow(2), status: 'pending', source: 'sandy' },
    ],
  })
}

// ─── Admin: Calendar (~6 events) ─────────────────────────────

async function seedAdminCalendar(userId: string) {
  const events = [
    { title: 'Executive Team Standup', startTime: weekday(0, 9, 0), endTime: weekday(0, 9, 30), category: 'admin' },
    { title: 'Platform Analytics Review', startTime: weekday(1, 10, 0), endTime: weekday(1, 11, 0), category: 'admin' },
    { title: 'FERPA Compliance Check-in', startTime: weekday(2, 14, 0), endTime: weekday(2, 15, 0), category: 'admin' },
    { title: 'Dean Robinson — AI Strategy', startTime: weekday(3, 11, 0), endTime: weekday(3, 12, 0), category: 'meeting', location: 'Admin Building 102' },
    { title: 'IT Infrastructure Planning', startTime: weekday(3, 14, 0), endTime: weekday(3, 15, 30), category: 'admin' },
    { title: 'Board Prep Meeting', startTime: weekday(4, 10, 0), endTime: weekday(4, 11, 30), category: 'admin', location: 'Main Building 500' },
  ]

  await prisma.assistantCalendarEvent.createMany({
    data: events.map(e => ({
      userId,
      title: e.title,
      startTime: e.startTime,
      endTime: e.endTime,
      category: e.category,
      attendees: [],
      location: e.location ?? null,
      description: null,
      source: 'simulated',
      isAllDay: false,
    })),
  })
}
