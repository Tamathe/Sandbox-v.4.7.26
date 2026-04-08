import { prisma } from './prisma'

const VALID_SCOPES = ['full', 'training', 'incidents', 'documents', 'reviews'] as const
type DelegationScope = (typeof VALID_SCOPES)[number]

export function isValidDelegationScope(scope: string): scope is DelegationScope {
  return VALID_SCOPES.includes(scope as DelegationScope)
}

/**
 * Create a new compliance delegation from delegator to delegate for a given scope.
 */
export async function createDelegation(opts: {
  delegatorId: string
  delegateId: string
  scope: string
  validUntil?: string | null
  reason?: string | null
}) {
  if (!isValidDelegationScope(opts.scope)) {
    throw new Error(`Invalid delegation scope: ${opts.scope}`)
  }
  if (opts.delegatorId === opts.delegateId) {
    throw new Error('Cannot delegate to yourself')
  }

  return prisma.complianceDelegation.create({
    data: {
      delegatorId: opts.delegatorId,
      delegateId: opts.delegateId,
      scope: opts.scope,
      validUntil: opts.validUntil ? new Date(opts.validUntil) : null,
      reason: opts.reason ?? null,
    },
    include: {
      delegator: { select: { id: true, name: true, email: true, role: true } },
      delegate: { select: { id: true, name: true, email: true, role: true } },
    },
  })
}

/**
 * Revoke (deactivate) a delegation by id.
 */
export async function revokeDelegation(id: string) {
  return prisma.complianceDelegation.update({
    where: { id },
    data: { active: false },
  })
}

/**
 * List delegations for a user — both given and received.
 */
export async function listDelegations(userId: string) {
  const [given, received] = await Promise.all([
    prisma.complianceDelegation.findMany({
      where: { delegatorId: userId },
      include: {
        delegate: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.complianceDelegation.findMany({
      where: { delegateId: userId },
      include: {
        delegator: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ])
  return { given, received }
}

/**
 * List all delegations (admin view).
 */
export async function listAllDelegations() {
  return prisma.complianceDelegation.findMany({
    include: {
      delegator: { select: { id: true, name: true, email: true, role: true } },
      delegate: { select: { id: true, name: true, email: true, role: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Get active delegates for a specific scope.
 */
export async function getActiveDelegatesForScope(scope: string) {
  const now = new Date()
  return prisma.complianceDelegation.findMany({
    where: {
      scope,
      active: true,
      validFrom: { lte: now },
      OR: [{ validUntil: null }, { validUntil: { gte: now } }],
    },
    include: {
      delegator: { select: { id: true, name: true, email: true } },
      delegate: { select: { id: true, name: true, email: true } },
    },
  })
}

/**
 * Check if userA has an active delegation from userB for the given scope.
 */
export async function isDelegateFor(delegateId: string, delegatorId: string, scope: string): Promise<boolean> {
  const now = new Date()
  const count = await prisma.complianceDelegation.count({
    where: {
      delegatorId,
      delegateId,
      active: true,
      OR: [{ scope }, { scope: 'full' }],
      validFrom: { lte: now },
      AND: [{ OR: [{ validUntil: null }, { validUntil: { gte: now } }] }],
    },
  })
  return count > 0
}
