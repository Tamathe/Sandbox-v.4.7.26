import { prisma } from './prisma'
import { toJsonValue } from './prisma-utils'
import { GoalStatus } from '../generated/prisma'

// ── Types ────────────────────────────────────────────────────────────────────

export interface PathStep {
  type: 'course' | 'tool' | 'flashcards' | 'practice' | 'custom'
  id?: string
  title: string
  reason: string
}

export type GoalWithMilestones = Awaited<ReturnType<typeof getGoal>>

// ── Goals CRUD ───────────────────────────────────────────────────────────────

export async function listGoals(userId: string) {
  return prisma.learningGoal.findMany({
    where: { userId },
    include: { milestones: { orderBy: { sortOrder: 'asc' } } },
    orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
  })
}

export async function getGoal(userId: string, goalId: string) {
  return prisma.learningGoal.findFirst({
    where: { id: goalId, userId },
    include: { milestones: { orderBy: { sortOrder: 'asc' } } },
  })
}

export async function createGoal(
  userId: string,
  data: { title: string; description?: string; category?: string; targetDate?: string },
) {
  return prisma.learningGoal.create({
    data: {
      userId,
      title: data.title,
      description: data.description,
      category: data.category,
      targetDate: data.targetDate ? new Date(data.targetDate) : undefined,
    },
    include: { milestones: true },
  })
}

export async function updateGoal(
  userId: string,
  goalId: string,
  data: { title?: string; description?: string; category?: string; status?: GoalStatus; targetDate?: string },
) {
  return prisma.learningGoal.update({
    where: { id: goalId, userId },
    data: {
      ...data,
      targetDate: data.targetDate !== undefined ? new Date(data.targetDate) : undefined,
      completedAt: data.status === GoalStatus.COMPLETED ? new Date() : undefined,
    },
    include: { milestones: { orderBy: { sortOrder: 'asc' } } },
  })
}

export async function deleteGoal(userId: string, goalId: string) {
  return prisma.learningGoal.delete({ where: { id: goalId, userId } })
}

// ── Milestones ───────────────────────────────────────────────────────────────

export async function addMilestone(
  userId: string,
  goalId: string,
  data: { title: string; description?: string; linkedCourseId?: string; linkedToolId?: string },
) {
  // Verify the goal belongs to this user
  const goal = await prisma.learningGoal.findFirst({ where: { id: goalId, userId } })
  if (!goal) throw new Error('Goal not found')

  // Auto-increment sortOrder
  const last = await prisma.goalMilestone.findFirst({
    where: { goalId },
    orderBy: { sortOrder: 'desc' },
  })
  const nextOrder = (last?.sortOrder ?? -1) + 1

  const milestone = await prisma.goalMilestone.create({
    data: {
      goalId,
      title: data.title,
      description: data.description,
      linkedCourseId: data.linkedCourseId,
      linkedToolId: data.linkedToolId,
      sortOrder: nextOrder,
    },
  })

  await recomputeProgress(goalId)
  return milestone
}

export async function toggleMilestone(userId: string, milestoneId: string) {
  const milestone = await prisma.goalMilestone.findFirst({
    where: { id: milestoneId },
    include: { goal: true },
  })
  if (!milestone || milestone.goal.userId !== userId) throw new Error('Milestone not found')

  const updated = await prisma.goalMilestone.update({
    where: { id: milestoneId },
    data: {
      completed: !milestone.completed,
      completedAt: !milestone.completed ? new Date() : null,
    },
  })

  await recomputeProgress(milestone.goalId)
  return updated
}

export async function deleteMilestone(userId: string, milestoneId: string) {
  const milestone = await prisma.goalMilestone.findFirst({
    where: { id: milestoneId },
    include: { goal: true },
  })
  if (!milestone || milestone.goal.userId !== userId) throw new Error('Milestone not found')

  await prisma.goalMilestone.delete({ where: { id: milestoneId } })
  await recomputeProgress(milestone.goalId)
}

// ── Progress ─────────────────────────────────────────────────────────────────

export async function recomputeProgress(goalId: string) {
  const milestones = await prisma.goalMilestone.findMany({ where: { goalId } })
  const total = milestones.length
  const completed = milestones.filter((m) => m.completed).length
  const progressPct = total === 0 ? 0 : Math.round((completed / total) * 100)

  await prisma.learningGoal.update({
    where: { id: goalId },
    data: {
      progressPct,
      ...(progressPct === 100 ? { status: GoalStatus.COMPLETED, completedAt: new Date() } : {}),
    },
  })
}

// ── Path ─────────────────────────────────────────────────────────────────────

export async function savePath(userId: string, goalId: string, path: PathStep[]) {
  return prisma.learningGoal.update({
    where: { id: goalId, userId },
    data: { pathJson: toJsonValue(path) },
    include: { milestones: { orderBy: { sortOrder: 'asc' } } },
  })
}

// ── Sandy Context ────────────────────────────────────────────────────────────

export async function getGoalsSummaryForSandy(userId: string): Promise<string> {
  const goals = await prisma.learningGoal.findMany({
    where: { userId, status: { in: [GoalStatus.ACTIVE, GoalStatus.PAUSED] } },
    include: { milestones: { orderBy: { sortOrder: 'asc' } } },
    orderBy: { updatedAt: 'desc' },
  })

  if (goals.length === 0) return ''

  const lines = goals.map((g) => {
    const done = g.milestones.filter((m) => m.completed).length
    const total = g.milestones.length
    const milestoneSummary = total > 0 ? ` (${done}/${total} milestones)` : ''
    const status = g.status === GoalStatus.PAUSED ? ' [PAUSED]' : ''
    return `- ${g.title}${status}: ${g.progressPct}% complete${milestoneSummary}`
  })

  return `\n## Active Learning Goals\n${lines.join('\n')}`
}
