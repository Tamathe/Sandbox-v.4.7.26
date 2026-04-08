// ─── Approval Workflow Service ────────────────────────────────
// Multi-level approval steps backed by the ApprovalStep model.
// Replaces the JSON-based approvalChain field with structured records.

import { prisma } from '../prisma'
import { getApprovalChain } from './approval-chains'
import { createApprovalActionItem, resolveApprovalActionItems } from './action-queue-service'

// ── Types ────────────────────────────────────────────────────

export interface ApprovalStepResult {
  id: string
  communicationId: string
  stepOrder: number
  approverEmail: string
  approverLabel: string
  status: string
  comment: string | null
  decidedAt: Date | null
  createdAt: Date
}

// ── Create Approval Chain ────────────────────────────────────

/**
 * Create ApprovalStep records for a communication based on its type.
 * If the submitter matches a step's default approver (e.g., the director
 * is submitting), that step is auto-approved.
 */
export async function createApprovalChain(
  communicationId: string,
  communicationType: string,
  submitterEmail: string
): Promise<ApprovalStepResult[]> {
  const chain = getApprovalChain(communicationType)

  if (chain.length === 0) return []

  // Delete any existing steps (in case of re-submission)
  await prisma.approvalStep.deleteMany({ where: { communicationId } })

  const steps: ApprovalStepResult[] = []

  for (let i = 0; i < chain.length; i++) {
    const template = chain[i]
    const approverEmail = template.defaultApproverEmail ?? ''
    const isSubmitter = approverEmail.toLowerCase() === submitterEmail.toLowerCase()

    const step = await prisma.approvalStep.create({
      data: {
        communicationId,
        stepOrder: i + 1,
        approverEmail,
        approverLabel: template.label,
        status: isSubmitter ? 'approved' : 'pending',
        decidedAt: isSubmitter ? new Date() : null,
        comment: isSubmitter ? 'Auto-approved (submitter is approver)' : null,
      },
    })

    steps.push(step)
  }

  // If all steps were auto-approved (submitter holds all roles), mark communication as approved
  const allApproved = steps.every((s) => s.status === 'approved')
  if (allApproved) {
    await prisma.staffCommunication.update({
      where: { id: communicationId },
      data: { status: 'approved' },
    })
  } else {
    // Create an action item for the first pending approver
    const firstPending = steps.find((s) => s.status === 'pending')
    if (firstPending) {
      const comm = await prisma.staffCommunication.findUnique({
        where: { id: communicationId },
        select: { subject: true },
      })
      await createApprovalActionItem(
        firstPending.approverEmail,
        communicationId,
        comm?.subject ?? null,
        firstPending.approverLabel
      )
    }
  }

  return steps
}

// ── Advance Approval ─────────────────────────────────────────

/**
 * Process a decision on an approval step.
 * - If approved and more steps remain, the next step becomes the active one.
 * - If all steps are approved, the communication status moves to 'approved'.
 * - If rejected, the communication reverts to 'draft'.
 */
export async function advanceApproval(
  stepId: string,
  decision: 'approved' | 'rejected',
  comment?: string
): Promise<ApprovalStepResult> {
  const step = await prisma.approvalStep.update({
    where: { id: stepId },
    data: {
      status: decision,
      decidedAt: new Date(),
      comment: comment ?? null,
    },
  })

  if (decision === 'rejected') {
    // Revert communication to draft
    await prisma.staffCommunication.update({
      where: { id: step.communicationId },
      data: { status: 'draft' },
    })
    // Resolve any pending action items for this communication
    await resolveApprovalActionItems(step.communicationId, 'system')
    return step
  }

  // Check if all steps for this communication are now approved
  const allSteps = await prisma.approvalStep.findMany({
    where: { communicationId: step.communicationId },
    orderBy: { stepOrder: 'asc' },
  })

  const allApproved = allSteps.every((s) => s.status === 'approved')

  if (allApproved) {
    await prisma.staffCommunication.update({
      where: { id: step.communicationId },
      data: { status: 'approved' },
    })
    // Resolve all action items
    await resolveApprovalActionItems(step.communicationId, 'system')
  } else {
    // Create action item for the next pending step
    const nextPending = allSteps.find((s) => s.status === 'pending')
    if (nextPending) {
      const comm = await prisma.staffCommunication.findUnique({
        where: { id: step.communicationId },
        select: { subject: true },
      })
      await createApprovalActionItem(
        nextPending.approverEmail,
        step.communicationId,
        comm?.subject ?? null,
        nextPending.approverLabel
      )
    }
  }

  return step
}

// ── Query Functions ──────────────────────────────────────────

/**
 * Get all approval steps for a communication, in order.
 */
export async function getApprovalStatus(
  communicationId: string
): Promise<ApprovalStepResult[]> {
  return prisma.approvalStep.findMany({
    where: { communicationId },
    orderBy: { stepOrder: 'asc' },
  })
}

/**
 * Find pending approval steps older than the given threshold (hours).
 * Useful for surfacing stale approvals in dashboards or nudges.
 */
export async function getStaleApprovals(
  hoursThreshold: number
): Promise<ApprovalStepResult[]> {
  const cutoff = new Date(Date.now() - hoursThreshold * 60 * 60 * 1000)

  return prisma.approvalStep.findMany({
    where: {
      status: 'pending',
      createdAt: { lt: cutoff },
    },
    orderBy: { createdAt: 'asc' },
  })
}

/**
 * Find all pending approval steps assigned to a specific user email.
 */
export async function getPendingApprovalsForUser(
  userEmail: string
): Promise<(ApprovalStepResult & { communication: { id: string; subject: string | null; type: string; authorId: string } })[]> {
  return prisma.approvalStep.findMany({
    where: {
      approverEmail: userEmail.toLowerCase(),
      status: 'pending',
    },
    include: {
      communication: {
        select: {
          id: true,
          subject: true,
          type: true,
          authorId: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })
}

/**
 * Find the current active (next pending) step for a communication.
 * Returns the first step with status 'pending'.
 */
export async function getCurrentActiveStep(
  communicationId: string
): Promise<ApprovalStepResult | null> {
  return prisma.approvalStep.findFirst({
    where: {
      communicationId,
      status: 'pending',
    },
    orderBy: { stepOrder: 'asc' },
  })
}
