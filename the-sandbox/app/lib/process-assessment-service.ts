// ── Process-Based Assessment Templates ────────────────────────────────────────

export interface ProcessCheckpoint {
  stage: string
  description: string
  deliverable: string
  gradingWeight: number // percentage
  aiResilience: string
}

export interface ProcessTemplate {
  id: string
  name: string
  originalFormat: string
  description: string
  checkpoints: ProcessCheckpoint[]
  reflectionPrompts: string[]
  inClassComponents: string[]
}

export const PROCESS_TEMPLATES: ProcessTemplate[] = [
  {
    id: 'essay-portfolio',
    name: 'Essay Process Portfolio',
    originalFormat: 'Take-home essay',
    description: 'Transform a single essay into a multi-stage portfolio where each stage is graded. Makes the thinking process visible.',
    checkpoints: [
      { stage: 'Brainstorm', description: 'Generate 5 possible thesis statements with 1-paragraph rationale for each', deliverable: 'Thesis exploration document', gradingWeight: 10, aiResilience: 'Requires personal connection to course material' },
      { stage: 'Source Audit', description: 'Find 6+ sources and evaluate each for reliability, bias, and relevance', deliverable: 'Annotated bibliography with evaluation criteria', gradingWeight: 15, aiResilience: 'Source evaluation requires judgment AI struggles with' },
      { stage: 'Outline + Peer Review', description: 'Detailed outline reviewed by 2 peers with written feedback', deliverable: 'Outline + peer feedback forms', gradingWeight: 15, aiResilience: 'Peer interaction creates accountability' },
      { stage: 'First Draft', description: 'Complete draft with tracked changes from outline', deliverable: 'Draft showing evolution from outline', gradingWeight: 20, aiResilience: 'Tracked changes show authentic revision process' },
      { stage: 'Revision + Reflection', description: 'Final version with change log and meta-reflection', deliverable: 'Final essay + revision log + 300-word reflection', gradingWeight: 40, aiResilience: 'Reflection on own process is hard to fake' },
    ],
    reflectionPrompts: [
      'What changed between your first thesis idea and your final argument? Why?',
      'Which piece of peer feedback most changed your thinking?',
      'Where did you struggle most? What did that struggle teach you?',
      'If you used any AI tools at any stage, describe specifically what you used them for and what you changed.',
    ],
    inClassComponents: [
      'Thesis workshop: students present 3 thesis options and class votes on strongest',
      'Peer review session: structured feedback using provided rubric',
      'Oral micro-defense: 3-minute explanation of argument to partner',
    ],
  },
  {
    id: 'research-staged',
    name: 'Staged Research Project',
    originalFormat: 'Research paper',
    description: 'Break a research paper into visible stages with an oral defense. Each checkpoint builds on the last.',
    checkpoints: [
      { stage: 'Proposal', description: 'Research question + personal motivation + preliminary source list', deliverable: '1-page proposal', gradingWeight: 10, aiResilience: 'Personal motivation is hard to fabricate' },
      { stage: 'Methodology', description: 'Explain HOW you will research this, not just WHAT you found', deliverable: 'Methodology document', gradingWeight: 15, aiResilience: 'Requires reflection on research process' },
      { stage: 'Evidence Audit', description: 'Present conflicting evidence and explain how you weigh it', deliverable: 'Evidence matrix with evaluation notes', gradingWeight: 15, aiResilience: 'Weighing conflicting evidence requires judgment' },
      { stage: 'Draft', description: 'Complete draft with methodology section', deliverable: 'Full draft', gradingWeight: 20, aiResilience: 'Builds on previous authenticated stages' },
      { stage: 'Oral Defense', description: '10-min presentation + Q&A on methodology and findings', deliverable: 'Presentation + responses to questions', gradingWeight: 40, aiResilience: 'Cannot be AI-completed; tests real understanding' },
    ],
    reflectionPrompts: [
      'What was the most surprising thing you found in your research?',
      'Where did your initial hypothesis prove wrong?',
      'What evidence was hardest to evaluate? Why?',
    ],
    inClassComponents: [
      'Proposal pitch: 2-minute elevator pitch of research question',
      'Evidence workshop: bring your most conflicting sources and discuss with peers',
      'Oral defense: 10-min presentation + 5-min Q&A',
    ],
  },
  {
    id: 'problem-set-hybrid',
    name: 'Hybrid Problem Set',
    originalFormat: 'Homework problem set',
    description: 'Split routine practice (AI-ok) from conceptual understanding (in-class). Grade the understanding, not the computation.',
    checkpoints: [
      { stage: 'Practice (Take-home)', description: 'Routine problems — AI tools permitted and documented', deliverable: 'Completed problems with AI usage notes', gradingWeight: 20, aiResilience: 'AI is allowed here; focus is on completion' },
      { stage: 'Explain (In-class)', description: 'Explain WHY methods work, not just HOW to apply them', deliverable: 'Written explanations during class', gradingWeight: 40, aiResilience: 'In-class, handwritten, no devices' },
      { stage: 'Create (In-class)', description: 'Create a novel problem for a classmate and solve theirs', deliverable: 'Original problem + solution to peer problem', gradingWeight: 40, aiResilience: 'Problem creation requires deep understanding' },
    ],
    reflectionPrompts: [
      'Which problem type was hardest to explain? What does that tell you about your understanding?',
      'If you used AI for the take-home portion, what did it get wrong or oversimplify?',
    ],
    inClassComponents: [
      'Explanation round: each student explains one problem to a partner',
      'Problem creation: write an original problem that tests the same concept differently',
      'Peer solve: solve a classmate\'s created problem',
    ],
  },
  {
    id: 'discussion-dialogue',
    name: 'Socratic Dialogue Journal',
    originalFormat: 'Discussion post / reading response',
    description: 'Replace generic responses with a question-answer-uncertainty format that mirrors genuine learning.',
    checkpoints: [
      { stage: 'Question', description: 'Write one genuine question the reading raised (not a summary question)', deliverable: 'Question with context', gradingWeight: 25, aiResilience: 'Genuine questions reflect personal engagement' },
      { stage: 'Attempt', description: 'Attempt to answer your own question using evidence from the reading', deliverable: '200-word attempted answer', gradingWeight: 35, aiResilience: 'Self-directed inquiry shows thinking process' },
      { stage: 'Uncertainty', description: 'Identify what you\'re still unsure about and why', deliverable: '100-word uncertainty statement', gradingWeight: 20, aiResilience: 'Admitting confusion is anti-pattern for AI' },
      { stage: 'Dialogue', description: 'In class: share question with partner, compare answers', deliverable: 'Partner discussion notes', gradingWeight: 20, aiResilience: 'In-person dialogue cannot be faked' },
    ],
    reflectionPrompts: [
      'How did your partner\'s perspective change your understanding?',
      'What question do you still have that neither of you could answer?',
    ],
    inClassComponents: [
      'Partner share: exchange questions and discuss answers (10 min)',
      'Class synthesis: instructor surfaces the most interesting questions',
    ],
  },
]

export function getTemplateById(id: string): ProcessTemplate | undefined {
  return PROCESS_TEMPLATES.find(t => t.id === id)
}
