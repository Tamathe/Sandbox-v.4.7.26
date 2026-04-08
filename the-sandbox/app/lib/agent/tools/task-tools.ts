/**
 * Sandy Universal Agent — Personal Task Tools
 *
 * 3 tools: create_task, list_tasks, complete_task
 * Available to all roles.
 */

import type { ToolModule } from '../agent-types';
import { prisma } from '../../prisma';

export const taskTools: ToolModule = {
  tools: [
    {
      name: 'create_task',
      description:
        'Create a personal task for the user. Use this when the user asks you to add something to their to-do list, remind them about something, or track an action item.',
      category: 'tasks',
      permission: 'auto',
      roles: ['EDUCATOR', 'STUDENT', 'ADMIN', 'STAFF', 'REGISTRAR'],
      input_schema: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Short title for the task',
          },
          description: {
            type: 'string',
            description: 'Optional longer description or context',
          },
          priority: {
            type: 'string',
            enum: ['P0', 'P1', 'P2', 'P3'],
            description: 'Priority level (P0=critical, P3=low). Default P2.',
          },
          dueDate: {
            type: 'string',
            description: 'Optional due date in ISO 8601 format (e.g. 2026-04-01)',
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: 'Optional tags for categorization',
          },
        },
        required: ['title'],
      },
    },
    {
      name: 'list_tasks',
      description:
        "List the user's tasks. Returns open tasks by default. Use to check what's on the user's plate, find overdue items, or review task priorities.",
      category: 'tasks',
      permission: 'auto',
      roles: ['EDUCATOR', 'STUDENT', 'ADMIN', 'STAFF', 'REGISTRAR'],
      input_schema: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['open', 'done', 'all'],
            description: 'Filter by status. Default "open".',
          },
          priority: {
            type: 'string',
            enum: ['P0', 'P1', 'P2', 'P3'],
            description: 'Optional filter by priority',
          },
        },
        required: [],
      },
    },
    {
      name: 'complete_task',
      description:
        'Mark a task as done. Can match by task ID or by a partial title match. Use when the user says they finished something.',
      category: 'tasks',
      permission: 'auto',
      roles: ['EDUCATOR', 'STUDENT', 'ADMIN', 'STAFF', 'REGISTRAR'],
      input_schema: {
        type: 'object',
        properties: {
          taskId: {
            type: 'string',
            description: 'The task ID (if known)',
          },
          titleMatch: {
            type: 'string',
            description: 'A partial title to match against (case-insensitive). Used if taskId is not provided.',
          },
        },
        required: [],
      },
    },
  ],

  handlers: {
    async create_task(args, user) {
      const title = args.title as string;
      const description = (args.description as string) || undefined;
      const priority = (args.priority as string) || 'P2';
      const dueDate = args.dueDate as string | undefined;
      const tags = (args.tags as string[]) || [];

      const task = await prisma.task.create({
        data: {
          userId: user.id,
          title,
          description: description ?? null,
          priority,
          dueDate: dueDate ? new Date(dueDate) : null,
          tags,
          source: 'sandy',
        },
      });

      return {
        success: true,
        task: {
          id: task.id,
          title: task.title,
          priority: task.priority,
          dueDate: task.dueDate?.toISOString() ?? null,
          tags: task.tags,
        },
        message: `Created task "${task.title}"${task.dueDate ? ` due ${task.dueDate.toLocaleDateString()}` : ''}.`,
      };
    },

    async list_tasks(args, user) {
      const status = (args.status as string) || 'open';
      const priority = args.priority as string | undefined;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: any = { userId: user.id };
      if (status !== 'all') where.status = status;
      if (priority) where.priority = priority;

      const tasks = await prisma.task.findMany({
        where,
        orderBy: [{ dueDate: 'asc' }, { priority: 'asc' }, { createdAt: 'desc' }],
        take: 20,
      });

      return {
        count: tasks.length,
        tasks: tasks.map((t) => ({
          id: t.id,
          title: t.title,
          priority: t.priority,
          status: t.status,
          dueDate: t.dueDate?.toISOString() ?? null,
          tags: t.tags,
        })),
      };
    },

    async complete_task(args, user) {
      const taskId = args.taskId as string | undefined;
      const titleMatch = args.titleMatch as string | undefined;

      if (!taskId && !titleMatch) {
        return { error: 'Provide either taskId or titleMatch' };
      }

      let task;

      if (taskId) {
        task = await prisma.task.findFirst({
          where: { id: taskId, userId: user.id },
        });
      } else if (titleMatch) {
        // Case-insensitive partial match
        task = await prisma.task.findFirst({
          where: {
            userId: user.id,
            status: 'open',
            title: { contains: titleMatch, mode: 'insensitive' },
          },
          orderBy: { createdAt: 'desc' },
        });
      }

      if (!task) {
        return { error: `No matching task found for "${titleMatch || taskId}"` };
      }

      const updated = await prisma.task.update({
        where: { id: task.id },
        data: { status: 'done', completedAt: new Date() },
      });

      return {
        success: true,
        task: {
          id: updated.id,
          title: updated.title,
          completedAt: updated.completedAt?.toISOString(),
        },
        message: `Marked "${updated.title}" as done.`,
      };
    },
  },
};
