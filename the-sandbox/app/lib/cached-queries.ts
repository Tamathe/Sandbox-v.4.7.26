// ─── Cached Queries ─────────────────────────────────────────────
// Server-side caching for low-mutation, high-read reference data.
// Uses Next.js unstable_cache with tag-based revalidation.
//
// Safe candidates only — these models change rarely at runtime:
//   - DegreeProgram: seeded + rare admin creates
//   - CampusBuilding: seeded once (56 buildings), never mutated
//   - CompetencyFramework: seeded once (QEP), never mutated
//   - AccreditationStandard: seeded, admin-only mutations
//   - PublishedTools: high-read catalog, infrequent publishes
//   - AdminAnnouncement: admin-only, rare mutations
//
// Call revalidateTag('degree-programs') etc. after any mutation.

import { unstable_cache } from 'next/cache'
import { prisma } from './prisma'

// ── Degree Programs ─────────────────────────────────────────────

export const getCachedDegreePrograms = unstable_cache(
  async () => {
    return prisma.degreeProgram.findMany({
      include: { requirements: { include: { courses: true } } },
      orderBy: [{ college: 'asc' }, { code: 'asc' }],
    })
  },
  ['degree-programs'],
  { revalidate: 3600, tags: ['degree-programs'] },
)

export const getCachedDegreeProgramByCode = unstable_cache(
  async (code: string) => {
    return prisma.degreeProgram.findFirst({
      where: { code },
      include: { requirements: { include: { courses: true } } },
      orderBy: { createdAt: 'desc' },
    })
  },
  ['degree-program-by-code'],
  { revalidate: 3600, tags: ['degree-programs'] },
)

// ── Campus Buildings ────────────────────────────────────────────

export const getCachedCampusBuildings = unstable_cache(
  async () => {
    return prisma.campusBuilding.findMany({
      orderBy: { name: 'asc' },
    })
  },
  ['campus-buildings'],
  { revalidate: 3600, tags: ['campus-buildings'] },
)

// ── Competency Frameworks ───────────────────────────────────────

export const getCachedCompetencyFrameworks = unstable_cache(
  async () => {
    return prisma.competencyFramework.findMany({
      where: { isActive: true },
      include: { competencies: { orderBy: { orderIndex: 'asc' } } },
    })
  },
  ['competency-frameworks'],
  { revalidate: 3600, tags: ['competency-frameworks'] },
)

// ── Accreditation Standards ────────────────────────────────────

export const getCachedAccreditationStandards = unstable_cache(
  async () => {
    return prisma.accreditationStandard.findMany({
      where: { isActive: true },
      orderBy: { standardNumber: 'asc' },
    })
  },
  ['accreditation-standards'],
  { revalidate: 3600, tags: ['accreditation-standards'] },
)

// ── Published Tools Catalog ────────────────────────────────────

export const getCachedPublishedTools = unstable_cache(
  async () => {
    return prisma.tool.findMany({
      where: { published: true, approvalStatus: { not: 'SUSPENDED' } },
      select: {
        id: true, name: true, shortDescription: true, category: true,
        toolType: true, isOfficialService: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
  },
  ['published-tools'],
  { revalidate: 300, tags: ['published-tools'] },
)

// ── Active Announcements ───────────────────────────────────────

export const getCachedActiveAnnouncements = unstable_cache(
  async () => {
    return prisma.adminAnnouncement.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true, title: true, message: true, createdAt: true,
      },
    })
  },
  ['active-announcements'],
  { revalidate: 300, tags: ['announcements'] },
)
