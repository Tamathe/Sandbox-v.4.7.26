/**
 * Scenario registry — indexes the 3 pre-built demo scenarios.
 *
 * Each scenario provides posts + pre-computed analysis so the page
 * loads instantly with no AI API calls.
 */

import type {
  SocialPost,
  SentimentResult,
  ThemeCluster,
  AIDetectionResult,
  CrisisIntelligenceBrief,
} from '../types'

import { SPROUT_7DAY_POSTS } from './index'
import {
  SEEDED_SENTIMENT,
  SEEDED_THEMES,
  SEEDED_AI_DETECTION,
  SEEDED_BRIEF,
  getSeededNarration,
} from './seeded-analysis'

import {
  CRISIS_EVENT_POSTS,
  CRISIS_EVENT_SENTIMENT,
  CRISIS_EVENT_THEMES,
  CRISIS_EVENT_AI_DETECTION,
  CRISIS_EVENT_BRIEF,
  getCrisisEventNarration,
} from './scenario-crisis-event'

import {
  COORDINATED_POSTS,
  COORDINATED_SENTIMENT,
  COORDINATED_THEMES,
  COORDINATED_AI_DETECTION,
  COORDINATED_BRIEF,
  getCoordinatedNarration,
} from './scenario-coordinated-campaign'

// ── Types ────────────────────────────────────────────────────────────────

export type ScenarioId = 'normal-week' | 'crisis-event' | 'coordinated-campaign' | 'live-sprout'

export interface ScenarioMeta {
  id: ScenarioId
  label: string
  description: string
  threatLevel: string
}

export interface ScenarioData {
  posts: SocialPost[]
  sentimentResults: SentimentResult[]
  themes: ThemeCluster[]
  aiDetection: AIDetectionResult[]
  brief: CrisisIntelligenceBrief
  getNarration: (firstName: string) => string
}

// ── Registry ─────────────────────────────────────────────────────────────

export const SCENARIO_LIST: ScenarioMeta[] = [
  {
    id: 'normal-week',
    label: 'Normal Week',
    description: 'Mixed sentiment, some AI noise — steady state monitoring',
    threatLevel: 'MODERATE',
  },
  {
    id: 'crisis-event',
    label: 'Crisis Event',
    description: 'Chemistry building gas leak — evacuation & media coverage',
    threatLevel: 'HIGH',
  },
  {
    id: 'coordinated-campaign',
    label: 'Coordinated Campaign',
    description: 'Anti-DEI bot network — 15 coordinated accounts detected',
    threatLevel: 'CRITICAL',
  },
]

export function getScenarioData(id: Exclude<ScenarioId, 'live-sprout'>): ScenarioData {
  switch (id) {
    case 'normal-week':
      return {
        posts: SPROUT_7DAY_POSTS,
        sentimentResults: SEEDED_SENTIMENT,
        themes: SEEDED_THEMES,
        aiDetection: SEEDED_AI_DETECTION,
        brief: SEEDED_BRIEF,
        getNarration: getSeededNarration,
      }
    case 'crisis-event':
      return {
        posts: CRISIS_EVENT_POSTS,
        sentimentResults: CRISIS_EVENT_SENTIMENT,
        themes: CRISIS_EVENT_THEMES,
        aiDetection: CRISIS_EVENT_AI_DETECTION,
        brief: CRISIS_EVENT_BRIEF,
        getNarration: getCrisisEventNarration,
      }
    case 'coordinated-campaign':
      return {
        posts: COORDINATED_POSTS,
        sentimentResults: COORDINATED_SENTIMENT,
        themes: COORDINATED_THEMES,
        aiDetection: COORDINATED_AI_DETECTION,
        brief: COORDINATED_BRIEF,
        getNarration: getCoordinatedNarration,
      }
  }
}
