import { randomBytes } from 'crypto'
import {
  AgentVisibility as AgentVisibilityValue,
  ApprovalStatus as ApprovalStatusValue,
  type AgentCategory,
  type AgentProfile,
  type AgentSession,
  type AgentVisibility,
  type Prisma,
  type UserRole,
} from '../../generated/prisma'
import { prisma } from '../prisma'
import {
  ABSOLUTE_MAX_ACTIONS,
  DEFAULT_MAX_ACTIONS,
  RESERVED_SLUGS,
  SYSTEM_ONLY_TOOLS,
} from './agent-profile-constants'
import { getToolRegistry } from './tool-registry'

export interface CreateProfileInput {
  name: string
  description: string
  systemPrompt: string
  capabilities: string[]
  category?: AgentCategory
  tags?: string[]
  targetRoles?: UserRole[]
  icon?: string
  color?: string
  welcomeMessage?: string
  starterQuestions?: string[]
  maxActionsPerRun?: number
  visibility?: AgentVisibility
}

export type UpdateProfileInput = Partial<CreateProfileInput>

export interface ProfileFilters {
  category?: AgentCategory
  role?: UserRole
  visibility?: 'mine' | 'shared' | 'institutional' | 'favorites'
  search?: string
  creatorId?: string
  userId: string
  userRole: UserRole
  limit?: number
  offset?: number
}

const profileInclude = {
  creator: { select: { id: true, name: true, role: true } },
  forkedFrom: { select: { id: true, name: true, slug: true } },
} satisfies Prisma.AgentProfileInclude

export type AgentProfileRecord = Prisma.AgentProfileGetPayload<{ include: typeof profileInclude }>

function serviceError(message: string, status = 400, extras?: Record<string, unknown>) {
  return Object.assign(new Error(message), { status, ...extras })
}

function normalizeText(value: string | undefined | null): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function normalizeStringArray(values: string[] | undefined, maxItems = 12): string[] {
  return Array.from(
    new Set(
      (values ?? [])
        .map((value) => value.trim())
        .filter(Boolean)
        .slice(0, maxItems),
    ),
  )
}

function normalizeCapabilities(values: string[] | undefined): string[] {
  return normalizeStringArray(values, 100)
}

function normalizeTargetRoles(values: UserRole[] | undefined, fallbackRole: UserRole): UserRole[] {
  const roles = Array.from(new Set((values ?? [fallbackRole]).filter(Boolean)))
  return roles.length > 0 ? roles : [fallbackRole]
}

function normalizeMaxActions(value: number | undefined): number {
  const safeValue = Number.isFinite(value) ? Math.trunc(value as number) : DEFAULT_MAX_ACTIONS
  return Math.min(Math.max(safeValue, 1), ABSOLUTE_MAX_ACTIONS)
}

function toSlugBase(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)

  return base || 'agent'
}

async function generateUniqueSlug(name: string): Promise<string> {
  const base = toSlugBase(name)
  let slug = base

  while (
    RESERVED_SLUGS.has(slug) ||
    (await prisma.agentProfile.findUnique({ where: { slug }, select: { id: true } }))
  ) {
    const suffix = randomBytes(2).toString('hex')
    slug = `${base.slice(0, 55)}-${suffix}`
  }

  return slug
}

async function requireUserRole(userId: string): Promise<UserRole> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })

  if (!user) {
    throw serviceError('User not found', 404)
  }

  return user.role
}

function getAccessibleProfileWhere(userId: string, userRole: UserRole): Prisma.AgentProfileWhereInput {
  return {
    OR: [
      { creatorId: userId },
      { visibility: 'SHARED', approvalStatus: 'APPROVED' },
      { visibility: 'INSTITUTIONAL', targetRoles: { has: userRole } },
    ],
  }
}

function buildSearchClause(search: string | undefined): Prisma.AgentProfileWhereInput | null {
  const query = search?.trim()
  if (!query) return null

  return {
    OR: [
      { name: { contains: query, mode: 'insensitive' } },
      { description: { contains: query, mode: 'insensitive' } },
      { tags: { has: query } },
    ],
  }
}

async function getManageableProfile(id: string, userId: string, userRole: UserRole) {
  const profile = await prisma.agentProfile.findUnique({
    where: { id },
    include: profileInclude,
  })

  if (!profile) {
    throw serviceError('Agent profile not found', 404)
  }

  if (profile.creatorId !== userId && userRole !== 'ADMIN') {
    throw serviceError('Forbidden', 403)
  }

  return profile
}

export function validateCapabilities(capabilities: string[], userRole: UserRole, visibility: AgentVisibility): string[] {
  const normalized = normalizeCapabilities(capabilities)
  if (normalized.length === 0) return []

  const registry = getToolRegistry()
  const invalid = new Set<string>()

  for (const capability of normalized) {
    const definition = registry.getDefinition(capability)
    if (!definition) {
      invalid.add(capability)
      continue
    }

    if (!definition.roles.includes(userRole)) {
      invalid.add(capability)
      continue
    }

    if (SYSTEM_ONLY_TOOLS.has(capability) && visibility !== AgentVisibilityValue.INSTITUTIONAL) {
      invalid.add(capability)
    }
  }

  return Array.from(invalid)
}

export async function createAgentProfile(data: CreateProfileInput, userId: string): Promise<AgentProfile> {
  const userRole = await requireUserRole(userId)
  const visibility = data.visibility ?? AgentVisibilityValue.PRIVATE

  if (visibility === AgentVisibilityValue.INSTITUTIONAL && userRole !== 'ADMIN') {
    throw serviceError('Only admins can create institutional agent profiles', 403)
  }

  const invalidCapabilities = validateCapabilities(data.capabilities ?? [], userRole, visibility)
  if (invalidCapabilities.length > 0) {
    throw serviceError('Invalid capabilities', 400, { invalid: invalidCapabilities })
  }

  return prisma.agentProfile.create({
    data: {
      name: data.name.trim(),
      slug: await generateUniqueSlug(data.name),
      description: data.description.trim(),
      icon: normalizeText(data.icon) ?? 'Bot',
      color: normalizeText(data.color) ?? '#0033A0',
      systemPrompt: data.systemPrompt.trim(),
      capabilities: normalizeCapabilities(data.capabilities),
      welcomeMessage: normalizeText(data.welcomeMessage),
      starterQuestions: normalizeStringArray(data.starterQuestions, 8),
      maxActionsPerRun: normalizeMaxActions(data.maxActionsPerRun),
      category: data.category ?? 'GENERAL',
      tags: normalizeStringArray(data.tags, 16),
      targetRoles: normalizeTargetRoles(data.targetRoles, userRole),
      visibility,
      approvalStatus:
        visibility === AgentVisibilityValue.PRIVATE
          ? ApprovalStatusValue.COMMUNITY
          : visibility === AgentVisibilityValue.SHARED
            ? ApprovalStatusValue.PENDING
            : ApprovalStatusValue.APPROVED,
      creatorId: userId,
    },
  })
}

export async function getAgentProfile(id: string, userId: string): Promise<AgentProfileRecord | null> {
  const userRole = await requireUserRole(userId)

  return prisma.agentProfile.findFirst({
    where: {
      id,
      AND: [getAccessibleProfileWhere(userId, userRole)],
    },
    include: profileInclude,
  })
}

export async function updateAgentProfile(
  id: string,
  data: UpdateProfileInput,
  userId: string,
  userRole: UserRole,
): Promise<AgentProfile> {
  const existing = await getManageableProfile(id, userId, userRole)
  const visibility = data.visibility ?? existing.visibility

  if (visibility === AgentVisibilityValue.INSTITUTIONAL && userRole !== 'ADMIN') {
    throw serviceError('Only admins can manage institutional agent profiles', 403)
  }

  const creatorRole = await requireUserRole(existing.creatorId)
  const invalidCapabilities = validateCapabilities(
    data.capabilities ?? existing.capabilities,
    creatorRole,
    visibility,
  )

  if (invalidCapabilities.length > 0) {
    throw serviceError('Invalid capabilities', 400, { invalid: invalidCapabilities })
  }

  let approvalStatus = existing.approvalStatus
  if (visibility === AgentVisibilityValue.INSTITUTIONAL) {
    approvalStatus = ApprovalStatusValue.APPROVED
  } else if (visibility === AgentVisibilityValue.PRIVATE) {
    approvalStatus = ApprovalStatusValue.COMMUNITY
  } else if (existing.visibility === AgentVisibilityValue.PRIVATE && visibility === AgentVisibilityValue.SHARED) {
    approvalStatus = ApprovalStatusValue.PENDING
  }

  return prisma.agentProfile.update({
    where: { id },
    data: {
      ...(data.name ? { name: data.name.trim() } : {}),
      ...(data.description ? { description: data.description.trim() } : {}),
      ...(data.systemPrompt ? { systemPrompt: data.systemPrompt.trim() } : {}),
      ...(data.icon !== undefined ? { icon: normalizeText(data.icon) ?? 'Bot' } : {}),
      ...(data.color !== undefined ? { color: normalizeText(data.color) ?? '#0033A0' } : {}),
      ...(data.welcomeMessage !== undefined ? { welcomeMessage: normalizeText(data.welcomeMessage) } : {}),
      ...(data.capabilities ? { capabilities: normalizeCapabilities(data.capabilities) } : {}),
      ...(data.starterQuestions ? { starterQuestions: normalizeStringArray(data.starterQuestions, 8) } : {}),
      ...(data.tags ? { tags: normalizeStringArray(data.tags, 16) } : {}),
      ...(data.targetRoles ? { targetRoles: normalizeTargetRoles(data.targetRoles, creatorRole) } : {}),
      ...(data.category ? { category: data.category } : {}),
      ...(data.maxActionsPerRun !== undefined
        ? { maxActionsPerRun: normalizeMaxActions(data.maxActionsPerRun) }
        : {}),
      ...(data.visibility ? { visibility } : {}),
      approvalStatus,
    },
  })
}

export async function deleteAgentProfile(id: string, userId: string, userRole: UserRole): Promise<void> {
  await getManageableProfile(id, userId, userRole)
  await prisma.agentProfile.delete({ where: { id } })
}

export async function listAgentProfiles(filters: ProfileFilters): Promise<{ profiles: AgentProfileRecord[]; total: number }> {
  const clauses: Prisma.AgentProfileWhereInput[] = []

  if (filters.visibility === 'mine') {
    clauses.push({ creatorId: filters.userId })
  } else if (filters.visibility === 'shared') {
    clauses.push({ visibility: 'SHARED', approvalStatus: 'APPROVED' })
  } else if (filters.visibility === 'institutional') {
    clauses.push({ visibility: 'INSTITUTIONAL', targetRoles: { has: filters.userRole } })
  } else if (filters.visibility === 'favorites') {
    clauses.push({ favorites: { some: { userId: filters.userId } } })
    clauses.push(getAccessibleProfileWhere(filters.userId, filters.userRole))
  } else {
    clauses.push(getAccessibleProfileWhere(filters.userId, filters.userRole))
  }

  if (filters.category) clauses.push({ category: filters.category })
  if (filters.role) clauses.push({ targetRoles: { has: filters.role } })
  if (filters.creatorId) clauses.push({ creatorId: filters.creatorId })

  const searchClause = buildSearchClause(filters.search)
  if (searchClause) clauses.push(searchClause)

  const where = clauses.length === 1 ? clauses[0] : { AND: clauses }
  const take = Math.min(filters.limit ?? 20, 100)
  const skip = Math.max(filters.offset ?? 0, 0)

  const [profiles, total] = await Promise.all([
    prisma.agentProfile.findMany({
      where,
      include: profileInclude,
      orderBy: [{ useCount: 'desc' }, { updatedAt: 'desc' }],
      take,
      skip,
    }),
    prisma.agentProfile.count({ where }),
  ])

  return { profiles, total }
}

export async function searchAgentProfiles(query: string, role: UserRole): Promise<AgentProfileRecord[]> {
  const searchClause = buildSearchClause(query)
  if (!searchClause) return []

  return prisma.agentProfile.findMany({
    where: {
      AND: [
        searchClause,
        {
          OR: [
            { visibility: 'SHARED', approvalStatus: 'APPROVED' },
            { visibility: 'INSTITUTIONAL', targetRoles: { has: role } },
          ],
        },
      ],
    },
    include: profileInclude,
    orderBy: [{ useCount: 'desc' }, { updatedAt: 'desc' }],
    take: 12,
  })
}

export async function forkAgentProfile(id: string, userId: string): Promise<AgentProfile> {
  const source = await getAgentProfile(id, userId)
  if (!source) {
    throw serviceError('Agent profile not found', 404)
  }

  const fork = await prisma.agentProfile.create({
    data: {
      name: source.name,
      slug: await generateUniqueSlug(source.name),
      description: source.description,
      icon: source.icon,
      color: source.color,
      systemPrompt: source.systemPrompt,
      capabilities: source.capabilities,
      welcomeMessage: source.welcomeMessage,
      starterQuestions: source.starterQuestions,
      maxActionsPerRun: source.maxActionsPerRun,
      category: source.category,
      tags: source.tags,
      targetRoles: source.targetRoles,
      visibility: AgentVisibilityValue.PRIVATE,
      approvalStatus: ApprovalStatusValue.COMMUNITY,
      creatorId: userId,
      forkedFromId: source.id,
    },
  })

  await prisma.agentProfile.update({
    where: { id: source.id },
    data: { forkCount: { increment: 1 } },
  })

  return fork
}

export async function getPopularProfiles(role: UserRole, limit = 8): Promise<AgentProfileRecord[]> {
  return prisma.agentProfile.findMany({
    where: {
      OR: [
        { visibility: 'SHARED', approvalStatus: 'APPROVED' },
        { visibility: 'INSTITUTIONAL', targetRoles: { has: role } },
      ],
    },
    include: profileInclude,
    orderBy: [{ useCount: 'desc' }, { forkCount: 'desc' }, { updatedAt: 'desc' }],
    take: limit,
  })
}

export async function toggleFavorite(profileId: string, userId: string): Promise<boolean> {
  const profile = await getAgentProfile(profileId, userId)
  if (!profile) {
    throw serviceError('Agent profile not found', 404)
  }

  const existing = await prisma.agentFavorite.findUnique({
    where: { profileId_userId: { profileId, userId } },
    select: { id: true },
  })

  if (existing) {
    await prisma.agentFavorite.delete({ where: { profileId_userId: { profileId, userId } } })
    return false
  }

  await prisma.agentFavorite.create({
    data: { profileId, userId },
  })
  return true
}

export async function getUserFavorites(userId: string): Promise<AgentProfileRecord[]> {
  const userRole = await requireUserRole(userId)
  const favorites = await prisma.agentFavorite.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { profile: { include: profileInclude } },
  })

  return favorites
    .map((favorite) => favorite.profile)
    .filter((profile) => {
      if (profile.creatorId === userId) return true
      if (profile.visibility === 'SHARED' && profile.approvalStatus === 'APPROVED') return true
      return profile.visibility === 'INSTITUTIONAL' && profile.targetRoles.includes(userRole)
    })
}

export async function incrementUseCount(profileId: string): Promise<void> {
  await prisma.agentProfile.update({
    where: { id: profileId },
    data: { useCount: { increment: 1 } },
  })
}

export async function getRecentlyUsed(userId: string, limit = 5): Promise<AgentProfileRecord[]> {
  const sessions = await prisma.agentSession.findMany({
    where: { userId },
    distinct: ['profileId'],
    orderBy: { updatedAt: 'desc' },
    take: limit,
    select: { profileId: true },
  })

  const orderedIds = sessions.map((session) => session.profileId)
  if (orderedIds.length === 0) return []

  const profiles = await prisma.agentProfile.findMany({
    where: { id: { in: orderedIds } },
    include: profileInclude,
  })

  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]))
  return orderedIds
    .map((id) => profileMap.get(id))
    .filter(Boolean) as AgentProfileRecord[]
}

export async function saveAgentSession(
  profileId: string,
  userId: string,
  messages: unknown[],
  toolCallCount: number,
): Promise<void> {
  await prisma.agentSession.upsert({
    where: { profileId_userId: { profileId, userId } },
    create: {
      profileId,
      userId,
      messages: messages as Prisma.InputJsonValue,
      toolCallCount,
    },
    update: {
      messages: messages as Prisma.InputJsonValue,
      toolCallCount,
    },
  })
}

export async function getAgentSession(profileId: string, userId: string): Promise<AgentSession | null> {
  return prisma.agentSession.findUnique({
    where: { profileId_userId: { profileId, userId } },
  })
}
