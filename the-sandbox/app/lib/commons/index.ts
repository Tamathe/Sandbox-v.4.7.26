// Barrel file — re-exports public API from commons services

// ─── Shared Types ───────────────────────────────────────────
export type {
  PlayerScore,
  LiveRoomSummary,
  LiveRoomConfig,
  GeneratedQuestion,
  ImportedQuestion,
  StreakData,
  LiveRoomSuggestion,
  CaseStudyConfig,
  DebateConfig,
  FishbowlConfig,
  ImprovConfig,
  OfficeHoursConfig,
  PeerReviewConfig,
  ProblemLabConfig,
  SimulationConfig,
  SpeedMentoringConfig,
  StudyConfig,
  StudyPhase,
  TeachBackConfig,
  WatchConfig,
} from './types'

export {
  createLiveRoom,
  joinLiveRoom,
  getLiveRoom,
  startLiveRoom,
  openNextRound,
  recordAnswer,
  closeRound,
  completeLiveRoom,
  endLiveRoom,
  getRoundsForReview,
} from './commons-service'

export { generateCommentary, generateSummary } from './commentary-service'

export { generateQuestion } from './question-service'

export { notifyGroupOfLiveRoom } from './notification-service'

export { getStudyStreak } from './streak-service'

export { getSuggestionsForUser, getSuggestionContext } from './suggestion-service'

export {
  parseCanvasQuiz,
  parsePlainTextQuiz,
  aiParseQuiz,
  createChallengeFromImport,
} from './quiz-import-service'

// Engines
export { startCaseStudy, submitHypothesis, endCaseStudy } from './case-study-engine'

export { startDebate, submitStatement, castVote, endDebate } from './debate-engine'

export { startFishbowl, submitAnnotation, requestTagIn, endFishbowl } from './fishbowl-engine'

export { startImprov, submitPerformance, submitImprovRating, endImprov } from './improv-engine'

export { startOfficeHours, submitQuestion, resolveQuestion, endOfficeHours } from './office-hours-engine'

export { startPeerReview, submitWork, submitReview, endPeerReview } from './peer-review-engine'

export { startProblemLab, submitSolution, endProblemLab } from './problem-lab-engine'

export { startSimulation, advanceTurn, submitChoice, completeDivergence, endSimulation } from './simulation-engine'

export { startSpeedMentoring, endSpeedMentoring } from './speed-mentoring-engine'

export { startStudySession, requestStuckHelp, endStudySession } from './study-engine'

export { startTeachBack, submitTeaching, submitRating, endTeachBack } from './teachback-engine'

export {
  startWatchParty,
  sendWatchReaction,
  triggerSandyCommentary,
  createWatchPoll,
  voteWatchPoll,
  completeWatchParty,
  endWatchParty,
} from './watch-engine'
