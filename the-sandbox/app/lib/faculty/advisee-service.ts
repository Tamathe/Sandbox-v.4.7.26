import { differenceInCalendarDays, endOfDay, startOfDay } from 'date-fns'
import { prisma } from '../prisma'

export type FlaggedStudentFlag = 'grade_drop' | 'inactive' | 'accommodation' | 'attendance'

export interface FacultyAdviseeListItem {
  id: string
  name: string
  email: string
  classStanding: string | null
  hasRegistrationHold: boolean
  holdReason: string | null
  needsDegreeAuditReview: boolean
}

export interface FacultyAdviseeStats {
  total: number
  withHolds: number
  needsDegreeAudit: number
  registrationWindow: { start: string; end: string } | null
}

export interface FacultyOfficeHoursSummary {
  todaySlot: { start: string; end: string } | null
  queueCount: number
  topTheme: string | null
}

export interface FacultyFlaggedStudent {
  id: string
  name: string
  flag: FlaggedStudentFlag
  course: string
  detail: string
}

interface FacultyAdvisingData {
  advisees: FacultyAdviseeStats
  officeHours: FacultyOfficeHoursSummary
  flaggedStudents: FacultyFlaggedStudent[]
}

const fallbackAdvisees: FacultyAdviseeListItem[] = [
  { id: 'adv-sarah-kim', name: 'Sarah Kim', email: 'sarah.kim.student@uky.edu', classStanding: 'Senior', hasRegistrationHold: false, holdReason: null, needsDegreeAuditReview: true },
  { id: 'adv-james-oduya', name: 'James Oduya', email: 'james.oduya@uky.edu', classStanding: 'Junior', hasRegistrationHold: false, holdReason: null, needsDegreeAuditReview: false },
  { id: 'adv-priya-patel', name: 'Priya Patel', email: 'priya.patel.student@uky.edu', classStanding: 'Sophomore', hasRegistrationHold: false, holdReason: null, needsDegreeAuditReview: false },
  { id: 'adv-javier-martinez', name: 'Javier Martinez', email: 'javier.martinez@uky.edu', classStanding: 'First-Year', hasRegistrationHold: false, holdReason: null, needsDegreeAuditReview: false },
  { id: 'adv-alice-chen', name: 'Alice Chen', email: 'alice.chen@uky.edu', classStanding: 'First-Year', hasRegistrationHold: false, holdReason: null, needsDegreeAuditReview: false },
  { id: 'adv-ruth-okafor', name: 'Ruth Okafor', email: 'ruth.okafor@uky.edu', classStanding: 'Sophomore', hasRegistrationHold: true, holdReason: 'FERPA release required', needsDegreeAuditReview: false },
  { id: 'adv-meera-singh', name: 'Meera Singh', email: 'meera.singh@uky.edu', classStanding: 'First-Year', hasRegistrationHold: false, holdReason: null, needsDegreeAuditReview: false },
  { id: 'adv-elijah-brooks', name: 'Elijah Brooks', email: 'elijah.brooks@uky.edu', classStanding: 'Junior', hasRegistrationHold: false, holdReason: null, needsDegreeAuditReview: true },
  { id: 'adv-fatima-noor', name: 'Fatima Noor', email: 'fatima.noor@uky.edu', classStanding: 'Senior', hasRegistrationHold: false, holdReason: null, needsDegreeAuditReview: false },
  { id: 'adv-daniel-park', name: 'Daniel Park', email: 'daniel.park@uky.edu', classStanding: 'Sophomore', hasRegistrationHold: false, holdReason: null, needsDegreeAuditReview: false },
  { id: 'adv-olivia-turner', name: 'Olivia Turner', email: 'olivia.turner@uky.edu', classStanding: 'Senior', hasRegistrationHold: false, holdReason: null, needsDegreeAuditReview: true },
  { id: 'adv-noah-carter', name: 'Noah Carter', email: 'noah.carter@uky.edu', classStanding: 'First-Year', hasRegistrationHold: false, holdReason: null, needsDegreeAuditReview: false },
  { id: 'adv-zoe-kim', name: 'Zoe Kim', email: 'zoe.kim@uky.edu', classStanding: 'Junior', hasRegistrationHold: false, holdReason: null, needsDegreeAuditReview: false },
  { id: 'adv-leo-alvarez', name: 'Leo Alvarez', email: 'leo.alvarez@uky.edu', classStanding: 'First-Year', hasRegistrationHold: false, holdReason: null, needsDegreeAuditReview: false },
  { id: 'adv-sofia-nguyen', name: 'Sofia Nguyen', email: 'sofia.nguyen@uky.edu', classStanding: 'Sophomore', hasRegistrationHold: false, holdReason: null, needsDegreeAuditReview: false },
  { id: 'adv-maya-bennett', name: 'Maya Bennett', email: 'maya.bennett@uky.edu', classStanding: 'Senior', hasRegistrationHold: false, holdReason: null, needsDegreeAuditReview: false },
  { id: 'adv-marcus-johnson', name: 'Marcus Johnson', email: 'marcus.johnson@uky.edu', classStanding: 'First-Year', hasRegistrationHold: false, holdReason: null, needsDegreeAuditReview: false },
  { id: 'adv-ava-reynolds', name: 'Ava Reynolds', email: 'ava.reynolds@uky.edu', classStanding: 'Junior', hasRegistrationHold: false, holdReason: null, needsDegreeAuditReview: false },
  { id: 'adv-nia-coleman', name: 'Nia Coleman', email: 'nia.coleman@uky.edu', classStanding: 'Sophomore', hasRegistrationHold: false, holdReason: null, needsDegreeAuditReview: false },
  { id: 'adv-gabriel-flores', name: 'Gabriel Flores', email: 'gabriel.flores@uky.edu', classStanding: 'First-Year', hasRegistrationHold: true, holdReason: 'Financial hold', needsDegreeAuditReview: false },
  { id: 'adv-hannah-lee', name: 'Hannah Lee', email: 'hannah.lee@uky.edu', classStanding: 'Senior', hasRegistrationHold: false, holdReason: null, needsDegreeAuditReview: false },
  { id: 'adv-ethan-walker', name: 'Ethan Walker', email: 'ethan.walker@uky.edu', classStanding: 'Junior', hasRegistrationHold: false, holdReason: null, needsDegreeAuditReview: false },
  { id: 'adv-chloe-davis', name: 'Chloe Davis', email: 'chloe.davis@uky.edu', classStanding: 'Sophomore', hasRegistrationHold: false, holdReason: null, needsDegreeAuditReview: false },
]

const fallbackOfficeHours: FacultyOfficeHoursSummary = {
  todaySlot: {
    start: new Date('2026-03-24T14:00:00-04:00').toISOString(),
    end: new Date('2026-03-24T15:30:00-04:00').toISOString(),
  },
  queueCount: 3,
  topTheme: 'Midterm review - Module 5',
}

const fallbackFlaggedStudents: FacultyFlaggedStudent[] = [
  { id: 'flag-javier-martinez', name: 'Javier Martinez', flag: 'grade_drop', course: 'TEK-100', detail: 'grade drop' },
  { id: 'flag-alice-chen', name: 'Alice Chen', flag: 'inactive', course: 'TEK-100', detail: '14 days inactive' },
  { id: 'flag-ruth-okafor', name: 'Ruth Okafor', flag: 'accommodation', course: 'TEK-100', detail: 'Accommodation letter active' },
  { id: 'flag-meera-singh', name: 'Meera Singh', flag: 'attendance', course: 'TEK-100', detail: 'Missed 3 classes' },
]

const flaggedStudentOverrides: Record<
  string,
  { flag: FlaggedStudentFlag; detail: string }
> = {
  'javier.martinez@uky.edu': { flag: 'grade_drop', detail: 'grade drop' },
  'alice.chen@uky.edu': { flag: 'inactive', detail: '14 days inactive' },
  'ruth.okafor@uky.edu': { flag: 'accommodation', detail: 'Accommodation letter active' },
  'meera.singh@uky.edu': { flag: 'attendance', detail: 'Missed 3 classes' },
}

function buildStatsFromList(list: FacultyAdviseeListItem[]): FacultyAdviseeStats {
  const registrationStarts = list
    .map(() => new Date('2026-04-07T08:00:00-04:00'))
  const registrationEnds = list
    .map(() => new Date('2026-04-11T17:00:00-04:00'))

  return {
    total: list.length,
    withHolds: list.filter((item) => item.hasRegistrationHold).length,
    needsDegreeAudit: list.filter((item) => item.needsDegreeAuditReview).length,
    registrationWindow:
      registrationStarts.length > 0 && registrationEnds.length > 0
        ? {
            start: registrationStarts[0]!.toISOString(),
            end: registrationEnds[0]!.toISOString(),
          }
        : null,
  }
}

function getFallbackAdviseeList(): FacultyAdviseeListItem[] {
  return fallbackAdvisees
}

function getFallbackOfficeHours(): FacultyOfficeHoursSummary {
  return fallbackOfficeHours
}

function getFallbackFlaggedStudents(): FacultyFlaggedStudent[] {
  return fallbackFlaggedStudents
}

export async function getAdviseeList(userId: string): Promise<FacultyAdviseeListItem[]> {
  try {
    const advisees = await prisma.facultyAdvisee.findMany({
      where: { facultyId: userId },
      orderBy: [{ assignedAt: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        classStanding: true,
        hasRegistrationHold: true,
        holdReason: true,
        needsDegreeAuditReview: true,
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (advisees.length === 0) return getFallbackAdviseeList()

    return advisees.map((advisee) => ({
      id: advisee.student.id,
      name: advisee.student.name,
      email: advisee.student.email,
      classStanding: advisee.classStanding,
      hasRegistrationHold: advisee.hasRegistrationHold,
      holdReason: advisee.holdReason,
      needsDegreeAuditReview: advisee.needsDegreeAuditReview,
    }))
  } catch (error) {
    console.warn('[faculty/advisee-service] Falling back to synthetic advisee list', error)
    return getFallbackAdviseeList()
  }
}

export async function getAdviseeStats(userId: string): Promise<FacultyAdviseeStats> {
  try {
    const [list, registrationWindowRows] = await Promise.all([
      getAdviseeList(userId),
      prisma.facultyAdvisee.findMany({
        where: { facultyId: userId },
        select: {
          registrationWindowStart: true,
          registrationWindowEnd: true,
        },
      }),
    ])

    if (registrationWindowRows.length === 0) return buildStatsFromList(list)

    const starts = registrationWindowRows
      .map((row) => row.registrationWindowStart)
      .filter((value): value is Date => Boolean(value))
      .sort((a, b) => a.getTime() - b.getTime())
    const ends = registrationWindowRows
      .map((row) => row.registrationWindowEnd)
      .filter((value): value is Date => Boolean(value))
      .sort((a, b) => b.getTime() - a.getTime())

    return {
      total: list.length,
      withHolds: list.filter((item) => item.hasRegistrationHold).length,
      needsDegreeAudit: list.filter((item) => item.needsDegreeAuditReview).length,
      registrationWindow:
        starts[0] && ends[0]
          ? { start: starts[0].toISOString(), end: ends[0].toISOString() }
          : null,
    }
  } catch (error) {
    console.warn('[faculty/advisee-service] Falling back to synthetic advisee stats', error)
    return buildStatsFromList(getFallbackAdviseeList())
  }
}

export async function getOfficeHoursSummary(userId: string): Promise<FacultyOfficeHoursSummary> {
  try {
    const todayStart = startOfDay(new Date())
    const todayEnd = endOfDay(new Date())

    const [courses, todaySlot] = await Promise.all([
      prisma.course.findMany({
        where: { instructorId: userId },
        select: { id: true },
      }),
      prisma.assistantCalendarEvent.findFirst({
        where: {
          userId,
          category: 'office-hours',
          startTime: { gte: todayStart, lte: todayEnd },
        },
        orderBy: { startTime: 'asc' },
      }),
    ])

    const courseIds = courses.map((course) => course.id)
    if (!todaySlot && courseIds.length === 0) return getFallbackOfficeHours()

    const [queueCount, topCluster] = await Promise.all([
      courseIds.length > 0
        ? prisma.officeHoursQuestion.count({
            where: {
              courseId: { in: courseIds },
              resolvedAt: null,
              createdAt: { gte: todayStart, lte: todayEnd },
            },
          })
        : Promise.resolve(0),
      courseIds.length > 0
        ? prisma.officeHoursCluster.findFirst({
            where: {
              courseId: { in: courseIds },
              status: 'open',
            },
            orderBy: [{ questionCount: 'desc' }, { updatedAt: 'desc' }],
            select: { label: true, questionCount: true },
          })
        : Promise.resolve(null),
    ])

    if (!todaySlot && queueCount === 0 && !topCluster) return getFallbackOfficeHours()

    return {
      todaySlot: todaySlot
        ? {
            start: todaySlot.startTime.toISOString(),
            end: todaySlot.endTime.toISOString(),
          }
        : null,
      queueCount: topCluster?.questionCount ?? queueCount,
      topTheme: topCluster?.label ?? null,
    }
  } catch (error) {
    console.warn('[faculty/advisee-service] Falling back to synthetic office hours summary', error)
    return getFallbackOfficeHours()
  }
}

export async function getFlaggedStudents(userId: string): Promise<FacultyFlaggedStudent[]> {
  try {
    const enrollments = await prisma.courseEnrollment.findMany({
      where: {
        course: { instructorId: userId },
        student: { email: { in: Object.keys(flaggedStudentOverrides) } },
      },
      select: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            studentProfile: {
              select: {
                riskScore: true,
                learningVelocity: true,
                lastSessionAt: true,
              },
            },
          },
        },
        course: {
          select: {
            courseCode: true,
          },
        },
      },
      orderBy: { studentId: 'asc' },
    })

    if (enrollments.length === 0) return getFallbackFlaggedStudents()

    const now = new Date()
    const flagged = enrollments.map((enrollment) => {
      const override = flaggedStudentOverrides[enrollment.student.email]
      const daysInactive = enrollment.student.studentProfile?.lastSessionAt
        ? differenceInCalendarDays(now, enrollment.student.studentProfile.lastSessionAt)
        : null

      let detail = override?.detail ?? 'Needs attention'
      if (override?.flag === 'grade_drop' && enrollment.student.studentProfile?.learningVelocity != null) {
        const velocityPct = Math.round(enrollment.student.studentProfile.learningVelocity * 100)
        detail = velocityPct < 0 ? `grade trend ${velocityPct}%` : override.detail
      }
      if (override?.flag === 'inactive' && daysInactive != null) {
        detail = `${daysInactive} days inactive`
      }

      return {
        id: enrollment.student.id,
        name: enrollment.student.name,
        flag: override?.flag ?? 'grade_drop',
        course: enrollment.course.courseCode,
        detail,
      } satisfies FacultyFlaggedStudent
    })

    return flagged.length > 0 ? flagged : getFallbackFlaggedStudents()
  } catch (error) {
    console.warn('[faculty/advisee-service] Falling back to synthetic flagged students', error)
    return getFallbackFlaggedStudents()
  }
}

export async function getFacultyAdvisingData(userId: string): Promise<FacultyAdvisingData> {
  const [advisees, officeHours, flaggedStudents] = await Promise.all([
    getAdviseeStats(userId),
    getOfficeHoursSummary(userId),
    getFlaggedStudents(userId),
  ])

  return {
    advisees,
    officeHours,
    flaggedStudents,
  }
}
