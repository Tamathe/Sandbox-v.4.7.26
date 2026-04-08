import type { CheckpointTemplateData } from './types'

export const CHECKPOINTS_GROUP1: CheckpointTemplateData[] = [
  // ── STEM ──────────────────────────────────────────────────────────────
  {
    disciplineFamily: 'STEM',
    name: 'Lab Notebook Audit',
    description:
      'Review handwritten lab notes against the typed report for consistency. Identifies gaps between raw observations and polished write-ups.',
    gradingWeight: '15%',
    aiTier: 'FOUNDATION',
  },
  {
    disciplineFamily: 'STEM',
    name: 'In-Class Problem Verification',
    description:
      'Randomly select 2 homework problems for the student to re-solve in class under timed conditions. Confirms independent problem-solving ability.',
    gradingWeight: '20%',
    aiTier: 'FOUNDATION',
  },
  {
    disciplineFamily: 'STEM',
    name: 'Method Explanation',
    description:
      'Student explains their approach to 1 problem orally during office hours. Assesses conceptual understanding beyond written solutions.',
    gradingWeight: '10%',
    aiTier: 'AWARENESS',
  },
  {
    disciplineFamily: 'STEM',
    name: 'AI Usage Documentation Review',
    description:
      'Review the quality and honesty of the student\'s AI documentation logs. Evaluates transparency in how AI tools were used during assignments.',
    gradingWeight: '10%',
    aiTier: 'PARTNERSHIP',
  },
  {
    disciplineFamily: 'STEM',
    name: 'Peer Code/Lab Review',
    description:
      'Structured peer review of a lab report or code submission with written feedback. Builds critical evaluation skills and collaborative learning.',
    gradingWeight: '10%',
    aiTier: 'PARTNERSHIP',
  },
  {
    disciplineFamily: 'STEM',
    name: 'Oral Defense of Final Project',
    description:
      '5-minute presentation defending methodology, results, and AI usage decisions. Tests deep understanding and the ability to justify technical choices.',
    gradingWeight: '20%',
    aiTier: 'FLUENCY',
  },

  // ── HUMANITIES ────────────────────────────────────────────────────────
  {
    disciplineFamily: 'HUMANITIES',
    name: 'Annotated Outline Check',
    description:
      'Submit an outline with a 2-sentence justification per source before drafting begins. Ensures intentional source selection and early argumentation.',
    gradingWeight: '15%',
    aiTier: 'FOUNDATION',
  },
  {
    disciplineFamily: 'HUMANITIES',
    name: 'Peer Review Exchange',
    description:
      'Provide written feedback on a classmate\'s draft, graded on the quality and depth of the critique. Develops analytical reading and constructive evaluation skills.',
    gradingWeight: '10%',
    aiTier: 'FOUNDATION',
  },
  {
    disciplineFamily: 'HUMANITIES',
    name: 'Revision Reflection',
    description:
      '300-word reflection on how peer and instructor feedback changed the argument. Demonstrates metacognitive awareness of the revision process.',
    gradingWeight: '10%',
    aiTier: 'AWARENESS',
  },
  {
    disciplineFamily: 'HUMANITIES',
    name: 'Process Portfolio Milestone',
    description:
      'Submit evidence of drafting stages with AI interaction logs at each stage. Documents the evolution of ideas and responsible AI integration throughout the writing process.',
    gradingWeight: '15%',
    aiTier: 'PARTNERSHIP',
  },
  {
    disciplineFamily: 'HUMANITIES',
    name: 'In-Class Writing Sample',
    description:
      '20-minute timed writing on a related topic to calibrate the student\'s voice baseline. Provides an authentic reference point for evaluating submitted work.',
    gradingWeight: '10%',
    aiTier: 'AWARENESS',
  },
  {
    disciplineFamily: 'HUMANITIES',
    name: 'Argumentation Defense',
    description:
      'Oral defense of the thesis with Q&A probing depth of understanding. Confirms the student can articulate and defend their argument extemporaneously.',
    gradingWeight: '15%',
    aiTier: 'FLUENCY',
  },

  // ── SOCIAL SCIENCES ──────────────────────────────────────────────────
  {
    disciplineFamily: 'SOCIAL_SCIENCES',
    name: 'Source Audit Submission',
    description:
      'Evaluate 8 sources for reliability, bias, and relevance before writing begins. Builds critical information literacy and source vetting habits.',
    gradingWeight: '15%',
    aiTier: 'FOUNDATION',
  },
  {
    disciplineFamily: 'SOCIAL_SCIENCES',
    name: 'Methods Justification Memo',
    description:
      'Written memo explaining why this research method was chosen over alternatives. Demonstrates methodological reasoning and awareness of trade-offs.',
    gradingWeight: '10%',
    aiTier: 'FOUNDATION',
  },
  {
    disciplineFamily: 'SOCIAL_SCIENCES',
    name: 'Data Collection Progress Report',
    description:
      'Mid-project check-in documenting the data collection process and challenges encountered. Ensures ongoing engagement and surfaces issues early.',
    gradingWeight: '10%',
    aiTier: 'AWARENESS',
  },
  {
    disciplineFamily: 'SOCIAL_SCIENCES',
    name: 'AI Analysis Comparison Log',
    description:
      'Side-by-side documentation of the student\'s analysis versus AI-generated analysis with critical evaluation. Develops the ability to assess and integrate AI outputs thoughtfully.',
    gradingWeight: '15%',
    aiTier: 'PARTNERSHIP',
  },
  {
    disciplineFamily: 'SOCIAL_SCIENCES',
    name: 'Peer Methodology Review',
    description:
      'Review a classmate\'s research design and provide written methodological feedback. Strengthens research design skills through collaborative critique.',
    gradingWeight: '10%',
    aiTier: 'PARTNERSHIP',
  },
  {
    disciplineFamily: 'SOCIAL_SCIENCES',
    name: 'Oral Defense of Findings',
    description:
      '10-minute presentation defending methodology, findings, and AI usage decisions. Tests the student\'s ability to communicate and justify their research holistically.',
    gradingWeight: '20%',
    aiTier: 'FLUENCY',
  },
]
