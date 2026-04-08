// ─── Approval Chain Templates ─────────────────────────────────
// Defines multi-level approval workflows by audience type.
// Each chain template lists the required approval steps in order.

export interface ApprovalChainStep {
  role: string
  label: string
  defaultApproverEmail?: string
}

// Chain templates keyed by communication type (maps to StaffCommunication.type)
const CHAIN_TEMPLATES: Record<string, ApprovalChainStep[]> = {
  'campus-wide': [
    { role: 'director', label: 'Director Review', defaultApproverEmail: 'director@uky.edu' },
    { role: 'vp', label: 'VP Approval', defaultApproverEmail: 'vp.communications@uky.edu' },
  ],
  'crisis': [
    { role: 'director', label: 'Director Review', defaultApproverEmail: 'director@uky.edu' },
    { role: 'vp', label: 'VP Approval', defaultApproverEmail: 'vp.communications@uky.edu' },
  ],
  'executive-brief': [
    { role: 'director', label: 'Director Review', defaultApproverEmail: 'director@uky.edu' },
    { role: 'dean', label: 'Dean Approval', defaultApproverEmail: 'dean@uky.edu' },
  ],
  'department': [
    { role: 'director', label: 'Director Review', defaultApproverEmail: 'director@uky.edu' },
  ],
  'student-facing': [
    { role: 'director', label: 'Director Review', defaultApproverEmail: 'director@uky.edu' },
  ],
  'social-media': [],
}

/**
 * Returns the approval chain template for a given communication type.
 * Returns an empty array if no approvals are needed (e.g., social-media, direct emails).
 */
export function getApprovalChain(communicationType: string): ApprovalChainStep[] {
  return CHAIN_TEMPLATES[communicationType] ?? []
}
