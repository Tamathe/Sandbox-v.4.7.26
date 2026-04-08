/**
 * Sandy Universal Agent — Learning Goal Tools
 *
 * 2 tools: get_learning_goals, update_goal_progress
 *
 * Lets Sandy read and update student learning goals for Progress Pulse check-ins.
 */

import type { ToolModule } from '../agent-types'
import { prisma } from '../../prisma'

export const learningGoalTools: ToolModule = {
  tools: [
    {
      name: 'get_learning_goals',
      description:
        'Get the student\'s declared learning goals from My Path, including milestones and progress. Use this to understand what the student is working toward and offer relevant suggestions.',
      category: 'academic',
      permission: 'auto',
      roles: ['STUDENT'],
      input_schema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'update_goal_progress',
      description:
        'Mark a milestone as completed on a student\'s learning goal. Use when the student tells you they\'ve accomplished something that matches one of their milestones.',
      category: 'academic',
      permission: 'confirm',
      roles: ['STUDENT'],
      input_schema: {
        type: 'object',
        properties: {
          milestoneId: {
            type: 'string',
            description: 'The ID of the milestone to mark as completed',
          },
        },
        required: ['milestoneId'],
      },
    },
  ],

  handlers: {
    async get_learning_goals(_args, user) {
      const goals = await prisma.learningGoal.findMany({
        where: { userId: user.id },
        include: { milestones: { orderBy: { sortOrder: 'asc' } } },
        orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
      })

      if (goals.length === 0) {
        return {
          message: 'No learning goals set yet. You can create goals at /my-path.',
          goals: [],
        }
      }

      // Update lastPulseAt for active goals (Progress Pulse timestamp)
      const activeIds = goals.filter(g => g.status === 'ACTIVE').map(g => g.id)
      if (activeIds.length > 0) {
        await prisma.learningGoal.updateMany({
          where: { id: { in: activeIds } },
          data: { lastPulseAt: new Date() },
        })
      }

      return {
        goals: goals.map(g => ({
          id: g.id,
          title: g.title,
          description: g.description,
          category: g.category,
          status: g.status,
          progressPct: g.progressPct,
          targetDate: g.targetDate?.toISOString() ?? null,
          milestones: g.milestones.map(m => ({
            id: m.id,
            title: m.title,
            completed: m.completed,
          })),
        })),
      }
    },

    async update_goal_progress(args, user) {
      const { milestoneId } = args as { milestoneId: string }

      const milestone = await prisma.goalMilestone.findUnique({
        where: { id: milestoneId },
        include: { goal: { select: { userId: true, id: true, title: true } } },
      })

      if (!milestone || milestone.goal.userId !== user.id) {
        return { error: 'Milestone not found' }
      }

      if (milestone.completed) {
        return { message: `"${milestone.title}" is already completed!` }
      }

      await prisma.goalMilestone.update({
        where: { id: milestoneId },
        data: { completed: true, completedAt: new Date() },
      })

      // Recompute goal progress
      const allMilestones = await prisma.goalMilestone.findMany({
        where: { goalId: milestone.goal.id },
      })
      const completedCount = allMilestones.filter(m => m.id === milestoneId || m.completed).length
      const pct = Math.round((completedCount / allMilestones.length) * 100)

      const updateData: Record<string, unknown> = { progressPct: pct }
      if (pct === 100) {
        updateData.status = 'COMPLETED'
        updateData.completedAt = new Date()
      }

      await prisma.learningGoal.update({
        where: { id: milestone.goal.id },
        data: updateData,
      })

      return {
        message: `Milestone "${milestone.title}" completed! Goal "${milestone.goal.title}" is now at ${pct}%.`,
        progressPct: pct,
        goalCompleted: pct === 100,
      }
    },
  },
}
