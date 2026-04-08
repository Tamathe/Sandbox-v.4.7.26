/**
 * Sandy Universal Agent — Calendar & Tasks Tools (P0 + P1)
 *
 * P0 (2): get_calendar, get_tasks
 * P1 (4): create_task, complete_task, create_calendar_event, find_free_time
 *
 * Wraps existing assistant/providers.ts CalendarProvider, task-service.ts,
 * and scheduling-service.ts.
 */

import type { ToolModule } from '../agent-types';
import { getCalendarProvider } from '../../assistant/providers';
import { getUserTasks } from '../../assistant/task-service';
import { createTask as createTaskService, completeTask as completeTaskService } from '../../assistant/task-service';
import { findMeetingOptions } from '../../assistant/scheduling-service';

export const calendarTools: ToolModule = {
  tools: [
    // ── P0 Tools ──────────────────────────────────────────────────
    {
      name: 'get_calendar',
      description:
        'Fetch calendar events for a date range. Defaults to today if no dates provided.',
      category: 'calendar',
      permission: 'auto',
      roles: ['EDUCATOR', 'STUDENT', 'ADMIN', 'STAFF', 'REGISTRAR'],
      input_schema: {
        type: 'object',
        properties: {
          startDate: {
            type: 'string',
            description: 'Start date in ISO 8601 format (e.g. "2026-03-24"). Defaults to today.',
          },
          endDate: {
            type: 'string',
            description: 'End date in ISO 8601 format. Defaults to end of startDate.',
          },
        },
        required: [],
      },
    },
    {
      name: 'get_tasks',
      description:
        'Fetch the user\'s task list with priorities and due dates. Can filter by status (pending, completed, dismissed).',
      category: 'calendar',
      permission: 'auto',
      roles: ['EDUCATOR', 'STUDENT', 'ADMIN', 'STAFF', 'REGISTRAR'],
      input_schema: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            description: 'Filter by status: "pending", "completed", or "dismissed". Defaults to "pending".',
          },
          limit: {
            type: 'number',
            description: 'Max tasks to return (default 20)',
          },
        },
        required: [],
      },
    },

    // ── P1 Tools ──────────────────────────────────────────────────
    {
      name: 'create_task',
      description:
        'Create a new task for the user with optional due date. Sandy will show the task details for your approval before adding it.',
      category: 'calendar',
      permission: 'confirm',
      roles: ['EDUCATOR', 'STUDENT', 'ADMIN', 'STAFF', 'REGISTRAR'],
      input_schema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Task title' },
          description: { type: 'string', description: 'Optional detailed description' },
          dueAt: { type: 'string', description: 'Due date in ISO 8601 format (e.g. "2026-03-28T17:00:00Z")' },
        },
        required: ['title'],
      },
    },
    {
      name: 'complete_task',
      description:
        'Mark a task as complete. Sandy will confirm which task is being completed before marking it done.',
      category: 'calendar',
      permission: 'confirm',
      roles: ['EDUCATOR', 'STUDENT', 'ADMIN', 'STAFF', 'REGISTRAR'],
      input_schema: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: 'The task ID to mark complete' },
        },
        required: ['taskId'],
      },
    },
    {
      name: 'create_calendar_event',
      description:
        'Add a new event to the user\'s calendar. Sandy will show the event details for your approval before creating it.',
      category: 'calendar',
      permission: 'confirm',
      roles: ['EDUCATOR', 'STUDENT', 'ADMIN', 'STAFF', 'REGISTRAR'],
      input_schema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Event title' },
          startTime: { type: 'string', description: 'Start time in ISO 8601 format' },
          endTime: { type: 'string', description: 'End time in ISO 8601 format' },
          location: { type: 'string', description: 'Optional location' },
          description: { type: 'string', description: 'Optional event description' },
          attendees: {
            type: 'array',
            items: { type: 'string' },
            description: 'Optional array of attendee email addresses',
          },
        },
        required: ['title', 'startTime', 'endTime'],
      },
    },
    {
      name: 'find_free_time',
      description:
        'Find available time slots in the user\'s calendar for scheduling a meeting. Returns the best available slots.',
      category: 'calendar',
      permission: 'auto',
      roles: ['EDUCATOR', 'STUDENT', 'ADMIN', 'STAFF', 'REGISTRAR'],
      reliability: 'synthetic',
      input_schema: {
        type: 'object',
        properties: {
          targetEmail: {
            type: 'string',
            description: 'Email of the person to find mutual availability with',
          },
          durationMinutes: {
            type: 'number',
            description: 'Meeting duration in minutes (default 30)',
          },
          startDate: {
            type: 'string',
            description: 'Start of search window in ISO 8601 format (defaults to tomorrow)',
          },
          endDate: {
            type: 'string',
            description: 'End of search window in ISO 8601 format (defaults to 5 business days out)',
          },
        },
        required: [],
      },
    },
  ],

  handlers: {
    // ── P0 Handlers ─────────────────────────────────────────────
    async get_calendar(args, user) {
      try {
        const now = new Date();
        const startDate = args.startDate
          ? new Date(args.startDate as string)
          : new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endDate = args.endDate
          ? new Date(args.endDate as string)
          : new Date(startDate.getTime() + 24 * 60 * 60 * 1000);

        const calendar = await getCalendarProvider();
        const events = await calendar.getEvents(user.id, startDate, endDate);

        return {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          eventCount: events.length,
          events: events.map((e) => ({
            id: e.id,
            title: e.title,
            description: e.description,
            startTime: e.startTime.toISOString(),
            endTime: e.endTime.toISOString(),
            location: e.location,
            attendees: e.attendees,
            isAllDay: e.isAllDay,
            category: e.category,
          })),
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to fetch calendar', status: 'failed' };
      }
    },

    async get_tasks(args, user) {
      try {
        const status = (args.status as string) ?? 'pending';
        const limit = (args.limit as number) ?? 20;

        const tasks = await getUserTasks(user.id, { status, limit });

        const now = new Date();
        return {
          status,
          taskCount: tasks.length,
          tasks: tasks.map((t) => ({
            id: t.id,
            title: t.title,
            description: t.description,
            dueAt: t.dueAt?.toISOString() ?? null,
            status: t.status,
            source: t.source,
            isOverdue: t.dueAt ? t.dueAt < now && t.status === 'pending' : false,
            createdAt: t.createdAt.toISOString(),
          })),
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to fetch tasks', status: 'failed' };
      }
    },

    // ── P1 Handlers ─────────────────────────────────────────────
    async create_task(args, user) {
      try {
        const title = args.title as string;
        const description = args.description as string | undefined;
        const dueAt = args.dueAt ? new Date(args.dueAt as string) : undefined;

        const task = await createTaskService({
          userId: user.id,
          title,
          description,
          dueAt,
          source: 'sandy',
        });

        return {
          status: 'created',
          task: {
            id: task.id,
            title: task.title,
            description: task.description,
            dueAt: task.dueAt?.toISOString() ?? null,
            source: task.source,
          },
          message: `Task "${title}" created${dueAt ? ` — due ${dueAt.toLocaleDateString()}` : ''}.`,
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to create task', status: 'failed' };
      }
    },

    async complete_task(args) {
      try {
        const taskId = args.taskId as string;

        const task = await completeTaskService(taskId);

        return {
          status: 'completed',
          task: {
            id: task.id,
            title: task.title,
            completedAt: task.completedAt?.toISOString() ?? new Date().toISOString(),
          },
          message: `Task "${task.title}" marked as complete.`,
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to complete task', status: 'failed' };
      }
    },

    async create_calendar_event(args, user) {
      try {
        const title = args.title as string;
        const startTime = new Date(args.startTime as string);
        const endTime = new Date(args.endTime as string);
        const location = args.location as string | undefined;
        const description = args.description as string | undefined;
        const attendees = (args.attendees as string[]) ?? [];

        const calendar = await getCalendarProvider();
        const event = await calendar.createEvent(user.id, {
          title,
          startTime,
          endTime,
          location,
          description,
          attendees,
        });

        return {
          status: 'created',
          event: {
            id: event.id,
            title: event.title,
            startTime: event.startTime.toISOString(),
            endTime: event.endTime.toISOString(),
            location: event.location,
            attendees: event.attendees,
          },
          message: `Calendar event "${title}" created for ${startTime.toLocaleDateString()} ${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}–${endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to create calendar event', status: 'failed' };
      }
    },

    async find_free_time(args, user) {
      try {
        const targetEmail = args.targetEmail as string | undefined;
        const durationMinutes = (args.durationMinutes as number) ?? 30;

        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        const fiveDaysOut = new Date(tomorrow);
        fiveDaysOut.setDate(fiveDaysOut.getDate() + 5);

        const startDate = args.startDate ? new Date(args.startDate as string) : tomorrow;
        const endDate = args.endDate ? new Date(args.endDate as string) : fiveDaysOut;

        if (targetEmail) {
          // Use scheduling service for mutual availability
          const options = await findMeetingOptions({
            requesterId: user.id,
            targetEmail,
            durationMinutes,
            startDate,
            endDate,
          });

          return {
            targetEmail,
            durationMinutes,
            searchWindow: {
              start: startDate.toISOString(),
              end: endDate.toISOString(),
            },
            slotCount: options.length,
            availableSlots: options.map((o) => ({
              start: o.start.toISOString(),
              end: o.end.toISOString(),
              label: o.label,
              score: o.score,
            })),
          };
        }

        // Solo availability — check user's own calendar for gaps
        const calendar = await getCalendarProvider();
        const events = await calendar.getEvents(user.id, startDate, endDate);

        // Simple gap detection (9am-5pm, 30min increments)
        const slots: { start: string; end: string; label: string }[] = [];
        const cursor = new Date(startDate);

        while (cursor < endDate && slots.length < 8) {
          const dayOfWeek = cursor.getDay();
          if (dayOfWeek >= 1 && dayOfWeek <= 5) {
            // Weekdays only
            for (let hour = 9; hour < 17 && slots.length < 8; hour++) {
              const slotStart = new Date(cursor);
              slotStart.setHours(hour, 0, 0, 0);
              const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60 * 1000);

              const hasConflict = events.some(
                (e) => e.startTime < slotEnd && e.endTime > slotStart,
              );

              if (!hasConflict) {
                slots.push({
                  start: slotStart.toISOString(),
                  end: slotEnd.toISOString(),
                  label: `${slotStart.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}, ${slotStart.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}–${slotEnd.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`,
                });
              }
            }
          }
          cursor.setDate(cursor.getDate() + 1);
          cursor.setHours(0, 0, 0, 0);
        }

        return {
          durationMinutes,
          searchWindow: {
            start: startDate.toISOString(),
            end: endDate.toISOString(),
          },
          slotCount: slots.length,
          availableSlots: slots,
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to find free time', status: 'failed' };
      }
    },
  },
};
