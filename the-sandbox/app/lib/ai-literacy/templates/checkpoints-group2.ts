import type { CheckpointTemplateData } from './types'

export const CHECKPOINTS_GROUP2: CheckpointTemplateData[] = [
  // ── ARTS ──────────────────────────────────────────────────────────────
  {
    disciplineFamily: 'ARTS',
    name: 'Process Journal Review',
    description:
      'Weekly documentation of creative process with visual or audio evidence. Captures iterative decision-making and artistic evolution over time.',
    gradingWeight: '20%',
    aiTier: 'FOUNDATION',
  },
  {
    disciplineFamily: 'ARTS',
    name: 'In-Studio Work Session',
    description:
      'Observed work session demonstrating hands-on skills in the studio environment. Confirms the student can execute techniques independently.',
    gradingWeight: '15%',
    aiTier: 'FOUNDATION',
  },
  {
    disciplineFamily: 'ARTS',
    name: 'Peer Critique',
    description:
      'Structured feedback session with 2 peers, graded on the quality of critique given rather than received. Develops critical vocabulary and constructive evaluation skills.',
    gradingWeight: '10%',
    aiTier: 'AWARENESS',
  },
  {
    disciplineFamily: 'ARTS',
    name: 'AI Collaboration Log',
    description:
      'Detailed log of AI interactions including prompts, outputs, and curation decisions. Documents how AI was used as a creative collaborator and what was kept, modified, or rejected.',
    gradingWeight: '10%',
    aiTier: 'PARTNERSHIP',
  },
  {
    disciplineFamily: 'ARTS',
    name: 'Artist Statement Draft',
    description:
      'Mid-project statement connecting creative process to the emerging outcome. Articulates intent, influences, and the role of tools in shaping the work.',
    gradingWeight: '10%',
    aiTier: 'PARTNERSHIP',
  },
  {
    disciplineFamily: 'ARTS',
    name: 'Exhibition/Performance Defense',
    description:
      'Present final work with oral explanation of creative choices, AI role, and artistic intent. Tests the student\'s ability to contextualize and defend their creative vision.',
    gradingWeight: '20%',
    aiTier: 'FLUENCY',
  },

  // ── PROFESSIONAL ────────────────────────────────────────────────────
  {
    disciplineFamily: 'PROFESSIONAL',
    name: 'Professional Simulation',
    description:
      'In-class roleplay of a professional scenario such as a client meeting or patient intake. Assesses applied communication and decision-making under realistic conditions.',
    gradingWeight: '20%',
    aiTier: 'FOUNDATION',
  },
  {
    disciplineFamily: 'PROFESSIONAL',
    name: 'Ethics Framework Application',
    description:
      'Written application of a professional code of ethics to a specific scenario. Demonstrates the ability to reason through ethical obligations and competing interests.',
    gradingWeight: '15%',
    aiTier: 'FOUNDATION',
  },
  {
    disciplineFamily: 'PROFESSIONAL',
    name: 'AI Audit Trail',
    description:
      'Document AI interactions with prompts, outputs, and your edits or decisions at each step. Builds habits of transparency and professional accountability in AI-assisted work.',
    gradingWeight: '10%',
    aiTier: 'AWARENESS',
  },
  {
    disciplineFamily: 'PROFESSIONAL',
    name: 'Peer Consultation',
    description:
      'Present analysis to a peer acting as a colleague and incorporate their feedback into the final deliverable. Develops collaborative professional judgment.',
    gradingWeight: '15%',
    aiTier: 'PARTNERSHIP',
  },
  {
    disciplineFamily: 'PROFESSIONAL',
    name: 'Stakeholder Impact Assessment',
    description:
      'Written assessment of how a recommendation affects each stakeholder group. Evaluates systemic thinking and the ability to anticipate downstream consequences.',
    gradingWeight: '10%',
    aiTier: 'PARTNERSHIP',
  },
  {
    disciplineFamily: 'PROFESSIONAL',
    name: 'Professional Portfolio Defense',
    description:
      'Present complete workflow to peers acting as supervisors, defending AI usage decisions and professional judgment. Tests holistic integration of tools, ethics, and expertise.',
    gradingWeight: '15%',
    aiTier: 'FLUENCY',
  },

  // ── HEALTH SCIENCES ─────────────────────────────────────────────────
  {
    disciplineFamily: 'HEALTH_SCIENCES',
    name: 'Initial Differential (In-Class)',
    description:
      'Generate a differential diagnosis without AI or references under timed, closed-book conditions. Establishes a baseline of independent clinical reasoning.',
    gradingWeight: '15%',
    aiTier: 'FOUNDATION',
  },
  {
    disciplineFamily: 'HEALTH_SCIENCES',
    name: 'Clinical Reasoning Defense',
    description:
      'Oral defense of a treatment plan with attending faculty, probing rationale and alternatives. Confirms the student can justify clinical decisions under questioning.',
    gradingWeight: '25%',
    aiTier: 'FOUNDATION',
  },
  {
    disciplineFamily: 'HEALTH_SCIENCES',
    name: 'Evidence Quality Audit',
    description:
      'Rate each cited study on validity, applicability, and relevance to the clinical question. Develops critical appraisal skills essential for evidence-based practice.',
    gradingWeight: '10%',
    aiTier: 'AWARENESS',
  },
  {
    disciplineFamily: 'HEALTH_SCIENCES',
    name: 'AI Verification Log',
    description:
      'Document every AI output used and how it was verified against authoritative clinical sources. Ensures AI recommendations are cross-checked before informing patient care.',
    gradingWeight: '15%',
    aiTier: 'PARTNERSHIP',
  },
  {
    disciplineFamily: 'HEALTH_SCIENCES',
    name: 'Patient Safety Checklist',
    description:
      'Complete a structured safety checklist reviewing AI recommendations for potential patient harm. Embeds systematic safety review into the AI-assisted clinical workflow.',
    gradingWeight: '10%',
    aiTier: 'PARTNERSHIP',
  },
  {
    disciplineFamily: 'HEALTH_SCIENCES',
    name: 'Interprofessional Debrief',
    description:
      'Post-case debrief with peers from other health professions discussing AI\'s role in clinical decision-making. Builds interprofessional communication and shared accountability.',
    gradingWeight: '10%',
    aiTier: 'FLUENCY',
  },
]
