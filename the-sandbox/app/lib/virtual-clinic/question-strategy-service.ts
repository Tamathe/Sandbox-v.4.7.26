import { callHaikuJSON } from './ai-config'
import { stripMarkers } from './marker-utils'
import type { QuestionStrategyAnalysis, TranscriptMessage } from './types'

/**
 * Analyzes the student's questioning strategy during history-taking.
 * Classifies each question by type and provides actionable feedback
 * on their interview technique.
 */
export async function analyzeQuestionStrategy(
  transcript: TranscriptMessage[],
): Promise<QuestionStrategyAnalysis> {
  const historyQuestions = transcript
    .filter((m) => m.role === 'user' && m.phase === 'HISTORY_TAKING')
    .map((m) => stripMarkers(m.content))

  if (historyQuestions.length === 0) {
    return {
      totalQuestions: 0,
      openEndedCount: 0,
      closedCount: 0,
      leadingCount: 0,
      followUpCount: 0,
      openEndedRatio: 0,
      strengths: [],
      improvements: [],
      exampleQuestions: [],
    }
  }

  const parsed = await callHaikuJSON<Omit<QuestionStrategyAnalysis, 'totalQuestions' | 'openEndedRatio'>>(
    'You are a clinical communication skills analyst specializing in medical interview technique. Analyze a student\'s questioning patterns during a patient encounter. Return JSON only.',
    `## Student Questions During History-Taking
${historyQuestions.map((q, i) => `${i + 1}. "${q}"`).join('\n')}

Classify each question and analyze the overall questioning strategy.

Return JSON:
{
  "openEndedCount": number,
  "closedCount": number,
  "leadingCount": number,
  "followUpCount": number,
  "strengths": ["1-2 specific strengths of their questioning technique"],
  "improvements": ["1-2 specific, actionable suggestions"],
  "exampleQuestions": [
    {
      "question": "original question text",
      "type": "open-ended|closed|leading|follow-up",
      "suggestion": "optional: how to improve this question (only for closed/leading questions, max 3 examples)"
    }
  ]
}

Classification rules:
- "open-ended" = invites narrative response ("Tell me about...", "How would you describe...", "What brings you in...")
- "closed" = yes/no or single-word answer ("Do you have...", "Is there...", "Have you ever...")
- "leading" = suggests the answer ("You don't have chest pain, do you?", "I assume you've been...")
- "follow-up" = builds on the patient's previous answer ("You mentioned X — can you tell me more?")
- A question can only be one type
- Include max 5 example questions (prioritize leading/closed that could be improved)
- Strengths/improvements should be specific to THIS student's patterns, not generic advice`,
  )

  const totalQuestions = historyQuestions.length
  const openEndedRatio = totalQuestions > 0
    ? Math.round(((parsed.openEndedCount + parsed.followUpCount) / totalQuestions) * 100) / 100
    : 0

  return {
    totalQuestions,
    openEndedCount: parsed.openEndedCount,
    closedCount: parsed.closedCount,
    leadingCount: parsed.leadingCount,
    followUpCount: parsed.followUpCount,
    openEndedRatio,
    strengths: parsed.strengths ?? [],
    improvements: parsed.improvements ?? [],
    exampleQuestions: (parsed.exampleQuestions ?? []).slice(0, 5),
  }
}
