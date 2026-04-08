// ── Faculty AI Pedagogy Case Studies ──────────────────────────────────────────

export interface CaseStudy {
  id: string
  title: string
  discipline: string
  stanceRange: string
  summary: string
  challenge: string
  approach: string
  outcome: string
  lessonsLearned: string[]
  source: 'DUS Survey' | 'CELT' | 'Faculty Contribution'
}

export const CASE_STUDIES: CaseStudy[] = [
  {
    id: 'physics-socratic-bot',
    title: 'Socratic AI Chatbot in Physics',
    discipline: 'Physics',
    stanceRange: 'Integrate / Require',
    summary: 'A physics program built a Socratic AI chatbot that teaches through dialogue, and in an advanced course requires students to build AI simulations, verify against their own calculations, and document where the AI gets the physics wrong.',
    challenge: 'Students were using AI to solve problem sets without understanding the physics. Faculty wanted to turn AI from a shortcut into a learning tool.',
    approach: 'In introductory courses, a custom chatbot was built that asks questions rather than giving answers (Socratic method). In advanced courses, students must build AI simulations and verify them against hand calculations, documenting every discrepancy.',
    outcome: 'Students engage more deeply with the material because they must find and explain AI errors. The verification process builds stronger conceptual understanding than traditional problem sets.',
    lessonsLearned: [
      'AI error analysis is a powerful teaching tool — students learn more from finding mistakes than from getting answers',
      'Different course levels need different AI integration strategies',
      'Building the chatbot required significant upfront investment but pays off across semesters',
    ],
    source: 'DUS Survey',
  },
  {
    id: 'history-debate-prep',
    title: 'AI-Powered Debate Preparation in History',
    discipline: 'History',
    stanceRange: 'Guided',
    summary: 'A history program worked with CELT to build a chatbot that helps students prepare for historical debate simulations, without doing the debate for them.',
    challenge: 'Students needed to prepare arguments from multiple historical perspectives, but many were using AI to generate arguments wholesale.',
    approach: 'Created a custom AI chatbot that takes a historical figure\'s perspective and challenges students\' arguments during preparation — but the actual debate is in class, unassisted. The AI is a practice partner, not a ghost writer.',
    outcome: 'Students arrive at debates better prepared because they have already had their arguments challenged. The in-class debate verifies genuine understanding.',
    lessonsLearned: [
      'AI as practice partner (not answer provider) preserves learning',
      'In-class performance component is essential for verification',
      'CELT collaboration made the technical implementation feasible',
    ],
    source: 'DUS Survey',
  },
  {
    id: 'science-critique',
    title: 'AI Output Critique in First-Year Science',
    discipline: 'Science (interdisciplinary)',
    stanceRange: 'Guided',
    summary: 'First-year students use Copilot to summarize papers beyond their reading level, and in upper-division courses critique AI-generated text for accuracy.',
    challenge: 'First-year students struggled with primary literature. Upper-division students needed critical evaluation skills that AI bypass.',
    approach: 'Tiered strategy: First-years use AI summaries as scaffolding to access difficult papers (but must identify what the summary missed). Upper-division students receive AI-generated analysis of their datasets and must identify errors, biases, and oversimplifications.',
    outcome: 'First-years engage with primary literature earlier. Upper-division students develop stronger critical evaluation skills by finding AI failures.',
    lessonsLearned: [
      'AI scaffolding works well for early students if paired with critical analysis',
      'Having students critique AI output is more effective than having them generate with AI',
      'Different levels in the same program can use AI very differently',
    ],
    source: 'DUS Survey',
  },
  {
    id: 'student-co-authored-policy',
    title: 'Students Co-Write the AI Policy',
    discipline: 'Multiple',
    stanceRange: 'Guided / Integrate',
    summary: 'One program has students co-write the course AI policy with their instructor on the first day of class, making AI expectations a learning activity rather than a rule to follow.',
    challenge: 'Faculty-imposed policies felt punitive and students did not internalize them. Violations were frequent.',
    approach: 'On the first day, instructor leads a discussion: "Where should we allow AI in this course? Where should we not? Why?" Class collaboratively writes the policy. Students are more invested because they helped create the rules.',
    outcome: 'Reported fewer violations because students understood and owned the rationale. Also surfaced student perspectives faculty had not considered.',
    lessonsLearned: [
      'Student buy-in increases when they participate in policy creation',
      'The discussion itself is a valuable learning activity about AI ethics',
      'Faculty learn things about student AI use they would not otherwise know',
    ],
    source: 'DUS Survey',
  },
  {
    id: 'four-level-framework',
    title: 'Four-Level AI Use Framework',
    discipline: 'Health Sciences',
    stanceRange: 'Guided',
    summary: 'A health sciences program built a four-level framework — Prohibited, Limited, Guided, Required — that varies by assignment, with a clear disciplinary rationale.',
    challenge: 'A one-size-fits-all AI policy did not work because different assignments served different learning goals.',
    approach: 'Each assignment is labeled with one of four AI levels. Clinical skill assessments are Prohibited (patient safety). Literature reviews are Guided (with disclosure). AI-powered diagnostic practice is Required. Students know exactly what to expect.',
    outcome: 'Clarity reduced confusion and violations. Faculty found it easier to enforce because the rationale was transparent per assignment.',
    lessonsLearned: [
      'Per-assignment granularity is better than course-level blanket policies',
      'Grounding levels in disciplinary rationale (e.g., patient safety) makes them feel principled, not arbitrary',
      'The framework is now being adopted by other programs in the college',
    ],
    source: 'DUS Survey',
  },
]

// ── Training Resources ───────────────────────────────────────────────────────

export interface TrainingResource {
  id: string
  title: string
  type: 'workshop' | 'guide' | 'template' | 'video'
  source: string
  description: string
  url?: string
}

export const TRAINING_RESOURCES: TrainingResource[] = [
  { id: 'celt-ai-scale', title: 'Student AI Use Scale', type: 'template', source: 'CELT', description: 'Framework for specifying AI use levels per assignment. Widely adopted across campus.' },
  { id: 'celt-syllabus', title: 'AI Syllabus Language Templates', type: 'template', source: 'CELT', description: 'Pre-written syllabus paragraphs for different AI stances. The most-used CELT resource according to the DUS survey.' },
  { id: 'celt-workshop', title: 'Designing AI-Resilient Assessments', type: 'workshop', source: 'CELT', description: 'Workshop series on redesigning assignments for the AI era. 71% of DUS respondents want more of these.' },
  { id: 'prompt-eng', title: 'Prompt Engineering for Educators', type: 'guide', source: 'AI Literacy Hub', description: 'How to use AI effectively in your own teaching workflow — lesson planning, rubric creation, feedback generation.' },
  { id: 'bloom-ai', title: 'Bloom\'s Taxonomy in the AI Age', type: 'guide', source: 'AI Literacy Hub', description: 'How AI changes each level of Bloom\'s taxonomy and what it means for assessment design.' },
]
