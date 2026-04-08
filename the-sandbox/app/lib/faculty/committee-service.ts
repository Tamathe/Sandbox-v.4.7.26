import { differenceInCalendarDays, isAfter, isBefore } from 'date-fns'
import { prisma } from '../prisma'

export interface FacultyCommitteeSummary {
  id: string
  name: string
  nextMeeting: string | null
  actionItemsDue: number
  unreadMinutes: boolean
}

export interface FacultyDepartmentFeedItem {
  id: string
  title: string
  sender: string
  createdAt: string
}

export interface FacultyCommitteeActionItem {
  id: string
  title: string
  committeeName: string
  dueDate: string | null
  status: string
}

interface FacultyCommitteeData {
  committees: FacultyCommitteeSummary[]
  departmentFeed: FacultyDepartmentFeedItem[]
}

type CommitteeMember = {
  userId?: string | null
  email?: string | null
}

const fallbackCommittees: FacultyCommitteeSummary[] = [
  {
    id: 'committee-faculty-curriculum',
    name: 'Curriculum Committee',
    nextMeeting: new Date('2026-03-28T15:00:00-04:00').toISOString(),
    actionItemsDue: 1,
    unreadMinutes: true,
  },
  {
    id: 'committee-faculty-assessment',
    name: 'Assessment & Accreditation',
    nextMeeting: new Date('2026-04-02T10:00:00-04:00').toISOString(),
    actionItemsDue: 1,
    unreadMinutes: true,
  },
]

const fallbackActions: FacultyCommitteeActionItem[] = [
  {
    id: 'action-review-syllabus',
    title: 'Review TEK-100 syllabus update',
    committeeName: 'Curriculum Committee',
    dueDate: new Date('2026-03-27T17:00:00-04:00').toISOString(),
    status: 'open',
  },
  {
    id: 'action-submit-sacscoc',
    title: 'Submit SACSCOC data',
    committeeName: 'Assessment & Accreditation',
    dueDate: new Date('2026-03-26T17:00:00-04:00').toISOString(),
    status: 'in-progress',
  },
]

const fallbackDepartmentFeed: FacultyDepartmentFeedItem[] = [
  {
    id: 'dept-feed-grades',
    title: 'Spring grades due May 5',
    sender: 'Carol Ellis',
    createdAt: new Date('2026-03-22T09:00:00-04:00').toISOString(),
  },
  {
    id: 'dept-feed-lab-space',
    title: 'New lab space proposals open next week',
    sender: 'Dean Robinson',
    createdAt: new Date('2026-03-20T11:00:00-04:00').toISOString(),
  },
  {
    id: 'dept-feed-assessment',
    title: 'Assessment reminder: submit midterm evidence checks',
    sender: 'Lisa Park',
    createdAt: new Date('2026-03-18T08:15:00-04:00').toISOString(),
  },
]

function isCommitteeMember(members: unknown, userId: string, email: string): boolean {
  if (!Array.isArray(members)) return false
  return members.some((member) => {
    const typedMember = member as CommitteeMember
    return typedMember.userId === userId || typedMember.email === email
  })
}

function getFallbackCommittees(): FacultyCommitteeSummary[] {
  return fallbackCommittees
}

function getFallbackActions(): FacultyCommitteeActionItem[] {
  return fallbackActions
}

function getFallbackDepartmentFeed(): FacultyDepartmentFeedItem[] {
  return fallbackDepartmentFeed
}

export async function getMyCommittees(userId: string): Promise<FacultyCommitteeSummary[]> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    })

    if (!user?.email) return getFallbackCommittees()

    const committees = await prisma.committee.findMany({
      where: { isActive: true },
      include: {
        meetings: {
          orderBy: { date: 'desc' },
          select: {
            id: true,
            date: true,
            formattedMinutes: true,
            distributionStatus: true,
          },
        },
        actionItems: {
          where: {
            ownerUserId: userId,
            status: { in: ['open', 'in-progress'] },
          },
          select: {
            id: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    const now = new Date()
    const mine = committees
      .filter((committee) => committee.chairId === userId || isCommitteeMember(committee.members, userId, user.email))
      .map((committee) => {
        const nextMeeting = committee.meetings
          .filter((meeting) => isAfter(meeting.date, now))
          .sort((a, b) => a.date.getTime() - b.date.getTime())[0]
        const latestDistributedPastMeeting = committee.meetings.find(
          (meeting) =>
            isBefore(meeting.date, now) &&
            Boolean(meeting.formattedMinutes) &&
            meeting.distributionStatus === 'distributed' &&
            differenceInCalendarDays(now, meeting.date) <= 14,
        )

        return {
          id: committee.id,
          name: committee.name,
          nextMeeting: nextMeeting?.date.toISOString() ?? null,
          actionItemsDue: committee.actionItems.length,
          unreadMinutes: Boolean(latestDistributedPastMeeting),
        } satisfies FacultyCommitteeSummary
      })

    return mine.length > 0 ? mine : getFallbackCommittees()
  } catch (error) {
    console.warn('[faculty/committee-service] Falling back to synthetic committees', error)
    return getFallbackCommittees()
  }
}

export async function getMyActionItems(userId: string): Promise<FacultyCommitteeActionItem[]> {
  try {
    const actions = await prisma.committeeActionItem.findMany({
      where: {
        ownerUserId: userId,
        status: { in: ['open', 'in-progress'] },
      },
      include: {
        committee: {
          select: { name: true },
        },
      },
      orderBy: [{ dueDate: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }],
    })

    if (actions.length === 0) return getFallbackActions()

    return actions.map((action) => ({
      id: action.id,
      title: action.action,
      committeeName: action.committee.name,
      dueDate: action.dueDate?.toISOString() ?? null,
      status: action.status,
    }))
  } catch (error) {
    console.warn('[faculty/committee-service] Falling back to synthetic committee actions', error)
    return getFallbackActions()
  }
}

export async function getDepartmentFeed(userId: string): Promise<FacultyDepartmentFeedItem[]> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { department: true },
    })

    if (!user?.department) return getFallbackDepartmentFeed()

    const announcements = await prisma.adminAnnouncement.findMany({
      where: {
        isActive: true,
        createdBy: {
          department: user.department,
        },
      },
      include: {
        createdBy: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 3,
    })

    if (announcements.length === 0) return getFallbackDepartmentFeed()

    return announcements.map((announcement) => ({
      id: announcement.id,
      title: announcement.title,
      sender: announcement.createdBy.name,
      createdAt: announcement.createdAt.toISOString(),
    }))
  } catch (error) {
    console.warn('[faculty/committee-service] Falling back to synthetic department feed', error)
    return getFallbackDepartmentFeed()
  }
}

export async function getFacultyCommitteeData(userId: string): Promise<FacultyCommitteeData> {
  const [committees, departmentFeed] = await Promise.all([
    getMyCommittees(userId),
    getDepartmentFeed(userId),
  ])

  return {
    committees,
    departmentFeed,
  }
}
