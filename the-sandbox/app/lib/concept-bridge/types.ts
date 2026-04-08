/**
 * Cross-Course Concept Bridge — Shared Types
 *
 * Types for bridge discovery, recommendations, and visualization.
 */

// ---------------------------------------------------------------------------
// Bridge Types
// ---------------------------------------------------------------------------

export type BridgeType = 'identical' | 'overlapping' | 'prerequisite' | 'extension'

export interface ConceptBridgeRecord {
  id: string
  conceptA: string
  courseA: string
  conceptB: string
  courseB: string
  similarity: number
  bridgeType: string
  createdBy: string
  verified: boolean
  createdAt: Date
}

// ---------------------------------------------------------------------------
// Resource Types
// ---------------------------------------------------------------------------

export type CrossCourseResourceType =
  | 'flashcards'
  | 'peer-experts'
  | 'study-groups'
  | 'materials'
  | 'live-rooms'

export interface CrossCourseResource {
  type: CrossCourseResourceType
  sourceCourse: string
  bridgedConcept: string
  count: number
  reason: string
  score: number
  peerIds?: string[]
  groupIds?: string[]
}

export interface BridgeRecommendationData {
  resources: CrossCourseResource[]
  concept: string
  courseId: string
}

// ---------------------------------------------------------------------------
// Struggle Detection
// ---------------------------------------------------------------------------

export type StruggleSignal = 'low-mastery' | 'flashcard-again' | 'low-score' | 'repeated-error'

// ---------------------------------------------------------------------------
// Bridge Map (Visualization)
// ---------------------------------------------------------------------------

export interface BridgeMapNode {
  id: string
  concept: string
  courseId: string
}

export interface BridgeMapEdge {
  source: string
  target: string
  similarity: number
  bridgeType: string
}

export interface BridgeMapData {
  nodes: BridgeMapNode[]
  edges: BridgeMapEdge[]
}

// ---------------------------------------------------------------------------
// API Response Types
// ---------------------------------------------------------------------------

export interface BridgeRecommendationResponse {
  id: string
  userId: string
  concept: string
  courseId: string
  resources: CrossCourseResource[]
  status: string
  actedOn: string | null
  helpful: boolean | null
  createdAt: string
  expiresAt: string
}

export interface BridgeFeedbackPayload {
  helpful: boolean
  actedOn?: string
}

export interface BridgeDiscoveryResult {
  created: number
  verified: number
}

// ---------------------------------------------------------------------------
// Integration Exports
// ---------------------------------------------------------------------------

export interface BridgeBriefingBlock {
  type: 'concept-bridge'
  count: number
  topConcept: string | null
  topCourseName: string | null
}

export interface BridgeSandyContext {
  activeBridgeRecommendations: number
  topStrugglingConcept: string | null
}
