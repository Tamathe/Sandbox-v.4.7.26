export const ASSESSMENT_MODES = [
  'TRADITIONAL',
  'PROCESS',
  'DIVERGENCE',
  'TEACHBACK',
  'CROSS_EXAM',
  'AUTHENTIC',
  'MASTERY_GATE',
] as const;

export type AssessmentMode = (typeof ASSESSMENT_MODES)[number];

export const EVIDENCE_TYPES = [
  'SANDY_TRANSCRIPT',
  'SIMULATION_THREAD',
  'TEACHBACK_SESSION',
  'PEER_REVIEW_SESSION',
  'DEBATE_SESSION',
  'FISHBOWL_SESSION',
  'TOOL_USAGE',
  'FLASHCARD_MASTERY',
  'CONCEPT_MASTERY',
  'STUDENT_ANNOTATION',
] as const;

export type EvidenceType = (typeof EVIDENCE_TYPES)[number];

export const GATE_STATUSES = [
  'LOCKED',
  'AVAILABLE',
  'IN_PROGRESS',
  'PASSED',
  'FAILED_RETRY',
] as const;

export type GateStatus = (typeof GATE_STATUSES)[number];

export interface EvidenceInput {
  gradebookEntryId: string;
  evidenceType: EvidenceType;
  sourceId: string;
  sourceLabel: string;
  weight?: number;
  studentAnnotation?: string | null;
}

export interface EvidenceUpdateInput {
  studentAnnotation?: string | null;
  facultyScore?: number | null;
  facultyNotes?: string | null;
  weight?: number;
}

export interface ProcessScores {
  processScore: number;
  coherenceScore: number;
  depthScore: number;
  rationale: string;
  usedFallback?: boolean;
}

export interface ProcessTranscriptMessage {
  role: string;
  content: string;
  timestamp: string;
}

export interface ProcessAnnotation {
  messageIndex: number;
  text: string;
}

export interface ProcessAnnotationPayload {
  annotations: ProcessAnnotation[];
  reflection?: string;
}

export interface ProcessSessionMeta {
  mode: string;
  duration: number;
  messageCount: number;
  startedAt: string;
  endedAt: string | null;
}

export interface ProcessTranscriptSnapshot {
  sessionId: string;
  messages: ProcessTranscriptMessage[];
  annotations: ProcessAnnotation[];
  reflection: string | null;
  sessionMeta: ProcessSessionMeta;
}

export interface AssessmentEvidenceRecord {
  id: string;
  gradebookEntryId: string;
  evidenceType: EvidenceType;
  sourceId: string;
  sourceLabel: string;
  studentAnnotation: string | null;
  annotatedAt: string | null;
  aiProcessScore: number | null;
  aiCoherenceScore: number | null;
  aiDepthScore: number | null;
  aiScoringRationale: string | null;
  facultyScore: number | null;
  facultyNotes: string | null;
  reviewedAt: string | null;
  weight: number;
  createdAt: string;
}

export interface EvidenceScoringInput {
  aiProcessScore?: number | null;
  aiCoherenceScore?: number | null;
  aiDepthScore?: number | null;
  aiScoringRationale?: string | null;
}

export interface AssessmentEvidenceSummary {
  count: number;
  compositeMethod: 'weighted_average' | null;
  processScore: number | null;
  weightedScores: {
    process: number | null;
    coherence: number | null;
    depth: number | null;
  };
}

export interface DivergenceTreeBranch {
  choice: string;
  participantIds: string[];
  childNode?: DivergenceTreeNode;
}

export interface DivergenceTreeNode {
  turn: number;
  prompt: string;
  branches: DivergenceTreeBranch[];
}

export interface DivergenceParticipantDecision {
  turn: number;
  choice: string;
  narrative: string;
}

export interface DivergenceParticipantPath {
  userId: string;
  name: string;
  decisions: DivergenceParticipantDecision[];
  endState: string;
  coherenceScore: number;
  coherenceRationale: string;
}

export interface DivergenceAssessmentRecord {
  roomId: string;
  scenario: string;
  tree: DivergenceTreeNode;
  clusterCount: number;
  keyDecisionPoints: Array<{ turn: number; divergenceScore: number }>;
  participants: DivergenceParticipantPath[];
}

export interface TeachbackAssessmentResult {
  userId: string;
  name: string;
  concept: string;
  explanation: string;
  clarity: number;
  depth: number;
  engagement: number;
  accuracy: number;
  composite: number;
  feedback: string;
}

export interface CrossExamAiScore {
  argumentQuality: number;
  evidenceUse: number;
  rebuttals: number;
  overall: number;
  rationale?: string;
}

export interface CrossExamPeerScore {
  ratings: number[];
  average: number;
}

export interface CrossExamSelfAssessmentPayload {
  selfScore?: number;
  reflection?: string;
}

export interface CrossExamParticipantResult {
  userId: string;
  name: string;
  ai: CrossExamAiScore;
  peer: CrossExamPeerScore;
  excerpts?: {
    strongest?: string;
    weakest?: string;
  };
}

export interface CompetencySnapshot {
  competency: string;
  category: 'Core' | 'Domain' | 'Professional';
  level: 'Developing' | 'Proficient' | 'Advanced' | 'Expert';
  score: number;
  evidenceCount: number;
  courseNames: string[];
  bloomHighWater: number;
  trend: 'improving' | 'stable' | 'declining';
}

export type CompetencyCategory = CompetencySnapshot['category'];
export type CompetencyLevel = CompetencySnapshot['level'];
export type CompetencyTrend = CompetencySnapshot['trend'];

export interface CompetencyEvidenceLink {
  label: string;
  href: string;
}

export interface CompetencyEvidenceItem {
  id: string;
  kind: 'assessment' | 'mastery';
  label: string;
  sourceLabel: string;
  evidenceType: EvidenceType | 'CONCEPT_MASTERY';
  score: number | null;
  rawScore: number | null;
  weight: number;
  courseName: string | null;
  occurredAt: string;
  note: string | null;
  link: CompetencyEvidenceLink | null;
}

export interface CompetencyDecayPoint {
  label: string;
  score: number;
}

export interface CompetencySuggestion {
  label: string;
  description: string;
  href: string;
}

export interface CompetencyRecordDetail extends CompetencySnapshot {
  rawScore: number;
  decayedScore: number;
  courseIds: string[];
  evidenceIds: string[];
  conceptSlugs: string[];
  firstDemonstrated: string;
  lastDemonstrated: string;
  decayProjection: CompetencyDecayPoint[];
  evidence: CompetencyEvidenceItem[];
  suggestions: CompetencySuggestion[];
}

export interface CompetencyGap {
  competency: string;
  score: number;
  evidenceCount: number;
  reason: 'low_score' | 'low_evidence';
  suggestions: CompetencySuggestion[];
}

export interface CompetencyPortfolioSummary {
  strongestCompetency: string | null;
  weakestCompetency: string | null;
  totalEvidenceCount: number;
  improvingCount: number;
}

export interface CompetencyPortfolioPayload {
  generatedAt: string;
  summary: CompetencyPortfolioSummary;
  competencies: CompetencyRecordDetail[];
  gaps: CompetencyGap[];
}

export interface CompetencySourceContribution {
  label: string;
  count: number;
}

export interface ClassCompetencyDistribution {
  competency: string;
  category: CompetencyCategory;
  developing: number;
  proficient: number;
  advanced: number;
  expert: number;
  totalStudents: number;
  averageScore: number;
  topSources: CompetencySourceContribution[];
}

export interface ClassCompetencyDistributionPayload {
  course: {
    id: string;
    courseCode: string;
    title: string;
  };
  totalStudents: number;
  generatedAt: string;
  distribution: ClassCompetencyDistribution[];
}

export const COMPETENCY_THRESHOLDS = {
  Developing: 0.0,
  Proficient: 0.5,
  Advanced: 0.75,
  Expert: 0.9,
} as const;

export type GapType =
  | 'misconception'
  | 'knowledge_gap'
  | 'transfer_failure'
  | 'procedural'
  | 'recall_decay';

export interface MasteryGateQuestionRecord {
  concept: string;
  bloomLevel: number;
  question: string;
  expectedAnswer: string;
  studentAnswer?: string;
  isCorrect?: boolean;
  feedback?: string;
  gapType?: GapType | 'none';
  answeredAt?: string;
}

export interface MasteryGapDiagnosis {
  concept: string;
  gapType: GapType;
  explanation: string;
  recommendation: string;
  practiceMode: 'tutor' | 'quiz' | 'flashcards' | 'socratic' | 'teach-back' | 'debate';
  practiceHref: string;
}

export interface MasteryGateAttemptSummary {
  id: string;
  gateId: string;
  status: GateStatus;
  attemptNumber: number;
  totalQuestions: number;
  correctCount: number;
  overallScore: number | null;
  startedAt: string;
  completedAt: string | null;
}

export interface MasteryGateAttemptDetail extends MasteryGateAttemptSummary {
  questions: MasteryGateQuestionRecord[];
  gapDiagnosis: MasteryGapDiagnosis[];
}

export interface MasteryGateConceptReadiness {
  concept: string;
  mastery: number | null;
  effectiveMastery: number | null;
  bloomHighWater: number | null;
  dueNow: boolean;
  note: string | null;
}

export interface MasteryGateCard {
  id: string;
  title: string;
  description: string | null;
  weekId: string | null;
  weekTitle: string | null;
  orderIndex: number;
  concepts: string[];
  bloomFloor: number;
  passThreshold: number;
  maxAttempts: number;
  cooldownHours: number;
  isPublished: boolean;
  status: GateStatus;
  available: boolean;
  availabilityReason: string | null;
  nextAvailableAt: string | null;
  readinessScore: number;
  conceptsReadiness: MasteryGateConceptReadiness[];
  latestAttempt: MasteryGateAttemptSummary | null;
  attemptCount: number;
  linkedAssignmentId: string | null;
  linkedAssignmentTitle: string | null;
  unlockLabel: string | null;
}

export interface MasteryGateCourseWeekOption {
  id: string;
  title: string;
  weekNumber: number;
}

export interface MasteryGateObjectiveOption {
  id: string;
  title: string;
  description: string | null;
  weekId: string | null;
  weekLabel: string | null;
}

export interface MasteryGateProgressPayload {
  generatedAt: string;
  viewerRole: string;
  course: {
    id: string;
    courseCode: string;
    title: string;
  };
  permissions: {
    canDesign: boolean;
    canAttempt: boolean;
  };
  weeks: MasteryGateCourseWeekOption[];
  objectives: MasteryGateObjectiveOption[];
  gates: MasteryGateCard[];
}

export interface MasteryGateDetailPayload {
  generatedAt: string;
  viewerRole: string;
  gate: MasteryGateCard;
  attempts: MasteryGateAttemptSummary[];
  activeAttempt: MasteryGateAttemptDetail | null;
  permissions: {
    canDesign: boolean;
    canAttempt: boolean;
    canReview: boolean;
  };
}

export interface MasteryGateStartPayload {
  attempt: MasteryGateAttemptDetail;
  currentQuestion: MasteryGateQuestionRecord;
}

export interface MasteryGateAnswerPayload {
  attempt: MasteryGateAttemptDetail;
  currentQuestion: MasteryGateQuestionRecord | null;
  correct: boolean;
  feedback: string;
  completed: boolean;
  passed: boolean;
  gapDiagnosis: MasteryGapDiagnosis[];
}

export interface MasteryGateDesignInput {
  courseId: string;
  title: string;
  description?: string | null;
  weekId?: string | null;
  concepts: string[];
  bloomFloor: number;
  passThreshold: number;
  maxAttempts: number;
  cooldownHours: number;
  orderIndex?: number | null;
  unlocksWeekId?: string | null;
  unlocksGateId?: string | null;
  isPublished?: boolean;
}

export interface AuthenticToolOption {
  id: string;
  name: string;
  shortDescription: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
  sessionCount: number;
  uniqueUsers: number;
  href: string;
}

export interface AuthenticAssessmentScores {
  functionality: number;
  usage: number;
  impact: number;
  iteration: number;
  composite: number;
}

export interface AuthenticAssessmentMetrics {
  toolId: string;
  toolName: string;
  toolType: string;
  toolHref: string;
  published: boolean;
  createdAt: string;
  publishedAt: string | null;
  lastEditedAt: string | null;
  hasWorkingChat: boolean;
  sessionCount: number;
  avgSessionDuration: number;
  avgSessionScore: number | null;
  uniqueUsers: number;
  totalSessions: number;
  repeatUsers: number;
  avgQualitySignal: number | null;
  positiveRatings: number;
  totalRatings: number;
  commentCount: number;
  editCount: number;
  feedbackResponseRate: number;
  iterationHeuristic: string;
  scores: AuthenticAssessmentScores;
}

export interface AuthenticAssessmentSubmissionPayload {
  submissionId: string;
  submittedAt: string;
  reflection: string | null;
  linkedToolId: string;
  linkedToolName: string;
  gradebookEntryId: string;
  gradebookStatus: string;
  aiScore: number | null;
  facultyScore: number | null;
  facultyFeedback: string | null;
  evidenceId: string | null;
  evidenceFacultyScore: number | null;
  evidenceFacultyNotes: string | null;
  metrics: AuthenticAssessmentMetrics;
}

export interface AuthenticAssessmentStudentPayload {
  generatedAt: string;
  viewerRole: string;
  assignment: {
    id: string;
    title: string;
    pointsPossible: number;
    dueAt: string | null;
    startDate: string;
    course: {
      id: string;
      title: string;
    };
  };
  availableTools: AuthenticToolOption[];
  submission: AuthenticAssessmentSubmissionPayload | null;
}

export interface AuthenticAssessmentFacultyRow {
  studentId: string;
  studentName: string;
  studentEmail: string;
  submissionId: string;
  submittedAt: string;
  linkedToolId: string;
  linkedToolName: string;
  gradebookEntryId: string;
  gradebookStatus: string;
  aiScore: number | null;
  facultyScore: number | null;
  metrics: AuthenticAssessmentMetrics | null;
}

export interface AuthenticAssessmentFacultyPayload {
  generatedAt: string;
  viewerRole: string;
  assignment: {
    id: string;
    title: string;
    pointsPossible: number;
    dueAt: string | null;
    startDate: string;
    course: {
      id: string;
      title: string;
    };
  };
  summary: {
    submittedCount: number;
    publishedCount: number;
    avgComposite: number | null;
    avgUniqueUsers: number | null;
    avgImpact: number | null;
  };
  submissions: AuthenticAssessmentFacultyRow[];
}

export const CANVAS_COMPOSITE_METHODS = [
  'weighted_average',
  'highest',
  'portfolio',
] as const;

export type CanvasCompositeMethod = (typeof CANVAS_COMPOSITE_METHODS)[number];

export type TraditionalCanvasModeConfig = Record<string, never>;

export interface ProcessCanvasModeConfig {
  annotationRequired: boolean;
  minMessages: number;
}

export interface DivergenceCanvasModeConfig {
  scenario: string;
  turns: number;
  coherenceWeight: number;
}

export interface TeachbackCanvasModeConfig {
  concepts: string[];
  timeLimitMinutes: number;
}

export interface CrossExamCanvasModeConfig {
  format: 'DEBATE' | 'FISHBOWL';
  aiWeight: number;
}

export interface AuthenticCanvasMetricWeights {
  functionality: number;
  usage: number;
  impact: number;
  iteration: number;
}

export interface AuthenticCanvasModeConfig {
  usagePeriodDays: number;
  weights: AuthenticCanvasMetricWeights;
  uniqueUsersTarget: number;
  totalSessionsTarget: number;
  repeatUsersTarget: number;
  durationTargetSeconds: number;
}

export interface MasteryGateCanvasModeConfig {
  concepts: string[];
  bloomFloor: number;
  passThreshold: number;
  gateId?: string | null;
}

export interface AssessmentCanvasModeConfigMap {
  TRADITIONAL: TraditionalCanvasModeConfig;
  PROCESS: ProcessCanvasModeConfig;
  DIVERGENCE: DivergenceCanvasModeConfig;
  TEACHBACK: TeachbackCanvasModeConfig;
  CROSS_EXAM: CrossExamCanvasModeConfig;
  AUTHENTIC: AuthenticCanvasModeConfig;
  MASTERY_GATE: MasteryGateCanvasModeConfig;
}

export type AssessmentCanvasModeConfig =
  AssessmentCanvasModeConfigMap[keyof AssessmentCanvasModeConfigMap];

export type AssessmentCanvasModeState<M extends AssessmentMode = AssessmentMode> = {
  mode: M;
  enabled: boolean;
  weight: number;
  config: AssessmentCanvasModeConfigMap[M];
};

export type AssessmentCanvasModeStateUnion = {
  [M in AssessmentMode]: AssessmentCanvasModeState<M>;
}[AssessmentMode];

export interface AssessmentCanvasConfig {
  version: number;
  compositeMethod: CanvasCompositeMethod;
  modes: AssessmentCanvasModeStateUnion[];
}

export interface AssessmentCanvasAssignmentInput {
  assessmentMode?: string | null;
  assessmentConfig?: unknown;
  processWeight?: number | null;
}

export interface AssessmentCanvasAssignmentPayload {
  generatedAt: string;
  assignment: {
    id: string;
    title: string;
    courseId: string;
    courseTitle: string;
    isPublished: boolean;
    primaryMode: AssessmentMode;
    enabledModes: AssessmentMode[];
    evidenceTypes: EvidenceType[];
    processWeight: number | null;
  };
  config: AssessmentCanvasConfig;
}

export interface AssessmentCanvasInstructionsPayload {
  generatedAt: string;
  assignment: {
    id: string;
    title: string;
    primaryMode: AssessmentMode;
    enabledModes: AssessmentMode[];
    compositeMethod: CanvasCompositeMethod;
  };
  instructions: string;
}

function normalizeProcessAnnotations(value: unknown): ProcessAnnotation[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;

      const rawIndex = (item as { messageIndex?: unknown }).messageIndex;
      const rawText = (item as { text?: unknown }).text;
      const messageIndex = Number(rawIndex);
      const text = typeof rawText === 'string' ? rawText.trim() : '';

      if (!Number.isInteger(messageIndex) || messageIndex < 0 || !text) {
        return null;
      }

      return { messageIndex, text };
    })
    .filter((item): item is ProcessAnnotation => item != null);
}

export function parseProcessAnnotationPayload(
  value: string | null | undefined
): ProcessAnnotationPayload {
  if (!value) {
    return { annotations: [] };
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { annotations: [], reflection: value };
    }

    const annotations = normalizeProcessAnnotations(
      (parsed as { annotations?: unknown }).annotations
    );
    const reflectionValue = (parsed as { reflection?: unknown }).reflection;
    const reflection =
      typeof reflectionValue === 'string' && reflectionValue.trim().length > 0
        ? reflectionValue.trim()
        : undefined;

    return {
      annotations,
      ...(reflection ? { reflection } : {}),
    };
  } catch {
    return { annotations: [], reflection: value };
  }
}

export function serializeProcessAnnotationPayload(
  value: ProcessAnnotationPayload | null | undefined
): string | null {
  if (!value) return null;

  const annotations = normalizeProcessAnnotations(value.annotations);
  const reflection =
    typeof value.reflection === 'string' && value.reflection.trim().length > 0
      ? value.reflection.trim()
      : undefined;

  if (annotations.length === 0 && !reflection) {
    return null;
  }

  return JSON.stringify({
    annotations,
    ...(reflection ? { reflection } : {}),
  });
}

export function parseCrossExamSelfAssessment(
  value: string | null | undefined
): CrossExamSelfAssessmentPayload {
  if (!value) return {};

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { reflection: value };
    }

    const rawScore = (parsed as { selfScore?: unknown }).selfScore;
    const rawReflection = (parsed as { reflection?: unknown }).reflection;
    const selfScore =
      typeof rawScore === 'number' && Number.isFinite(rawScore)
        ? (clampUnit(rawScore) ?? undefined)
        : undefined;
    const reflection =
      typeof rawReflection === 'string' && rawReflection.trim().length > 0
        ? rawReflection.trim()
        : undefined;

    return {
      ...(selfScore != null ? { selfScore } : {}),
      ...(reflection ? { reflection } : {}),
    };
  } catch {
    return { reflection: value };
  }
}

export function serializeCrossExamSelfAssessment(
  value: CrossExamSelfAssessmentPayload | null | undefined
): string | null {
  if (!value) return null;

  const selfScore = clampUnit(value.selfScore);
  const reflection =
    typeof value.reflection === 'string' && value.reflection.trim().length > 0
      ? value.reflection.trim()
      : undefined;

  if (selfScore == null && !reflection) {
    return null;
  }

  return JSON.stringify({
    ...(selfScore != null ? { selfScore } : {}),
    ...(reflection ? { reflection } : {}),
  });
}

export function clampUnit(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value)) return null;
  return Math.max(0, Math.min(1, value));
}

function weightedAverage(
  items: Array<{ score: number | null | undefined; weight: number | null | undefined }>
): number | null {
  const scored = items
    .map((item) => ({
      score: clampUnit(item.score),
      weight: typeof item.weight === 'number' && item.weight > 0 ? item.weight : 1,
    }))
    .filter((item): item is { score: number; weight: number } => item.score != null);

  if (scored.length === 0) return null;

  const totalWeight = scored.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight === 0) return null;

  const total = scored.reduce((sum, item) => sum + item.score * item.weight, 0);
  return Math.round((total / totalWeight) * 1000) / 1000;
}

export function summarizeAssessmentEvidence(
  evidence: Array<{
    aiProcessScore: number | null;
    aiCoherenceScore: number | null;
    aiDepthScore: number | null;
    facultyScore: number | null;
    weight: number;
  }>,
  options?: {
    processScore?: number | null;
    compositeMethod?: string | null;
  }
): AssessmentEvidenceSummary {
  const processAverage = weightedAverage(
    evidence.map((item) => ({
      score: item.facultyScore ?? item.aiProcessScore,
      weight: item.weight,
    }))
  );

  return {
    count: evidence.length,
    compositeMethod:
      evidence.length > 0
        ? ((options?.compositeMethod as 'weighted_average' | null | undefined) ??
          'weighted_average')
        : null,
    processScore: clampUnit(options?.processScore) ?? processAverage,
    weightedScores: {
      process: weightedAverage(
        evidence.map((item) => ({
          score: item.aiProcessScore,
          weight: item.weight,
        }))
      ),
      coherence: weightedAverage(
        evidence.map((item) => ({
          score: item.aiCoherenceScore,
          weight: item.weight,
        }))
      ),
      depth: weightedAverage(
        evidence.map((item) => ({
          score: item.aiDepthScore,
          weight: item.weight,
        }))
      ),
    },
  };
}
