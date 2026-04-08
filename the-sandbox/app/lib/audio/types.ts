// app/lib/audio/types.ts
// Shared types for the Audio Experience Platform

export type EpisodeTier = 'auto' | 'educator' | 'student'
export type EpisodeStatus = 'draft' | 'published' | 'stale'
export type EpisodeVisibility = 'private' | 'course' | 'campus'
export type PlayerState = 'idle' | 'bar' | 'panel' | 'full'

export interface SegmentMapEntry {
  startMs: number
  endMs: number
  sourceAnchor: string
  sourceText: string
  topic: string
}

export interface SegmentMap {
  segments: SegmentMapEntry[]
}

export interface ChapterMarker {
  title: string
  startMs: number
}

export interface Bookmark {
  timestampMs: number
  note: string
}

export interface EpisodeCardData {
  id: string
  title: string
  sourceName: string
  courseId: string | null
  courseName?: string
  tier: EpisodeTier
  status: EpisodeStatus
  tags: string[]
  listenCount: number
  durationSecs: number
  cdnUrl: string | null
  createdAt: string
  publishedAt: string | null
  // Listening progress (if student has history)
  completedPct?: number
  lastPositionMs?: number
}

export interface EpisodeDetail extends EpisodeCardData {
  transcript: string | null
  transcriptFormat: string | null
  segmentMap: SegmentMap | null
  chapters: ChapterMarker[]
  visibility: EpisodeVisibility
  creatorId: string | null
  creatorName?: string
  bookmarks?: Bookmark[]
}

export interface AudioHubFeedResponse {
  continueListening: EpisodeCardData[]
  recommended: EpisodeCardData[]
  trending: EpisodeCardData[]
}

export interface AudioHubCoursesResponse {
  courses: {
    courseId: string
    courseName: string
    courseCode: string
    episodes: EpisodeCardData[]
    totalDuration: number
  }[]
}

export interface AudioHubBrowseResponse {
  episodes: EpisodeCardData[]
  tags: { tag: string; count: number }[]
  total: number
}

// Voice session types
export type VoiceTutoringMode = 'socratic' | 'rehearsal' | 'walkthrough' | 'assessment' | 'scenario'

export interface TranscriptEntry {
  role: 'user' | 'assistant'
  text: string
  timestampMs: number
}

export interface CheckpointResult {
  name: string
  met: boolean
  evidence: string
}

export interface ScoreDimension {
  dimension: string
  score: number
  weight: number
  evidence: string
  feedback: string
}

export interface VoiceSessionSummary {
  id: string
  type: VoiceTutoringMode
  courseId: string | null
  topicTags: string[]
  durationSecs: number | null
  summary: string | null
  status: string
  createdAt: string
  scores: ScoreDimension[]
}

// Interactive scenario types
export type ScenarioTemplateType = 'clinical' | 'interview' | 'debate' | 'roleplay'

export interface ScenarioPersona {
  name: string
  role: string
  voice: string
  personality: string
}

export interface ScenarioPhase {
  name: string
  objective: string
  checkpoint?: { required: boolean; criteria: string }
  maxDurationSecs?: number
}

export interface RubricDimension {
  dimension: string
  weight: number
  descriptors: Record<string, string>
}

export interface ScenarioDetail {
  id: string
  templateType: ScenarioTemplateType
  title: string
  description: string
  persona: ScenarioPersona
  situation: string
  phases: ScenarioPhase[]
  rubric: RubricDimension[]
  completionCriteria: string
  published: boolean
  courseId: string | null
  timesPlayed: number
  avgScore: number | null
  creatorId: string
  creatorName?: string
}

// Audio state for Sandy ambient context
export interface AudioAmbientState {
  isPlaying: boolean
  currentEpisode: { id: string; title: string; courseId: string | null; topicTags: string[] } | null
  currentTimestampMs: number
  currentSegment: { topic: string; sourceText: string } | null
  activeVoiceSession: { type: string; mode: VoiceTutoringMode; scenarioId: string | null } | null
}
