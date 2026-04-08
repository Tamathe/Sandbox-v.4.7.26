/**
 * reputation-pulse-service.ts
 *
 * Returns pre-computed (seeded) analysis for the 48 synthetic demo posts.
 * The seeded data lives in synthetic-data/seeded-analysis.ts and mirrors
 * what the AI pipeline would produce, eliminating 4 Haiku + 1 Sonnet
 * API calls on every page load.
 */

import { getPosts } from './synthetic-data'
import {
  SEEDED_SENTIMENT,
  SEEDED_THEMES,
  SEEDED_AI_DETECTION,
  SEEDED_BRIEF,
} from './synthetic-data/seeded-analysis'
import type {
  FullAnalysisResult,
} from './types'

// ── Public API ────────────────────────────────────────────────────────────

export interface AnalyzeRequest {
  userContext?: string
}

/**
 * Returns the pre-computed analysis for the demo dataset.
 * No AI API calls — instant response.
 */
export async function analyzeReputationPulse(_req: AnalyzeRequest = {}): Promise<FullAnalysisResult> {
  const posts = getPosts()

  return {
    brief: SEEDED_BRIEF,
    posts,
    sentimentResults: SEEDED_SENTIMENT,
    themes: SEEDED_THEMES,
    aiDetection: SEEDED_AI_DETECTION,
  }
}

