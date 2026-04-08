import 'dotenv/config'

import { PrismaPg } from '@prisma/adapter-pg'
import {
  AssignmentType,
  AssessmentDeadlineStatus,
  AssessmentScope,
  GradebookStatus,
  Prisma,
  PrismaClient,
  RecommendationStatus,
  UserRole,
} from '../app/generated/prisma'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

type AdviseeSeed = {
  name: string
  email: string
  classStanding: string
  hasRegistrationHold?: boolean
  holdReason?: string
  needsDegreeAuditReview?: boolean
  riskScore?: number
  learningVelocity?: number
  lastSessionDaysAgo?: number
}

const adviseeSeeds: AdviseeSeed[] = [
  { name: 'Sarah Kim', email: 'sarah.kim.student@uky.edu', classStanding: 'Senior', needsDegreeAuditReview: true, riskScore: 0.34, learningVelocity: 0.08, lastSessionDaysAgo: 2 },
  { name: 'James Oduya', email: 'james.oduya@uky.edu', classStanding: 'Junior', riskScore: 0.22, learningVelocity: 0.12, lastSessionDaysAgo: 1 },
  { name: 'Priya Patel', email: 'priya.patel.student@uky.edu', classStanding: 'Sophomore', riskScore: 0.28, learningVelocity: 0.09, lastSessionDaysAgo: 2 },
  { name: 'Javier Martinez', email: 'javier.martinez@uky.edu', classStanding: 'First-Year', riskScore: 0.82, learningVelocity: -0.24, lastSessionDaysAgo: 2 },
  { name: 'Alice Chen', email: 'alice.chen@uky.edu', classStanding: 'First-Year', riskScore: 0.74, learningVelocity: -0.16, lastSessionDaysAgo: 14 },
  { name: 'Ruth Okafor', email: 'ruth.okafor@uky.edu', classStanding: 'Sophomore', hasRegistrationHold: true, holdReason: 'FERPA release required', riskScore: 0.46, learningVelocity: 0.03, lastSessionDaysAgo: 1 },
  { name: 'Meera Singh', email: 'meera.singh@uky.edu', classStanding: 'First-Year', riskScore: 0.67, learningVelocity: -0.07, lastSessionDaysAgo: 3 },
  { name: 'Elijah Brooks', email: 'elijah.brooks@uky.edu', classStanding: 'Junior', needsDegreeAuditReview: true, riskScore: 0.31, learningVelocity: 0.04, lastSessionDaysAgo: 2 },
  { name: 'Fatima Noor', email: 'fatima.noor@uky.edu', classStanding: 'Senior', riskScore: 0.19, learningVelocity: 0.13, lastSessionDaysAgo: 1 },
  { name: 'Daniel Park', email: 'daniel.park@uky.edu', classStanding: 'Sophomore', riskScore: 0.27, learningVelocity: 0.11, lastSessionDaysAgo: 1 },
  { name: 'Olivia Turner', email: 'olivia.turner@uky.edu', classStanding: 'Senior', needsDegreeAuditReview: true, riskScore: 0.38, learningVelocity: 0.02, lastSessionDaysAgo: 3 },
  { name: 'Noah Carter', email: 'noah.carter@uky.edu', classStanding: 'First-Year', riskScore: 0.24, learningVelocity: 0.09, lastSessionDaysAgo: 2 },
  { name: 'Zoe Kim', email: 'zoe.kim@uky.edu', classStanding: 'Junior', riskScore: 0.21, learningVelocity: 0.07, lastSessionDaysAgo: 1 },
  { name: 'Leo Alvarez', email: 'leo.alvarez@uky.edu', classStanding: 'First-Year', riskScore: 0.29, learningVelocity: 0.05, lastSessionDaysAgo: 2 },
  { name: 'Sofia Nguyen', email: 'sofia.nguyen@uky.edu', classStanding: 'Sophomore', riskScore: 0.25, learningVelocity: 0.14, lastSessionDaysAgo: 1 },
  { name: 'Maya Bennett', email: 'maya.bennett@uky.edu', classStanding: 'Senior', riskScore: 0.18, learningVelocity: 0.16, lastSessionDaysAgo: 1 },
  { name: 'Marcus Johnson', email: 'marcus.johnson@uky.edu', classStanding: 'First-Year', riskScore: 0.58, learningVelocity: -0.11, lastSessionDaysAgo: 5 },
  { name: 'Ava Reynolds', email: 'ava.reynolds@uky.edu', classStanding: 'Junior', riskScore: 0.2, learningVelocity: 0.15, lastSessionDaysAgo: 1 },
  { name: 'Nia Coleman', email: 'nia.coleman@uky.edu', classStanding: 'Sophomore', riskScore: 0.32, learningVelocity: 0.06, lastSessionDaysAgo: 2 },
  { name: 'Gabriel Flores', email: 'gabriel.flores@uky.edu', classStanding: 'First-Year', hasRegistrationHold: true, holdReason: 'Financial hold', riskScore: 0.49, learningVelocity: -0.04, lastSessionDaysAgo: 4 },
  { name: 'Hannah Lee', email: 'hannah.lee@uky.edu', classStanding: 'Senior', riskScore: 0.23, learningVelocity: 0.1, lastSessionDaysAgo: 1 },
  { name: 'Ethan Walker', email: 'ethan.walker@uky.edu', classStanding: 'Junior', riskScore: 0.17, learningVelocity: 0.18, lastSessionDaysAgo: 1 },
  { name: 'Chloe Davis', email: 'chloe.davis@uky.edu', classStanding: 'Sophomore', riskScore: 0.26, learningVelocity: 0.07, lastSessionDaysAgo: 2 },
]

function daysAgo(days: number, hour = 10, minute = 0): Date {
  const value = new Date()
  value.setDate(value.getDate() - days)
  value.setHours(hour, minute, 0, 0)
  return value
}

function daysFromNow(days: number, hour = 10, minute = 0): Date {
  const value = new Date()
  value.setDate(value.getDate() + days)
  value.setHours(hour, minute, 0, 0)
  return value
}

function todayAt(hour: number, minute = 0): Date {
  const value = new Date()
  value.setHours(hour, minute, 0, 0)
  return value
}

async function upsertUser(input: {
  email: string
  name: string
  role: UserRole
  department?: string
  college?: string
  title?: string
}) {
  return prisma.user.upsert({
    where: { email: input.email },
    update: {
      name: input.name,
      role: input.role,
      department: input.department ?? null,
      college: input.college ?? null,
      title: input.title ?? null,
    },
    create: {
      email: input.email,
      name: input.name,
      role: input.role,
      department: input.department ?? null,
      college: input.college ?? null,
      title: input.title ?? null,
    },
  })
}

async function ensureStudentProfile(userId: string, seed: AdviseeSeed) {
  await prisma.studentProfile.upsert({
    where: { userId },
    update: {
      riskScore: seed.riskScore ?? 0.24,
      learningVelocity: seed.learningVelocity ?? 0.08,
      lastSessionAt: daysAgo(seed.lastSessionDaysAgo ?? 2, 16, 0),
      totalSessionCount: 8,
      topConceptsThisWeek: ['hallucination-detection', 'source-verification', 'prompt-engineering'],
      preferredModality: 'dialogue',
    },
    create: {
      userId,
      riskScore: seed.riskScore ?? 0.24,
      learningVelocity: seed.learningVelocity ?? 0.08,
      lastSessionAt: daysAgo(seed.lastSessionDaysAgo ?? 2, 16, 0),
      totalSessionCount: 8,
      topConceptsThisWeek: ['hallucination-detection', 'source-verification', 'prompt-engineering'],
      preferredModality: 'dialogue',
    },
  })
}

async function main() {
  const katie = await upsertUser({
    email: 'katie.thompson@uky.edu',
    name: 'Katie Thompson',
    role: UserRole.EDUCATOR,
    department: 'College of Engineering',
    college: 'College of Engineering',
    title: 'Associate Professor of Engineering',
  })

  const chair = await upsertUser({
    email: 'carol.ellis@uky.edu',
    name: 'Carol Ellis',
    role: UserRole.STAFF,
    department: katie.department ?? 'College of Engineering',
    college: katie.college ?? 'College of Engineering',
    title: 'Department Chair',
  })

  const dean = await upsertUser({
    email: 'dean.robinson@uky.edu',
    name: 'Dean Robinson',
    role: UserRole.ADMIN,
    department: katie.department ?? 'College of Engineering',
    college: katie.college ?? 'College of Engineering',
    title: 'Dean',
  })

  const assessmentLead = await upsertUser({
    email: 'lisa.park@uky.edu',
    name: 'Lisa Park',
    role: UserRole.STAFF,
    department: katie.department ?? 'College of Engineering',
    college: katie.college ?? 'College of Engineering',
    title: 'Assessment Director',
  })

  const tek100 =
    (await prisma.course.findUnique({ where: { courseCode: 'TEK-100' } })) ??
    (await prisma.course.create({
      data: {
        courseCode: 'TEK-100',
        title: 'Technology & Society',
        description: 'First-year technology, ethics, and AI literacy course.',
        semester: 'Spring 2026',
        instructorId: katie.id,
        isPublic: true,
        importSource: 'manual',
      },
    }))

  if (tek100.instructorId !== katie.id) {
    await prisma.course.update({
      where: { id: tek100.id },
      data: { instructorId: katie.id },
    })
  }

  const registrationWindowStart = new Date('2026-04-07T08:00:00-04:00')
  const registrationWindowEnd = new Date('2026-04-11T17:00:00-04:00')

  const students = await Promise.all(
    adviseeSeeds.map(async (seed) => {
      const student = await upsertUser({
        email: seed.email,
        name: seed.name,
        role: UserRole.STUDENT,
        department: 'College of Engineering',
        college: 'College of Engineering',
      })

      await ensureStudentProfile(student.id, seed)

      const existingEnrollment = await prisma.courseEnrollment.findFirst({
        where: { courseId: tek100.id, studentId: student.id },
        select: { id: true },
      })

      if (!existingEnrollment) {
        await prisma.courseEnrollment.create({
          data: {
            courseId: tek100.id,
            studentId: student.id,
            enrolledAt: daysAgo(45, 9, 0),
          },
        })
      }

      await prisma.facultyAdvisee.upsert({
        where: { facultyId_studentId: { facultyId: katie.id, studentId: student.id } },
        update: {
          classStanding: seed.classStanding,
          registrationWindowStart,
          registrationWindowEnd,
          hasRegistrationHold: seed.hasRegistrationHold ?? false,
          holdReason: seed.holdReason ?? null,
          needsDegreeAuditReview: seed.needsDegreeAuditReview ?? false,
          source: 'simulated',
        },
        create: {
          facultyId: katie.id,
          studentId: student.id,
          classStanding: seed.classStanding,
          registrationWindowStart,
          registrationWindowEnd,
          hasRegistrationHold: seed.hasRegistrationHold ?? false,
          holdReason: seed.holdReason ?? null,
          needsDegreeAuditReview: seed.needsDegreeAuditReview ?? false,
          source: 'simulated',
        },
      })

      return student
    }),
  )

  const studentByEmail = new Map(students.map((student) => [student.email, student]))

  await prisma.recommendationRequest.deleteMany({
    where: {
      facultyId: katie.id,
      studentName: { in: ['Sarah Kim', 'James Oduya', 'Priya Patel'] },
    },
  })

  await prisma.recommendationRequest.createMany({
    data: [
      {
        facultyId: katie.id,
        studentName: 'Sarah Kim',
        studentEmail: 'sarah.kim.student@uky.edu',
        purpose: 'PhD program',
        targetOrg: 'MIT EECS',
        dueDate: new Date('2026-04-01T17:00:00-04:00'),
        status: RecommendationStatus.IN_PROGRESS,
        notes: 'Strong research instincts in TEK-100 and outstanding office-hours engagement. Position this toward a computer science PhD audience.',
        draftContent: 'Sarah consistently shows rare intellectual maturity and persistence in open-ended research work.',
        source: 'simulated',
      },
      {
        facultyId: katie.id,
        studentName: 'James Oduya',
        studentEmail: 'james.oduya@uky.edu',
        purpose: 'Scholarship',
        targetOrg: 'UK Honors',
        dueDate: new Date('2026-04-15T17:00:00-04:00'),
        status: RecommendationStatus.PENDING,
        notes: 'Highlight peer leadership and steady performance across technical writing assignments.',
        source: 'simulated',
      },
      {
        facultyId: katie.id,
        studentName: 'Priya Patel',
        studentEmail: 'priya.patel.student@uky.edu',
        purpose: 'Internship',
        targetOrg: 'Google STEP',
        dueDate: new Date('2026-04-20T17:00:00-04:00'),
        status: RecommendationStatus.PENDING,
        notes: 'Recommend emphasizing strong collaboration and presentation skills.',
        source: 'simulated',
      },
    ],
  })

  const seededCommitteeIds = ['committee-faculty-curriculum', 'committee-faculty-assessment']

  await prisma.committeeActionItem.deleteMany({
    where: { committeeId: { in: seededCommitteeIds } },
  })
  await prisma.committeeMeeting.deleteMany({
    where: { committeeId: { in: seededCommitteeIds } },
  })
  await prisma.committee.deleteMany({
    where: { id: { in: seededCommitteeIds } },
  })

  const curriculumMembers = [
    { name: chair.name, email: chair.email, role: 'chair', userId: chair.id },
    { name: katie.name, email: katie.email, role: 'member', userId: katie.id },
    { name: dean.name, email: dean.email, role: 'ex-officio', userId: dean.id },
  ] as Prisma.InputJsonValue

  const assessmentMembers = [
    { name: assessmentLead.name, email: assessmentLead.email, role: 'chair', userId: assessmentLead.id },
    { name: katie.name, email: katie.email, role: 'member', userId: katie.id },
    { name: chair.name, email: chair.email, role: 'member', userId: chair.id },
  ] as Prisma.InputJsonValue

  await prisma.committee.createMany({
    data: [
      {
        id: 'committee-faculty-curriculum',
        name: 'Curriculum Committee',
        description: 'Reviews course proposals, prerequisite updates, and undergraduate curriculum changes.',
        type: 'academic',
        chairId: chair.id,
        members: curriculumMembers,
        cadence: 'weekly',
        meetingDay: 'Thursday',
        meetingTime: '3:00 PM',
        meetingLocation: 'White Hall 310',
        agendaTemplate: 'Review syllabus revisions\nApprove curriculum proposals\nTrack action items',
        source: 'simulated',
      },
      {
        id: 'committee-faculty-assessment',
        name: 'Assessment & Accreditation',
        description: 'Coordinates outcome reporting, accreditation evidence, and course assessment submissions.',
        type: 'academic',
        chairId: assessmentLead.id,
        members: assessmentMembers,
        cadence: 'biweekly',
        meetingDay: 'Tuesday',
        meetingTime: '10:00 AM',
        meetingLocation: 'Main Building 118',
        agendaTemplate: 'Assessment snapshots\nAccreditation updates\nEvidence requests',
        source: 'simulated',
      },
    ],
  })

  const curriculumPastMeeting = await prisma.committeeMeeting.create({
    data: {
      committeeId: 'committee-faculty-curriculum',
      meetingNumber: 6,
      date: new Date('2026-03-21T15:00:00-04:00'),
      location: 'White Hall 310',
      duration: 60,
      formattedMinutes: '# Curriculum Committee Minutes\n\nReviewed TEK-100 syllabus updates and approved the agenda for the minor proposal packet.',
      attendees: {
        present: ['Carol Ellis', 'Katie Thompson', 'Dean Robinson'],
        absent: [],
      },
      distributionStatus: 'distributed',
      distributedAt: new Date('2026-03-22T09:00:00-04:00'),
      status: 'finalized',
      source: 'simulated',
    },
  })

  await prisma.committeeMeeting.create({
    data: {
      committeeId: 'committee-faculty-curriculum',
      meetingNumber: 7,
      date: new Date('2026-03-28T15:00:00-04:00'),
      location: 'White Hall 310',
      duration: 60,
      status: 'draft',
      source: 'simulated',
    },
  })

  const assessmentPastMeeting = await prisma.committeeMeeting.create({
    data: {
      committeeId: 'committee-faculty-assessment',
      meetingNumber: 4,
      date: new Date('2026-03-19T10:00:00-04:00'),
      location: 'Main Building 118',
      duration: 50,
      formattedMinutes: '# Assessment & Accreditation Minutes\n\nReviewed course-level evidence requests and SACSCOC data submission timing.',
      attendees: {
        present: ['Lisa Park', 'Katie Thompson', 'Carol Ellis'],
        absent: [],
      },
      distributionStatus: 'distributed',
      distributedAt: new Date('2026-03-20T08:30:00-04:00'),
      status: 'finalized',
      source: 'simulated',
    },
  })

  await prisma.committeeMeeting.create({
    data: {
      committeeId: 'committee-faculty-assessment',
      meetingNumber: 5,
      date: new Date('2026-04-02T10:00:00-04:00'),
      location: 'Main Building 118',
      duration: 50,
      status: 'draft',
      source: 'simulated',
    },
  })

  await prisma.committeeActionItem.createMany({
    data: [
      {
        committeeId: 'committee-faculty-curriculum',
        meetingId: curriculumPastMeeting.id,
        action: 'Review TEK-100 syllabus update',
        ownerName: katie.name,
        ownerUserId: katie.id,
        dueDate: new Date('2026-03-27T17:00:00-04:00'),
        priority: 'high',
        status: 'open',
      },
      {
        committeeId: 'committee-faculty-assessment',
        meetingId: assessmentPastMeeting.id,
        action: 'Submit SACSCOC data',
        ownerName: katie.name,
        ownerUserId: katie.id,
        dueDate: new Date('2026-03-26T17:00:00-04:00'),
        priority: 'high',
        status: 'in-progress',
      },
    ],
  })

  await prisma.adminAnnouncement.deleteMany({
    where: {
      title: {
        in: [
          'Spring grades due May 5',
          'New lab space proposals open next week',
          'Assessment reminder: submit midterm evidence checks',
        ],
      },
      createdById: { in: [chair.id, dean.id, assessmentLead.id] },
    },
  })

  await prisma.adminAnnouncement.createMany({
    data: [
      {
        title: 'Spring grades due May 5',
        message: 'Please plan final grading timelines now so there is no end-of-term bottleneck.',
        tone: 'INFO',
        startsAt: new Date('2026-03-22T09:00:00-04:00'),
        createdAt: new Date('2026-03-22T09:00:00-04:00'),
        createdById: chair.id,
      },
      {
        title: 'New lab space proposals open next week',
        message: 'The Dean\'s office will begin accepting proposals for the summer lab refresh cycle on Monday.',
        tone: 'INFO',
        startsAt: new Date('2026-03-20T11:00:00-04:00'),
        createdAt: new Date('2026-03-20T11:00:00-04:00'),
        createdById: dean.id,
      },
      {
        title: 'Assessment reminder: submit midterm evidence checks',
        message: 'Upload course evidence snapshots before March 31 so they can be included in the college packet.',
        tone: 'INFO',
        startsAt: new Date('2026-03-18T08:15:00-04:00'),
        createdAt: new Date('2026-03-18T08:15:00-04:00'),
        createdById: assessmentLead.id,
      },
    ],
  })

  await prisma.assessmentDeadline.deleteMany({
    where: {
      OR: [
        { title: 'SACSCOC Outcome Report' },
        { title: 'Mid-semester grades' },
      ],
    },
  })

  await prisma.assessmentDeadline.createMany({
    data: [
      {
        title: 'SACSCOC Outcome Report',
        description: 'College packet needs TEK-100 assessment evidence.',
        dueDate: new Date('2026-04-15T17:00:00-04:00'),
        scope: AssessmentScope.INSTITUTION,
        department: katie.department ?? 'College of Engineering',
        createdById: assessmentLead.id,
        progressLabel: 'TEK-100 data needed',
        status: AssessmentDeadlineStatus.UPCOMING,
        source: 'simulated',
      },
      {
        title: 'Mid-semester grades',
        description: 'Enter remaining TEK-100 grades before the registrar deadline.',
        dueDate: new Date('2026-03-31T17:00:00-04:00'),
        scope: AssessmentScope.COURSE,
        courseId: tek100.id,
        department: katie.department ?? 'College of Engineering',
        createdById: katie.id,
        progressLabel: '12 of 28 entered',
        status: AssessmentDeadlineStatus.IN_PROGRESS,
        source: 'simulated',
      },
    ],
  })

  const assignmentId = 'assignment-faculty-home-grade-queue'
  const assignment = await prisma.assignment.upsert({
    where: { id: assignmentId },
    update: {
      courseId: tek100.id,
      title: 'Midterm reflection memo',
      description: 'Short reflection on AI evaluation methods.',
      type: AssignmentType.LEGACY_SUBMISSION,
      dueAt: daysAgo(3, 23, 59),
      pointsPossible: 100,
      category: 'paper',
      isPublished: true,
      acceptingLate: true,
    },
    create: {
      id: assignmentId,
      courseId: tek100.id,
      title: 'Midterm reflection memo',
      description: 'Short reflection on AI evaluation methods.',
      type: AssignmentType.LEGACY_SUBMISSION,
      dueAt: daysAgo(3, 23, 59),
      pointsPossible: 100,
      category: 'paper',
      isPublished: true,
      acceptingLate: true,
    },
  })

  for (const email of ['javier.martinez@uky.edu', 'alice.chen@uky.edu', 'sarah.kim.student@uky.edu', 'gabriel.flores@uky.edu']) {
    const student = studentByEmail.get(email)
    if (!student) continue

    let submission = await prisma.submission.findFirst({
      where: { assignmentId: assignment.id, studentId: student.id },
    })

    if (!submission) {
      submission = await prisma.submission.create({
        data: {
          assignmentId: assignment.id,
          studentId: student.id,
          type: AssignmentType.LEGACY_SUBMISSION,
          textContent: `${student.name} submission for the midterm reflection memo.`,
          submittedAt: daysAgo(4, 14, 0),
        },
      })
    }

    await prisma.gradebookEntry.upsert({
      where: { submissionId: submission.id },
      update: {
        status: GradebookStatus.AI_DRAFT,
        aiScore: 84,
        aiRawFeedback: 'AI draft feedback is ready for faculty review.',
        createdAt: daysAgo(4, 16, 0),
        updatedAt: daysAgo(3, 11, 0),
      },
      create: {
        submissionId: submission.id,
        status: GradebookStatus.AI_DRAFT,
        aiScore: 84,
        aiRawFeedback: 'AI draft feedback is ready for faculty review.',
        createdAt: daysAgo(4, 16, 0),
        updatedAt: daysAgo(3, 11, 0),
      },
    })
  }

  const todayStart = todayAt(0, 0)
  const todayEnd = todayAt(23, 59)
  await prisma.assistantCalendarEvent.deleteMany({
    where: {
      userId: katie.id,
      category: 'office-hours',
      startTime: { gte: todayStart, lte: todayEnd },
    },
  })

  await prisma.assistantCalendarEvent.create({
    data: {
      userId: katie.id,
      title: 'Office Hours',
      description: 'Drop-in support for TEK-100 students.',
      startTime: todayAt(14, 0),
      endTime: todayAt(15, 30),
      location: 'White Hall 310',
      attendees: [],
      source: 'simulated',
      category: 'office-hours',
    },
  })

  await prisma.officeHoursQuestion.deleteMany({
    where: {
      courseId: tek100.id,
      question: {
        in: [
          'Can you walk through the midterm review steps for Module 5 again?',
          'I am still confused about which evidence to trust for the midterm review.',
          'What should we focus on before the Module 5 midterm review session?',
        ],
      },
    },
  })

  await prisma.officeHoursCluster.deleteMany({
    where: {
      courseId: tek100.id,
      label: 'Midterm review - Module 5',
    },
  })

  const officeHoursCluster = await prisma.officeHoursCluster.create({
    data: {
      courseId: tek100.id,
      label: 'Midterm review - Module 5',
      conceptSlugs: ['midterm-review', 'source-verification'],
      questionCount: 0,
      status: 'open',
    },
  })

  const officeHoursStudents = [
    studentByEmail.get('javier.martinez@uky.edu'),
    studentByEmail.get('alice.chen@uky.edu'),
    studentByEmail.get('sarah.kim.student@uky.edu'),
  ].filter(Boolean)

  const createdQuestions = []
  for (const [index, student] of officeHoursStudents.entries()) {
    const question = await prisma.officeHoursQuestion.create({
      data: {
        courseId: tek100.id,
        studentId: student!.id,
        question: [
          'Can you walk through the midterm review steps for Module 5 again?',
          'I am still confused about which evidence to trust for the midterm review.',
          'What should we focus on before the Module 5 midterm review session?',
        ][index]!,
        context: 'Queueing for today\'s office hours block.',
        conceptSlugs: ['midterm-review', 'source-verification'],
        triageResult: 'clustered',
        clusterId: officeHoursCluster.id,
        priority: 2,
        createdAt: todayAt(13, 10 + index * 7),
      },
    })
    createdQuestions.push(question)
  }

  await prisma.officeHoursCluster.update({
    where: { id: officeHoursCluster.id },
    data: {
      questionCount: createdQuestions.length,
      representativeQuestionId: createdQuestions[0]?.id ?? null,
    },
  })

  console.log(`[seed-faculty-v2] Seeded ${students.length} advisees for Katie Thompson`)
  console.log('[seed-faculty-v2] Seeded recommendation requests, committee actions, assessment deadlines, office hours, and grading queue data')
}

main()
  .catch((error) => {
    console.error('[seed-faculty-v2] Failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
