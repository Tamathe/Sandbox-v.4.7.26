/**
 * Department AI Campaigns — DUS/admin can set policy coverage targets.
 * Progress tracked against CourseAIPolicy coverage within the department.
 */

import { prisma } from '../prisma'
import type { CampaignStatus } from '../../generated/prisma'

export interface CampaignProgress {
  id: string
  title: string
  departmentName: string
  departmentSlug: string
  targetCoverage: number // 0-1
  currentCoverage: number // 0-1
  totalCourses: number
  coursesWithPolicy: number
  deadline: Date
  status: CampaignStatus
  daysRemaining: number
  onTrack: boolean
}

export async function createCampaign(
  departmentId: string,
  title: string,
  targetCoverage: number,
  deadline: Date,
  createdById: string,
) {
  return prisma.departmentAICampaign.create({
    data: {
      departmentId,
      title,
      targetCoverage: Math.min(1, Math.max(0, targetCoverage)),
      deadline,
      createdById,
    },
  })
}

export async function getCampaignProgress(campaignId: string): Promise<CampaignProgress | null> {
  const campaign = await prisma.departmentAICampaign.findUnique({
    where: { id: campaignId },
    include: {
      department: {
        select: {
          name: true,
          slug: true,
          members: { select: { userId: true } },
        },
      },
    },
  })

  if (!campaign) return null

  const memberUserIds = campaign.department.members.map(m => m.userId)

  // Get courses taught by department members
  const courses = await prisma.course.findMany({
    where: { instructorId: { in: memberUserIds } },
    select: {
      id: true,
      courseAIPolicy: { select: { id: true } },
    },
  })

  const totalCourses = courses.length
  const coursesWithPolicy = courses.filter(c => c.courseAIPolicy).length
  const currentCoverage = totalCourses > 0 ? coursesWithPolicy / totalCourses : 0

  const now = new Date()
  const daysRemaining = Math.max(0, Math.ceil((campaign.deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
  const onTrack = currentCoverage >= campaign.targetCoverage || daysRemaining > 0

  return {
    id: campaign.id,
    title: campaign.title,
    departmentName: campaign.department.name,
    departmentSlug: campaign.department.slug,
    targetCoverage: campaign.targetCoverage,
    currentCoverage,
    totalCourses,
    coursesWithPolicy,
    deadline: campaign.deadline,
    status: campaign.status,
    daysRemaining,
    onTrack,
  }
}

export async function getDepartmentCampaigns(departmentId: string): Promise<CampaignProgress[]> {
  const campaigns = await prisma.departmentAICampaign.findMany({
    where: { departmentId, status: { not: 'ARCHIVED' } },
    select: { id: true },
    orderBy: { createdAt: 'desc' },
  })

  const results: CampaignProgress[] = []
  for (const c of campaigns) {
    const progress = await getCampaignProgress(c.id)
    if (progress) results.push(progress)
  }
  return results
}

export async function getActiveCampaignsForUser(userId: string): Promise<CampaignProgress[]> {
  // Find departments user belongs to
  const memberships = await prisma.departmentMember.findMany({
    where: { userId },
    select: { departmentId: true },
  })

  const deptIds = memberships.map(m => m.departmentId)
  if (deptIds.length === 0) return []

  const campaigns = await prisma.departmentAICampaign.findMany({
    where: { departmentId: { in: deptIds }, status: 'ACTIVE' },
    select: { id: true },
  })

  const results: CampaignProgress[] = []
  for (const c of campaigns) {
    const progress = await getCampaignProgress(c.id)
    if (progress) results.push(progress)
  }
  return results
}
