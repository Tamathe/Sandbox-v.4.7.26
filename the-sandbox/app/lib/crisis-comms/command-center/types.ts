/**
 * Crisis Command Center — shared types.
 */

export type IncidentStatus = 'INITIATED' | 'ASSESSING' | 'DRAFTING' | 'ACTIVE' | 'CONTAINED' | 'CLOSED'

export type SeverityLevel = 1 | 2 | 3

export type DocumentType =
  | 'EMERGENCY_TEXT_ALERT'
  | 'PRESS_STATEMENT'
  | 'INTERNAL_EMAIL'
  | 'SOCIAL_TWITTER'
  | 'SOCIAL_INSTAGRAM'
  | 'SOCIAL_FACEBOOK'
  | 'PARENT_NOTIFICATION'
  | 'WEBSITE_BANNER'
  | 'TALKING_POINTS'
  | 'AFTER_ACTION_REPORT'

export type DocumentStatus = 'DRAFT' | 'REVIEW' | 'READY' | 'SENT'

export interface DistributionMeta {
  channel: 'sms' | 'email' | 'web' | 'social' | 'print' | 'internal'
  charLimit?: number
  copyLabel: string
  integration: 'manual' | 'api'
}

export const DISTRIBUTION_META: Record<DocumentType, DistributionMeta> = {
  EMERGENCY_TEXT_ALERT: { channel: 'sms', charLimit: 160, copyLabel: 'Copy for Mass Notification System', integration: 'manual' },
  PRESS_STATEMENT:      { channel: 'print', copyLabel: 'Copy Press Statement', integration: 'manual' },
  INTERNAL_EMAIL:       { channel: 'email', copyLabel: 'Copy for Email', integration: 'manual' },
  SOCIAL_TWITTER:       { channel: 'social', charLimit: 280, copyLabel: 'Copy for X/Twitter', integration: 'manual' },
  SOCIAL_INSTAGRAM:     { channel: 'social', charLimit: 2200, copyLabel: 'Copy for Instagram', integration: 'manual' },
  SOCIAL_FACEBOOK:      { channel: 'social', copyLabel: 'Copy for Facebook', integration: 'manual' },
  PARENT_NOTIFICATION:  { channel: 'email', copyLabel: 'Copy for Parent Email', integration: 'manual' },
  WEBSITE_BANNER:       { channel: 'web', copyLabel: 'Copy for Website', integration: 'manual' },
  TALKING_POINTS:       { channel: 'internal', copyLabel: 'Copy Talking Points', integration: 'manual' },
  AFTER_ACTION_REPORT:  { channel: 'internal', copyLabel: 'Copy Report', integration: 'manual' },
}

export type ParticipantRole = 'LEAD' | 'RESPONDER' | 'OBSERVER'

export type TimelineAction =
  | 'INCIDENT_CREATED'
  | 'PARTICIPANT_JOINED'
  | 'ASSESSMENT_CONFIRMED'
  | 'DOCUMENTS_GENERATED'
  | 'DOCUMENT_EDITED'
  | 'DOCUMENT_FINALIZED'
  | 'AI_REVISION'
  | 'STATUS_CHANGED'
  | 'INCIDENT_CLOSED'

export type CommandCenterPhase = 'initiation' | 'assessment' | 'workspace' | 'archived'

export interface AssessmentResult {
  summary: string
  severity: SeverityLevel
  affectedPopulations: string[]
  recommendedChannels: string[]
  suggestedDocumentTypes: DocumentType[]
  keyFacts: string[]
  unknowns: string[]
  immediateActions: string[]
}

export interface DemoScenario {
  id: string
  title: string
  severity: SeverityLevel
  icon: string
  description: string
  inputText: string
}

// ── API request/response types ──

export interface InitiateRequest {
  title: string
  inputText: string
  severity?: SeverityLevel
}

export interface InitiateResponse {
  incident: SerializedIncident
  assessment: AssessmentResult
}

export interface ConfirmAssessmentRequest {
  incidentId: string
  assessment: AssessmentResult
}

export interface DocumentUpdateRequest {
  documentId: string
  content: string
}

export interface AiEditRequest {
  documentId: string
  instruction: string
}

export interface JoinRoomRequest {
  roomCode: string
}

// ── Serialized types (Prisma models with Date → string for JSON transport) ──

export interface SerializedParticipant {
  id: string
  incidentId: string
  userId: string
  role: ParticipantRole
  joinedAt: string
  user?: {
    id: string
    name: string
    email: string
    role: string
    avatarUrl: string | null
  }
}

export interface SerializedDocument {
  id: string
  incidentId: string
  type: DocumentType
  title: string
  content: string
  status: DocumentStatus
  editedById: string | null
  createdAt: string
  updatedAt: string
  editedBy?: {
    id: string
    name: string
  } | null
}

export interface SerializedTimelineEvent {
  id: string
  incidentId: string
  userId: string | null
  action: TimelineAction
  detail: string | null
  metadata: string | null
  createdAt: string
  user?: {
    id: string
    name: string
  } | null
}

export interface SerializedIncident {
  id: string
  title: string
  severity: SeverityLevel
  status: IncidentStatus
  inputText: string
  assessment: string | null
  roomCode: string
  createdById: string
  createdAt: string
  updatedAt: string
  closedAt: string | null
  createdBy?: {
    id: string
    name: string
    email: string
    role: string
  }
  participants?: SerializedParticipant[]
  documents?: SerializedDocument[]
  timelineEvents?: SerializedTimelineEvent[]
}
