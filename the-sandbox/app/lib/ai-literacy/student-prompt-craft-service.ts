// Student Prompt Craft — 18 discipline-specific prompt challenges (client-safe, no Prisma)

export type DisciplineFamilyKey = 'STEM' | 'HUMANITIES' | 'SOCIAL_SCIENCES' | 'ARTS' | 'PROFESSIONAL' | 'HEALTH_SCIENCES'

export interface StudentPromptChallenge {
  id: string
  title: string
  discipline: DisciplineFamilyKey
  level: 1 | 3 | 5
  scenario: string
  originalPrompt: string
  evaluationCriteria: string
}

// ── STEM ────────────────────────────────────────────────────────────────────

const STEM_CHALLENGES: StudentPromptChallenge[] = [
  {
    id: 'student-stem-1',
    title: 'Exam Prep: Photosynthesis',
    discipline: 'STEM',
    level: 1,
    scenario: 'You need to understand photosynthesis for your biology exam tomorrow. You want the AI to explain it clearly so you can study.',
    originalPrompt: 'Explain photosynthesis',
    evaluationCriteria: 'Should specify depth level (introductory vs. biochemistry detail), which aspects to focus on (light reactions, Calvin cycle, or both), desired format (summary, diagram description, flashcard-style), and target audience (first-year bio student)',
  },
  {
    id: 'student-stem-3',
    title: 'Lab Report: Statistical Analysis',
    discipline: 'STEM',
    level: 3,
    scenario: 'You ran an experiment measuring plant growth under different light conditions and need to write the statistical analysis section of your lab report. You have mean values and standard deviations for 3 groups.',
    originalPrompt: 'Help me with my statistics for my lab',
    evaluationCriteria: 'Should provide the actual data or describe it, specify the statistical test needed (ANOVA, t-test), state the hypothesis, request interpretation guidance (not just calculations), and specify the report format expected by the course',
  },
  {
    id: 'student-stem-5',
    title: 'Research Proposal: Algorithm Design',
    discipline: 'STEM',
    level: 5,
    scenario: 'You\'re writing a senior thesis proposal on using machine learning to predict protein folding patterns. You need AI to help you think through your methodology section, not write it for you.',
    originalPrompt: 'Help me with my thesis about protein folding and machine learning',
    evaluationCriteria: 'Should frame AI as a thinking partner (not ghostwriter), specify what aspects of methodology need development, provide constraints (existing dataset, computing resources), ask for structured feedback on feasibility, and request identification of methodological gaps',
  },
]

// ── HUMANITIES ───────────────────────────────────────────────────────────────

const HUMANITIES_CHALLENGES: StudentPromptChallenge[] = [
  {
    id: 'student-hum-1',
    title: 'Reading Comprehension: Novel Themes',
    discipline: 'HUMANITIES',
    level: 1,
    scenario: 'You just finished reading "The Great Gatsby" for your American Literature class and need to identify the major themes for a class discussion.',
    originalPrompt: 'What are the themes in The Great Gatsby?',
    evaluationCriteria: 'Should ask for themes with textual evidence, specify how many themes to cover, request connection to the historical period, and indicate whether this is for discussion prep vs. essay writing',
  },
  {
    id: 'student-hum-3',
    title: 'Comparative Essay: Two Novels',
    discipline: 'HUMANITIES',
    level: 3,
    scenario: 'You\'re writing a comparative essay on "Beloved" by Toni Morrison and "The Color Purple" by Alice Walker for your African American Literature class. You need help developing your thesis.',
    originalPrompt: 'Compare Beloved and The Color Purple',
    evaluationCriteria: 'Should specify which themes or literary elements to compare, name an analytical framework (feminist, historical, structural), define the essay\'s argument direction, state the assignment requirements (length, sources), and request thesis options rather than a complete essay',
  },
  {
    id: 'student-hum-5',
    title: 'Primary Source Analysis: Historical Documents',
    discipline: 'HUMANITIES',
    level: 5,
    scenario: 'You\'re a history graduate student analyzing 18th-century correspondence for evidence of Enlightenment ideas spreading to colonial America. You want AI to help you develop an analytical framework, not do the analysis.',
    originalPrompt: 'Help me analyze these historical letters',
    evaluationCriteria: 'Should describe the source material characteristics, specify the analytical lens (intellectual history, social networks), ask for framework suggestions rather than conclusions, include methodological constraints (primary vs. secondary source hierarchy), and request questions to guide close reading rather than answers',
  },
]

// ── SOCIAL SCIENCES ──────────────────────────────────────────────────────────

const SOCIAL_SCIENCES_CHALLENGES: StudentPromptChallenge[] = [
  {
    id: 'student-soc-1',
    title: 'Study Guide: Research Methods',
    discipline: 'SOCIAL_SCIENCES',
    level: 1,
    scenario: 'You have a Research Methods midterm next week and need to understand the difference between qualitative and quantitative research.',
    originalPrompt: 'Explain research methods',
    evaluationCriteria: 'Should specify which methods to compare, request examples from a specific field (psychology, sociology, political science), ask for a structured comparison format, and indicate the level of detail needed for exam prep',
  },
  {
    id: 'student-soc-3',
    title: 'Survey Design: Psychology Study',
    discipline: 'SOCIAL_SCIENCES',
    level: 3,
    scenario: 'For your Research Methods class, you need to design a survey measuring college students\' social media use and its relationship to self-reported anxiety. You want AI feedback on your draft questions.',
    originalPrompt: 'Help me make a survey about social media and anxiety',
    evaluationCriteria: 'Should include draft questions or describe the constructs being measured, specify the target population, mention validity concerns (leading questions, response bias), state the analytical approach planned, and ask for specific feedback on question wording rather than having AI write all questions',
  },
  {
    id: 'student-soc-5',
    title: 'Policy Brief: Educational Inequality',
    discipline: 'SOCIAL_SCIENCES',
    level: 5,
    scenario: 'You\'re writing a policy brief on educational inequality in Kentucky for your senior seminar. You have data but need help structuring your argument and identifying counterarguments.',
    originalPrompt: 'Help me write about educational inequality',
    evaluationCriteria: 'Should present the specific data/findings to be included, define the target audience (state legislators, school boards), specify the policy recommendation direction, ask for structural feedback and counterargument identification (not content generation), and include constraints about evidence standards',
  },
]

// ── ARTS ─────────────────────────────────────────────────────────────────────

const ARTS_CHALLENGES: StudentPromptChallenge[] = [
  {
    id: 'student-art-1',
    title: 'Art History: Movement Comparison',
    discipline: 'ARTS',
    level: 1,
    scenario: 'You need to understand the differences between Impressionism and Post-Impressionism for your Art History 200 exam.',
    originalPrompt: 'Tell me about Impressionism',
    evaluationCriteria: 'Should ask for comparison (not just one movement), specify which aspects to compare (technique, philosophy, key artists), request visual description of stylistic differences, and indicate the level of detail needed',
  },
  {
    id: 'student-art-3',
    title: 'Artist Statement: Portfolio Review',
    discipline: 'ARTS',
    level: 3,
    scenario: 'You\'re preparing an artist statement for your end-of-semester portfolio review in your Studio Art class. You want AI to help you articulate your creative process, not write the statement for you.',
    originalPrompt: 'Write an artist statement for my portfolio',
    evaluationCriteria: 'Should describe the work in the portfolio (medium, themes, techniques), explain the creative intent, ask for questions that help articulate process rather than requesting a finished statement, specify the audience (faculty review panel), and include constraints about voice/authenticity',
  },
  {
    id: 'student-art-5',
    title: 'Curatorial Proposal: Exhibition Design',
    discipline: 'ARTS',
    level: 5,
    scenario: 'You\'re proposing a student-curated exhibition for the campus gallery that explores climate change through mixed media. You need AI to help identify gaps in your conceptual framework.',
    originalPrompt: 'Help me plan an art exhibition about climate change',
    evaluationCriteria: 'Should present the existing curatorial framework and artist selections, specify the physical space constraints, ask for critique of conceptual coherence (not content creation), request questions about audience engagement strategy, and define what "help" means (gap analysis, not planning)',
  },
]

// ── PROFESSIONAL ──────────────────────────────────────────────────────────────

const PROFESSIONAL_CHALLENGES: StudentPromptChallenge[] = [
  {
    id: 'student-pro-1',
    title: 'Career Prep: Resume Bullet Points',
    discipline: 'PROFESSIONAL',
    level: 1,
    scenario: 'You\'re updating your resume for summer internship applications and need to describe your campus tutoring job more effectively.',
    originalPrompt: 'Help me with my resume',
    evaluationCriteria: 'Should describe the specific role and responsibilities, specify the target industry/position, provide quantifiable achievements if possible, request a specific format (action verb + result), and indicate how many bullet points are needed',
  },
  {
    id: 'student-pro-3',
    title: 'Case Study: Business Ethics',
    discipline: 'PROFESSIONAL',
    level: 3,
    scenario: 'For your Business Ethics class, you need to analyze a real corporate scandal using an ethical framework. You\'ve chosen the Wells Fargo fake accounts scandal.',
    originalPrompt: 'Analyze the Wells Fargo scandal',
    evaluationCriteria: 'Should specify which ethical framework to apply (utilitarian, deontological, virtue ethics), define the stakeholders to consider, request structured analysis rather than summary, state the assignment requirements, and ask for framework application guidance rather than conclusions',
  },
  {
    id: 'student-pro-5',
    title: 'Consulting Presentation: Market Entry',
    discipline: 'PROFESSIONAL',
    level: 5,
    scenario: 'Your capstone team is presenting a market entry strategy for a Kentucky bourbon brand expanding to Japan. You need AI to stress-test your assumptions, not build your deck.',
    originalPrompt: 'Help me with a market entry strategy for bourbon in Japan',
    evaluationCriteria: 'Should present the team\'s existing strategy and assumptions, specify which assumptions need stress-testing, ask for counterarguments and risk identification (not strategy generation), define presentation constraints (10-minute format, executive audience), and request Socratic questioning rather than answers',
  },
]

// ── HEALTH SCIENCES ──────────────────────────────────────────────────────────

const HEALTH_SCIENCES_CHALLENGES: StudentPromptChallenge[] = [
  {
    id: 'student-hs-1',
    title: 'Exam Prep: Drug Classifications',
    discipline: 'HEALTH_SCIENCES',
    level: 1,
    scenario: 'You\'re studying for your Pharmacology exam and need to understand the major classes of antihypertensive drugs.',
    originalPrompt: 'Tell me about blood pressure medications',
    evaluationCriteria: 'Should specify which drug classes to cover, request mechanism of action for each, ask for comparison format (table, concept map), include clinical relevance (when to use which class), and indicate the level of detail needed for exam prep',
  },
  {
    id: 'student-hs-3',
    title: 'Patient Education: Diabetes Management',
    discipline: 'HEALTH_SCIENCES',
    level: 3,
    scenario: 'For your Community Health Nursing clinical, you need to create a patient education handout for a newly diagnosed Type 2 diabetic patient with limited health literacy.',
    originalPrompt: 'Write something about diabetes for a patient',
    evaluationCriteria: 'Should specify the patient\'s health literacy level, define what topics to cover (diet, medication, monitoring), request appropriate reading level (5th-6th grade), ask for culturally sensitive content, and specify the format (handout, bullet points, visual aids)',
  },
  {
    id: 'student-hs-5',
    title: 'Clinical Reasoning: Complex Case',
    discipline: 'HEALTH_SCIENCES',
    level: 5,
    scenario: 'You\'re a PA student preparing for clinical rotations. You have a complex case study with a 67-year-old patient presenting with chest pain, diabetes, and renal insufficiency. You want AI to help you practice clinical reasoning, not give you the answer.',
    originalPrompt: 'Help me with this patient case about chest pain',
    evaluationCriteria: 'Should present the full case data (vitals, labs, history), ask for differential diagnosis questioning (not answers), request a systematic approach framework (SOAP, clinical reasoning steps), specify which aspects need development (prioritization, contraindications given comorbidities), and explicitly frame AI as a practice partner',
  },
]

// ── Export combined array ────────────────────────────────────────────────────

export const STUDENT_CHALLENGES: StudentPromptChallenge[] = [
  ...STEM_CHALLENGES,
  ...HUMANITIES_CHALLENGES,
  ...SOCIAL_SCIENCES_CHALLENGES,
  ...ARTS_CHALLENGES,
  ...PROFESSIONAL_CHALLENGES,
  ...HEALTH_SCIENCES_CHALLENGES,
]

export function getStudentChallenges(
  discipline?: DisciplineFamilyKey,
  level?: number,
): StudentPromptChallenge[] {
  let result = STUDENT_CHALLENGES
  if (discipline) result = result.filter((c) => c.discipline === discipline)
  if (level) result = result.filter((c) => c.level === level)
  return result
}

export function getStudentChallenge(id: string): StudentPromptChallenge | undefined {
  return STUDENT_CHALLENGES.find((c) => c.id === id)
}
