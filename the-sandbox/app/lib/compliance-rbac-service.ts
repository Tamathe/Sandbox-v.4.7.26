import { prisma } from './prisma'

type ComplianceRoleName = 'compliance-officer' | 'dpo' | 'auditor' | 'viewer'

// Permission mapping: role → allowed actions
const ROLE_PERMISSIONS: Record<ComplianceRoleName, string[]> = {
  'compliance-officer': ['manage-dpas', 'manage-dsas', 'manage-workflows', 'view-all', 'manage-documents'],
  'dpo': ['trigger-erasure', 'trigger-export', 'view-all', 'manage-documents', 'manage-incidents'],
  'auditor': ['generate-reports', 'view-all', 'run-tests', 'view-documents'],
  'viewer': ['view-all', 'view-documents'],
}

const VALID_ROLES: ComplianceRoleName[] = ['compliance-officer', 'dpo', 'auditor', 'viewer']

export function isValidComplianceRole(role: string): role is ComplianceRoleName {
  return VALID_ROLES.includes(role as ComplianceRoleName)
}

export async function assignComplianceRole(userId: string, role: string, grantedBy: string) {
  if (!isValidComplianceRole(role)) throw new Error(`Invalid compliance role: ${role}`)

  return prisma.complianceRole.upsert({
    where: { userId_role: { userId, role } },
    update: { grantedBy },
    create: { userId, role, grantedBy },
  })
}

export async function revokeComplianceRole(id: string) {
  return prisma.complianceRole.delete({ where: { id } })
}

export async function getUserComplianceRoles(userId: string) {
  return prisma.complianceRole.findMany({
    where: { userId },
    orderBy: { grantedAt: 'desc' },
  })
}

export async function hasCompliancePermission(userId: string, action: string): Promise<boolean> {
  const roles = await prisma.complianceRole.findMany({
    where: { userId },
    select: { role: true },
  })

  for (const { role } of roles) {
    const perms = ROLE_PERMISSIONS[role as ComplianceRoleName]
    if (perms?.includes(action)) return true
  }

  return false
}

export async function listAllComplianceRoleAssignments() {
  return prisma.complianceRole.findMany({
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
    },
    orderBy: { grantedAt: 'desc' },
  })
}
