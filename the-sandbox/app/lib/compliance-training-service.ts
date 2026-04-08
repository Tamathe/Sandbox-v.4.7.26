import { prisma } from './prisma'

// ── Module CRUD ─────────────────────────────────────────────────────────────

export async function createModule(data: {
  title: string
  description: string
  type: string
  requiredForRoles: string[]
  passingScore?: number
  content: unknown
  active?: boolean
}) {
  return prisma.complianceTrainingModule.create({
    data: {
      title: data.title,
      description: data.description,
      type: data.type,
      requiredForRoles: data.requiredForRoles,
      passingScore: data.passingScore ?? 80,
      content: data.content as never,
      active: data.active ?? true,
    },
  })
}

export async function updateModule(
  id: string,
  data: Partial<{
    title: string
    description: string
    type: string
    requiredForRoles: string[]
    passingScore: number
    content: unknown
    active: boolean
  }>,
) {
  const update: Record<string, unknown> = {}
  if (data.title !== undefined) update.title = data.title
  if (data.description !== undefined) update.description = data.description
  if (data.type !== undefined) update.type = data.type
  if (data.requiredForRoles !== undefined) update.requiredForRoles = data.requiredForRoles
  if (data.passingScore !== undefined) update.passingScore = data.passingScore
  if (data.content !== undefined) update.content = data.content as never
  if (data.active !== undefined) update.active = data.active

  return prisma.complianceTrainingModule.update({
    where: { id },
    data: update,
  })
}

export async function listModules(activeOnly = false) {
  return prisma.complianceTrainingModule.findMany({
    where: activeOnly ? { active: true } : undefined,
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { completions: true } } },
  })
}

export async function deleteModule(id: string) {
  return prisma.complianceTrainingModule.delete({ where: { id } })
}

export async function getModule(id: string) {
  return prisma.complianceTrainingModule.findUnique({
    where: { id },
    include: { completions: { include: { user: { select: { id: true, name: true, email: true, role: true } } } } },
  })
}

// ── Completion recording ────────────────────────────────────────────────────

export async function recordCompletion(userId: string, moduleId: string, score: number) {
  const mod = await prisma.complianceTrainingModule.findUnique({ where: { id: moduleId } })
  if (!mod) throw new Error('Module not found')

  const passed = score >= mod.passingScore

  return prisma.complianceTrainingCompletion.upsert({
    where: { userId_moduleId: { userId, moduleId } },
    create: { userId, moduleId, score, passed },
    update: { score, passed, completedAt: new Date() },
  })
}

// ── Queries ─────────────────────────────────────────────────────────────────

export async function getCompletionsForUser(userId: string) {
  return prisma.complianceTrainingCompletion.findMany({
    where: { userId },
    include: { module: { select: { id: true, title: true, type: true, passingScore: true } } },
    orderBy: { completedAt: 'desc' },
  })
}

export async function getModuleCompletionStats(moduleId: string) {
  const mod = await prisma.complianceTrainingModule.findUnique({ where: { id: moduleId } })
  if (!mod) throw new Error('Module not found')

  // Count eligible users by role
  const eligibleUsers = await prisma.user.count({
    where: mod.requiredForRoles.length > 0
      ? { role: { in: mod.requiredForRoles as never[] } }
      : undefined,
  })

  const completions = await prisma.complianceTrainingCompletion.findMany({
    where: { moduleId },
    select: { passed: true },
  })

  const completed = completions.length
  const passed = completions.filter((c) => c.passed).length

  return {
    moduleId,
    moduleTitle: mod.title,
    eligibleUsers,
    completed,
    passed,
    completionRate: eligibleUsers > 0 ? Math.round((completed / eligibleUsers) * 100) : 0,
    passRate: completed > 0 ? Math.round((passed / completed) * 100) : 0,
  }
}
