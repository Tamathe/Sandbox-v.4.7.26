/**
 * Sandy Universal Agent — Sandy Self-Referential Tools (P0 + P1)
 *
 * P0 (3): get_current_context, get_user_profile, navigate_user
 * P1 (2): search_platform, launch_tool
 *
 * Wraps concierge-service.ts page descriptions, Prisma user/tool queries.
 */

import type { ToolModule } from '../agent-types';
import { describeCurrentPage } from '../../concierge-service';
import { prisma } from '../../prisma';

export const sandyTools: ToolModule = {
  tools: [
    // ── P0 Tools ──────────────────────────────────────────────────
    {
      name: 'get_current_context',
      description:
        'Get context about the current page the user is viewing, the current time, and their role. Use this to understand what the user is doing right now.',
      category: 'sandy',
      permission: 'auto',
      roles: ['EDUCATOR', 'STUDENT', 'ADMIN', 'STAFF', 'REGISTRAR'],
      reliability: 'navigation',
      input_schema: {
        type: 'object',
        properties: {
          currentPage: {
            type: 'string',
            description: 'The current page pathname (e.g. "/courses", "/hub")',
          },
        },
        required: [],
      },
    },
    {
      name: 'get_user_profile',
      description:
        'Get detailed profile for the current user including role, courses, preferences, and learning profile.',
      category: 'sandy',
      permission: 'auto',
      roles: ['EDUCATOR', 'STUDENT', 'ADMIN', 'STAFF', 'REGISTRAR'],
      input_schema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'navigate_user',
      description:
        'Navigate the user to a specific page on the platform. Returns a navigation instruction that the client will execute.',
      category: 'sandy',
      permission: 'auto',
      roles: ['EDUCATOR', 'STUDENT', 'ADMIN', 'STAFF', 'REGISTRAR'],
      reliability: 'navigation',
      input_schema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'The page path to navigate to (e.g. "/courses", "/hub", "/build", "/explore-majors")',
          },
          reason: {
            type: 'string',
            description: 'Brief explanation of why Sandy is suggesting this navigation',
          },
        },
        required: ['path'],
      },
    },

    // ── P1 Tools ──────────────────────────────────────────────────
    {
      name: 'search_platform',
      description:
        'Full-text search across courses, tools, materials, and users on the platform. Returns matching results grouped by type.',
      category: 'sandy',
      permission: 'auto',
      roles: ['EDUCATOR', 'STUDENT', 'ADMIN', 'STAFF', 'REGISTRAR'],
      input_schema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query (e.g. "resume builder", "machine learning course", "TEK-100")',
          },
          type: {
            type: 'string',
            description: 'Optional filter: "courses", "tools", "materials", "users"',
          },
          limit: {
            type: 'number',
            description: 'Max results per category (default 5)',
          },
        },
        required: ['query'],
      },
    },
    {
      name: 'launch_tool',
      description:
        'Open a specific tool for the user by name or ID. Returns a navigation instruction to the tool page.',
      category: 'sandy',
      permission: 'auto',
      roles: ['EDUCATOR', 'STUDENT', 'ADMIN', 'STAFF', 'REGISTRAR'],
      reliability: 'navigation',
      input_schema: {
        type: 'object',
        properties: {
          toolName: {
            type: 'string',
            description: 'Name of the tool to launch (e.g. "Resume Builder", "Exam Forge")',
          },
          toolId: {
            type: 'string',
            description: 'Alternative: direct tool ID',
          },
        },
        required: [],
      },
    },
  ],

  handlers: {
    // ── P0 Handlers ─────────────────────────────────────────────
    async get_current_context(args) {
      try {
        const currentPage = (args.currentPage as string) ?? '/';
        const pageDescription = describeCurrentPage(currentPage);

        return {
          currentPage,
          pageDescription,
          timestamp: new Date().toISOString(),
          platform: 'University of Kentucky',
          university: 'University of Kentucky',
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to get context', status: 'failed' };
      }
    },

    async get_user_profile(_args, user) {
      try {
        const fullUser = await prisma.user.findUnique({
          where: { id: user.id },
          include: {
            studentProfile: {
              select: {
                preferredModality: true,
                avgSessionLength: true,
                peakEngagementHour: true,
                riskScore: true,
                learningVelocity: true,
                totalSessionCount: true,
                lastSessionAt: true,
                topConceptsThisWeek: true,
                dominantBloomLevel: true,
              },
            },
            _count: {
              select: {
                courses: true,
                courseEnrollments: true,
                tools: true,
              },
            },
          },
        });

        if (!fullUser) {
          return { error: 'User not found' };
        }

        return {
          id: fullUser.id,
          name: fullUser.name,
          email: fullUser.email,
          role: fullUser.role,
          department: fullUser.department,
          college: fullUser.college,
          personalContext: fullUser.personalContext,
          memberSince: fullUser.createdAt.toISOString(),
          coursesTeaching: fullUser._count.courses,
          coursesEnrolled: fullUser._count.courseEnrollments,
          toolsCreated: fullUser._count.tools,
          learningProfile: fullUser.studentProfile
            ? {
                preferredModality: fullUser.studentProfile.preferredModality,
                avgSessionMinutes: fullUser.studentProfile.avgSessionLength
                  ? Math.round(fullUser.studentProfile.avgSessionLength / 60)
                  : null,
                peakHour: fullUser.studentProfile.peakEngagementHour,
                riskScore: fullUser.studentProfile.riskScore,
                learningVelocity: fullUser.studentProfile.learningVelocity,
                totalSessions: fullUser.studentProfile.totalSessionCount,
                lastActive: fullUser.studentProfile.lastSessionAt?.toISOString() ?? null,
                topConcepts: fullUser.studentProfile.topConceptsThisWeek,
                bloomLevel: fullUser.studentProfile.dominantBloomLevel,
              }
            : null,
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to get user profile', status: 'failed' };
      }
    },

    async navigate_user(args) {
      try {
        const path = args.path as string;
        const reason = args.reason as string | undefined;

        return {
          action: 'navigate',
          path,
          reason: reason ?? `Navigating to ${path}`,
          instruction: `<!--ACTION:{"type":"navigate","href":"${path}","label":"${reason ?? path}"}-->`,
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to navigate', status: 'failed' };
      }
    },

    // ── P1 Handlers ─────────────────────────────────────────────
    async search_platform(args) {
      try {
        const query = args.query as string;
        const typeFilter = args.type as string | undefined;
        const limit = (args.limit as number) ?? 5;
        const results: Record<string, unknown> = { query };

        // Search courses
        if (!typeFilter || typeFilter === 'courses') {
          const courses = await prisma.course.findMany({
            where: {
              OR: [
                { title: { contains: query, mode: 'insensitive' } },
                { courseCode: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } },
              ],
            },
            select: {
              id: true,
              courseCode: true,
              title: true,
              instructor: { select: { name: true } },
            },
            take: limit,
          });
          results.courses = courses.map((c) => ({
            id: c.id,
            courseCode: c.courseCode,
            title: c.title,
            instructor: c.instructor?.name ?? 'Unknown',
            url: `/courses/${c.id}`,
          }));
        }

        // Search tools
        if (!typeFilter || typeFilter === 'tools') {
          const tools = await prisma.tool.findMany({
            where: {
              OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { shortDescription: { contains: query, mode: 'insensitive' } },
              ],
              published: true,
            },
            select: {
              id: true,
              name: true,
              shortDescription: true,
              category: true,
            },
            take: limit,
          });
          results.tools = tools.map((t) => ({
            id: t.id,
            name: t.name,
            description: t.shortDescription?.slice(0, 100) ?? '',
            category: t.category,
            url: `/hub/${t.id}`,
          }));
        }

        // Search materials
        if (!typeFilter || typeFilter === 'materials') {
          const materials = await prisma.courseMaterial.findMany({
            where: {
              title: { contains: query, mode: 'insensitive' },
            },
            select: {
              id: true,
              title: true,
              materialType: true,
              course: { select: { courseCode: true } },
            },
            take: limit,
          });
          results.materials = materials.map((m) => ({
            id: m.id,
            title: m.title,
            type: m.materialType,
            courseCode: m.course.courseCode,
          }));
        }

        // Search users
        if (!typeFilter || typeFilter === 'users') {
          const users = await prisma.user.findMany({
            where: {
              OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { email: { contains: query, mode: 'insensitive' } },
                { department: { contains: query, mode: 'insensitive' } },
              ],
            },
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              department: true,
            },
            take: limit,
          });
          results.users = users.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            department: u.department,
          }));
        }

        return results;
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to search platform', status: 'failed' };
      }
    },

    async launch_tool(args) {
      try {
        const toolName = args.toolName as string | undefined;
        const toolId = args.toolId as string | undefined;

        if (!toolName && !toolId) {
          return { error: 'Either toolName or toolId is required' };
        }

        let tool;
        if (toolId) {
          tool = await prisma.tool.findUnique({
            where: { id: toolId },
            select: { id: true, name: true, shortDescription: true, category: true },
          });
        } else if (toolName) {
          tool = await prisma.tool.findFirst({
            where: {
              name: { contains: toolName, mode: 'insensitive' },
              published: true,
            },
            select: { id: true, name: true, shortDescription: true, category: true },
          });
        }

        if (!tool) {
          return { error: `Tool "${toolName ?? toolId}" not found` };
        }

        const path = `/hub/${tool.id}`;
        return {
          action: 'navigate',
          tool: {
            id: tool.id,
            name: tool.name,
            description: tool.shortDescription?.slice(0, 150) ?? '',
            category: tool.category,
          },
          path,
          instruction: `<!--ACTION:{"type":"navigate","href":"${path}","label":"Open ${tool.name}"}-->`,
          message: `Opening "${tool.name}" for you.`,
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to launch tool', status: 'failed' };
      }
    },
  },
};
