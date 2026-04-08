// Prompt Lab — Challenge data (client-safe, no Prisma imports)

export interface PromptLabLevel {
  id: number
  name: string
  description: string
  skillFocus: string
  icon: string // lucide icon name as string
}

export interface PromptLabChallenge {
  id: string
  level: number
  scenario: string
  originalPrompt: string
  hints: string[]
  scoringCriteria: string
}

export const PROMPT_LAB_LEVELS: PromptLabLevel[] = [
  { id: 1, name: 'Clarity', description: 'Transform vague prompts into clear, specific instructions', skillFocus: 'Removing ambiguity and being explicit about what you want', icon: 'Eye' },
  { id: 2, name: 'Constraints', description: 'Add format, length, tone, and structural constraints', skillFocus: 'Controlling output shape through precise boundaries', icon: 'Ruler' },
  { id: 3, name: 'Context', description: 'Provide background information and role instructions', skillFocus: 'Setting up the AI with the right frame of reference', icon: 'BookOpen' },
  { id: 4, name: 'Chain of Thought', description: 'Break complex tasks into sequential reasoning steps', skillFocus: 'Guiding the AI through multi-step problem solving', icon: 'GitBranch' },
  { id: 5, name: 'Evaluation', description: 'Critique and iteratively improve AI outputs', skillFocus: 'Using follow-up prompts to refine and improve results', icon: 'RefreshCw' },
]

// ── Level 1: Clarity (5 challenges) ──────────────────────────────────────────

const LEVEL_1_CHALLENGES: PromptLabChallenge[] = [
  {
    id: 'clarity-1',
    level: 1,
    scenario: 'You need to write a paper for your History 101 class, but your prompt is too vague for the AI to produce anything useful.',
    originalPrompt: 'Write about history.',
    hints: [
      'Specify a time period — what era or century?',
      'Name a region or civilization',
      'What format should the output be? Essay, outline, timeline?',
      'How long should the response be?',
    ],
    scoringCriteria: 'Specificity of topic (era, region, event), clear output format, defined length or scope, elimination of ambiguity',
  },
  {
    id: 'clarity-2',
    level: 1,
    scenario: 'You\'re studying for a Biology exam and want the AI to help explain a concept, but the prompt could mean almost anything.',
    originalPrompt: 'Tell me about cells.',
    hints: [
      'Which type of cells? Animal, plant, bacterial?',
      'What aspect? Structure, function, division?',
      'At what level of detail — intro or advanced?',
      'Are you preparing for a specific exam or assignment?',
    ],
    scoringCriteria: 'Cell type specified, aspect narrowed, audience/level indicated, purpose stated',
  },
  {
    id: 'clarity-3',
    level: 1,
    scenario: 'You need help with a math problem for your Statistics course, but the AI can\'t help without knowing what kind of problem.',
    originalPrompt: 'Help me with math.',
    hints: [
      'What branch of math? Statistics, calculus, linear algebra?',
      'Describe the specific problem or concept',
      'Do you want a worked example, explanation, or practice problems?',
      'What have you tried so far?',
    ],
    scoringCriteria: 'Math domain specified, concrete problem or concept named, desired output type clear, current understanding referenced',
  },
  {
    id: 'clarity-4',
    level: 1,
    scenario: 'You\'re working on a Computer Science assignment and need coding help, but the AI needs more to go on.',
    originalPrompt: 'Write some code for me.',
    hints: [
      'What programming language?',
      'What should the code accomplish?',
      'Any input/output requirements?',
      'Are there constraints like time complexity or libraries to use?',
    ],
    scoringCriteria: 'Language specified, task clearly described, input/output defined, constraints or requirements mentioned',
  },
  {
    id: 'clarity-5',
    level: 1,
    scenario: 'You need to prepare for a Nursing clinical and want help understanding a medical concept, but your prompt is far too broad.',
    originalPrompt: 'Explain medicine.',
    hints: [
      'Which medical topic? Pharmacology, pathophysiology, patient assessment?',
      'Name a specific drug, condition, or procedure',
      'Who is the audience — a nursing student, a patient, a physician?',
      'What depth — overview or detailed mechanism?',
    ],
    scoringCriteria: 'Specific medical topic identified, target audience stated, depth/scope clarified, relevant clinical context included',
  },
]

// ── Level 2: Constraints (5 challenges) ──────────────────────────────────────

const LEVEL_2_CHALLENGES: PromptLabChallenge[] = [
  {
    id: 'constraints-1',
    level: 2,
    scenario: 'Your Chemistry professor wants a study guide for photosynthesis aimed at non-science majors. The AI output needs to be accessible.',
    originalPrompt: 'Explain photosynthesis.',
    hints: [
      'Set a target audience — introductory college students with no science background',
      'Add a word count limit (e.g., under 300 words)',
      'Specify "no jargon" or "define all technical terms"',
      'Request a specific format like bullet points or numbered steps',
    ],
    scoringCriteria: 'Audience constraint set, length/word limit included, jargon/vocabulary constraint, format or structure specified',
  },
  {
    id: 'constraints-2',
    level: 2,
    scenario: 'You\'re writing a professional email to a professor requesting a letter of recommendation. Tone matters enormously.',
    originalPrompt: 'Write an email to my professor.',
    hints: [
      'Specify the tone: formal, respectful, concise',
      'Set a length constraint — emails should be brief (under 150 words)',
      'Include what information must be covered (deadline, purpose, your qualifications)',
      'Add structural constraints: greeting, body paragraphs, sign-off',
    ],
    scoringCriteria: 'Tone specified (formal/professional), length constraint, required content elements listed, structural format defined',
  },
  {
    id: 'constraints-3',
    level: 2,
    scenario: 'You need a social media post for a student org event. It needs to fit platform constraints and capture attention.',
    originalPrompt: 'Write a social media post about our event.',
    hints: [
      'Set a character limit (e.g., 280 characters for Twitter/X)',
      'Specify tone: casual, enthusiastic, informative',
      'Require specific elements: date, time, location, hashtag',
      'Add a constraint about including a call-to-action',
    ],
    scoringCriteria: 'Character/length limit, tone constraint, required information elements, call-to-action or engagement element specified',
  },
  {
    id: 'constraints-4',
    level: 2,
    scenario: 'Your Education professor wants you to create a lesson plan outline. The format and structure matter as much as the content.',
    originalPrompt: 'Make a lesson plan.',
    hints: [
      'Specify the subject and grade level',
      'Require specific sections: objective, materials, activities, assessment',
      'Set a time constraint — the lesson should fit in a 50-minute class',
      'Add a constraint about Bloom\'s taxonomy level for the learning objective',
    ],
    scoringCriteria: 'Subject/grade specified, required sections listed, time constraint included, pedagogical framework referenced',
  },
  {
    id: 'constraints-5',
    level: 2,
    scenario: 'You need a literature review summary for your Psychology research paper. The professor requires APA style and specific structure.',
    originalPrompt: 'Summarize some psychology research.',
    hints: [
      'Specify the topic area (e.g., cognitive bias, attachment theory)',
      'Require APA citation format',
      'Set a structure: introduction, themes, gaps, conclusion',
      'Add a constraint: "Use only peer-reviewed sources from 2018 or later"',
    ],
    scoringCriteria: 'Topic narrowed, citation format specified, organizational structure defined, source recency/quality constraint included',
  },
]

// ── Level 3: Context (5 challenges) ──────────────────────────────────────────

const LEVEL_3_CHALLENGES: PromptLabChallenge[] = [
  {
    id: 'context-1',
    level: 3,
    scenario: 'You\'re asking the AI for help with your English Composition paper, but it doesn\'t know anything about your assignment, your draft, or your professor\'s expectations.',
    originalPrompt: 'Help me with my paper.',
    hints: [
      'Describe the assignment: topic, length, due date, rubric criteria',
      'Share your thesis statement or main argument',
      'Include your professor\'s specific feedback on previous drafts',
      'Specify what kind of help you need: structure, argument strength, grammar, transitions',
    ],
    scoringCriteria: 'Assignment context provided (topic, requirements, rubric), current work shared (thesis/draft excerpt), professor expectations included, specific help request articulated',
  },
  {
    id: 'context-2',
    level: 3,
    scenario: 'You\'re a pre-med student asking for help studying for the MCAT, but the AI doesn\'t know your strengths, weaknesses, or timeline.',
    originalPrompt: 'Help me study for my test.',
    hints: [
      'Name the specific exam (MCAT) and your test date',
      'Describe your current performance level (e.g., practice test scores)',
      'Identify your weak areas vs. strong areas',
      'Set the AI\'s role: "Act as an MCAT tutor who focuses on my weak areas"',
    ],
    scoringCriteria: 'Exam identified with date, current performance baseline shared, strengths/weaknesses specified, AI role defined with appropriate expertise',
  },
  {
    id: 'context-3',
    level: 3,
    scenario: 'You\'re a Social Work student preparing for a difficult client conversation in your field placement. The AI needs to understand the scenario.',
    originalPrompt: 'Help me practice a conversation.',
    hints: [
      'Set the role: "You are a client experiencing housing insecurity"',
      'Provide the clinical context: field placement setting, supervisor expectations',
      'Describe the client\'s background and presenting issues',
      'Specify what skills you\'re practicing: motivational interviewing, active listening, resource referral',
    ],
    scoringCriteria: 'Role assignment for AI, clinical/professional context described, client background provided, specific skills or objectives named',
  },
  {
    id: 'context-4',
    level: 3,
    scenario: 'You\'re an Engineering student asking the AI to help debug your circuit design, but it doesn\'t know your course level, components, or design specs.',
    originalPrompt: 'Fix my circuit.',
    hints: [
      'Describe the circuit: components, topology, power supply specs',
      'Explain the expected behavior vs. actual behavior',
      'Include your course level (intro EE, advanced analog, digital)',
      'Mention any design constraints (voltage limits, available components, simulation tool)',
    ],
    scoringCriteria: 'Circuit description provided, expected vs. actual behavior explained, course level and knowledge context set, design constraints specified',
  },
  {
    id: 'context-5',
    level: 3,
    scenario: 'You\'re a Business student asking for feedback on your marketing strategy, but the AI doesn\'t know your target market, product, or class framework.',
    originalPrompt: 'Review my marketing plan.',
    hints: [
      'Describe the product/service and target market',
      'Include the framework your class uses (4Ps, STP, SWOT)',
      'Share the specific section you want feedback on',
      'Set the role: "Act as a marketing professor evaluating against the 4Ps framework"',
    ],
    scoringCriteria: 'Product/market context provided, academic framework specified, specific feedback area identified, evaluator role defined',
  },
]

// ── Level 4: Chain of Thought (5 challenges) ─────────────────────────────────

const LEVEL_4_CHALLENGES: PromptLabChallenge[] = [
  {
    id: 'cot-1',
    level: 4,
    scenario: 'Your Economics professor gave you a dataset of regional unemployment rates over 10 years and asked for an analysis. A single-step prompt yields superficial results.',
    originalPrompt: 'Analyze this data.',
    hints: [
      'Break it into steps: first summarize the data, then identify trends',
      'Add a step for comparing regions or time periods',
      'Include a step for drawing conclusions and suggesting policy implications',
      'Ask the AI to explain its reasoning at each step',
    ],
    scoringCriteria: 'Multi-step structure (3+ explicit steps), logical sequencing from description to analysis to conclusion, reasoning transparency requested, domain-appropriate analytical framework',
  },
  {
    id: 'cot-2',
    level: 4,
    scenario: 'You need to solve a complex Organic Chemistry synthesis problem. Asking the AI to "solve it" yields a final answer without the reasoning chain you need to learn.',
    originalPrompt: 'Solve this chemistry problem.',
    hints: [
      'Ask for step-by-step retrosynthetic analysis',
      'Request that each step explains which reaction mechanism applies and why',
      'Have the AI evaluate alternative routes before choosing one',
      'Ask it to identify potential side reactions at each step',
    ],
    scoringCriteria: 'Retrosynthetic or stepwise approach specified, mechanism explanations requested per step, alternative evaluation included, potential pitfalls addressed',
  },
  {
    id: 'cot-3',
    level: 4,
    scenario: 'You\'re writing a Philosophy paper on utilitarianism vs. deontology. You need the AI to build a nuanced argument, not just list facts.',
    originalPrompt: 'Compare utilitarianism and deontology.',
    hints: [
      'Step 1: Define each theory with key thinkers',
      'Step 2: Apply both to a specific ethical dilemma',
      'Step 3: Identify where they agree and disagree on the dilemma',
      'Step 4: Evaluate which framework is more persuasive, and explain why',
    ],
    scoringCriteria: 'Sequential reasoning steps defined, definitions before application, specific test case included, evaluative judgment with justification requested',
  },
  {
    id: 'cot-4',
    level: 4,
    scenario: 'Your Computer Science professor wants you to design an algorithm for a scheduling problem. You need the AI to think through the design, not just output code.',
    originalPrompt: 'Design an algorithm for scheduling.',
    hints: [
      'Step 1: Define the problem constraints and inputs formally',
      'Step 2: Consider 2-3 algorithmic approaches (greedy, DP, backtracking)',
      'Step 3: Analyze time/space complexity for each approach',
      'Step 4: Choose the best approach and implement it with explanation',
    ],
    scoringCriteria: 'Problem formalization step, multiple approaches considered, complexity analysis included, justified selection with implementation',
  },
  {
    id: 'cot-5',
    level: 4,
    scenario: 'You\'re a Public Health student analyzing a disease outbreak case study. The AI needs to follow an epidemiological investigation framework.',
    originalPrompt: 'Analyze this disease outbreak.',
    hints: [
      'Step 1: Establish the case definition and count',
      'Step 2: Describe the epidemiological triangle (agent, host, environment)',
      'Step 3: Construct an epidemic curve and identify the outbreak pattern',
      'Step 4: Propose and evaluate hypotheses for the source',
      'Step 5: Recommend control measures with evidence',
    ],
    scoringCriteria: 'Epidemiological framework followed, sequential investigation steps, hypothesis generation and testing included, evidence-based recommendations at the end',
  },
]

// ── Level 5: Evaluation (5 challenges) ───────────────────────────────────────

const LEVEL_5_CHALLENGES: PromptLabChallenge[] = [
  {
    id: 'eval-1',
    level: 5,
    scenario: 'The AI wrote an essay for your Political Science class, but your professor uses a detailed rubric. You need to critique and iterate on the AI output.',
    originalPrompt: 'Review this essay.',
    hints: [
      'Share the rubric criteria (thesis, evidence, analysis, writing quality)',
      'Ask the AI to score itself on each rubric dimension first',
      'Identify the weakest dimension and ask for a targeted rewrite of just that section',
      'Follow up: "Now strengthen the evidence by adding two more supporting examples"',
    ],
    scoringCriteria: 'Rubric criteria provided, self-evaluation requested, weakest area identified for targeted improvement, iterative follow-up with specific improvement instructions',
  },
  {
    id: 'eval-2',
    level: 5,
    scenario: 'The AI generated a Python function for your data science project but you\'re not sure it handles edge cases. You need to guide systematic evaluation.',
    originalPrompt: 'Check my code.',
    hints: [
      'Ask the AI to list all edge cases for the function',
      'Request test cases for each edge case with expected outputs',
      'Have it identify any performance concerns or potential bugs',
      'Follow up: "Now refactor to handle the edge cases you identified"',
    ],
    scoringCriteria: 'Edge case enumeration requested, test case generation included, performance/bug analysis, iterative improvement cycle with specific refactoring request',
  },
  {
    id: 'eval-3',
    level: 5,
    scenario: 'The AI drafted a grant proposal introduction for your research lab. Your advisor says it needs to be more compelling and better framed.',
    originalPrompt: 'Improve my grant intro.',
    hints: [
      'Ask the AI to identify the current hook, gap statement, and proposed solution',
      'Request an evaluation of each element\'s strength on a 1-5 scale',
      'Ask for 3 alternative opening hooks and compare them',
      'Follow up: "Rewrite using the strongest hook and tighten the gap statement to two sentences"',
    ],
    scoringCriteria: 'Structural analysis requested (hook/gap/solution), quantitative evaluation, alternatives generated for comparison, specific synthesis instructions for final rewrite',
  },
  {
    id: 'eval-4',
    level: 5,
    scenario: 'The AI created a presentation outline for your Architecture studio review. The structure is okay but the narrative flow is weak.',
    originalPrompt: 'Fix my presentation.',
    hints: [
      'Ask the AI to map the current outline\'s narrative arc (setup, tension, resolution)',
      'Request identification of where the audience might lose interest',
      'Have it suggest transitions between sections',
      'Follow up: "Restructure slides 3-7 to build tension before the design reveal"',
    ],
    scoringCriteria: 'Narrative analysis requested, audience engagement evaluation, transition improvements specified, targeted restructuring of specific sections',
  },
  {
    id: 'eval-5',
    level: 5,
    scenario: 'The AI summarized a research article for your Neuroscience journal club, but you suspect it missed nuances and may have misrepresented the findings.',
    originalPrompt: 'Check this summary.',
    hints: [
      'Ask the AI to compare its summary against specific sections of the original (methods, results, limitations)',
      'Request it identify any claims in the summary not supported by the original text',
      'Have it flag any oversimplifications or missing caveats',
      'Follow up: "Rewrite the results paragraph to accurately reflect the confidence intervals and p-values reported"',
    ],
    scoringCriteria: 'Source verification requested, unsupported claims identification, nuance/caveat check included, precision-targeted rewrite with specific metrics',
  },
]

export const PROMPT_LAB_CHALLENGES: PromptLabChallenge[] = [
  ...LEVEL_1_CHALLENGES,
  ...LEVEL_2_CHALLENGES,
  ...LEVEL_3_CHALLENGES,
  ...LEVEL_4_CHALLENGES,
  ...LEVEL_5_CHALLENGES,
]
