/**
 * Sandy Universal Agent — Communication Tools (P0 + P1)
 *
 * P0 (2): get_unread_emails, draft_email
 * P1 (5): send_message, post_announcement, get_conversations, check_follow_ups, compose_email
 *
 * Wraps existing email-service, messaging, and communication services.
 */

import type { ToolModule } from '../agent-types';
import { getInbox } from '../../assistant/email-service';
import type { EmailCategorySummary } from '../../assistant/providers';
import { getEmailProvider } from '../../assistant/providers';
import { getConversations as fetchConversations } from '../../messages/conversations-service';

export const communicationTools: ToolModule = {
  tools: [
    // ── P0 Tools ──────────────────────────────────────────────────
    {
      name: 'get_unread_emails',
      description:
        'Fetch unread emails with category breakdown (decision, waiting, fyi, noise). Returns up to 10 most recent unread emails.',
      category: 'communication',
      permission: 'auto',
      roles: ['EDUCATOR', 'STUDENT', 'ADMIN', 'STAFF', 'REGISTRAR'],
      input_schema: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description: 'Optional category filter: decision, waiting, fyi, noise',
          },
          limit: {
            type: 'number',
            description: 'Max emails to return (default 10)',
          },
        },
        required: [],
      },
    },
    {
      name: 'draft_email',
      description:
        'Compose a draft email for the user to review before sending. Shows a preview for approval.',
      category: 'communication',
      permission: 'confirm',
      roles: ['EDUCATOR', 'STUDENT', 'ADMIN', 'STAFF', 'REGISTRAR'],
      input_schema: {
        type: 'object',
        properties: {
          to: { type: 'string', description: 'Recipient email address' },
          subject: { type: 'string', description: 'Email subject line' },
          body: { type: 'string', description: 'Email body text' },
          replyToEmailId: {
            type: 'string',
            description: 'If replying, the ID of the original email',
          },
        },
        required: ['to', 'subject', 'body'],
      },
    },

    // ── P1 Tools ──────────────────────────────────────────────────
    {
      name: 'send_message',
      description:
        'Send a platform message to a user or group chat. Sandy will show the message content for your approval before sending.',
      category: 'communication',
      permission: 'confirm',
      roles: ['EDUCATOR', 'STUDENT', 'ADMIN', 'STAFF', 'REGISTRAR'],
      input_schema: {
        type: 'object',
        properties: {
          recipientId: { type: 'string', description: 'User ID of the recipient' },
          groupId: { type: 'string', description: 'Chat group ID (alternative to recipientId for group messages)' },
          content: { type: 'string', description: 'Message content' },
        },
        required: ['content'],
      },
    },
    {
      name: 'post_announcement',
      description:
        'Post an announcement to a course or the entire platform. Sandy will show the announcement for your review before posting.',
      category: 'communication',
      permission: 'confirm',
      roles: ['EDUCATOR', 'ADMIN', 'STAFF'],
      input_schema: {
        type: 'object',
        properties: {
          courseId: { type: 'string', description: 'Course ID to post to (omit for platform-wide)' },
          title: { type: 'string', description: 'Announcement title' },
          body: { type: 'string', description: 'Announcement body (supports markdown)' },
          audience: { type: 'string', description: 'Target audience: students, faculty, all (default: all)' },
        },
        required: ['title', 'body'],
      },
    },
    {
      name: 'get_conversations',
      description:
        'List recent message threads/conversations for the current user, including unread counts and last message preview.',
      category: 'communication',
      permission: 'auto',
      roles: ['EDUCATOR', 'STUDENT', 'ADMIN', 'STAFF', 'REGISTRAR'],
      input_schema: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Max conversations to return (default 10)' },
        },
        required: [],
      },
    },
    {
      name: 'compose_email',
      description:
        'Start composing a new email with context-aware suggestions. Returns suggested recipient, subject, tone, and known contacts based on the user\'s current page.',
      category: 'communication',
      permission: 'auto',
      roles: ['EDUCATOR', 'STUDENT', 'ADMIN', 'STAFF', 'REGISTRAR'],
      input_schema: {
        type: 'object',
        properties: {
          to: { type: 'string', description: 'Recipient name or email (optional — Sandy will suggest)' },
          about: { type: 'string', description: 'What the email is about (optional)' },
        },
        required: [],
      },
    },
    {
      name: 'summarize_thread',
      description:
        'Summarize an email thread — useful for long conversations with 3+ messages. Returns a concise summary, key decisions, and whether a response is needed.',
      category: 'communication',
      permission: 'auto',
      roles: ['EDUCATOR', 'STUDENT', 'ADMIN', 'STAFF', 'REGISTRAR'],
      input_schema: {
        type: 'object',
        properties: {
          threadId: {
            type: 'string',
            description: 'The thread ID to summarize',
          },
        },
        required: ['threadId'],
      },
    },
    {
      name: 'detect_thread_stall',
      description:
        'Check if an email thread with 3+ participants and 4+ messages is going in circles. If stalling, suggests starting a Commons session to resolve it in real time.',
      category: 'communication',
      permission: 'auto',
      roles: ['EDUCATOR', 'STUDENT', 'ADMIN', 'STAFF', 'REGISTRAR'],
      input_schema: {
        type: 'object',
        properties: {
          threadId: {
            type: 'string',
            description: 'The thread ID to check for stalling',
          },
        },
        required: ['threadId'],
      },
    },
    {
      name: 'send_nudge',
      description:
        'Send a targeted nudge message to a specific student in a course. Sandy drafts the message based on the student\'s situation (grade drop, inactivity, etc.).',
      category: 'communication',
      permission: 'confirm',
      roles: ['EDUCATOR', 'ADMIN'],
      input_schema: {
        type: 'object',
        properties: {
          courseId: { type: 'string', description: 'Course ID' },
          studentName: { type: 'string', description: 'Student\'s name' },
          studentId: { type: 'string', description: 'Student user ID (if known)' },
          context: { type: 'string', description: 'Why the nudge (e.g. "grade drop", "inactive 10 days")' },
          message: { type: 'string', description: 'The nudge message body' },
        },
        required: ['courseId', 'message'],
      },
    },
    {
      name: 'suggest_course_posts',
      description:
        'Analyze course data and suggest posts/nudges faculty should send. Returns suggested posts with pre-filled content based on engagement trends, at-risk students, and upcoming deadlines.',
      category: 'communication',
      permission: 'auto',
      roles: ['EDUCATOR', 'ADMIN'],
      input_schema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'check_follow_ups',
      description:
        'Check for emails where you sent a reply but haven\'t heard back. Returns stale threads that may need a follow-up.',
      category: 'communication',
      permission: 'auto',
      roles: ['EDUCATOR', 'STUDENT', 'ADMIN', 'STAFF', 'REGISTRAR'],
      input_schema: {
        type: 'object',
        properties: {
          thresholdDays: {
            type: 'number',
            description: 'Number of days without a reply before flagging (default 3)',
          },
        },
        required: [],
      },
    },
  ],

  handlers: {
    // ── P0 Handlers ─────────────────────────────────────────────
    async get_unread_emails(args, user) {
      try {
        const category = args.category as string | undefined;
        const limit = (args.limit as number) ?? 10;

        const emailProvider = await getEmailProvider();
        const summary: EmailCategorySummary =
          await emailProvider.categorizeInbox(user.id);

        const emails = await getInbox(user.id, {
          category,
          limit,
        });

        const unread = emails.filter((e) => !e.isRead).slice(0, limit);

        // Enrich with sender context — look up each sender on the platform
        const { prisma } = await import('../../prisma');
        const senderAddresses = [...new Set(unread.map((e) => e.fromAddress))];
        const platformUsers = senderAddresses.length > 0
          ? await prisma.user.findMany({
              where: { email: { in: senderAddresses } },
              select: {
                email: true,
                role: true,
                name: true,
                courseEnrollments: { select: { course: { select: { courseCode: true } } } },
                courses: { select: { courseCode: true } },
              },
            })
          : [];

        const senderMap = new Map(
          platformUsers.map((u) => [
            u.email,
            {
              isPlatformUser: true,
              role: u.role,
              name: u.name,
              courses: [
                ...u.courses.map((c: { courseCode: string }) => c.courseCode),
                ...u.courseEnrollments.map((e: { course: { courseCode: string } }) => e.course.courseCode),
              ],
            },
          ]),
        );

        return {
          totalUnread: summary.unread,
          categories: summary.categories,
          urgentCount: summary.urgent.length,
          emails: unread.map((e) => ({
            id: e.id,
            from: e.fromName || e.fromAddress,
            fromAddress: e.fromAddress,
            subject: e.subject,
            snippet: e.snippet ?? e.body.slice(0, 150),
            category: e.category,
            receivedAt: e.receivedAt.toISOString(),
            isStarred: e.isStarred,
            urgencyScore: e.urgencyScore,
            urgencyBucket: e.urgencyBucket,
            senderContext: senderMap.get(e.fromAddress) ?? { isPlatformUser: false },
          })),
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to fetch emails', status: 'failed' };
      }
    },

    async draft_email(args, user) {
      try {
        const to = args.to as string;
        const subject = args.subject as string;
        const body = args.body as string;

        return {
          status: 'draft_created',
          draft: {
            from: user.email,
            fromName: user.name,
            to,
            subject,
            body,
          },
          message: `Draft email to ${to} created. Awaiting your approval to send.`,
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to draft email', status: 'failed' };
      }
    },

    // ── P1 Handlers ─────────────────────────────────────────────
    async send_message(args, user) {
      try {
        const content = args.content as string;
        const recipientId = args.recipientId as string | undefined;
        const groupId = args.groupId as string | undefined;

        if (!recipientId && !groupId) {
          return { error: 'Either recipientId or groupId is required' };
        }

        // For the demo, return a preview for the approval card
        // Actual send happens post-approval via compose-service
        let recipientName = 'Unknown';
        if (recipientId) {
          const { prisma } = await import('../../prisma');
          const recipient = await prisma.user.findUnique({
            where: { id: recipientId },
            select: { name: true },
          });
          recipientName = recipient?.name ?? recipientId;
        }

        return {
          status: 'preview',
          message: {
            from: user.name,
            to: recipientId ? recipientName : `Group ${groupId}`,
            content,
          },
          preview: `Message to ${recipientId ? recipientName : 'group chat'}: "${content.slice(0, 100)}${content.length > 100 ? '...' : ''}"`,
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to send message', status: 'failed' };
      }
    },

    async post_announcement(args, user) {
      try {
        const title = args.title as string;
        const body = args.body as string;
        const courseId = args.courseId as string | undefined;
        const audience = (args.audience as string) ?? 'all';

        // If courseId provided, create a real CoursePost
        if (courseId) {
          const { createCoursePost } = await import('../../course-post-service');
          const audienceMap: Record<string, 'ALL' | 'AT_RISK' | 'SPECIFIC'> = {
            students: 'ALL', all: 'ALL', 'at-risk': 'AT_RISK', specific: 'SPECIFIC',
          };
          const post = await createCoursePost({
            courseId,
            authorId: user.id,
            title,
            body,
            type: 'ANNOUNCEMENT',
            audience: audienceMap[audience.toLowerCase()] ?? 'ALL',
            channelPlatform: true,
            sandyGenerated: true,
            sandyPrompt: `post_announcement tool call: ${title}`,
          });

          const { prisma } = await import('../../prisma');
          const course = await prisma.course.findUnique({
            where: { id: courseId },
            select: { courseCode: true, title: true },
          });

          return {
            status: 'posted',
            announcement: {
              id: post.id,
              title,
              body,
              scope: course ? `${course.courseCode} — ${course.title}` : courseId,
              audience,
              author: user.name,
              createdAt: post.createdAt.toISOString(),
            },
            message: `Announcement "${title}" posted to ${course?.courseCode ?? courseId}. Students will see it in their course feed.`,
          };
        }

        // Platform-wide: preview only (admin announcements use a different system)
        return {
          status: 'preview',
          announcement: {
            title,
            body,
            scope: 'Platform-wide',
            audience,
            author: user.name,
            createdAt: new Date().toISOString(),
          },
          message: `Announcement "${title}" ready for Platform-wide (audience: ${audience}). Approve to post.`,
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to create announcement', status: 'failed' };
      }
    },

    async get_conversations(args, user) {
      try {
        const limit = (args.limit as number) ?? 10;

        const result = await fetchConversations({
          userId: user.id,
          limit,
        });

        return {
          conversationCount: result.conversations.length,
          conversations: result.conversations.map((c) => ({
            groupId: c.groupId,
            name: c.name,
            type: c.type,
            unreadCount: c.unreadCount,
            memberCount: c.memberCount,
            lastMessage: c.lastMessage
              ? {
                  content: c.lastMessage.content.slice(0, 150),
                  author: c.lastMessage.authorName,
                  sentAt: c.lastMessage.createdAt,
                }
              : null,
          })),
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to fetch conversations', status: 'failed' };
      }
    },

    async compose_email(args, user) {
      try {
        const { buildComposeContext } = await import('../../assistant/email-compose-service');
        const composeCtx = await buildComposeContext(
          (args._currentPage as string) ?? '/',
          user.id,
        );

        const to = args.to as string | undefined;
        const about = args.about as string | undefined;

        // If user specified a recipient, try to match against known contacts
        let matchedRecipient = composeCtx.suggestedRecipient;
        if (to) {
          const match = composeCtx.knownContacts.find(
            (c) => c.name.toLowerCase().includes(to.toLowerCase()) ||
                   c.email.toLowerCase().includes(to.toLowerCase()),
          );
          if (match) {
            matchedRecipient = { name: match.name, email: match.email, role: match.role };
          }
        }

        return {
          status: 'compose_ready',
          suggestedRecipient: matchedRecipient ?? null,
          suggestedSubject: about
            ? (composeCtx.suggestedSubject ?? '') + about
            : composeCtx.suggestedSubject ?? null,
          suggestedTone: composeCtx.suggestedTone,
          relatedCourse: composeCtx.relatedCourse ?? null,
          knownContacts: composeCtx.knownContacts.slice(0, 10).map((c) => ({
            name: c.name,
            email: c.email,
            role: c.role,
            context: c.context,
          })),
          instructions: matchedRecipient
            ? `Ready to compose an email to ${matchedRecipient.name}. Show the user a compose card using <!--ASSISTANT_ACTION:{"type":"show-compose-card",...}--> then offer to draft it.`
            : 'Show the user a compose card with their known contacts so they can pick a recipient.',
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to build compose context', status: 'failed' };
      }
    },

    async detect_thread_stall(args, user) {
      try {
        const threadId = args.threadId as string;
        if (!threadId) {
          return { error: 'threadId is required', status: 'failed' };
        }

        const { detectThreadStall } = await import('../../assistant/email-commons-bridge-service');
        const signal = await detectThreadStall(user.id, threadId);

        if (!signal.isCircular && !signal.isDecisionBlocked) {
          return {
            stalling: false,
            threadId: signal.threadId,
            participantCount: signal.participantCount,
            messageCount: signal.messageCount,
            message: 'Thread appears productive — no intervention needed.',
          };
        }

        return {
          stalling: true,
          threadId: signal.threadId,
          participantCount: signal.participantCount,
          messageCount: signal.messageCount,
          isCircular: signal.isCircular,
          isDecisionBlocked: signal.isDecisionBlocked,
          suggestedRoomType: signal.suggestedRoomType,
          suggestedTopic: signal.suggestedTopic,
          suggestion: signal.suggestion,
          instructions: signal.suggestedRoomType
            ? `Show the user a thread stall card: <!--ASSISTANT_ACTION:{"type":"show-thread-stall","threadId":"${signal.threadId}","suggestion":"${signal.suggestion.replace(/"/g, '\\"')}","roomType":"${signal.suggestedRoomType}","topic":"${signal.suggestedTopic.replace(/"/g, '\\"')}","participantCount":${signal.participantCount},"messageCount":${signal.messageCount}}-->`
            : undefined,
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to detect thread stall', status: 'failed' };
      }
    },

    async summarize_thread(args, user) {
      try {
        const threadId = args.threadId as string;
        if (!threadId) {
          return { error: 'threadId is required', status: 'failed' };
        }

        const { summarizeThread } = await import('../../assistant/email-thread-summary-service');
        const summary = await summarizeThread(user.id, threadId);

        return {
          threadId: summary.threadId,
          messageCount: summary.messageCount,
          summary: summary.summary,
          keyDecisions: summary.keyDecisions,
          needsResponse: summary.needsResponse,
          lastActivity: summary.lastActivity.toISOString(),
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to summarize thread', status: 'failed' };
      }
    },

    async send_nudge(args, user) {
      try {
        const courseId = args.courseId as string;
        const message = args.message as string;
        const studentId = args.studentId as string | undefined;
        const studentName = args.studentName as string | undefined;
        const context = args.context as string | undefined;

        const { createCoursePost } = await import('../../course-post-service');
        const { prisma } = await import('../../prisma');

        // Look up student by name if ID not provided
        let targetIds: string[] = [];
        let resolvedName = studentName ?? 'Student';
        if (studentId) {
          targetIds = [studentId];
        } else if (studentName) {
          const student = await prisma.user.findFirst({
            where: { name: { contains: studentName, mode: 'insensitive' } },
            select: { id: true, name: true },
          });
          if (student) {
            targetIds = [student.id];
            resolvedName = student.name;
          }
        }

        const post = await createCoursePost({
          courseId,
          authorId: user.id,
          body: message,
          type: 'NUDGE',
          audience: targetIds.length > 0 ? 'SPECIFIC' : 'ALL',
          targetStudentIds: targetIds,
          channelPlatform: true,
          sandyGenerated: true,
          sandyPrompt: `send_nudge: ${context ?? 'manual nudge'} for ${resolvedName}`,
        });

        const course = await prisma.course.findUnique({
          where: { id: courseId },
          select: { courseCode: true },
        });

        return {
          status: 'sent',
          postId: post.id,
          message: `Nudge sent to ${resolvedName} in ${course?.courseCode ?? courseId}. They'll see it in their course feed.`,
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to send nudge', status: 'failed' };
      }
    },

    async suggest_course_posts(_args, user) {
      try {
        const { getSuggestedNudges } = await import('../../course-post-service');
        const suggestions = await getSuggestedNudges(user.id);

        if (suggestions.length === 0) {
          return {
            status: 'no_suggestions',
            message: 'All your courses look healthy — no nudges needed right now.',
            suggestions: [],
          };
        }

        return {
          status: 'suggestions_found',
          count: suggestions.length,
          suggestions: suggestions.map(s => ({
            courseCode: s.courseCode,
            type: s.type,
            audience: s.audience,
            title: s.suggestedTitle,
            body: s.suggestedBody,
            reason: s.reason,
          })),
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to generate suggestions', status: 'failed' };
      }
    },

    async check_follow_ups(args, user) {
      try {
        const { getStaleThreads } = await import('../../assistant/email-followup-service');
        const thresholdDays = (args.thresholdDays as number) ?? 3;
        const candidates = await getStaleThreads(user.id, thresholdDays);

        if (candidates.length === 0) {
          return {
            status: 'all_clear',
            message: 'No stale threads — all your sent emails have been replied to.',
            candidates: [],
          };
        }

        return {
          status: 'follow_ups_found',
          count: candidates.length,
          candidates: candidates.map((c) => ({
            emailId: c.emailId,
            subject: c.subject,
            recipient: c.recipient,
            recipientAddress: c.recipientAddress,
            daysSinceApproval: c.daysSinceApproval,
            suggestedAction: c.suggestedAction,
          })),
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to check follow-ups', status: 'failed' };
      }
    },
  },
};
