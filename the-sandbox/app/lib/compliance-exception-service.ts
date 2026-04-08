import { prisma } from './prisma'

const VALID_EXCEPTION_TYPES = ['waiver', 'extension', 'exemption', 'accommodation'] as const
type ExceptionType = (typeof VALID_EXCEPTION_TYPES)[number]

export function isValidExceptionType(t: string): t is ExceptionType {
  return VALID_EXCEPTION_TYPES.includes(t as ExceptionType)
}

const userSelect = { id: true, name: true, email: true, role: true } as const
const requirementSelect = { id: true, title: true, regulation: true } as const

/**
 * Create a new compliance exception/waiver.
 */
export async function createException(opts: {
  userId?: string | null
  requirementId?: string | null
  exceptionType: string
  reason: string
  grantedBy: string
  validFrom?: string | null
  validUntil: string
}) {
  if (!isValidExceptionType(opts.exceptionType)) {
    throw new Error(`Invalid exception type: ${opts.exceptionType}`)
  }

  return prisma.complianceException.create({
    data: {
      userId: opts.userId ?? null,
      requirementId: opts.requirementId ?? null,
      exceptionType: opts.exceptionType,
      reason: opts.reason,
      grantedBy: opts.grantedBy,
      validFrom: opts.validFrom ? new Date(opts.validFrom) : new Date(),
      validUntil: new Date(opts.validUntil),
    },
    include: {
      user: { select: userSelect },
      requirement: { select: requirementSelect },
      grantor: { select: userSelect },
    },
  })
}

/**
 * Revoke an active exception.
 */
export async function revokeException(id: string, revokedReason?: string) {
  return prisma.complianceException.update({
    where: { id },
    data: {
      status: 'revoked',
      revokedAt: new Date(),
      revokedReason: revokedReason ?? null,
    },
    include: {
      user: { select: userSelect },
      requirement: { select: requirementSelect },
      grantor: { select: userSelect },
    },
  })
}

/**
 * List exceptions with optional filters.
 */
export async function listExceptions(opts?: {
  status?: string
  userId?: string
  requirementId?: string
}) {
  const where: Record<string, unknown> = {}
  if (opts?.status) where.status = opts.status
  if (opts?.userId) where.userId = opts.userId
  if (opts?.requirementId) where.requirementId = opts.requirementId

  return prisma.complianceException.findMany({
    where,
    include: {
      user: { select: userSelect },
      requirement: { select: requirementSelect },
      grantor: { select: userSelect },
    },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Get all active exceptions for a specific user.
 */
export async function getActiveExceptionsForUser(userId: string) {
  return prisma.complianceException.findMany({
    where: {
      userId,
      status: 'active',
      validUntil: { gte: new Date() },
    },
    include: {
      requirement: { select: requirementSelect },
      grantor: { select: userSelect },
    },
    orderBy: { validUntil: 'asc' },
  })
}

/**
 * Get exceptions expiring within 30 days.
 */
export async function getExpiringExceptions() {
  const now = new Date()
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  return prisma.complianceException.findMany({
    where: {
      status: 'active',
      validUntil: {
        gte: now,
        lte: thirtyDaysFromNow,
      },
    },
    include: {
      user: { select: userSelect },
      requirement: { select: requirementSelect },
      grantor: { select: userSelect },
    },
    orderBy: { validUntil: 'asc' },
  })
}

/**
 * Check if a user has an active exception for a specific requirement.
 */
export async function isExempt(userId: string, requirementId: string): Promise<boolean> {
  const count = await prisma.complianceException.count({
    where: {
      userId,
      requirementId,
      status: 'active',
      validUntil: { gte: new Date() },
    },
  })
  return count > 0
}
