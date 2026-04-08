/**
 * Personal Task Manager — Business Logic
 *
 * CRUD operations for user tasks with filtering, bulk updates,
 * and cross-pollination helpers (committee action → task).
 */

import { prisma } from './prisma';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CreateTaskInput {
  userId: string;
  title: string;
  description?: string;
  priority?: string;
  dueDate?: string | null;
  tags?: string[];
  source?: string;
  sourceId?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  priority?: string;
  status?: string;
  dueDate?: string | null;
  tags?: string[];
}

export interface TaskFilters {
  status?: string;
  priority?: string;
  tags?: string;
  dueBefore?: string;
  dueAfter?: string;
}

// ── Create ────────────────────────────────────────────────────────────────────

export async function createTask(input: CreateTaskInput) {
  return prisma.task.create({
    data: {
      userId: input.userId,
      title: input.title,
      description: input.description ?? null,
      priority: input.priority ?? 'P2',
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      tags: input.tags ?? [],
      source: input.source ?? 'manual',
      sourceId: input.sourceId ?? null,
    },
  });
}

// ── List ──────────────────────────────────────────────────────────────────────

export async function listTasks(userId: string, filters: TaskFilters = {}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { userId };

  if (filters.status && filters.status !== 'all') {
    where.status = filters.status;
  }
  if (filters.priority) {
    where.priority = filters.priority;
  }
  if (filters.tags) {
    where.tags = { hasSome: filters.tags.split(',').map((t) => t.trim()) };
  }
  if (filters.dueBefore || filters.dueAfter) {
    where.dueDate = {};
    if (filters.dueBefore) where.dueDate.lte = new Date(filters.dueBefore);
    if (filters.dueAfter) where.dueDate.gte = new Date(filters.dueAfter);
  }

  return prisma.task.findMany({
    where,
    orderBy: [{ dueDate: 'asc' }, { priority: 'asc' }, { createdAt: 'desc' }],
  });
}

// ── Update ────────────────────────────────────────────────────────────────────

export async function updateTask(
  taskId: string,
  userId: string,
  input: UpdateTaskInput,
) {
  // Verify ownership
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task || task.userId !== userId) {
    throw new Error('Task not found');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.description !== undefined) data.description = input.description;
  if (input.priority !== undefined) data.priority = input.priority;
  if (input.tags !== undefined) data.tags = input.tags;
  if (input.dueDate !== undefined) {
    data.dueDate = input.dueDate ? new Date(input.dueDate) : null;
  }
  if (input.status !== undefined) {
    data.status = input.status;
    if (input.status === 'done' && !task.completedAt) {
      data.completedAt = new Date();
    }
    if (input.status !== 'done') {
      data.completedAt = null;
    }
  }

  return prisma.task.update({ where: { id: taskId }, data });
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deleteTask(taskId: string, userId: string) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task || task.userId !== userId) {
    throw new Error('Task not found');
  }
  return prisma.task.delete({ where: { id: taskId } });
}

// ── Bulk Update ───────────────────────────────────────────────────────────────

export async function bulkUpdateTaskStatus(
  ids: string[],
  status: string,
  userId: string,
) {
  // Verify all tasks belong to user
  const tasks = await prisma.task.findMany({
    where: { id: { in: ids }, userId },
    select: { id: true },
  });
  if (tasks.length !== ids.length) {
    throw new Error('Some tasks not found or do not belong to user');
  }

  const completedAt = status === 'done' ? new Date() : null;

  await prisma.task.updateMany({
    where: { id: { in: ids }, userId },
    data: { status, completedAt },
  });

  return { updated: ids.length };
}

// ── Count helpers (for badges) ────────────────────────────────────────────────

export async function getOverdueCount(userId: string) {
  return prisma.task.count({
    where: {
      userId,
      status: 'open',
      dueDate: { lt: new Date() },
    },
  });
}

export async function getDueTodayCount(userId: string) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  return prisma.task.count({
    where: {
      userId,
      status: 'open',
      dueDate: { gte: start, lte: end },
    },
  });
}
