import { prisma } from './prisma'

const VALID_REQUEST_TYPES = ['dpa-renewal', 'data-erasure', 'policy-change', 'role-assignment', 'vendor-approval'] as const
const VALID_STATUSES = ['pending', 'approved', 'rejected', 'escalated'] as const

type RequestType = (typeof VALID_REQUEST_TYPES)[number]

export function isValidRequestType(type: string): type is RequestType {
  return VALID_REQUEST_TYPES.includes(type as RequestType)
}

/**
 * Create a new approval request.
 */
export async function createApprovalRequest(opts: {
  requestType: string
  requestData: Record<string, unknown>
  requestedBy: string
}) {
  if (!isValidRequestType(opts.requestType)) {
    throw new Error(`Invalid request type: ${opts.requestType}`)
  }

  return prisma.complianceApproval.create({
    data: {
      requestType: opts.requestType,
      requestData: opts.requestData as Record<string, string>,
      requestedBy: opts.requestedBy,
    },
    include: {
      requester: { select: { id: true, name: true, email: true, role: true } },
    },
  })
}

/**
 * Approve a pending request.
 */
export async function approveRequest(id: string, approverId: string, comments?: string) {
  return prisma.complianceApproval.update({
    where: { id },
    data: {
      status: 'approved',
      approvedBy: approverId,
      approvedAt: new Date(),
      comments: comments ?? null,
    },
    include: {
      requester: { select: { id: true, name: true, email: true, role: true } },
      approver: { select: { id: true, name: true, email: true, role: true } },
    },
  })
}

/**
 * Reject a pending request.
 */
export async function rejectRequest(id: string, approverId: string, comments?: string) {
  return prisma.complianceApproval.update({
    where: { id },
    data: {
      status: 'rejected',
      approvedBy: approverId,
      approvedAt: new Date(),
      comments: comments ?? null,
    },
    include: {
      requester: { select: { id: true, name: true, email: true, role: true } },
      approver: { select: { id: true, name: true, email: true, role: true } },
    },
  })
}

/**
 * Escalate a request.
 */
export async function escalateRequest(id: string, comments?: string) {
  return prisma.complianceApproval.update({
    where: { id },
    data: {
      status: 'escalated',
      comments: comments ?? null,
    },
    include: {
      requester: { select: { id: true, name: true, email: true, role: true } },
    },
  })
}

/**
 * List pending approval requests.
 */
export async function listPendingApprovals() {
  return prisma.complianceApproval.findMany({
    where: { status: 'pending' },
    include: {
      requester: { select: { id: true, name: true, email: true, role: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Get full approval history (all statuses).
 */
export async function getApprovalHistory(opts?: { requestType?: string; status?: string }) {
  const where: Record<string, unknown> = {}
  if (opts?.requestType) where.requestType = opts.requestType
  if (opts?.status) where.status = opts.status

  return prisma.complianceApproval.findMany({
    where,
    include: {
      requester: { select: { id: true, name: true, email: true, role: true } },
      approver: { select: { id: true, name: true, email: true, role: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Get approval stats (counts by status).
 */
export async function getApprovalStats() {
  const [pending, approved, rejected, escalated] = await Promise.all([
    prisma.complianceApproval.count({ where: { status: 'pending' } }),
    prisma.complianceApproval.count({ where: { status: 'approved' } }),
    prisma.complianceApproval.count({ where: { status: 'rejected' } }),
    prisma.complianceApproval.count({ where: { status: 'escalated' } }),
  ])
  return { pending, approved, rejected, escalated, total: pending + approved + rejected + escalated }
}
