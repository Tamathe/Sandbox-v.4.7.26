/**
 * Zod schemas for all API input validation.
 * Enums are derived directly from the Prisma-generated const objects so that
 * adding a value to schema.prisma is automatically reflected here after
 * `prisma generate` — no manual sync needed.
 * TypeScript types are derived from schemas — do not write them separately.
 */
import { z } from 'zod'
import {
  UserRole,
  ToolType,
  ApprovalStatus,
  ToolDeploymentMode,
  BountyStatus,
  CollabMode,
  PortfolioType,
} from '../generated/prisma'

// ---------------------------------------------------------------------------
// Enums — single-sourced from Prisma
// ---------------------------------------------------------------------------

export const UserRoleSchema = z.nativeEnum(UserRole)
export const ToolTypeSchema = z.nativeEnum(ToolType)
export const ApprovalStatusSchema = z.nativeEnum(ApprovalStatus)
export const ToolDeploymentModeSchema = z.nativeEnum(ToolDeploymentMode)
export const BountyStatusSchema = z.nativeEnum(BountyStatus)
export const CollabModeSchema = z.nativeEnum(CollabMode)
export const PortfolioTypeSchema = z.nativeEnum(PortfolioType)

// StudyBuddyMode is UI-only (not in Prisma) — keep as manual enum
export const StudyBuddyModeSchema = z.enum([
  'tutor',
  'quiz',
  'flashcards',
  'socratic',
  'teach-back',
  'debate',
  'essay',
])

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

export const CustomMetricSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.string().min(1).max(50),
  description: z.string().max(500).optional(),
})

export const CreateToolSchema = z.object({
  name: z.string().min(1).max(150),
  shortDescription: z.string().min(1).max(500),
  fullDescription: z.string().min(1),
  category: z.string().min(1).max(100),
  toolType: ToolTypeSchema,
  difficultyLevel: z.string().max(50).optional(),
  estimatedMinutes: z.coerce.number().int().min(1).max(600).optional().nullable(),
  thumbnailUrl: z.string().url().optional().nullable(),
  externalUrl: z.string().url().optional().nullable(),
  systemPrompt: z.string().max(12000).optional().nullable(),
  personaName: z.string().max(80).optional().nullable(),
  personaAvatar: z.string().max(500).optional().nullable(),
  welcomeMessage: z.string().max(1000).optional().nullable(),
  starterQuestions: z.array(z.string().max(300)).max(10).optional(),
  referenceDocUrls: z.array(z.string()).max(20).optional(),
  learningObjectives: z.array(z.string().max(300)).max(20).optional(),
  intendedAudience: z.string().max(300).optional().nullable(),
  published: z.boolean().optional(),
  deploymentMode: ToolDeploymentModeSchema.optional(),
  approvalStatus: ApprovalStatusSchema.optional(),
  isOfficialService: z.boolean().optional(),
  serviceProtocol: z.string().max(100).optional().nullable(),
  escalationEmail: z.string().email().optional().nullable(),
  audioEnabled: z.boolean().optional(),
  audioPersonaName: z.string().max(80).optional().nullable(),
  audioEngine: z.string().max(50).optional(),
  audioVoiceName: z.string().max(100).optional().nullable(),
  audioSpeakingStyle: z.string().max(200).optional().nullable(),
  audioSpeed: z.number().min(0.25).max(4).optional(),
  audioSystemSuffix: z.string().max(2000).optional().nullable(),
  audioBackgroundTrack: z.string().max(200).optional().nullable(),
  customMetrics: z.array(CustomMetricSchema).max(20).optional(),
  totalSteps: z.coerce.number().int().min(1).max(100).optional().nullable(),
  stepLabel: z.string().max(50).optional().nullable(),
})
export type CreateToolInput = z.infer<typeof CreateToolSchema>

export const UpdateToolSchema = CreateToolSchema.partial()
export type UpdateToolInput = z.infer<typeof UpdateToolSchema>

export const ToolsQuerySchema = z.object({
  search: z.string().max(200).optional(),
  category: z.string().max(100).optional(),
  toolType: ToolTypeSchema.optional(),
  difficulty: z.string().max(50).optional(),
  approvalStatus: ApprovalStatusSchema.optional(),
  audioEnabled: z.enum(['true', 'false']).optional(),
  featured: z.enum(['true', 'false']).optional(),
  sort: z.enum(['newest', 'sessions', 'upvotes', 'favorites', 'updated']).optional(),
  published: z.enum(['true', 'false', 'all', 'draft', 'private', 'department']).optional(),
  creator: z.string().optional(),
  creatorEmail: z.string().email().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
  since: z.string().datetime().optional(),
})
export type ToolsQueryInput = z.infer<typeof ToolsQuerySchema>

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

export const ChatMessageItemSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(20000),
})

export const ChatRequestSchema = z.object({
  toolId: z.string().min(1),
  messages: z.array(ChatMessageItemSchema).min(1).max(200),
  sessionId: z.string().optional(),
  courseId: z.string().optional(),
  audioMode: z.boolean().optional(),
  mode: StudyBuddyModeSchema.optional(),
  difficultyBias: z.enum(['easier', 'harder']).optional(),
  // Study Buddy v2: Exam prep phase context
  examPrepPhase: z.enum(['intake', 'diagnostic', 'plan', 'execution', 'final-check', 'results']).optional(),
  examPrepContext: z.object({
    topic: z.string().optional(),
    date: z.string().optional(),
    planStep: z.number().optional(),
    planTotal: z.number().optional(),
    currentConcept: z.string().nullable().optional(),
    diagnosticAccuracy: z.number().nullable().optional(),
  }).optional(),
})
export type ChatRequestInput = z.infer<typeof ChatRequestSchema>

// ---------------------------------------------------------------------------
// Bounties
// ---------------------------------------------------------------------------

export const CreateBountySchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  category: z.string().min(1).max(100),
  difficulty: z.string().max(50).optional().nullable(),
  estimatedHours: z.coerce.number().int().min(1).max(10000).optional().nullable(),
})
export type CreateBountyInput = z.infer<typeof CreateBountySchema>

export const BountiesQuerySchema = z.object({
  status: BountyStatusSchema.optional(),
  category: z.string().max(100).optional(),
})

export const BountyReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
  recommended: z.boolean().optional(),
})
export type BountyReviewInput = z.infer<typeof BountyReviewSchema>

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export const UpdateUserSchema = z.object({
  role: UserRoleSchema.optional(),
  suspended: z.boolean().optional(),
  suspendedReason: z.string().max(500).optional(),
})
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>

export const UpdateProfileSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  bio: z.string().max(1000).optional().nullable(),
  department: z.string().max(150).optional().nullable(),
  college: z.string().max(150).optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),
  personalContext: z.string().max(2000).optional().nullable(),
})
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>

// ---------------------------------------------------------------------------
// Courses
// ---------------------------------------------------------------------------

export const CreateCourseSchema = z.object({
  courseCode: z.string().min(1).max(50),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  isPublic: z.boolean().optional(),
})
export type CreateCourseInput = z.infer<typeof CreateCourseSchema>

export const CreateDiscussionThreadSchema = z.object({
  title: z.string().min(1).max(300),
  body: z.string().min(1).max(10000),
  isPinned: z.boolean().optional(),
})

export const CreateDiscussionPostSchema = z.object({
  body: z.string().min(1).max(5000),
})

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export const CreateSessionSchema = z.object({
  toolId: z.string().min(1),
  courseId: z.string().optional(),
  assignmentId: z.string().optional(),
})

// ---------------------------------------------------------------------------
// Comments & Ratings
// ---------------------------------------------------------------------------

export const CreateCommentSchema = z.object({
  content: z.string().min(1).max(2000),
})

export const CreateRatingSchema = z.object({
  rating: z.number().int().min(1).max(5),
  review: z.string().max(1000).optional(),
})

// ---------------------------------------------------------------------------
// Collab
// ---------------------------------------------------------------------------

export const CreateCollabRequestSchema = z.object({
  toolId: z.string().min(1),
  mode: CollabModeSchema,
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  maxParticipants: z.number().int().min(2).max(20).optional(),
})

export const JoinCollabSessionSchema = z.object({
  sessionId: z.string().min(1),
})

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export const SendMessageSchema = z.object({
  content: z.string().min(1).max(5000),
})

export const CreateConversationSchema = z.object({
  participantId: z.string().min(1),
  initialMessage: z.string().min(1).max(5000).optional(),
})

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

export const UpsertNoteSchema = z.object({
  content: z.string().max(50000),
  toolId: z.string().optional(),
  courseId: z.string().optional(),
})

// ---------------------------------------------------------------------------
// Memories
// ---------------------------------------------------------------------------

export const CreateMemorySchema = z.object({
  content: z.string().min(1).max(1000),
  category: z.string().max(50).optional(),
})

export const UpdateMemorySchema = z.object({
  content: z.string().min(1).max(1000).optional(),
  category: z.string().max(50).optional(),
})

// ---------------------------------------------------------------------------
// Portfolio
// ---------------------------------------------------------------------------

export const CreatePortfolioItemSchema = z.object({
  type: PortfolioTypeSchema,
  title: z.string().min(1).max(200),
  organization: z.string().max(200).optional().nullable(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  skills: z.array(z.string().max(100)).max(30).optional(),
  url: z.string().url().optional().nullable(),
})

export const UpdatePortfolioItemSchema = CreatePortfolioItemSchema.partial()

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export const CreateAnnouncementSchema = z.object({
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
  tone: z.string().max(50).optional(),
  dismissible: z.boolean().optional(),
  isActive: z.boolean().optional(),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
})

export const AdminToolApprovalSchema = z.object({
  approvalStatus: ApprovalStatusSchema,
  suspendedReason: z.string().max(500).optional(),
})

// ---------------------------------------------------------------------------
// Library
// ---------------------------------------------------------------------------

export const AddToLibrarySchema = z.object({
  toolId: z.string().min(1),
  note: z.string().max(500).optional(),
})

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

export const BuilderMessageSchema = z.object({
  message: z.string().min(1).max(8000),
  spec: z.record(z.string(), z.unknown()).optional(),
})

// ---------------------------------------------------------------------------
// Audio
// ---------------------------------------------------------------------------

export const AudioSynthesizeSchema = z.object({
  text: z.string().min(1).max(4096),
  voice: z.string().max(50).optional(),
  speed: z.number().min(0.25).max(4).optional(),
  model: z.string().max(50).optional(),
})
