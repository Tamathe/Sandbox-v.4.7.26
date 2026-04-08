import { prisma } from '../prisma';
import type {
  AssessmentEvidence,
  CompetencyRecord,
  StudentConceptMastery,
  ToolSession,
} from '../../generated/prisma';
import { applyMasteryDecay } from '../mastery-decay';
import {
  COMPETENCY_THRESHOLDS,
  type ClassCompetencyDistribution,
  type ClassCompetencyDistributionPayload,
  type CompetencyCategory,
  type CompetencyDecayPoint,
  type CompetencyEvidenceItem,
  type CompetencyGap,
  type CompetencyLevel,
  type CompetencyPortfolioPayload,
  type CompetencyRecordDetail,
  type CompetencySuggestion,
  type CompetencyTrend,
  type EvidenceType,
} from './types';

const DAY_MS = 24 * 60 * 60 * 1000;
const HALF_LIFE_DAYS = 90;

type CourseSummary = {
  id: string;
  courseCode: string;
  title: string;
};

type MasteryRecord = Pick<
  StudentConceptMastery,
  | 'concept'
  | 'encounterCount'
  | 'successCount'
  | 'failCount'
  | 'masteryLevel'
  | 'coursesEncountered'
  | 'firstCourseId'
  | 'firstSeenAt'
  | 'lastSeenAt'
> & {
  firstCourse: CourseSummary | null;
};

type EvidenceRecord = Pick<
  AssessmentEvidence,
  | 'id'
  | 'evidenceType'
  | 'sourceId'
  | 'sourceLabel'
  | 'aiProcessScore'
  | 'aiCoherenceScore'
  | 'aiDepthScore'
  | 'aiScoringRationale'
  | 'facultyScore'
  | 'facultyNotes'
  | 'weight'
  | 'createdAt'
> & {
  gradebookEntry: {
    submission: {
      assignment: {
        id: string;
        title: string;
        courseId: string;
        course: CourseSummary;
      };
    };
  };
};

type SessionRecord = Pick<
  ToolSession,
  'id' | 'bloomLevel' | 'conceptsTouched' | 'courseId' | 'startedAt' | 'score' | 'notes'
> & {
  course: CourseSummary | null;
};

type CompetencyDefinition = {
  category: CompetencyCategory;
  concepts: string[];
  evidenceTypes: EvidenceType[];
  sourceKeywords: string[];
  defaultBloomFloor: number;
  suggestions: CompetencySuggestion[];
};

const COMPETENCY_DEFINITIONS: Record<string, CompetencyDefinition> = {
  'Critical Thinking': {
    category: 'Core',
    concepts: [
      'analysis',
      'evaluate',
      'evaluation',
      'synthesis',
      'logical-reasoning',
      'evidence-assessment',
      'argumentation',
      'hypothesis',
    ],
    evidenceTypes: [
      'SANDY_TRANSCRIPT',
      'SIMULATION_THREAD',
      'TEACHBACK_SESSION',
      'DEBATE_SESSION',
      'FISHBOWL_SESSION',
      'PEER_REVIEW_SESSION',
    ],
    sourceKeywords: ['case study', 'simulation', 'debate', 'analysis', 'review'],
    defaultBloomFloor: 4,
    suggestions: [
      {
        label: 'Run a Commons simulation',
        description: 'Practice decisions under ambiguity and capture reasoning evidence.',
        href: '/campus',
      },
      {
        label: 'Use Study Buddy Socratic mode',
        description: 'Turn recall into analysis with guided questioning.',
        href: '/study',
      },
    ],
  },
  'Quantitative Reasoning': {
    category: 'Core',
    concepts: [
      'statistics',
      'data-interpretation',
      'mathematical-modeling',
      'probability',
      'calculation',
      'quantitative',
      'numeracy',
      'graph',
    ],
    evidenceTypes: ['FLASHCARD_MASTERY', 'CONCEPT_MASTERY', 'SANDY_TRANSCRIPT'],
    sourceKeywords: ['math', 'stats', 'quant', 'data', 'calculus'],
    defaultBloomFloor: 3,
    suggestions: [
      {
        label: 'Launch Study Buddy quiz mode',
        description: 'Build repeated quantitative reps with adaptive questions.',
        href: '/study',
      },
      {
        label: 'Refresh flashcards',
        description: 'Reinforce formulas and data patterns before they decay.',
        href: '/study',
      },
    ],
  },
  'Written Communication': {
    category: 'Core',
    concepts: [
      'argumentation',
      'clarity',
      'structure',
      'revision',
      'audience-awareness',
      'writing',
      'thesis',
    ],
    evidenceTypes: ['SANDY_TRANSCRIPT', 'PEER_REVIEW_SESSION'],
    sourceKeywords: ['essay', 'writing', 'draft', 'revision', 'process'],
    defaultBloomFloor: 3,
    suggestions: [
      {
        label: 'Use Essay Coach mode',
        description: 'Generate new revision evidence with guided drafting.',
        href: '/study',
      },
      {
        label: 'Annotate your process',
        description: 'Capture how and why your writing changed over time.',
        href: '/study',
      },
    ],
  },
  'Oral Communication': {
    category: 'Core',
    concepts: [
      'presentation',
      'teaching',
      'debate',
      'articulation',
      'responsiveness',
      'oral',
      'speech',
    ],
    evidenceTypes: [
      'TEACHBACK_SESSION',
      'DEBATE_SESSION',
      'FISHBOWL_SESSION',
      'PEER_REVIEW_SESSION',
    ],
    sourceKeywords: ['teach-back', 'teach back', 'debate', 'fishbowl', 'presentation'],
    defaultBloomFloor: 4,
    suggestions: [
      {
        label: 'Start a Teach Back session',
        description: 'Explaining ideas aloud creates strong oral evidence quickly.',
        href: '/study',
      },
      {
        label: 'Join a Commons debate',
        description: 'Practice rebuttals, responsiveness, and clarity under pressure.',
        href: '/campus',
      },
    ],
  },
  'Ethical Reasoning': {
    category: 'Core',
    concepts: [
      'ethical-frameworks',
      'stakeholder-analysis',
      'moral-reasoning',
      'decision-coherence',
      'ethics',
      'justice',
    ],
    evidenceTypes: ['SIMULATION_THREAD', 'DEBATE_SESSION', 'FISHBOWL_SESSION'],
    sourceKeywords: ['ethical', 'stakeholder', 'policy', 'dilemma', 'justice'],
    defaultBloomFloor: 4,
    suggestions: [
      {
        label: 'Practice a dilemma simulation',
        description: 'Branching scenarios surface tradeoffs and ethical frameworks.',
        href: '/campus',
      },
      {
        label: 'Defend a position in debate',
        description: 'Turn values into explicit, reviewable reasoning.',
        href: '/campus',
      },
    ],
  },
  'Collaborative Problem-Solving': {
    category: 'Professional',
    concepts: [
      'teamwork',
      'peer-feedback',
      'conflict-resolution',
      'delegation',
      'collaboration',
      'group-work',
    ],
    evidenceTypes: ['PEER_REVIEW_SESSION', 'DEBATE_SESSION', 'FISHBOWL_SESSION'],
    sourceKeywords: ['peer', 'group', 'team', 'collab', 'fishbowl'],
    defaultBloomFloor: 3,
    suggestions: [
      {
        label: 'Work in a Commons room',
        description: 'Live group sessions create collaborative evidence naturally.',
        href: '/campus',
      },
      {
        label: 'Ask for peer review',
        description: 'Feedback exchanges count as collaboration, not just product polish.',
        href: '/study',
      },
    ],
  },
  'Information Literacy': {
    category: 'Core',
    concepts: [
      'source-evaluation',
      'research-methodology',
      'citation',
      'ai-literacy',
      'information-literacy',
      'research',
    ],
    evidenceTypes: ['SANDY_TRANSCRIPT', 'PEER_REVIEW_SESSION', 'TOOL_USAGE'],
    sourceKeywords: ['research', 'source', 'citation', 'evidence', 'ai literacy'],
    defaultBloomFloor: 3,
    suggestions: [
      {
        label: 'Review sources with Sandy',
        description: 'Use guided questioning to compare credibility and evidence quality.',
        href: '/study',
      },
      {
        label: 'Capture a research workflow',
        description: 'Turning source evaluation into evidence strengthens this competency fast.',
        href: '/portfolio-mapper',
      },
    ],
  },
  Adaptability: {
    category: 'Professional',
    concepts: [
      'transfer-learning',
      'novel-problem-solving',
      'cross-domain',
      'resilience',
      'adapt',
      'pivot',
    ],
    evidenceTypes: ['SIMULATION_THREAD', 'TEACHBACK_SESSION', 'TOOL_USAGE'],
    sourceKeywords: ['adapt', 'novel', 'scenario', 'transfer', 'pivot'],
    defaultBloomFloor: 4,
    suggestions: [
      {
        label: 'Try a new scenario',
        description: 'Novel conditions are the clearest way to build adaptability evidence.',
        href: '/campus',
      },
      {
        label: 'Switch Study Buddy modes',
        description: 'Practice transfer by moving between quiz, teach-back, and Socratic work.',
        href: '/study',
      },
    ],
  },
};

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function roundUnit(value: number): number {
  return Math.round(Math.max(0, Math.min(1, value)) * 1000) / 1000;
}

function weightedAverage(
  values: Array<{ score: number | null | undefined; weight: number }>
): number | null {
  const scored = values
    .map((value) => ({
      score:
        typeof value.score === 'number' && Number.isFinite(value.score)
          ? roundUnit(value.score)
          : null,
      weight: value.weight > 0 ? value.weight : 1,
    }))
    .filter((value): value is { score: number; weight: number } => value.score != null);

  if (scored.length === 0) return null;

  const totalWeight = scored.reduce((sum, value) => sum + value.weight, 0);
  if (totalWeight === 0) return null;

  return roundUnit(
    scored.reduce((sum, value) => sum + value.score * value.weight, 0) / totalWeight
  );
}

function scoreToLevel(score: number): CompetencyLevel {
  if (score >= COMPETENCY_THRESHOLDS.Expert) return 'Expert';
  if (score >= COMPETENCY_THRESHOLDS.Advanced) return 'Advanced';
  if (score >= COMPETENCY_THRESHOLDS.Proficient) return 'Proficient';
  return 'Developing';
}

function titleizeConcept(concept: string): string {
  return concept
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function textMatchesTerms(text: string, terms: string[]): boolean {
  const normalized = normalizeText(text);
  return terms.some((term) => {
    const normalizedTerm = normalizeText(term);
    if (!normalizedTerm) return false;
    return normalized.includes(normalizedTerm);
  });
}

function averageEvidenceComponent(evidence: EvidenceRecord): number | null {
  if (typeof evidence.facultyScore === 'number') {
    return roundUnit(evidence.facultyScore);
  }

  return weightedAverage([
    { score: evidence.aiProcessScore, weight: 1 },
    { score: evidence.aiCoherenceScore, weight: 1 },
    { score: evidence.aiDepthScore, weight: 1 },
  ]);
}

function applyMasteryDecayAt(mastery: MasteryRecord, referenceDate: Date): number {
  const days = (referenceDate.getTime() - mastery.lastSeenAt.getTime()) / (1000 * 60 * 60 * 24);
  const effective = mastery.masteryLevel * Math.pow(0.5, Math.max(0, days) / HALF_LIFE_DAYS);
  return roundUnit(effective);
}

function buildDecayProjection(
  masteries: MasteryRecord[],
  evidenceScore: number | null
): CompetencyDecayPoint[] {
  const labels = [
    { label: 'Now', days: 0 },
    { label: '30d', days: 30 },
    { label: '60d', days: 60 },
    { label: '90d', days: 90 },
    { label: '120d', days: 120 },
  ];

  return labels.map((point) => {
    const referenceDate = new Date(Date.now() + point.days * DAY_MS);
    const masteryScore = weightedAverage(
      masteries.map((mastery) => ({
        score: applyMasteryDecayAt(mastery, referenceDate),
        weight: Math.max(1, mastery.encounterCount),
      }))
    );

    const blended = blendSignals(
      masteryScore,
      evidenceScore,
      masteries.length,
      evidenceScore == null ? 0 : 1
    );

    return {
      label: point.label,
      score: blended,
    };
  });
}

function blendSignals(
  masteryScore: number | null,
  evidenceScore: number | null,
  masteryCount: number,
  evidenceCount: number
): number {
  if (masteryScore == null && evidenceScore == null) return 0;
  if (masteryScore == null) return roundUnit(evidenceScore ?? 0);
  if (evidenceScore == null) return roundUnit(masteryScore);

  const masteryWeight = masteryCount > 0 ? 0.65 : 0;
  const evidenceWeight = evidenceCount > 0 ? 0.35 : 0;
  const normalizedWeight = masteryWeight + evidenceWeight || 1;

  return roundUnit(
    (masteryScore * masteryWeight + evidenceScore * evidenceWeight) / normalizedWeight
  );
}

function computeTrend(masteries: MasteryRecord[], evidence: EvidenceRecord[]): CompetencyTrend {
  const points = [
    ...masteries.map((mastery) => ({
      score: applyMasteryDecay(mastery as unknown as StudentConceptMastery),
      date: mastery.lastSeenAt,
    })),
    ...evidence
      .map((item) => ({
        score: averageEvidenceComponent(item),
        date: item.createdAt,
      }))
      .filter((point): point is { score: number; date: Date } => point.score != null),
  ].sort((left, right) => left.date.getTime() - right.date.getTime());

  if (points.length < 2) return 'stable';

  const midpoint = Math.ceil(points.length / 2);
  const firstHalf = points.slice(0, midpoint);
  const secondHalf = points.slice(midpoint);
  const firstAverage =
    firstHalf.reduce((sum, point) => sum + point.score, 0) / Math.max(1, firstHalf.length);
  const secondAverage =
    secondHalf.reduce((sum, point) => sum + point.score, 0) / Math.max(1, secondHalf.length);
  const delta = secondAverage - firstAverage;

  if (delta > 0.08) return 'improving';
  if (delta < -0.08) return 'declining';
  return 'stable';
}

function defaultBloomFloorForEvidence(evidenceType: EvidenceType): number {
  switch (evidenceType) {
    case 'TEACHBACK_SESSION':
    case 'DEBATE_SESSION':
    case 'FISHBOWL_SESSION':
      return 4;
    case 'SIMULATION_THREAD':
      return 4;
    case 'SANDY_TRANSCRIPT':
    case 'PEER_REVIEW_SESSION':
    case 'TOOL_USAGE':
      return 3;
    case 'FLASHCARD_MASTERY':
    case 'CONCEPT_MASTERY':
      return 2;
    case 'STUDENT_ANNOTATION':
      return 3;
    default:
      return 1;
  }
}

function deriveEvidenceLink(evidence: EvidenceRecord): { label: string; href: string } | null {
  if (
    evidence.evidenceType === 'SIMULATION_THREAD' ||
    evidence.evidenceType === 'TEACHBACK_SESSION' ||
    evidence.evidenceType === 'DEBATE_SESSION' ||
    evidence.evidenceType === 'FISHBOWL_SESSION' ||
    evidence.evidenceType === 'PEER_REVIEW_SESSION'
  ) {
    return {
      label: 'Open session',
      href: `/join-room/${evidence.sourceId}`,
    };
  }

  if (evidence.evidenceType === 'TOOL_USAGE') {
    return {
      label: 'Open tool',
      href: `/tools/${evidence.sourceId}`,
    };
  }

  if (evidence.gradebookEntry.submission.assignment.id) {
    return {
      label: 'Open assignment',
      href: `/assignments/${evidence.gradebookEntry.submission.assignment.id}`,
    };
  }

  if (
    evidence.evidenceType === 'FLASHCARD_MASTERY' ||
    evidence.evidenceType === 'CONCEPT_MASTERY' ||
    evidence.evidenceType === 'STUDENT_ANNOTATION'
  ) {
    return {
      label: 'Open Study Buddy',
      href: '/study',
    };
  }

  return null;
}

function masteryMatchesCompetency(
  mastery: MasteryRecord,
  definition: CompetencyDefinition
): boolean {
  return textMatchesTerms(mastery.concept, definition.concepts);
}

function evidenceMatchesCompetency(
  evidence: EvidenceRecord,
  definition: CompetencyDefinition,
  session: SessionRecord | null
): boolean {
  if (definition.evidenceTypes.includes(evidence.evidenceType)) {
    return true;
  }

  const combinedText = [
    evidence.sourceLabel,
    evidence.gradebookEntry.submission.assignment.title,
    session?.conceptsTouched.join(' ') ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    textMatchesTerms(combinedText, definition.sourceKeywords) ||
    textMatchesTerms(combinedText, definition.concepts)
  );
}

function buildMasteryEvidenceItem(
  mastery: MasteryRecord,
  courseMap: Map<string, CourseSummary>
): CompetencyEvidenceItem {
  const courseId = mastery.firstCourseId ?? mastery.coursesEncountered[0] ?? null;
  const course = courseId ? (courseMap.get(courseId) ?? mastery.firstCourse) : mastery.firstCourse;
  const effectiveScore = applyMasteryDecay(mastery as unknown as StudentConceptMastery);

  return {
    id: `mastery:${mastery.concept}`,
    kind: 'mastery',
    label: titleizeConcept(mastery.concept),
    sourceLabel: `Concept mastery: ${titleizeConcept(mastery.concept)}`,
    evidenceType: 'CONCEPT_MASTERY',
    score: effectiveScore,
    rawScore: roundUnit(mastery.masteryLevel),
    weight: Math.max(1, mastery.encounterCount),
    courseName: course ? `${course.courseCode} · ${course.title}` : null,
    occurredAt: mastery.lastSeenAt.toISOString(),
    note: `${mastery.successCount}/${mastery.encounterCount} successful encounters`,
    link: {
      label: 'Open Study Buddy',
      href: '/study',
    },
  };
}

function buildAssessmentEvidenceItem(
  evidence: EvidenceRecord,
  courseMap: Map<string, CourseSummary>
): CompetencyEvidenceItem {
  const assignment = evidence.gradebookEntry.submission.assignment;
  const course = courseMap.get(assignment.courseId) ?? assignment.course;
  const score = averageEvidenceComponent(evidence);

  return {
    id: evidence.id,
    kind: 'assessment',
    label: evidence.sourceLabel,
    sourceLabel: evidence.sourceLabel,
    evidenceType: evidence.evidenceType,
    score,
    rawScore: score,
    weight: evidence.weight,
    courseName: course ? `${course.courseCode} · ${course.title}` : null,
    occurredAt: evidence.createdAt.toISOString(),
    note: evidence.facultyNotes ?? evidence.aiScoringRationale ?? null,
    link: deriveEvidenceLink(evidence),
  };
}

function buildPortfolioSummary(competencies: CompetencyRecordDetail[]) {
  const sorted = [...competencies].sort((left, right) => right.score - left.score);

  return {
    strongestCompetency: sorted[0]?.competency ?? null,
    weakestCompetency: sorted.at(-1)?.competency ?? null,
    totalEvidenceCount: competencies.reduce((sum, competency) => sum + competency.evidenceCount, 0),
    improvingCount: competencies.filter((competency) => competency.trend === 'improving').length,
  };
}

function buildPortfolioGaps(competencies: CompetencyRecordDetail[]): CompetencyGap[] {
  return competencies
    .filter(
      (competency) =>
        competency.score < COMPETENCY_THRESHOLDS.Proficient || competency.evidenceCount < 3
    )
    .map((competency) => ({
      competency: competency.competency,
      score: competency.score,
      evidenceCount: competency.evidenceCount,
      reason: (competency.score < COMPETENCY_THRESHOLDS.Proficient ? 'low_score' : 'low_evidence') as CompetencyGap['reason'],
      suggestions: competency.suggestions,
    }))
    .sort((left, right) => left.score - right.score);
}

async function loadPortfolioSignals(userId: string): Promise<{
  masteries: MasteryRecord[];
  evidence: EvidenceRecord[];
  sessionsById: Map<string, SessionRecord>;
  courseMap: Map<string, CourseSummary>;
}> {
  const masteries = await prisma.studentConceptMastery.findMany({
    where: { userId },
    select: {
      concept: true,
      encounterCount: true,
      successCount: true,
      failCount: true,
      masteryLevel: true,
      coursesEncountered: true,
      firstCourseId: true,
      firstSeenAt: true,
      lastSeenAt: true,
      firstCourse: {
        select: {
          id: true,
          courseCode: true,
          title: true,
        },
      },
    },
  });

  const evidence = await prisma.assessmentEvidence.findMany({
    where: {
      gradebookEntry: {
        submission: {
          studentId: userId,
        },
      },
    },
    select: {
      id: true,
      evidenceType: true,
      sourceId: true,
      sourceLabel: true,
      aiProcessScore: true,
      aiCoherenceScore: true,
      aiDepthScore: true,
      aiScoringRationale: true,
      facultyScore: true,
      facultyNotes: true,
      weight: true,
      createdAt: true,
      gradebookEntry: {
        select: {
          submission: {
            select: {
              assignment: {
                select: {
                  id: true,
                  title: true,
                  courseId: true,
                  course: {
                    select: {
                      id: true,
                      courseCode: true,
                      title: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const sessionIds = [
    ...new Set(
      evidence
        .filter((item) => item.evidenceType === 'SANDY_TRANSCRIPT')
        .map((item) => item.sourceId)
    ),
  ];

  const sessions = sessionIds.length
    ? await prisma.toolSession.findMany({
        where: { id: { in: sessionIds } },
        select: {
          id: true,
          bloomLevel: true,
          conceptsTouched: true,
          courseId: true,
          startedAt: true,
          score: true,
          notes: true,
          course: {
            select: {
              id: true,
              courseCode: true,
              title: true,
            },
          },
        },
      })
    : [];

  const courseIds = new Set<string>();
  masteries.forEach((mastery) => {
    mastery.coursesEncountered.forEach((courseId) => courseIds.add(courseId));
    if (mastery.firstCourseId) courseIds.add(mastery.firstCourseId);
  });
  evidence.forEach((item) => courseIds.add(item.gradebookEntry.submission.assignment.courseId));
  sessions.forEach((session) => {
    if (session.courseId) courseIds.add(session.courseId);
  });

  const courses = courseIds.size
    ? await prisma.course.findMany({
        where: { id: { in: [...courseIds] } },
        select: {
          id: true,
          courseCode: true,
          title: true,
        },
      })
    : [];

  return {
    masteries,
    evidence,
    sessionsById: new Map(sessions.map((session) => [session.id, session])),
    courseMap: new Map(courses.map((course) => [course.id, course])),
  };
}

function buildCompetencyDetails(input: {
  records: Array<
    Pick<
      CompetencyRecord,
      | 'competency'
      | 'category'
      | 'level'
      | 'score'
      | 'evidenceCount'
      | 'courseIds'
      | 'evidenceIds'
      | 'conceptSlugs'
      | 'bloomHighWater'
      | 'firstDemonstrated'
      | 'lastDemonstrated'
      | 'decayedScore'
    >
  >;
  masteries: MasteryRecord[];
  evidence: EvidenceRecord[];
  courseMap: Map<string, CourseSummary>;
}): CompetencyRecordDetail[] {
  return input.records
    .map((record) => {
      const definition = COMPETENCY_DEFINITIONS[record.competency];
      const relevantMasteries = input.masteries.filter((mastery) =>
        record.conceptSlugs.includes(mastery.concept)
      );
      const relevantEvidence = input.evidence.filter((evidence) =>
        record.evidenceIds.includes(evidence.id)
      );

      const trend = computeTrend(relevantMasteries, relevantEvidence);
      const evidence = [
        ...relevantEvidence.map((item) => buildAssessmentEvidenceItem(item, input.courseMap)),
        ...relevantMasteries.map((mastery) => buildMasteryEvidenceItem(mastery, input.courseMap)),
      ].sort(
        (left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime()
      );

      return {
        competency: record.competency,
        category: (definition?.category ?? record.category) as CompetencyCategory,
        level: scoreToLevel(record.decayedScore ?? record.score),
        score: roundUnit(record.decayedScore ?? record.score),
        rawScore: roundUnit(record.score),
        decayedScore: roundUnit(record.decayedScore ?? record.score),
        evidenceCount: record.evidenceCount,
        courseIds: record.courseIds,
        courseNames: record.courseIds
          .map((courseId) => input.courseMap.get(courseId))
          .filter((course): course is CourseSummary => course != null)
          .map((course) => `${course.courseCode} · ${course.title}`),
        evidenceIds: record.evidenceIds,
        conceptSlugs: record.conceptSlugs,
        bloomHighWater: record.bloomHighWater ?? definition?.defaultBloomFloor ?? 1,
        trend,
        firstDemonstrated: record.firstDemonstrated.toISOString(),
        lastDemonstrated: record.lastDemonstrated.toISOString(),
        decayProjection: buildDecayProjection(
          relevantMasteries,
          weightedAverage(
            relevantEvidence.map((item) => ({
              score: averageEvidenceComponent(item),
              weight: item.weight,
            }))
          )
        ),
        evidence,
        suggestions: definition?.suggestions ?? [],
      };
    })
    .sort((left, right) => right.score - left.score);
}

async function hydratePortfolioFromRecords(
  userId: string,
  records: Array<
    Pick<
      CompetencyRecord,
      | 'competency'
      | 'category'
      | 'level'
      | 'score'
      | 'evidenceCount'
      | 'courseIds'
      | 'evidenceIds'
      | 'conceptSlugs'
      | 'bloomHighWater'
      | 'firstDemonstrated'
      | 'lastDemonstrated'
      | 'decayedScore'
      | 'computedAt'
    >
  >
): Promise<CompetencyPortfolioPayload> {
  const allEvidenceIds = [...new Set(records.flatMap((record) => record.evidenceIds))];
  const allConceptSlugs = [...new Set(records.flatMap((record) => record.conceptSlugs))];
  const allCourseIds = [...new Set(records.flatMap((record) => record.courseIds))];

  const [masteries, evidence, courses] = await Promise.all([
    allConceptSlugs.length
      ? prisma.studentConceptMastery.findMany({
          where: {
            userId,
            concept: { in: allConceptSlugs },
          },
          select: {
            concept: true,
            encounterCount: true,
            successCount: true,
            failCount: true,
            masteryLevel: true,
            coursesEncountered: true,
            firstCourseId: true,
            firstSeenAt: true,
            lastSeenAt: true,
            firstCourse: {
              select: {
                id: true,
                courseCode: true,
                title: true,
              },
            },
          },
        })
      : Promise.resolve([]),
    allEvidenceIds.length
      ? prisma.assessmentEvidence.findMany({
          where: {
            id: { in: allEvidenceIds },
            gradebookEntry: {
              submission: {
                studentId: userId,
              },
            },
          },
          select: {
            id: true,
            evidenceType: true,
            sourceId: true,
            sourceLabel: true,
            aiProcessScore: true,
            aiCoherenceScore: true,
            aiDepthScore: true,
            aiScoringRationale: true,
            facultyScore: true,
            facultyNotes: true,
            weight: true,
            createdAt: true,
            gradebookEntry: {
              select: {
                submission: {
                  select: {
                    assignment: {
                      select: {
                        id: true,
                        title: true,
                        courseId: true,
                        course: {
                          select: {
                            id: true,
                            courseCode: true,
                            title: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        })
      : Promise.resolve([]),
    allCourseIds.length
      ? prisma.course.findMany({
          where: { id: { in: allCourseIds } },
          select: {
            id: true,
            courseCode: true,
            title: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const competencyDetails = buildCompetencyDetails({
    records,
    masteries: masteries as MasteryRecord[],
    evidence: evidence as EvidenceRecord[],
    courseMap: new Map(courses.map((course) => [course.id, course])),
  });

  return {
    generatedAt: records[0]?.computedAt.toISOString() ?? new Date().toISOString(),
    summary: buildPortfolioSummary(competencyDetails),
    competencies: competencyDetails,
    gaps: buildPortfolioGaps(competencyDetails),
  };
}

function getRelevantSignals(input: {
  competency: string;
  definition: CompetencyDefinition;
  masteries: MasteryRecord[];
  evidence: EvidenceRecord[];
  sessionsById: Map<string, SessionRecord>;
  courseMap: Map<string, CourseSummary>;
}): CompetencyRecordDetail | null {
  const relevantMasteries = input.masteries.filter((mastery) =>
    masteryMatchesCompetency(mastery, input.definition)
  );
  const relevantEvidence = input.evidence.filter((evidence) =>
    evidenceMatchesCompetency(
      evidence,
      input.definition,
      input.sessionsById.get(evidence.sourceId) ?? null
    )
  );

  if (relevantMasteries.length === 0 && relevantEvidence.length === 0) {
    return null;
  }

  const rawMasteryScore = weightedAverage(
    relevantMasteries.map((mastery) => ({
      score: mastery.masteryLevel,
      weight: Math.max(1, mastery.encounterCount),
    }))
  );
  const decayedMasteryScore = weightedAverage(
    relevantMasteries.map((mastery) => ({
      score: applyMasteryDecay(mastery as unknown as StudentConceptMastery),
      weight: Math.max(1, mastery.encounterCount),
    }))
  );
  const evidenceScore = weightedAverage(
    relevantEvidence.map((evidence) => ({
      score: averageEvidenceComponent(evidence),
      weight: evidence.weight,
    }))
  );

  const rawScore = blendSignals(
    rawMasteryScore,
    evidenceScore,
    relevantMasteries.length,
    relevantEvidence.length
  );
  const decayedScore = blendSignals(
    decayedMasteryScore,
    evidenceScore,
    relevantMasteries.length,
    relevantEvidence.length
  );

  const courseIds = [
    ...new Set([
      ...relevantMasteries.flatMap((mastery) => mastery.coursesEncountered),
      ...relevantEvidence.map((evidence) => evidence.gradebookEntry.submission.assignment.courseId),
    ]),
  ];

  const evidenceItems = [
    ...relevantEvidence.map((evidence) => buildAssessmentEvidenceItem(evidence, input.courseMap)),
    ...relevantMasteries.map((mastery) => buildMasteryEvidenceItem(mastery, input.courseMap)),
  ].sort(
    (left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime()
  );

  const firstDemonstrated = new Date(
    Math.min(
      ...[
        ...relevantMasteries.map((mastery) => mastery.firstSeenAt.getTime()),
        ...relevantEvidence.map((evidence) => evidence.createdAt.getTime()),
      ]
    )
  );
  const lastDemonstrated = new Date(
    Math.max(
      ...[
        ...relevantMasteries.map((mastery) => mastery.lastSeenAt.getTime()),
        ...relevantEvidence.map((evidence) => evidence.createdAt.getTime()),
      ]
    )
  );

  const bloomHighWater = Math.max(
    input.definition.defaultBloomFloor,
    ...relevantEvidence.map((evidence) => {
      const session = input.sessionsById.get(evidence.sourceId);
      return session?.bloomLevel ?? defaultBloomFloorForEvidence(evidence.evidenceType);
    })
  );

  return {
    competency: input.competency,
    category: input.definition.category,
    level: scoreToLevel(decayedScore),
    score: decayedScore,
    rawScore,
    decayedScore,
    evidenceCount: evidenceItems.length,
    courseIds,
    courseNames: courseIds
      .map((courseId) => input.courseMap.get(courseId))
      .filter((course): course is CourseSummary => course != null)
      .map((course) => `${course.courseCode} · ${course.title}`),
    evidenceIds: relevantEvidence.map((evidence) => evidence.id),
    conceptSlugs: relevantMasteries.map((mastery) => mastery.concept),
    bloomHighWater,
    trend: computeTrend(relevantMasteries, relevantEvidence),
    firstDemonstrated: firstDemonstrated.toISOString(),
    lastDemonstrated: lastDemonstrated.toISOString(),
    decayProjection: buildDecayProjection(relevantMasteries, evidenceScore),
    evidence: evidenceItems,
    suggestions: input.definition.suggestions,
  };
}

export async function recomputePortfolio(userId: string): Promise<CompetencyPortfolioPayload> {
  const { masteries, evidence, sessionsById, courseMap } = await loadPortfolioSignals(userId);

  const competencies = Object.entries(COMPETENCY_DEFINITIONS)
    .map(([competency, definition]) =>
      getRelevantSignals({
        competency,
        definition,
        masteries,
        evidence,
        sessionsById,
        courseMap,
      })
    )
    .filter((competency): competency is CompetencyRecordDetail => competency != null)
    .sort((left, right) => right.score - left.score);

  const computedAt = new Date();

  await prisma.$transaction([
    prisma.competencyRecord.deleteMany({
      where: {
        userId,
        competency: {
          notIn: competencies.map((competency) => competency.competency),
        },
      },
    }),
    ...competencies.map((competency) =>
      prisma.competencyRecord.upsert({
        where: {
          userId_competency: {
            userId,
            competency: competency.competency,
          },
        },
        create: {
          userId,
          competency: competency.competency,
          category: competency.category,
          level: competency.level,
          score: competency.rawScore,
          evidenceCount: competency.evidenceCount,
          courseIds: competency.courseIds,
          evidenceIds: competency.evidenceIds,
          conceptSlugs: competency.conceptSlugs,
          bloomHighWater: competency.bloomHighWater,
          firstDemonstrated: new Date(competency.firstDemonstrated),
          lastDemonstrated: new Date(competency.lastDemonstrated),
          decayedScore: competency.decayedScore,
          computedAt,
        },
        update: {
          category: competency.category,
          level: competency.level,
          score: competency.rawScore,
          evidenceCount: competency.evidenceCount,
          courseIds: competency.courseIds,
          evidenceIds: competency.evidenceIds,
          conceptSlugs: competency.conceptSlugs,
          bloomHighWater: competency.bloomHighWater,
          firstDemonstrated: new Date(competency.firstDemonstrated),
          lastDemonstrated: new Date(competency.lastDemonstrated),
          decayedScore: competency.decayedScore,
          computedAt,
        },
      })
    ),
  ]);

  return {
    generatedAt: computedAt.toISOString(),
    summary: buildPortfolioSummary(competencies),
    competencies,
    gaps: buildPortfolioGaps(competencies),
  };
}

export async function getPortfolio(userId: string): Promise<CompetencyPortfolioPayload> {
  const records = await prisma.competencyRecord.findMany({
    where: { userId },
    orderBy: [{ decayedScore: 'desc' }, { score: 'desc' }],
    select: {
      competency: true,
      category: true,
      level: true,
      score: true,
      evidenceCount: true,
      courseIds: true,
      evidenceIds: true,
      conceptSlugs: true,
      bloomHighWater: true,
      firstDemonstrated: true,
      lastDemonstrated: true,
      decayedScore: true,
      computedAt: true,
    },
  });

  const oldestComputedAt =
    records.length > 0 ? Math.min(...records.map((record) => record.computedAt.getTime())) : 0;

  if (records.length === 0 || Date.now() - oldestComputedAt > DAY_MS) {
    return recomputePortfolio(userId);
  }

  return hydratePortfolioFromRecords(userId, records);
}

async function ensureFreshPortfolioRecords(userIds: string[]): Promise<void> {
  if (userIds.length === 0) return;

  const records = await prisma.competencyRecord.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, computedAt: true },
  });

  const recordMap = new Map<string, Date[]>();
  records.forEach((record) => {
    const existing = recordMap.get(record.userId) ?? [];
    existing.push(record.computedAt);
    recordMap.set(record.userId, existing);
  });

  const staleUsers = userIds.filter((userId) => {
    const computedAt = recordMap.get(userId);
    if (!computedAt || computedAt.length === 0) return true;
    return Math.min(...computedAt.map((value) => value.getTime())) < Date.now() - DAY_MS;
  });

  await Promise.all(
    staleUsers.map(async (userId) => {
      try {
        await recomputePortfolio(userId);
      } catch (error) {
        console.error('[competency-portfolio-service] Failed to recompute portfolio', {
          userId,
          error,
        });
      }
    })
  );
}

export async function getClassCompetencyDistribution(
  courseId: string
): Promise<ClassCompetencyDistributionPayload> {
  const [course, enrollments] = await Promise.all([
    prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        courseCode: true,
        title: true,
      },
    }),
    prisma.courseEnrollment.findMany({
      where: { courseId },
      select: { studentId: true },
    }),
  ]);

  if (!course) {
    throw new Error('Course not found');
  }

  const studentIds = [...new Set(enrollments.map((enrollment) => enrollment.studentId))];
  await ensureFreshPortfolioRecords(studentIds);

  const records = studentIds.length
    ? await prisma.competencyRecord.findMany({
        where: {
          userId: { in: studentIds },
          courseIds: { has: courseId },
        },
        select: {
          userId: true,
          competency: true,
          category: true,
          level: true,
          score: true,
          decayedScore: true,
          evidenceIds: true,
        },
      })
    : [];

  const evidenceIds = [...new Set(records.flatMap((record) => record.evidenceIds))];
  const evidence = evidenceIds.length
    ? await prisma.assessmentEvidence.findMany({
        where: {
          id: { in: evidenceIds },
          gradebookEntry: {
            submission: {
              assignment: {
                courseId,
              },
            },
          },
        },
        select: {
          id: true,
          sourceLabel: true,
        },
      })
    : [];
  const evidenceById = new Map(evidence.map((item) => [item.id, item]));

  const recordsByStudent = new Map<string, Map<string, (typeof records)[number]>>();
  records.forEach((record) => {
    const existing = recordsByStudent.get(record.userId) ?? new Map();
    existing.set(record.competency, record);
    recordsByStudent.set(record.userId, existing);
  });

  const distribution: ClassCompetencyDistribution[] = Object.entries(COMPETENCY_DEFINITIONS).map(
    ([competency, definition]) => {
      let developing = 0;
      let proficient = 0;
      let advanced = 0;
      let expert = 0;
      let totalScore = 0;
      const sourceCounts = new Map<string, number>();

      studentIds.forEach((studentId) => {
        const record = recordsByStudent.get(studentId)?.get(competency);
        const level = record?.level as CompetencyLevel | undefined;
        const score = roundUnit(record?.decayedScore ?? record?.score ?? 0);

        if (level === 'Expert') expert += 1;
        else if (level === 'Advanced') advanced += 1;
        else if (level === 'Proficient') proficient += 1;
        else developing += 1;

        totalScore += score;

        record?.evidenceIds.forEach((evidenceId) => {
          const source = evidenceById.get(evidenceId);
          if (!source) return;
          sourceCounts.set(source.sourceLabel, (sourceCounts.get(source.sourceLabel) ?? 0) + 1);
        });
      });

      return {
        competency,
        category: definition.category,
        developing,
        proficient,
        advanced,
        expert,
        totalStudents: studentIds.length,
        averageScore: studentIds.length > 0 ? roundUnit(totalScore / studentIds.length) : 0,
        topSources: [...sourceCounts.entries()]
          .sort((left, right) => right[1] - left[1])
          .slice(0, 3)
          .map(([label, count]) => ({ label, count })),
      };
    }
  );

  return {
    course,
    totalStudents: studentIds.length,
    generatedAt: new Date().toISOString(),
    distribution,
  };
}
