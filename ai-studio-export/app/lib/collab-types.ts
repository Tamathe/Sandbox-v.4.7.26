export type CollabModeValue =
  | 'CO_PRESENCE'
  | 'TURN_BASED'
  | 'ARTIFACT_BUILDER'
  | 'COLLABORATIVE_QUEST'

export type CollabMessageRoleValue = 'user' | 'assistant' | 'system'

export interface CollabParticipantSummary {
  id: string
  userId: string
  name: string
  email: string
  avatarUrl: string | null
  isHost: boolean
  isActive: boolean
  messageCount: number
  joinedAt: string
  leftAt: string | null
  turnOrder: number | null
  toolSessionId: string | null
}

export interface CollabMessageSummary {
  id: string
  role: CollabMessageRoleValue
  content: string
  senderId: string | null
  senderName: string | null
  senderEmail: string | null
  clientMessageId: string | null
  createdAt: string
  turnNumber: number | null
  triggeredArtifactUpdate: boolean
}

export interface CollabSessionState {
  id: string
  toolId: string
  toolName: string
  joinCode: string
  shareUrl: string
  mode: CollabModeValue
  status: string
  maxParticipants: number
  hostId: string
  hostName: string
  participants: CollabParticipantSummary[]
  messageHistory: CollabMessageSummary[]
  teamScore: number
  artifactContent: string | null
  artifactTitle: string | null
  currentTurnUserId: string | null
  currentTurnUserName: string | null
  startedAt: string | null
  endedAt: string | null
}

export type CollabSSEEvent =
  | { type: 'init_state'; payload: CollabSessionState }
  | { type: 'new_message'; payload: CollabMessageSummary }
  | { type: 'ai_stream_chunk'; payload: { chunk: string; messageId: string } }
  | {
      type: 'ai_stream_end'
      payload: { messageId: string; fullContent: string; createdAt: string }
    }
  | {
      type: 'presence_update'
      payload: {
        participants: CollabParticipantSummary[]
        event: 'joined' | 'left' | 'updated'
        user: string
        promotedHostId?: string
      }
    }
  | {
      type: 'turn_change'
      payload: {
        activeUserId: string | null
        activeName: string | null
        turnEndsAt: string | null
        turnNumber: number
      }
    }
  | {
      type: 'artifact_update'
      payload: { artifact: string; updatedBy: string; timestamp: string }
    }
  | {
      type: 'session_end'
      payload: { endedBy: string; endedByName: string; endedAt: string }
    }
  | { type: 'typing'; payload: { userEmail: string; userName: string; isTyping: boolean } }
  | { type: 'score_update'; payload: { teamScore: number; delta: number; reason: string } }
  | { type: 'error'; payload: { message: string; code: string } }
