/**
 * command-center-service.ts
 *
 * Core business logic for the Crisis Command Center.
 * All DB access and AI calls live here — route files stay thin.
 */

import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../../prisma'
import { buildAssessmentPrompt, buildDocumentGenerationPrompt, buildAiRevisionPrompt } from './prompts'
import type {
  AssessmentResult,
  DocumentType,
  IncidentStatus,
  SeverityLevel,
  InitiateRequest,
  DocumentUpdateRequest,
  AiEditRequest,
  SerializedIncident,
  SerializedDocument,
  SerializedParticipant,
  SerializedTimelineEvent,
} from './types'

const anthropic = new Anthropic()

const DOCUMENT_TITLES: Record<DocumentType, string> = {
  EMERGENCY_TEXT_ALERT: 'Emergency Text Alert',
  PRESS_STATEMENT: 'Press Statement',
  INTERNAL_EMAIL: 'Internal Email',
  SOCIAL_TWITTER: 'Social Post — X/Twitter',
  SOCIAL_INSTAGRAM: 'Social Post — Instagram',
  SOCIAL_FACEBOOK: 'Social Post — Facebook',
  PARENT_NOTIFICATION: 'Parent & Family Notification',
  WEBSITE_BANNER: 'Website Banner',
  TALKING_POINTS: 'Talking Points',
  AFTER_ACTION_REPORT: 'After-Action Report',
}

// ── Include objects for Prisma queries ────────────────────────────────────────

const FULL_INCLUDE = {
  createdBy: { select: { id: true, name: true, email: true, role: true } },
  participants: {
    include: {
      user: { select: { id: true, name: true, email: true, role: true, avatarUrl: true } },
    },
    orderBy: { joinedAt: 'asc' as const },
  },
  documents: {
    include: {
      editedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'asc' as const },
  },
  timelineEvents: {
    include: {
      user: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'asc' as const },
  },
}

const LIGHT_INCLUDE = {
  createdBy: { select: { id: true, name: true, email: true, role: true } },
  participants: {
    include: {
      user: { select: { id: true, name: true, email: true, role: true, avatarUrl: true } },
    },
  },
}

// ── Serialization helpers ─────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeIncident(incident: any): SerializedIncident {
  return {
    id: incident.id,
    title: incident.title,
    severity: incident.severity,
    status: incident.status,
    inputText: incident.inputText,
    assessment: incident.assessment,
    roomCode: incident.roomCode,
    createdById: incident.createdById,
    createdAt: incident.createdAt.toISOString(),
    updatedAt: incident.updatedAt.toISOString(),
    closedAt: incident.closedAt?.toISOString() ?? null,
    createdBy: incident.createdBy,
    participants: incident.participants?.map(serializeParticipant),
    documents: incident.documents?.map(serializeDocument),
    timelineEvents: incident.timelineEvents?.map(serializeTimelineEvent),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeParticipant(p: any): SerializedParticipant {
  return {
    id: p.id,
    incidentId: p.incidentId,
    userId: p.userId,
    role: p.role,
    joinedAt: p.joinedAt.toISOString(),
    user: p.user,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeDocument(d: any): SerializedDocument {
  return {
    id: d.id,
    incidentId: d.incidentId,
    type: d.type,
    title: d.title,
    content: d.content,
    status: d.status,
    editedById: d.editedById,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
    editedBy: d.editedBy ?? null,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeTimelineEvent(e: any): SerializedTimelineEvent {
  return {
    id: e.id,
    incidentId: e.incidentId,
    userId: e.userId,
    action: e.action,
    detail: e.detail,
    metadata: e.metadata,
    createdAt: e.createdAt.toISOString(),
    user: e.user ?? null,
  }
}

// ── AI helper ─────────────────────────────────────────────────────────────────

async function callHaiku(systemPrompt: string, userMessage: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [{ role: 'user', content: userMessage }],
    system: systemPrompt,
  })
  return response.content[0].type === 'text' ? response.content[0].text : ''
}

// ── Exported service functions ────────────────────────────────────────────────

/**
 * Create a new incident, run AI assessment, and return the result.
 */
export async function initiateIncident(
  userId: string,
  input: InitiateRequest,
): Promise<{ incident: SerializedIncident; assessment: AssessmentResult }> {
  // Create the incident
  const incident = await prisma.crisisIncident.create({
    data: {
      title: input.title,
      severity: input.severity ?? 2,
      status: 'INITIATED',
      inputText: input.inputText,
      createdById: userId,
    },
  })

  // Add creator as LEAD participant
  await prisma.crisisParticipant.create({
    data: { incidentId: incident.id, userId, role: 'LEAD' },
  })

  // Timeline: incident created
  await prisma.crisisTimelineEvent.create({
    data: { incidentId: incident.id, userId, action: 'INCIDENT_CREATED' },
  })

  // AI assessment
  const systemPrompt = buildAssessmentPrompt(input.inputText)
  const aiText = await callHaiku(systemPrompt, 'Analyze this incident and return the JSON assessment.')

  let assessment: AssessmentResult
  try {
    const jsonMatch = aiText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in AI response')
    assessment = JSON.parse(jsonMatch[0]) as AssessmentResult
  } catch {
    // Fallback assessment if AI response is malformed
    assessment = {
      summary: 'AI assessment could not be parsed. Please review the incident details manually.',
      severity: input.severity ?? 2,
      affectedPopulations: ['students', 'faculty', 'staff'],
      recommendedChannels: ['internal email', 'website banner'],
      suggestedDocumentTypes: ['INTERNAL_EMAIL', 'WEBSITE_BANNER'],
      keyFacts: [],
      unknowns: [],
      immediateActions: ['Review the incident report manually', 'Convene crisis team'],
    }
  }

  // Update incident with assessment
  await prisma.crisisIncident.update({
    where: { id: incident.id },
    data: {
      status: 'ASSESSING',
      assessment: JSON.stringify(assessment),
      severity: assessment.severity,
    },
  })

  // Timeline: assessment generated
  await prisma.crisisTimelineEvent.create({
    data: {
      incidentId: incident.id,
      userId,
      action: 'ASSESSMENT_CONFIRMED',
      detail: assessment.summary,
    },
  })

  // Fetch full incident with relations
  const full = await prisma.crisisIncident.findUniqueOrThrow({
    where: { id: incident.id },
    include: FULL_INCLUDE,
  })

  return { incident: serializeIncident(full), assessment }
}

/**
 * Run AI assessment on an existing incident (or update its input).
 */
export async function assessIncident(
  userId: string,
  incidentId: string,
  inputText: string,
  severity: SeverityLevel,
  hasTitle: boolean,
): Promise<{ incident: SerializedIncident; assessment: AssessmentResult }> {
  const systemPrompt = buildAssessmentPrompt(inputText)
  const aiText = await callHaiku(systemPrompt, 'Analyze this incident and return the JSON assessment.')

  let assessment: AssessmentResult
  try {
    const jsonMatch = aiText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in AI response')
    assessment = JSON.parse(jsonMatch[0]) as AssessmentResult
  } catch {
    assessment = {
      summary: 'AI assessment could not be parsed. Please review the incident details manually.',
      severity,
      affectedPopulations: ['students', 'faculty', 'staff'],
      recommendedChannels: ['internal email', 'website banner'],
      suggestedDocumentTypes: ['INTERNAL_EMAIL', 'WEBSITE_BANNER'],
      keyFacts: [],
      unknowns: [],
      immediateActions: ['Review the incident report manually', 'Convene crisis team'],
    }
  }

  const title = hasTitle ? undefined : assessment.summary.slice(0, 100)
  await prisma.crisisIncident.update({
    where: { id: incidentId },
    data: {
      status: 'ASSESSING',
      inputText,
      assessment: JSON.stringify(assessment),
      severity: assessment.severity,
      ...(title ? { title } : {}),
    },
  })

  await prisma.crisisTimelineEvent.create({
    data: { incidentId, userId, action: 'ASSESSMENT_CONFIRMED', detail: assessment.summary },
  })

  const full = await prisma.crisisIncident.findUniqueOrThrow({
    where: { id: incidentId },
    include: FULL_INCLUDE,
  })
  return { incident: serializeIncident(full), assessment }
}

/**
 * Confirm the assessment (possibly user-edited) and generate all documents.
 */
export async function confirmAssessment(
  userId: string,
  incidentId: string,
  assessment: AssessmentResult,
): Promise<SerializedIncident> {
  // Update incident to DRAFTING
  const incident = await prisma.crisisIncident.update({
    where: { id: incidentId },
    data: {
      status: 'DRAFTING',
      assessment: JSON.stringify(assessment),
      severity: assessment.severity,
    },
  })

  // Timeline: status changed
  await prisma.crisisTimelineEvent.create({
    data: {
      incidentId,
      userId,
      action: 'STATUS_CHANGED',
      detail: 'Status changed to DRAFTING',
    },
  })

  // Generate documents in parallel
  await Promise.all(
    assessment.suggestedDocumentTypes.map((type) =>
      generateDocument(incidentId, type, assessment, incident.title),
    ),
  )

  // Timeline: documents generated
  await prisma.crisisTimelineEvent.create({
    data: {
      incidentId,
      userId,
      action: 'DOCUMENTS_GENERATED',
      detail: `Generated ${assessment.suggestedDocumentTypes.length} documents`,
      metadata: JSON.stringify({ types: assessment.suggestedDocumentTypes }),
    },
  })

  // Return full incident
  const full = await prisma.crisisIncident.findUniqueOrThrow({
    where: { id: incidentId },
    include: FULL_INCLUDE,
  })
  return serializeIncident(full)
}

/**
 * Generate a single crisis communication document via AI.
 */
export async function generateDocument(
  incidentId: string,
  type: DocumentType,
  assessment: AssessmentResult,
  title: string,
): Promise<void> {
  const systemPrompt = buildDocumentGenerationPrompt(type, assessment, title)
  const content = await callHaiku(systemPrompt, `Generate the ${type.replace(/_/g, ' ').toLowerCase()} now.`)

  await prisma.crisisDocument.create({
    data: {
      incidentId,
      type,
      title: DOCUMENT_TITLES[type],
      content: content.trim(),
      status: 'DRAFT',
    },
  })
}

/**
 * Join an incident room by room code.
 */
export async function joinRoom(
  userId: string,
  roomCode: string,
): Promise<SerializedIncident> {
  const incident = await prisma.crisisIncident.findUnique({
    where: { roomCode },
  })
  if (!incident) {
    throw new Error('Room not found. Check the room code and try again.')
  }

  // Upsert participant
  await prisma.crisisParticipant.upsert({
    where: { incidentId_userId: { incidentId: incident.id, userId } },
    create: { incidentId: incident.id, userId, role: 'RESPONDER' },
    update: {},
  })

  // Timeline: participant joined
  await prisma.crisisTimelineEvent.create({
    data: {
      incidentId: incident.id,
      userId,
      action: 'PARTICIPANT_JOINED',
    },
  })

  const full = await prisma.crisisIncident.findUniqueOrThrow({
    where: { id: incident.id },
    include: FULL_INCLUDE,
  })
  return serializeIncident(full)
}

/**
 * Get a single incident with all relations.
 */
export async function getIncident(incidentId: string): Promise<SerializedIncident> {
  const incident = await prisma.crisisIncident.findUniqueOrThrow({
    where: { id: incidentId },
    include: FULL_INCLUDE,
  })
  return serializeIncident(incident)
}

/**
 * Get all incidents where the user is a participant, ordered by most recent.
 */
export async function getIncidentsByUser(userId: string): Promise<SerializedIncident[]> {
  const incidents = await prisma.crisisIncident.findMany({
    where: {
      participants: { some: { userId } },
    },
    include: LIGHT_INCLUDE,
    orderBy: { createdAt: 'desc' },
  })
  return incidents.map(serializeIncident)
}

/**
 * Update a document's content (manual edit).
 */
export async function updateDocument(
  userId: string,
  req: DocumentUpdateRequest,
): Promise<SerializedDocument> {
  const doc = await prisma.crisisDocument.update({
    where: { id: req.documentId },
    data: {
      content: req.content,
      editedById: userId,
    },
    include: { editedBy: { select: { id: true, name: true } } },
  })

  // Timeline: document edited
  await prisma.crisisTimelineEvent.create({
    data: {
      incidentId: doc.incidentId,
      userId,
      action: 'DOCUMENT_EDITED',
      detail: `Edited: ${doc.title}`,
    },
  })

  return serializeDocument(doc)
}

/**
 * AI-assisted document revision.
 */
export async function aiEditDocument(
  userId: string,
  req: AiEditRequest,
): Promise<SerializedDocument> {
  const doc = await prisma.crisisDocument.findUniqueOrThrow({
    where: { id: req.documentId },
  })

  const systemPrompt = buildAiRevisionPrompt(
    doc.content,
    req.instruction,
    doc.type as DocumentType,
  )
  const revisedContent = await callHaiku(systemPrompt, req.instruction)

  const updated = await prisma.crisisDocument.update({
    where: { id: req.documentId },
    data: {
      content: revisedContent.trim(),
      editedById: userId,
    },
    include: { editedBy: { select: { id: true, name: true } } },
  })

  // Timeline: AI revision
  await prisma.crisisTimelineEvent.create({
    data: {
      incidentId: doc.incidentId,
      userId,
      action: 'AI_REVISION',
      detail: `AI revision on: ${doc.title} — "${req.instruction}"`,
    },
  })

  return serializeDocument(updated)
}

/**
 * Update incident status (and closedAt if closing).
 */
export async function updateIncidentStatus(
  userId: string,
  incidentId: string,
  status: IncidentStatus,
): Promise<SerializedIncident> {
  const data: Record<string, unknown> = { status }
  if (status === 'CLOSED') {
    data.closedAt = new Date()
  }

  await prisma.crisisIncident.update({
    where: { id: incidentId },
    data,
  })

  // Timeline: status changed
  await prisma.crisisTimelineEvent.create({
    data: {
      incidentId,
      userId,
      action: status === 'CLOSED' ? 'INCIDENT_CLOSED' : 'STATUS_CHANGED',
      detail: `Status changed to ${status}`,
    },
  })

  const full = await prisma.crisisIncident.findUniqueOrThrow({
    where: { id: incidentId },
    include: FULL_INCLUDE,
  })
  return serializeIncident(full)
}
