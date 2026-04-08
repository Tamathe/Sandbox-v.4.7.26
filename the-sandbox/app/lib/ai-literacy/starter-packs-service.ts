/**
 * Discipline Starter Packs — pre-built AI literacy bundles per DisciplineFamily.
 * Each pack includes a policy template, 3 assignment redesigns, and 3 process checkpoints.
 */

import { prisma } from '../prisma'
import type { AIStance, DisciplineFamily } from '../../generated/prisma'
import { generatePolicy, type AssignmentAILevel } from '../policy-builder-service'

export interface StarterPackAssignment {
  title: string
  originalFormat: string
  redesignedFormat: string
  aiLevel: AssignmentAILevel
  description: string
}

export interface StarterPackCheckpoint {
  name: string
  description: string
  gradingWeight: string
}

export interface StarterPack {
  id: string
  disciplineFamily: DisciplineFamily
  label: string
  description: string
  defaultStance: AIStance
  assignments: StarterPackAssignment[]
  checkpoints: StarterPackCheckpoint[]
  policyExcerpt: string
}

export const STARTER_PACKS: StarterPack[] = [
  {
    id: 'stem-pack',
    disciplineFamily: 'STEM',
    label: 'STEM Lab & Problem Set Pack',
    description: 'For science, math, engineering, and technology courses. Emphasizes in-class verification and AI-as-tool workflows.',
    defaultStance: 'GUIDED',
    assignments: [
      {
        title: 'Lab Report with AI Comparison',
        originalFormat: 'Standard lab report',
        redesignedFormat: 'Write your analysis, then compare with AI-generated version. Grade the comparison.',
        aiLevel: 'GUIDED',
        description: 'Students write their own Discussion section, prompt AI to write one, then submit a comparative analysis evaluating what AI got right and wrong about their specific data.',
      },
      {
        title: 'Hybrid Problem Set',
        originalFormat: 'Take-home problem set',
        redesignedFormat: 'Routine problems at home (AI OK), conceptual problems in class.',
        aiLevel: 'LIMITED',
        description: 'Part A (take-home, AI permitted): computation problems. Part B (in-class, no devices): conceptual problems requiring explanation of WHY the method works. Part B weighted 70%.',
      },
      {
        title: 'Process-Based Research Poster',
        originalFormat: 'End-of-semester research paper',
        redesignedFormat: 'Staged poster with oral defense and checkpoint submissions.',
        aiLevel: 'GUIDED',
        description: '4 checkpoints: topic proposal → annotated bibliography → poster draft → final poster with 5-minute oral defense. AI use documented at each stage.',
      },
    ],
    checkpoints: [
      { name: 'Lab Notebook Audit', description: 'Review handwritten lab notes vs. typed report for consistency.', gradingWeight: '15%' },
      { name: 'In-Class Problem Verification', description: 'Randomly select 2 homework problems for in-class re-solve.', gradingWeight: '20%' },
      { name: 'Method Explanation', description: 'Student explains their approach to 1 problem orally in office hours.', gradingWeight: '10%' },
    ],
    policyExcerpt: 'AI tools may be used for computation, debugging, and brainstorming in this course. All AI use must be documented. In-class work and oral components cannot involve AI assistance.',
  },
  {
    id: 'humanities-pack',
    disciplineFamily: 'HUMANITIES',
    label: 'Humanities Essay & Analysis Pack',
    description: 'For literature, history, philosophy, and language courses. Emphasizes process visibility and original argumentation.',
    defaultStance: 'CAUTIOUS',
    assignments: [
      {
        title: 'Process Portfolio Essay',
        originalFormat: 'Take-home essay',
        redesignedFormat: '4-stage portfolio: brainstorm → outline → peer-reviewed draft → final with change log.',
        aiLevel: 'LIMITED',
        description: 'Week 1: 3 thesis statements with rationale. Week 3: Annotated outline with source justifications. Week 5: Full draft for peer review. Week 7: Final with tracked changes and 300-word process reflection.',
      },
      {
        title: 'Close Reading with Textual Evidence',
        originalFormat: 'Reading response',
        redesignedFormat: 'Passage-specific analysis with page citations and in-class discussion tie-in.',
        aiLevel: 'PROHIBITED',
        description: 'Select a 200-word passage. Analyze: word choice, rhetorical strategy, historical context. All claims must cite specific page numbers. In-class: share analysis with partner, compare interpretations.',
      },
      {
        title: 'Socratic Dialogue Journal',
        originalFormat: 'Weekly reading response',
        redesignedFormat: 'Question → attempt → uncertainty format.',
        aiLevel: 'LIMITED',
        description: 'Each entry: (1) a genuine question the reading raised, (2) an attempted answer with evidence, (3) what you\'re still unsure about and why. In class: share questions, compare answers.',
      },
    ],
    checkpoints: [
      { name: 'Annotated Outline Check', description: 'Submit outline with 2-sentence justification per source.', gradingWeight: '15%' },
      { name: 'Peer Review Exchange', description: 'Written feedback on classmate\'s draft; graded for quality of critique.', gradingWeight: '10%' },
      { name: 'Revision Reflection', description: '300-word reflection on how feedback changed the argument.', gradingWeight: '10%' },
    ],
    policyExcerpt: 'AI tools may be used only for grammar checking and brainstorming. All substantive content — arguments, analysis, and interpretation — must be entirely your own. Close readings and in-class work are AI-free.',
  },
  {
    id: 'social-sciences-pack',
    disciplineFamily: 'SOCIAL_SCIENCES',
    label: 'Social Sciences Research & Methods Pack',
    description: 'For psychology, sociology, political science, and economics courses. Balances methodological rigor with AI literacy.',
    defaultStance: 'GUIDED',
    assignments: [
      {
        title: 'Staged Research Project with Oral Defense',
        originalFormat: 'Research paper',
        redesignedFormat: '5-checkpoint project culminating in oral defense.',
        aiLevel: 'GUIDED',
        description: 'Proposal → source audit (8 sources evaluated for reliability/bias) → methods section → full draft → 10-min oral defense. AI use documented at each stage; defense questions probe methodology.',
      },
      {
        title: 'Data Interpretation Challenge',
        originalFormat: 'Problem set with data tables',
        redesignedFormat: 'In-class data analysis with AI-generated comparison.',
        aiLevel: 'GUIDED',
        description: 'Students analyze a dataset in class (no devices). Then at home, prompt AI to analyze the same data. Submit: your analysis, AI analysis, and a comparison identifying where AI missed context or nuance.',
      },
      {
        title: 'Case Study with Personal Stake',
        originalFormat: 'Case study analysis',
        redesignedFormat: 'Analysis tied to student\'s personal experience or local context.',
        aiLevel: 'LIMITED',
        description: 'Apply the theoretical framework to a case from your own community or experience. Include: what the theory predicts, what actually happened, and why the gap exists. AI can help with theory summary but not personal analysis.',
      },
    ],
    checkpoints: [
      { name: 'Source Audit', description: 'Evaluate 8 sources for reliability, bias, and relevance before writing.', gradingWeight: '15%' },
      { name: 'Methods Justification', description: 'Explain why you chose this method over alternatives.', gradingWeight: '10%' },
      { name: 'Oral Defense', description: '10-min presentation defending your methodology and conclusions.', gradingWeight: '20%' },
    ],
    policyExcerpt: 'AI tools may be used with full disclosure. For each assignment, describe which tools you used, what for, and how you verified the output. Methodological sections and oral defenses must reflect your own understanding.',
  },
  {
    id: 'arts-pack',
    disciplineFamily: 'ARTS',
    label: 'Arts & Creative Practice Pack',
    description: 'For fine arts, music, theater, and design courses. Centers process documentation and embodied practice.',
    defaultStance: 'INTEGRATE',
    assignments: [
      {
        title: 'Creative Process Documentation',
        originalFormat: 'Final portfolio',
        redesignedFormat: 'Documented creative journey with AI reflection points.',
        aiLevel: 'GUIDED',
        description: 'Document 5+ stages of your creative process with photos/screenshots. At each stage, note: what you tried, what worked, what you changed. If AI was used, document the prompt, output, and your editorial decisions.',
      },
      {
        title: 'AI as Creative Collaborator',
        originalFormat: 'Studio project',
        redesignedFormat: 'Intentional AI collaboration with critical reflection.',
        aiLevel: 'REQUIRED',
        description: 'Use AI as a creative partner for ideation/iteration. Submit: final work + AI collaboration log (prompts, outputs, your curation decisions) + 500-word reflection on what AI contributed vs. what required human judgment.',
      },
      {
        title: 'Live Performance/Critique',
        originalFormat: 'Written critique',
        redesignedFormat: 'In-person presentation with Q&A.',
        aiLevel: 'PROHIBITED',
        description: 'Present your work to peers. Explain your creative choices, influences, and process. Respond to 3 questions. No AI can substitute for understanding your own creative decisions.',
      },
    ],
    checkpoints: [
      { name: 'Process Journal', description: 'Weekly documentation of creative process with visual evidence.', gradingWeight: '20%' },
      { name: 'Peer Critique', description: 'Structured feedback session with 2 peers; graded for quality of critique given.', gradingWeight: '10%' },
      { name: 'Artist Statement', description: 'Final statement connecting process to outcome, referencing documented journey.', gradingWeight: '15%' },
    ],
    policyExcerpt: 'AI is a creative tool in this course, like any medium. When you use AI, document the collaboration. Your grade reflects creative judgment, process documentation, and ability to articulate your choices — not AI-free output.',
  },
  {
    id: 'professional-pack',
    disciplineFamily: 'PROFESSIONAL',
    label: 'Professional & Applied Sciences Pack',
    description: 'For business, education, nursing, engineering practice, and law courses. Emphasizes real-world AI competency.',
    defaultStance: 'INTEGRATE',
    assignments: [
      {
        title: 'AI-Augmented Case Analysis',
        originalFormat: 'Case study write-up',
        redesignedFormat: 'Use AI for initial analysis, then add professional judgment layer.',
        aiLevel: 'REQUIRED',
        description: 'Prompt AI to analyze the case. Then: identify 3 things AI got wrong or oversimplified, add context AI couldn\'t know (stakeholder relationships, organizational culture), and recommend a course of action with professional rationale.',
      },
      {
        title: 'Client/Patient Communication',
        originalFormat: 'Written communication assignment',
        redesignedFormat: 'Draft, AI-review, roleplay triad.',
        aiLevel: 'GUIDED',
        description: 'Draft a professional communication. Use AI to improve it. Then roleplay the scenario with a partner. Submit: original draft, AI-improved version, reflection on what AI improved vs. what required human sensitivity.',
      },
      {
        title: 'Ethical Scenario Analysis',
        originalFormat: 'Ethics essay',
        redesignedFormat: 'Structured ethical framework application with personal position.',
        aiLevel: 'LIMITED',
        description: 'Apply 2 ethical frameworks to the scenario. AI may help summarize frameworks but all application, conflict resolution, and personal position must be your own. Include: what your professional code says, where frameworks conflict, and your reasoned position.',
      },
    ],
    checkpoints: [
      { name: 'Professional Simulation', description: 'In-class roleplay of professional scenario.', gradingWeight: '20%' },
      { name: 'AI Audit Trail', description: 'Document AI interactions with prompts, outputs, and your edits.', gradingWeight: '10%' },
      { name: 'Peer Consultation', description: 'Present analysis to peer "colleague" and incorporate feedback.', gradingWeight: '15%' },
    ],
    policyExcerpt: 'AI tools are part of modern professional practice. You are expected to use them effectively AND critically. Document all AI use. Your grade reflects professional judgment, not just output quality.',
  },
  {
    id: 'health-sciences-pack',
    disciplineFamily: 'HEALTH_SCIENCES',
    label: 'Health Sciences Clinical & Evidence Pack',
    description: 'For medical, nursing, pharmacy, and public health courses. Prioritizes patient safety and evidence-based reasoning.',
    defaultStance: 'CAUTIOUS',
    assignments: [
      {
        title: 'Clinical Reasoning Portfolio',
        originalFormat: 'Patient case write-up',
        redesignedFormat: 'Multi-checkpoint case with differential diagnosis progression.',
        aiLevel: 'LIMITED',
        description: 'Stage 1: Initial differential (in class, no devices). Stage 2: Refine with additional history/labs. Stage 3: Final assessment with treatment plan. AI may be used for drug interaction checks only. All clinical reasoning must be your own.',
      },
      {
        title: 'Evidence Appraisal with AI Comparison',
        originalFormat: 'Literature review',
        redesignedFormat: 'Critical appraisal of AI-generated vs. self-generated evidence summaries.',
        aiLevel: 'GUIDED',
        description: 'Find 5 relevant studies yourself. Then prompt AI to find 5 studies on the same question. Compare: which studies did AI miss? Which did it include that you wouldn\'t? Evaluate quality of AI\'s summaries vs. your own. Submit both with comparative analysis.',
      },
      {
        title: 'Standardized Patient Encounter',
        originalFormat: 'Written SOAP note',
        redesignedFormat: 'Live encounter + SOAP note with decision tree.',
        aiLevel: 'PROHIBITED',
        description: 'Complete standardized patient encounter. Write SOAP note within 30 minutes (no AI). Include decision tree: what you considered, what you ruled out, and why. Evaluated by clinical faculty.',
      },
    ],
    checkpoints: [
      { name: 'Initial Differential (in-class)', description: 'Generate differential diagnosis without AI or references.', gradingWeight: '15%' },
      { name: 'Evidence Quality Audit', description: 'Rate each cited study on validity, applicability, and relevance.', gradingWeight: '10%' },
      { name: 'Clinical Reasoning Defense', description: 'Oral defense of treatment plan with attending faculty.', gradingWeight: '25%' },
    ],
    policyExcerpt: 'Patient safety requires that you develop independent clinical reasoning. AI may be used for drug references and evidence searches, but all diagnostic reasoning, treatment decisions, and clinical documentation must be your own work.',
  },
]

export function getStarterPack(disciplineFamily: DisciplineFamily): StarterPack | null {
  return STARTER_PACKS.find(p => p.disciplineFamily === disciplineFamily) ?? null
}

export async function adoptStarterPack(
  userId: string,
  courseId: string,
  disciplineFamily: DisciplineFamily,
) {
  const pack = getStarterPack(disciplineFamily)
  if (!pack) throw new Error(`No starter pack for ${disciplineFamily}`)

  // Check for existing adoption
  const existing = await prisma.starterPackAdoption.findUnique({
    where: { userId_courseId: { userId, courseId } },
  })
  if (existing) throw new Error('Starter pack already adopted for this course')

  // Get course info
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { courseCode: true, title: true },
  })
  if (!course) throw new Error('Course not found')

  // Generate policy from pack
  const assignmentLevels = pack.assignments.map(a => ({
    title: a.title,
    level: a.aiLevel,
  }))

  const policy = generatePolicy(
    pack.defaultStance,
    `${course.courseCode} — ${course.title}`,
    assignmentLevels,
    disciplineFamily,
  )

  // Save policy
  await prisma.courseAIPolicy.upsert({
    where: { courseId },
    create: {
      courseId,
      createdById: userId,
      stance: pack.defaultStance,
      policyText: policy.fullText,
      policyJson: {
        assignmentLevels,
        disclosureRequirements: policy.disclosureRequirements,
        consequencesLanguage: policy.consequencesLanguage,
      },
      fromStarterPack: true,
    },
    update: {
      stance: pack.defaultStance,
      policyText: policy.fullText,
      policyJson: {
        assignmentLevels,
        disclosureRequirements: policy.disclosureRequirements,
        consequencesLanguage: policy.consequencesLanguage,
      },
      fromStarterPack: true,
    },
  })

  // Record adoption
  await prisma.starterPackAdoption.create({
    data: { userId, courseId, disciplineFamily },
  })

  // Update profile coverage
  const totalCourses = await prisma.course.count({ where: { instructorId: userId } })
  const coursesWithPolicy = await prisma.courseAIPolicy.count({
    where: { course: { instructorId: userId } },
  })
  const coverage = totalCourses > 0 ? coursesWithPolicy / totalCourses : 0

  await prisma.aILiteracyProfile.upsert({
    where: { userId },
    create: { userId, policyCoverage: coverage },
    update: { policyCoverage: coverage },
  })

  return { policy: policy.fullText, pack }
}

export async function getAdoptionCounts(): Promise<Record<string, number>> {
  const counts = await prisma.starterPackAdoption.groupBy({
    by: ['disciplineFamily'],
    _count: { id: true },
  })
  const result: Record<string, number> = {}
  for (const c of counts) {
    result[c.disciplineFamily] = c._count.id
  }
  return result
}
