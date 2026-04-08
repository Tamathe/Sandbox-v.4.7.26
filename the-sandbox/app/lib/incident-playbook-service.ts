import { prisma } from './prisma'
import type { Prisma } from '../generated/prisma'

// ── Types ────────────────────────────────────────────────────────────────────

type PlaybookStep = {
  order: number
  title: string
  description: string
  assignee: string
  slaHours: number
}

type CreatePlaybookInput = {
  name: string
  incidentType: string
  severity: string
  steps: PlaybookStep[]
  notifyRoles: string[]
}

type UpdatePlaybookInput = Partial<CreatePlaybookInput> & { active?: boolean }

// ── Playbook CRUD ────────────────────────────────────────────────────────────

export async function createPlaybook(input: CreatePlaybookInput) {
  return prisma.incidentPlaybook.create({
    data: {
      name: input.name,
      incidentType: input.incidentType,
      severity: input.severity,
      steps: input.steps as unknown as Prisma.InputJsonValue,
      notifyRoles: input.notifyRoles,
    },
  })
}

export async function updatePlaybook(id: string, input: UpdatePlaybookInput) {
  const data: Record<string, unknown> = {}
  if (input.name !== undefined) data.name = input.name
  if (input.incidentType !== undefined) data.incidentType = input.incidentType
  if (input.severity !== undefined) data.severity = input.severity
  if (input.steps !== undefined) data.steps = input.steps as unknown as Prisma.InputJsonValue
  if (input.notifyRoles !== undefined) data.notifyRoles = input.notifyRoles
  if (input.active !== undefined) data.active = input.active

  return prisma.incidentPlaybook.update({ where: { id }, data })
}

export async function listPlaybooks() {
  return prisma.incidentPlaybook.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { responses: true } } },
  })
}

export async function deletePlaybook(id: string) {
  return prisma.incidentPlaybook.delete({ where: { id } })
}

// ── Response lifecycle ───────────────────────────────────────────────────────

export async function initiateResponse(incidentId: string, playbookId?: string, assignedTo?: string) {
  return prisma.incidentResponse.create({
    data: {
      incidentId,
      playbookId: playbookId || null,
      assignedTo: assignedTo || null,
      status: 'initiated',
      currentStep: 0,
    },
    include: { playbook: true, incident: true },
  })
}

export async function advanceStep(responseId: string) {
  const response = await prisma.incidentResponse.findUnique({
    where: { id: responseId },
    include: { playbook: true },
  })
  if (!response) throw new Error('Response not found')
  if (response.status === 'resolved') throw new Error('Response already resolved')

  const steps = (response.playbook?.steps as PlaybookStep[] | null) ?? []
  const nextStep = response.currentStep + 1

  return prisma.incidentResponse.update({
    where: { id: responseId },
    data: {
      currentStep: nextStep,
      status: nextStep >= steps.length ? 'resolved' : 'in-progress',
      resolvedAt: nextStep >= steps.length ? new Date() : undefined,
    },
    include: { playbook: true, incident: true },
  })
}

export async function escalateResponse(responseId: string, notes?: string) {
  return prisma.incidentResponse.update({
    where: { id: responseId },
    data: {
      status: 'escalated',
      notes: notes || undefined,
    },
    include: { playbook: true, incident: true },
  })
}

export async function resolveResponse(responseId: string, notes?: string) {
  return prisma.incidentResponse.update({
    where: { id: responseId },
    data: {
      status: 'resolved',
      resolvedAt: new Date(),
      notes: notes || undefined,
    },
    include: { playbook: true, incident: true },
  })
}

export async function getResponsesForIncident(incidentId: string) {
  return prisma.incidentResponse.findMany({
    where: { incidentId },
    include: { playbook: true },
    orderBy: { startedAt: 'desc' },
  })
}

// ── Seed default playbooks ───────────────────────────────────────────────────

export async function seedPlaybooks() {
  const defaults: CreatePlaybookInput[] = [
    {
      name: 'Data Breach Response',
      incidentType: 'data-breach',
      severity: 'critical',
      notifyRoles: ['ADMIN'],
      steps: [
        { order: 1, title: 'Identify & Contain', description: 'Identify affected systems and contain the breach immediately. Disconnect compromised systems if necessary.', assignee: 'IT Security', slaHours: 1 },
        { order: 2, title: 'Assess Scope', description: 'Determine the scope of data exposure: number of affected records, types of data compromised, and duration of exposure.', assignee: 'IT Security', slaHours: 4 },
        { order: 3, title: 'Notify Leadership', description: 'Notify CIO, CISO, and university legal counsel. Prepare initial impact assessment summary.', assignee: 'Compliance Officer', slaHours: 6 },
        { order: 4, title: 'Regulatory Notification', description: 'File required notifications with federal/state agencies per FERPA and KY breach notification laws.', assignee: 'Legal', slaHours: 24 },
        { order: 5, title: 'Affected Party Notification', description: 'Notify affected students, faculty, or staff with details of the breach and protective measures available.', assignee: 'Communications', slaHours: 48 },
        { order: 6, title: 'Post-Incident Review', description: 'Conduct a post-incident review, document lessons learned, and update security controls to prevent recurrence.', assignee: 'IT Security', slaHours: 168 },
      ],
    },
    {
      name: 'FERPA Violation Response',
      incidentType: 'ferpa-violation',
      severity: 'high',
      notifyRoles: ['ADMIN', 'EDUCATOR'],
      steps: [
        { order: 1, title: 'Document Violation', description: 'Document the nature of the FERPA violation including what records were disclosed, to whom, and under what circumstances.', assignee: 'Compliance Officer', slaHours: 2 },
        { order: 2, title: 'Secure Records', description: 'Ensure the improperly disclosed records are secured and no further unauthorized access is possible.', assignee: 'IT Security', slaHours: 4 },
        { order: 3, title: 'Notify Registrar', description: 'Notify the University Registrar and FERPA compliance officer. Determine if the Department of Education must be notified.', assignee: 'Compliance Officer', slaHours: 8 },
        { order: 4, title: 'Remediation Training', description: 'Provide targeted FERPA remediation training to the individual(s) involved in the violation.', assignee: 'HR / Training', slaHours: 72 },
        { order: 5, title: 'Process Improvement', description: 'Review and update access controls, audit procedures, and training requirements to prevent recurrence.', assignee: 'Compliance Officer', slaHours: 168 },
      ],
    },
    {
      name: 'Unauthorized Access Response',
      incidentType: 'unauthorized-access',
      severity: 'high',
      notifyRoles: ['ADMIN'],
      steps: [
        { order: 1, title: 'Revoke Access', description: 'Immediately revoke the unauthorized access. Reset credentials for affected accounts.', assignee: 'IT Security', slaHours: 1 },
        { order: 2, title: 'Audit Trail Review', description: 'Review audit logs to determine what data was accessed, modified, or exfiltrated during the unauthorized access period.', assignee: 'IT Security', slaHours: 8 },
        { order: 3, title: 'Impact Assessment', description: 'Assess whether any student education records or PII were compromised. Determine regulatory notification obligations.', assignee: 'Compliance Officer', slaHours: 24 },
        { order: 4, title: 'Corrective Action', description: 'Implement corrective actions: patch vulnerabilities, update access policies, add monitoring alerts, and document the incident.', assignee: 'IT Security', slaHours: 72 },
      ],
    },
  ]

  const results = []
  for (const playbook of defaults) {
    const existing = await prisma.incidentPlaybook.findFirst({
      where: { name: playbook.name },
    })
    if (!existing) {
      const created = await createPlaybook(playbook)
      results.push(created)
    }
  }
  return results
}
