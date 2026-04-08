// ── Student AI Literacy Progress Service ─────────────────────────────────────
// Tracks per-module completion status across the 5 student AI Literacy modules.

import { prisma } from '../prisma'

export type StudentModuleKey = 'policies' | 'judgment-calls' | 'prompt-craft' | 'output-detective' | 'study-coach'
export type ModuleStatus = 'not-started' | 'in-progress' | 'completed'

/**
 * Determine the completion status of each student AI Literacy module.
 *
 * - policies: completed if any ClarityCheckResponse exists, in-progress if enrolled courses have policies
 * - judgment-calls: completed if 3+ JudgmentCallAttempt, in-progress if 1+
 * - prompt-craft: completed if 3+ PromptLabAttempt (context='student'), in-progress if any
 * - output-detective: completed if 3+ OutputEvalAttempt (context='student'), in-progress if any
 * - study-coach: completed if 2+ StudyCoachSession with completedAt, in-progress if any sessions
 */
export async function getStudentModuleProgress(
  userId: string,
): Promise<Record<StudentModuleKey, ModuleStatus>> {
  const [
    clarityCheckCount,
    judgmentCallCount,
    promptCraftCount,
    outputDetectiveCount,
    studyCoachTotal,
    studyCoachCompleted,
  ] = await Promise.all([
    prisma.clarityCheckResponse.count({ where: { userId } }),
    prisma.judgmentCallAttempt.count({ where: { userId } }),
    prisma.promptLabAttempt.count({ where: { userId, context: 'student' } }),
    prisma.outputEvalAttempt.count({ where: { userId, context: 'student' } }),
    prisma.studyCoachSession.count({ where: { userId } }),
    prisma.studyCoachSession.count({ where: { userId, completedAt: { not: null } } }),
  ])

  return {
    policies: clarityCheckCount >= 1 ? 'completed' : 'not-started',
    'judgment-calls': judgmentCallCount >= 3 ? 'completed' : judgmentCallCount >= 1 ? 'in-progress' : 'not-started',
    'prompt-craft': promptCraftCount >= 3 ? 'completed' : promptCraftCount >= 1 ? 'in-progress' : 'not-started',
    'output-detective': outputDetectiveCount >= 3 ? 'completed' : outputDetectiveCount >= 1 ? 'in-progress' : 'not-started',
    'study-coach': studyCoachCompleted >= 2 ? 'completed' : studyCoachTotal >= 1 ? 'in-progress' : 'not-started',
  }
}
