/**
 * Sandy Universal Agent — Campus & Policy Tools (P0 + P1)
 *
 * P0 (1): search_policies
 * P1 (5): lookup_directory, check_degree_audit, get_campus_news,
 *          search_campus_orgs, search_campus_events
 *
 * Wraps existing policy-service, user-search, what-if-service, uknow-service,
 * and the CampusLabs Engage sync data (CampusOrg / CampusEvent).
 */

import type { ToolModule } from '../agent-types';
import { searchPolicies } from '../../staff/policy-service';
import { searchUsers } from '../../messages/user-search-service';
import { searchArticles } from '../../uknow-service';
import { imageUrl, orgUrl, ENGAGE_BASE } from '../../campuslabs';
import { searchDepartmentTools } from '../../department-service';
import { getDiningStatus, getDiningMenu, getNearestOpenDining } from '../../dining-service';
import { haversineDistance, walkingMinutes } from '../../geo-utils';

export const campusTools: ToolModule = {
  tools: [
    // ── P0 Tools ──────────────────────────────────────────────────
    {
      name: 'search_policies',
      description:
        'Search university policies using RAG (vector similarity). Returns matching policy documents with relevant excerpts. Useful for answering questions about academic policies, compliance, HR, financial policies, etc.',
      category: 'campus',
      permission: 'auto',
      roles: ['EDUCATOR', 'STUDENT', 'ADMIN', 'STAFF', 'REGISTRAR'],
      input_schema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Natural language search query (e.g. "credit hour definition", "grade appeal process")',
          },
          category: {
            type: 'string',
            description: 'Optional category filter (e.g. "Academic", "Financial", "HR")',
          },
          limit: {
            type: 'number',
            description: 'Max results to return (default 5)',
          },
        },
        required: ['query'],
      },
    },

    // ── P1 Tools ──────────────────────────────────────────────────
    {
      name: 'lookup_directory',
      description:
        'Search the university directory to find people by name, email, or department. Returns matching users with their role and contact info.',
      category: 'campus',
      permission: 'auto',
      roles: ['EDUCATOR', 'STUDENT', 'ADMIN', 'STAFF', 'REGISTRAR'],
      input_schema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search by name, email, or department (e.g. "Thompson", "dean", "computer science")',
          },
          limit: {
            type: 'number',
            description: 'Max results to return (default 10)',
          },
        },
        required: ['query'],
      },
    },
    {
      name: 'check_degree_audit',
      description:
        'Run a degree audit for a student to check their progress toward graduation requirements, completed credits, remaining requirements, and GPA.',
      category: 'campus',
      permission: 'auto',
      roles: ['EDUCATOR', 'ADMIN', 'REGISTRAR', 'STUDENT'],
      reliability: 'synthetic',
      input_schema: {
        type: 'object',
        properties: {
          studentId: {
            type: 'string',
            description: 'The student user ID (omit to check current user if student)',
          },
          programCode: {
            type: 'string',
            description: 'Optional degree program code for what-if audit (e.g. "CS-BS")',
          },
        },
        required: [],
      },
    },
    {
      name: 'get_campus_news',
      description:
        'Fetch recent UKNow articles, campus news, and university alerts. Can search by topic.',
      category: 'campus',
      permission: 'auto',
      roles: ['EDUCATOR', 'STUDENT', 'ADMIN', 'STAFF', 'REGISTRAR'],
      input_schema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Optional search query to filter articles by topic',
          },
          limit: {
            type: 'number',
            description: 'Max articles to return (default 5)',
          },
        },
        required: [],
      },
    },
    {
      name: 'search_campus_orgs',
      description:
        'Search student organizations from BBNvolved (CampusLabs Engage). Find clubs, Greek orgs, academic groups, service orgs, and more. Returns name, summary, categories, image, and link to Engage page.',
      category: 'campus',
      permission: 'auto',
      roles: ['EDUCATOR', 'STUDENT', 'ADMIN', 'STAFF', 'REGISTRAR'],
      input_schema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description:
              'Search by org name or keyword (e.g. "engineering", "volunteer", "dance")',
          },
          category: {
            type: 'string',
            description:
              'Filter by category: Academic-Honorary, Academic-Interest, Cultural, Fine Arts, Hobbies/Interests, Political, Professional, Recreational, Religious/Spiritual, Service/Volunteer, Greek, Graduate/Professional, Other',
          },
          limit: {
            type: 'number',
            description: 'Max results (default 10, max 25)',
          },
        },
        required: [],
      },
    },
    {
      name: 'search_campus_events',
      description:
        'Search upcoming campus events from BBNvolved (CampusLabs Engage). Find events by topic, theme, benefits (free food, credit), or hosting organization. Returns event name, date/time, location, org, theme, and benefits.',
      category: 'campus',
      permission: 'auto',
      roles: ['EDUCATOR', 'STUDENT', 'ADMIN', 'STAFF', 'REGISTRAR'],
      input_schema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description:
              'Search by event name or org name (e.g. "career fair", "study abroad")',
          },
          theme: {
            type: 'string',
            description:
              'Filter by theme: Arts, Athletics, CommunityService, Cultural, Fundraising, GroupBusiness, Social, Spirituality, ThoughtfulLearning',
          },
          benefit: {
            type: 'string',
            description: 'Filter by benefit: "Free Food", "Credit", "Free Stuff"',
          },
          daysAhead: {
            type: 'number',
            description: 'Only show events starting within this many days (default: 30)',
          },
          limit: {
            type: 'number',
            description: 'Max results (default 10, max 25)',
          },
        },
        required: [],
      },
    },
    // ── Campus Map Tools ───────────────────────────────────────
    {
      name: 'search_campus_map',
      description:
        'Search for buildings and locations on the UK campus map. Returns building details including type, address, hours, amenities, and coordinates. Use when users ask "Where is the library?" or "What dining halls are on campus?"',
      category: 'campus',
      permission: 'auto',
      roles: ['EDUCATOR', 'STUDENT', 'ADMIN', 'STAFF', 'REGISTRAR'],
      reliability: 'seeded',
      input_schema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Building name or type to search for (e.g., "Young Library", "dining", "parking")',
          },
        },
        required: ['query'],
      },
    },

    {
      name: 'find_nearest_parking',
      description:
        'Find the nearest parking structures to a campus building. Accepts a building name or slug, returns the top 3 closest parking options with distance and walking time.',
      category: 'campus',
      permission: 'auto',
      roles: ['EDUCATOR', 'STUDENT', 'ADMIN', 'STAFF', 'REGISTRAR'],
      reliability: 'seeded',
      input_schema: {
        type: 'object',
        properties: {
          building: {
            type: 'string',
            description: 'Building name or slug to find parking near (e.g., "Young Library", "young-library")',
          },
        },
        required: ['building'],
      },
    },
    {
      name: 'estimate_walking_route',
      description:
        'Estimate walking distance and time between two campus buildings. Useful for answering "How far is it from Young Library to Gatton?" or checking if a student can make it between back-to-back classes.',
      category: 'campus',
      permission: 'auto',
      roles: ['EDUCATOR', 'STUDENT', 'ADMIN', 'STAFF', 'REGISTRAR'],
      reliability: 'seeded',
      input_schema: {
        type: 'object',
        properties: {
          from: {
            type: 'string',
            description: 'Starting building name or slug',
          },
          to: {
            type: 'string',
            description: 'Destination building name or slug',
          },
        },
        required: ['from', 'to'],
      },
    },

    {
      name: 'get_building_details',
      description:
        'Get full details for a campus building including floors, departments, accessibility notes, and indoor wayfinding hints. Use when a user asks about a specific room (e.g., "Room 203 Marksbury"), needs to find a department, or asks about accessibility. Returns floor info, entrance suggestions, and department locations.',
      category: 'campus',
      permission: 'auto',
      roles: ['EDUCATOR', 'STUDENT', 'ADMIN', 'STAFF', 'REGISTRAR'],
      reliability: 'seeded',
      input_schema: {
        type: 'object',
        properties: {
          building: {
            type: 'string',
            description: 'Building name, slug, or short name (e.g., "Marksbury", "marksbury-building", "DMB")',
          },
          room: {
            type: 'string',
            description: 'Optional room number (e.g., "203", "Room 203"). If provided, floor info and entrance suggestion will be included.',
          },
        },
        required: ['building'],
      },
    },

    // ── Department Storefront Tools ──────────────────────────────
    {
      name: 'request_department_tool',
      description:
        'Submit a tool request to a department. Use when a user says "I need a rubric generator" or "Can CELT build a tool for X?" and no existing tool matches. Creates a ToolRequest linked to the specified department. Sandy should first search existing tools before creating a request.',
      category: 'campus',
      permission: 'confirm',
      roles: ['EDUCATOR', 'STUDENT', 'ADMIN', 'STAFF', 'REGISTRAR'],
      input_schema: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Short title for the requested tool (e.g. "Rubric Generator")',
          },
          description: {
            type: 'string',
            description: 'Description of what the tool should do and who would use it',
          },
          department: {
            type: 'string',
            description: 'Department slug to route the request to (e.g. "celt", "engineering"). If omitted, creates an unrouted request.',
          },
          category: {
            type: 'string',
            description: 'Optional tool category (e.g. "Assessment", "Research", "Writing")',
          },
        },
        required: ['title', 'description'],
      },
    },
    {
      name: 'check_dining',
      description:
        'Check dining hall hours, menus, and what is open now. Can find nearest open dining to a building.',
      category: 'campus',
      permission: 'auto',
      roles: ['EDUCATOR', 'ADMIN', 'STAFF', 'STUDENT', 'REGISTRAR'],
      input_schema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Specific dining hall name or question',
          },
          nearBuilding: {
            type: 'string',
            description: 'Building name to find nearest dining',
          },
        },
      },
    },
    {
      name: 'search_department_tools',
      description:
        'Search for approved tools within department storefronts. Finds tools by name or description across all departments, or filtered to a specific department. Useful for answering "What tools does CELT offer?" or "Find assessment tools".',
      category: 'campus',
      permission: 'auto',
      roles: ['EDUCATOR', 'STUDENT', 'ADMIN', 'STAFF', 'REGISTRAR'],
      input_schema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query to match tool name or description (e.g. "assessment", "resume")',
          },
          department: {
            type: 'string',
            description: 'Optional department slug to filter results (e.g. "celt", "engineering")',
          },
        },
        required: ['query'],
      },
    },
  ],

  handlers: {
    // ── P0 Handler ──────────────────────────────────────────────
    async search_policies(args) {
      try {
        const query = args.query as string;
        const category = args.category as string | undefined;
        const limit = (args.limit as number) ?? 5;

        const results = await searchPolicies(query, { category, limit });

        return {
          query,
          resultCount: results.length,
          policies: results.map((r) => ({
            policyNumber: r.document.policyNumber,
            title: r.document.title,
            category: r.document.category,
            responsibleOffice: r.document.responsibleOffice,
            appliesTo: r.document.appliesTo,
            effectiveDate: r.document.effectiveDate.toISOString(),
            lastRevised: r.document.lastRevised.toISOString(),
            summary: r.document.summary,
            excerpt: r.highlightedExcerpt,
            relevantSections: r.matchedChunks.map((c) => ({
              section: c.sectionTitle,
              content: c.content.slice(0, 300),
              similarity: Math.round(c.similarity * 100) / 100,
            })),
          })),
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to search policies', status: 'failed' };
      }
    },

    // ── P1 Handlers ─────────────────────────────────────────────
    async lookup_directory(args, user) {
      try {
        const query = args.query as string;
        const limit = (args.limit as number) ?? 10;

        const results = await searchUsers(user.id, query, limit);

        return {
          query,
          resultCount: results.length,
          people: results.map((r) => ({
            id: r.id,
            name: r.name,
            email: r.email,
            role: r.role,
            avatarUrl: r.avatarUrl,
          })),
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to search directory', status: 'failed' };
      }
    },

    async check_degree_audit(args, user) {
      try {
        const studentId = (args.studentId as string) ?? user.id;
        const programCode = args.programCode as string | undefined;

        const { prisma } = await import('../../prisma');

        // Fetch student info and enrolled program
        const student = await prisma.user.findUnique({
          where: { id: studentId },
          select: {
            id: true,
            name: true,
            email: true,
            studentProfile: {
              select: { riskScore: true, learningVelocity: true },
            },
          },
        });

        if (!student) {
          return { error: 'Student not found' };
        }

        // Get most recent degree audit result if one exists
        const audit = await prisma.degreeAuditResult.findFirst({
          where: { studentId },
          orderBy: { auditedAt: 'desc' },
          select: {
            id: true,
            auditedAt: true,
            overallStatus: true,
            percentComplete: true,
            totalCreditsCompleted: true,
            totalCreditsRequired: true,
            requirementResults: true,
          },
        });

        if (!audit) {
          // Return synthetic data for demo — flagged so Sandy caveats it
          return {
            _isFallback: true,
            _fallbackReason: 'No degree audit record exists for this student. The data below is a synthetic estimate based on typical progress — do NOT present it as the student\'s actual record.',
            student: { id: student.id, name: student.name },
            programCode: programCode ?? 'Undeclared',
            audit: {
              creditsCompleted: 87,
              creditsRequired: 120,
              creditsRemaining: 33,
              onTrack: true,
              completionPercentage: 72.5,
              overallStatus: 'In Progress',
              requirementSummary: [
                { category: 'General Education', completed: 30, required: 30, status: 'complete' },
                { category: 'Core Major', completed: 42, required: 54, status: 'in_progress' },
                { category: 'Electives', completed: 15, required: 18, status: 'in_progress' },
                { category: 'Capstone', completed: 0, required: 6, status: 'not_started' },
              ],
            },
            message: `Degree audit for ${student.name}: 87/120 credits (72.5%).`,
          };
        }

        const creditsRemaining = audit.totalCreditsRequired - audit.totalCreditsCompleted;
        return {
          student: { id: student.id, name: student.name },
          programCode: programCode ?? 'Current Program',
          audit: {
            auditedAt: audit.auditedAt.toISOString(),
            overallStatus: audit.overallStatus,
            creditsCompleted: audit.totalCreditsCompleted,
            creditsRequired: audit.totalCreditsRequired,
            creditsRemaining,
            completionPercentage: audit.percentComplete,
            requirementResults: audit.requirementResults,
          },
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to check degree audit', status: 'failed' };
      }
    },

    async get_campus_news(args) {
      try {
        const query = args.query as string | undefined;
        const limit = (args.limit as number) ?? 5;

        if (query) {
          const result = await searchArticles(query, undefined, undefined, undefined, 1, limit);
          return {
            query,
            articleCount: result.articles.length,
            articles: result.articles.map((a) => ({
              id: a.id,
              title: a.title,
              section: a.section,
              publishedAt: a.publishedAt,
              excerpt: a.excerpt,
              slug: a.slug,
              url: `/uknow/${a.slug}`,
            })),
          };
        }

        // No query — return recent articles
        const { getRecentArticles } = await import('../../uknow-service');
        const recent = await getRecentArticles(undefined, limit);

        return {
          articleCount: recent.length,
          articles: recent.map((a) => ({
            id: a.id,
            title: a.title,
            section: a.section,
            publishedAt: a.publishedAt,
            excerpt: a.excerpt,
            slug: a.slug,
            url: `/uknow/${a.slug}`,
          })),
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to fetch campus news', status: 'failed' };
      }
    },

    async search_campus_orgs(args) {
      try {
        const { prisma } = await import('../../prisma');
        const query = args.query as string | undefined;
        const category = args.category as string | undefined;
        const limit = Math.min(25, (args.limit as number) ?? 10);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: any = { status: 'Active', visibility: 'Public' };

        if (query) {
          where.OR = [
            { name: { contains: query, mode: 'insensitive' } },
            { summary: { contains: query, mode: 'insensitive' } },
          ];
        }
        if (category) {
          where.categoryNames = { has: category };
        }

        const orgs = await prisma.campusOrg.findMany({
          where,
          orderBy: { name: 'asc' },
          take: limit,
          select: {
            name: true,
            shortName: true,
            websiteKey: true,
            summary: true,
            profilePicture: true,
            categoryNames: true,
          },
        });

        const total = await prisma.campusOrg.count({ where });

        return {
          query: query ?? '(all)',
          category: category ?? '(all)',
          resultCount: orgs.length,
          totalMatches: total,
          organizations: orgs.map((o) => ({
            name: o.name,
            shortName: o.shortName,
            categories: o.categoryNames,
            summary: o.summary.slice(0, 200),
            imageUrl: imageUrl(o.profilePicture),
            engageUrl: orgUrl(o.websiteKey),
            sandboxUrl: `/campus-life?tab=orgs&q=${encodeURIComponent(o.name)}`,
          })),
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to search orgs', status: 'failed' };
      }
    },

    async search_campus_events(args) {
      try {
        const { prisma } = await import('../../prisma');
        const query = args.query as string | undefined;
        const theme = args.theme as string | undefined;
        const benefit = args.benefit as string | undefined;
        const daysAhead = (args.daysAhead as number) ?? 30;
        const limit = Math.min(25, (args.limit as number) ?? 10);

        const now = new Date();
        const cutoff = new Date(now);
        cutoff.setDate(cutoff.getDate() + daysAhead);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: any = {
          status: 'Approved',
          visibility: 'Public',
          endsOn: { gte: now },
          startsOn: { lte: cutoff },
        };

        if (query) {
          where.OR = [
            { name: { contains: query, mode: 'insensitive' } },
            { organizationName: { contains: query, mode: 'insensitive' } },
          ];
        }
        if (theme) where.theme = theme;
        if (benefit) where.benefitNames = { has: benefit };

        const events = await prisma.campusEvent.findMany({
          where,
          orderBy: { startsOn: 'asc' },
          take: limit,
          select: {
            externalId: true,
            name: true,
            location: true,
            startsOn: true,
            endsOn: true,
            theme: true,
            categoryNames: true,
            benefitNames: true,
            organizationName: true,
            description: true,
          },
        });

        const total = await prisma.campusEvent.count({ where });

        return {
          query: query ?? '(all)',
          theme: theme ?? '(all)',
          benefit: benefit ?? '(all)',
          daysAhead,
          resultCount: events.length,
          totalMatches: total,
          events: events.map((e) => ({
            name: e.name,
            organization: e.organizationName,
            location: e.location,
            startsOn: e.startsOn.toISOString(),
            endsOn: e.endsOn.toISOString(),
            theme: e.theme,
            categories: e.categoryNames,
            benefits: e.benefitNames,
            description: e.description
              .replace(/<[^>]*>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
              .slice(0, 200),
            engageUrl: `${ENGAGE_BASE}/event/${e.externalId}`,
            sandboxUrl: `/campus-life?tab=events&q=${encodeURIComponent(e.name)}`,
          })),
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to search events', status: 'failed' };
      }
    },

    // ── Campus Map Handler ─────────────────────────────────────
    async search_campus_map(args) {
      try {
        const { prisma } = await import('../../prisma');
        const query = args.query as string;
        const q = query.toLowerCase();

        // Try exact type match first
        const typeMap: Record<string, string> = {
          academic: 'ACADEMIC', dining: 'DINING', recreation: 'RECREATION',
          library: 'LIBRARY', residence: 'RESIDENCE', parking: 'PARKING',
          health: 'HEALTH', administration: 'ADMINISTRATION', athletics: 'ATHLETICS',
          'student services': 'STUDENT_SERVICES',
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: any = {};
        const matchedType = Object.entries(typeMap).find(([k]) => q.includes(k));
        if (matchedType) {
          where.type = matchedType[1];
        } else {
          where.OR = [
            { name: { contains: query, mode: 'insensitive' } },
            { shortName: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ];
        }

        const buildings = await prisma.campusBuilding.findMany({
          where,
          orderBy: { name: 'asc' },
          take: 5,
        });

        return {
          query,
          resultCount: buildings.length,
          buildings: buildings.map((b) => ({
            name: b.name,
            shortName: b.shortName,
            type: b.type,
            address: b.address,
            hours: b.hours,
            description: b.description,
            amenities: b.amenities,
            floors: b.floors,
            departments: b.departments,
            accessibilityNotes: b.accessibilityNotes,
            latitude: b.latitude,
            longitude: b.longitude,
            mapUrl: `/campus-map`,
          })),
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to search campus map', status: 'failed' };
      }
    },

    // ── Nearest Parking Handler ─────────────────────────────
    async find_nearest_parking(args) {
      try {
        const { prisma } = await import('../../prisma');
        const buildingQuery = args.building as string;

        // Look up the target building by name, slug, or alias
        const qUpper = buildingQuery.toUpperCase();
        const target = await prisma.campusBuilding.findFirst({
          where: {
            OR: [
              { name: { contains: buildingQuery, mode: 'insensitive' } },
              { slug: { equals: buildingQuery } },
              { shortName: { contains: buildingQuery, mode: 'insensitive' } },
              { aliases: { hasSome: [buildingQuery, qUpper, buildingQuery.toLowerCase()] } },
            ],
          },
        });

        if (!target) {
          return { error: `Building "${buildingQuery}" not found on campus map.` };
        }

        // Fetch all parking buildings
        const parkingLots = await prisma.campusBuilding.findMany({
          where: { type: 'PARKING' },
        });

        if (parkingLots.length === 0) {
          return { error: 'No parking structures found on campus map.' };
        }

        // Rank by distance
        const ranked = parkingLots
          .map((p) => {
            const dist = haversineDistance(target.latitude, target.longitude, p.latitude, p.longitude);
            return {
              name: p.name,
              shortName: p.shortName,
              address: p.address,
              distanceMiles: Math.round(dist * 100) / 100,
              walkingMinutes: walkingMinutes(dist),
            };
          })
          .sort((a, b) => a.distanceMiles - b.distanceMiles)
          .slice(0, 3);

        return {
          building: target.name,
          nearestParking: ranked,
          message: `The closest parking to ${target.name} is ${ranked[0].name} (${ranked[0].walkingMinutes} min walk).`,
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to find nearest parking', status: 'failed' };
      }
    },

    // ── Walking Route Estimate Handler ──────────────────────
    async estimate_walking_route(args) {
      try {
        const { prisma } = await import('../../prisma');
        const fromQ = args.from as string;
        const toQ = args.to as string;

        function buildingWhere(q: string) {
          const qUpper = q.toUpperCase();
          return {
            OR: [
              { name: { contains: q, mode: 'insensitive' as const } },
              { slug: { equals: q } },
              { shortName: { contains: q, mode: 'insensitive' as const } },
              { aliases: { hasSome: [q, qUpper, q.toLowerCase()] } },
            ],
          };
        }

        const [fromBuilding, toBuilding] = await Promise.all([
          prisma.campusBuilding.findFirst({ where: buildingWhere(fromQ) }),
          prisma.campusBuilding.findFirst({ where: buildingWhere(toQ) }),
        ]);

        if (!fromBuilding) return { error: `Building "${fromQ}" not found on campus map.` };
        if (!toBuilding) return { error: `Building "${toQ}" not found on campus map.` };

        const dist = haversineDistance(
          fromBuilding.latitude, fromBuilding.longitude,
          toBuilding.latitude, toBuilding.longitude
        );
        const mins = walkingMinutes(dist);
        const warning = mins > 10;

        return {
          from: fromBuilding.name,
          to: toBuilding.name,
          distanceMiles: Math.round(dist * 100) / 100,
          walkingMinutes: mins,
          warning,
          message: `${fromBuilding.name} → ${toBuilding.name}: ${Math.round(dist * 100) / 100} mi, ~${mins} min walk.${warning ? ' ⚠️ This is a long walk — you may want to allow extra time.' : ''}`,
          directionsUrl: `https://www.google.com/maps/dir/?api=1&origin=${fromBuilding.latitude},${fromBuilding.longitude}&destination=${toBuilding.latitude},${toBuilding.longitude}&travelmode=walking`,
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to estimate walking route', status: 'failed' };
      }
    },

    // ── Building Details + Indoor Wayfinding Handler ─────────
    async get_building_details(args) {
      try {
        const { prisma } = await import('../../prisma');
        const buildingQuery = args.building as string;
        const roomNumber = args.room as string | undefined;

        const qUpper = buildingQuery.toUpperCase();
        const building = await prisma.campusBuilding.findFirst({
          where: {
            OR: [
              { name: { contains: buildingQuery, mode: 'insensitive' } },
              { slug: { equals: buildingQuery } },
              { shortName: { contains: buildingQuery, mode: 'insensitive' } },
              { aliases: { hasSome: [buildingQuery, qUpper, buildingQuery.toLowerCase()] } },
            ],
          },
        });

        if (!building) {
          return { error: `Building "${buildingQuery}" not found on campus map.` };
        }

        // Build response with full details
        const details: Record<string, unknown> = {
          name: building.name,
          shortName: building.shortName,
          type: building.type,
          address: building.address,
          hours: building.hours,
          description: building.description,
          floors: building.floors,
          departments: building.departments,
          accessibilityNotes: building.accessibilityNotes,
          amenities: building.amenities,
          latitude: building.latitude,
          longitude: building.longitude,
          mapUrl: '/campus-map',
        };

        // Indoor wayfinding hints when a room number is provided
        if (roomNumber) {
          const roomDigits = roomNumber.replace(/\D/g, '');
          const floorNumber = roomDigits.length > 0 ? parseInt(roomDigits.charAt(0), 10) : null;

          const wayfinding: Record<string, unknown> = { room: roomNumber };

          if (floorNumber !== null && building.floors) {
            if (floorNumber === 0 || floorNumber <= building.floors) {
              wayfinding.estimatedFloor = floorNumber === 0 ? 'Basement / Ground floor' : `Floor ${floorNumber}`;
              wayfinding.floorHint = floorNumber === 0
                ? 'This room is likely on the ground or basement level.'
                : floorNumber === 1
                  ? 'This room is on the first floor — accessible directly from the main entrance.'
                  : `This room is on floor ${floorNumber}. Use the elevator or stairs to reach this level.`;
            } else {
              wayfinding.floorHint = `Room ${roomNumber} suggests floor ${floorNumber}, but ${building.name} has only ${building.floors} floors. Double-check the room number.`;
            }
          }

          // Entrance suggestion based on accessibility notes
          if (building.accessibilityNotes) {
            const notes = building.accessibilityNotes.toLowerCase();
            if (notes.includes('main entrance')) {
              const mainMatch = building.accessibilityNotes.match(/[Mm]ain entrance[^.]*\./);
              wayfinding.entranceSuggestion = mainMatch ? mainMatch[0] : 'Use the main entrance.';
            } else {
              const entranceMatch = building.accessibilityNotes.match(/[Aa]ccessible entrance[^.]*\./);
              wayfinding.entranceSuggestion = entranceMatch ? entranceMatch[0] : null;
            }
          }

          details.wayfinding = wayfinding;
        }

        return details;
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to get building details', status: 'failed' };
      }
    },

    // ── Department Tool Request Handler ──────────────────────
    async request_department_tool(args, user) {
      try {
        const { prisma } = await import('../../prisma');
        const title = args.title as string;
        const description = args.description as string;
        const departmentSlug = args.department as string | undefined;
        const category = args.category as string | undefined;

        let departmentId: string | null = null;
        let departmentName = 'Platform';

        if (departmentSlug) {
          const dept = await prisma.department.findUnique({
            where: { slug: departmentSlug },
            select: { id: true, shortName: true },
          });
          if (dept) {
            departmentId = dept.id;
            departmentName = dept.shortName;
          }
        }

        const request = await prisma.toolRequest.create({
          data: {
            title,
            description,
            category: category ?? null,
            departmentId,
            requesterId: user.id,
          },
        });

        return {
          success: true,
          requestId: request.id,
          title,
          department: departmentName,
          message: departmentId
            ? `Tool request "${title}" has been submitted to ${departmentName}. Their editors will review it.`
            : `Tool request "${title}" has been submitted to the platform. An admin will review it.`,
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to create tool request', status: 'failed' };
      }
    },

    // ── Dining Handler ─────────────────────────────────────────
    async check_dining(args) {
      try {
        const nearBuilding = args.nearBuilding as string | undefined;
        const query = args.query as string | undefined;

        if (nearBuilding) {
          const nearest = await getNearestOpenDining(nearBuilding);
          if (!nearest) {
            return { message: 'No dining locations are currently open.' };
          }
          return {
            nearest: {
              name: nearest.location.name,
              building: nearest.location.building,
              type: nearest.location.type,
              mealPlanAccepted: nearest.location.mealPlanAccepted,
              currentMeal: nearest.currentMeal,
              closesAt: nearest.closesAt,
            },
            message: `The nearest open dining to ${nearBuilding} is ${nearest.location.name} at ${nearest.location.building}. Currently serving ${nearest.currentMeal} until ${nearest.closesAt}.`,
          };
        }

        if (query) {
          const statuses = await getDiningStatus();
          const q = query.toLowerCase();
          const match = statuses.find(s =>
            s.location.name.toLowerCase().includes(q) ||
            s.location.id.includes(q)
          );
          if (match) {
            const menu = await getDiningMenu(match.location.id);
            return {
              location: {
                name: match.location.name,
                building: match.location.building,
                type: match.location.type,
                mealPlanAccepted: match.location.mealPlanAccepted,
                isOpenNow: match.isOpenNow,
                currentMeal: match.currentMeal,
                closesAt: match.closesAt,
                nextOpens: match.nextOpens,
              },
              menu: menu ? { meal: menu.meal, items: menu.items.map(i => ({ name: i.name, station: i.station, dietary: i.dietaryTags })) } : null,
            };
          }
          return { message: `No dining location found matching "${query}". Try searching for Champions Kitchen, Blazer Dining, The 90, Chick-fil-A, etc.` };
        }

        // Default: all statuses overview
        const statuses = await getDiningStatus();
        const openCount = statuses.filter(s => s.isOpenNow).length;
        return {
          openNow: openCount,
          totalLocations: statuses.length,
          locations: statuses.map(s => ({
            name: s.location.name,
            building: s.location.building,
            isOpenNow: s.isOpenNow,
            currentMeal: s.currentMeal,
            closesAt: s.closesAt,
            nextOpens: s.nextOpens,
            mealPlan: s.location.mealPlanAccepted,
          })),
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to check dining', status: 'failed' };
      }
    },

    // ── Department Storefront Handler ─────────────────────────
    async search_department_tools(args) {
      try {
        const query = args.query as string;
        const department = args.department as string | undefined;

        const results = await searchDepartmentTools(query, department);

        return {
          query,
          department: department ?? '(all)',
          resultCount: results.length,
          tools: results.map((r) => ({
            name: r.name,
            shortDescription: r.shortDescription,
            category: r.category,
            departmentName: r.departmentName,
            collectionName: r.collectionName,
            url: r.url,
          })),
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed to search department tools', status: 'failed' };
      }
    },
  },
};
