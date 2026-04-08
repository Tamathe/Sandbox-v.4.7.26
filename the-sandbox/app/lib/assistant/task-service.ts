// ─── Task Service ────────────────────────────────────────────
// In-platform tasks with due dates. Sandy creates them from
// natural language; users complete/dismiss via UI.

import { prisma } from '../prisma'
import type { AssistantTask } from '../../generated/prisma'

export async function createTask(input: {
  userId: string
  title: string
  description?: string
  dueAt?: Date
  source?: string
}): Promise<AssistantTask> {
  return prisma.assistantTask.create({
    data: {
      userId: input.userId,
      title: input.title,
      description: input.description ?? null,
      dueAt: input.dueAt ?? null,
      source: input.source ?? 'sandy',
      status: 'pending',
    },
  })
}

export async function completeTask(taskId: string): Promise<AssistantTask> {
  return prisma.assistantTask.update({
    where: { id: taskId },
    data: { status: 'completed', completedAt: new Date() },
  })
}

export async function dismissTask(taskId: string): Promise<AssistantTask> {
  return prisma.assistantTask.update({
    where: { id: taskId },
    data: { status: 'dismissed' },
  })
}

export async function getUpcomingTasks(userId: string): Promise<AssistantTask[]> {
  return prisma.assistantTask.findMany({
    where: {
      userId,
      status: 'pending',
    },
    orderBy: [
      { dueAt: { sort: 'asc', nulls: 'last' } },
      { createdAt: 'asc' },
    ],
  })
}

export async function getOverdueTasks(userId: string): Promise<AssistantTask[]> {
  return prisma.assistantTask.findMany({
    where: {
      userId,
      status: 'pending',
      dueAt: { lt: new Date() },
    },
    orderBy: { dueAt: 'asc' },
  })
}

export async function getUserTasks(
  userId: string,
  opts?: { status?: string; limit?: number }
): Promise<AssistantTask[]> {
  return prisma.assistantTask.findMany({
    where: {
      userId,
      ...(opts?.status ? { status: opts.status } : {}),
    },
    orderBy: [
      { dueAt: { sort: 'asc', nulls: 'last' } },
      { createdAt: 'desc' },
    ],
    take: opts?.limit ?? 50,
  })
}
