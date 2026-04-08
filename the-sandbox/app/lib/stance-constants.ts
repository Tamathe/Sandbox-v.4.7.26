import type { AIStance } from '../generated/prisma'

// ── Scoring (pure function, no prisma) ──────────────────────────────────────

export function computeScore(responses: { questionId: string; selectedValue: number }[]): number {
  if (responses.length === 0) return 3.0
  const sum = responses.reduce((acc, r) => acc + r.selectedValue, 0)
  return Math.round((sum / responses.length) * 100) / 100
}

// ── Assessment Questions ─────────────────────────────────────────────────────

export interface StanceQuestion {
  id: string
  title: string
  prompt: string
  context: string
  options: { label: string; value: number; isUnsure?: boolean }[]
}

export const STANCE_QUESTIONS: StanceQuestion[] = [
  {
    id: 'q1_discipline_values',
    title: 'Discipline Values',
    prompt: 'What does your discipline most value in student work?',
    context: 'Different fields have different relationships with originality, process, and tools.',
    options: [
      { label: 'Original voice and authentic expression', value: 1 },
      { label: 'Demonstrated understanding of core concepts', value: 2 },
      { label: 'Ability to analyze, evaluate, and synthesize', value: 3 },
      { label: 'Practical skill application using industry tools', value: 4 },
      { label: 'Efficiency and output quality regardless of method', value: 5 },
    ],
  },
  {
    id: 'q2_assessment_philosophy',
    title: 'Assessment Philosophy',
    prompt: 'When you grade student work, what matters most to you?',
    context: 'This shapes how AI use intersects with your evaluation criteria.',
    options: [
      { label: 'The writing/thinking process itself — drafts, revision, growth', value: 1 },
      { label: 'Mastery of foundational knowledge and accuracy', value: 2 },
      { label: 'Critical thinking and the student\'s own analysis', value: 3 },
      { label: 'Creative problem-solving and tool fluency', value: 4 },
      { label: 'Professional-quality deliverables that meet real-world standards', value: 5 },
    ],
  },
  {
    id: 'q3_learning_loss',
    title: 'Learning Loss Concern',
    prompt: 'How concerned are you that AI use prevents students from developing essential skills?',
    context: '78% of DUS leaders rated this concern 4 or 5 out of 5.',
    options: [
      { label: 'Extremely — AI bypasses the exact skills my courses build', value: 1 },
      { label: 'Very — most of what I teach requires unassisted practice', value: 2 },
      { label: 'Moderately — some skills need protection, others can be augmented', value: 3 },
      { label: 'Slightly — AI frees students to focus on higher-order skills', value: 4 },
      { label: 'Not concerned — using AI effectively IS the skill', value: 5 },
    ],
  },
  {
    id: 'q4_industry_context',
    title: 'Industry/Professional Context',
    prompt: 'How do graduates of your program use AI in their careers?',
    context: 'Some advisory boards explicitly expect AI fluency; others value unassisted expertise.',
    options: [
      { label: 'They don\'t and shouldn\'t — the field requires unassisted judgment', value: 1 },
      { label: 'Minimally — the field is cautious about AI adoption', value: 2 },
      { label: 'Selectively — some tasks use AI, core expertise does not', value: 3 },
      { label: 'Regularly — AI is an expected tool in the profession', value: 4 },
      { label: 'Extensively — AI fluency is a hiring criterion', value: 5 },
      { label: "I'm not sure — I don't have enough experience with AI to answer this", value: 3, isUnsure: true },
    ],
  },
  {
    id: 'q5_current_reality',
    title: 'Current Reality',
    prompt: 'To the best of your knowledge, how are students in your courses currently using AI?',
    context: '48% of DUS leaders said students use AI on their own without guidance.',
    options: [
      { label: 'Most are not using it, and I want to keep it that way', value: 1 },
      { label: 'Some probably use it quietly; I\'d rather not encourage it', value: 2 },
      { label: 'Many use it — I\'d rather guide than ignore it', value: 3 },
      { label: 'Most use it — I want to channel it toward learning goals', value: 4 },
      { label: 'Everyone uses it — it would be unrealistic to restrict it', value: 5 },
      { label: "I'm not sure — I don't have enough experience with AI to answer this", value: 3, isUnsure: true },
    ],
  },
  {
    id: 'q6_enforcement',
    title: 'Enforcement Comfort',
    prompt: 'If a student submits work you suspect was AI-generated against your policy, how would you respond?',
    context: 'Faculty describe confronting students about obvious AI misuse and losing.',
    options: [
      { label: 'I want clear policy, enforcement tools, and institutional backing', value: 1 },
      { label: 'I\'d address it but I\'m frustrated by the lack of reliable detection', value: 2 },
      { label: 'I\'d redesign the assignment rather than try to catch it', value: 3 },
      { label: 'My assignments already account for AI use, so this wouldn\'t arise', value: 4 },
      { label: 'I don\'t restrict AI, so this question doesn\'t apply', value: 5 },
    ],
  },
  {
    id: 'q7_institutional_climate',
    title: 'Institutional Climate',
    prompt: 'How does the university\'s public enthusiasm about AI affect your teaching decisions?',
    context: 'Several respondents felt institutional climate complicates their ability to restrict use.',
    options: [
      { label: 'It makes me feel unsupported in my choice to limit AI', value: 1 },
      { label: 'It creates tension — I want flexibility without pressure', value: 2 },
      { label: 'I try to find my own path regardless of messaging', value: 3 },
      { label: 'It encourages me, but I wish there were more support', value: 4 },
      { label: 'It aligns with my enthusiasm — I want to go further', value: 5 },
    ],
  },
  {
    id: 'q8_assignment_resilience',
    title: 'Assignment Resilience',
    prompt: 'How would you describe the AI-completability of your current assignments?',
    context: 'Traditional homework, take-home essays, and research papers are now routinely AI-completable.',
    options: [
      { label: 'Most require in-person, proctored, or embodied work', value: 1 },
      { label: 'I\'ve made some adjustments but many are still vulnerable', value: 2 },
      { label: 'I\'m actively redesigning — it\'s a work in progress', value: 3 },
      { label: 'I\'ve integrated AI into the assignments themselves', value: 4 },
      { label: 'AI is a required tool in my assignments', value: 5 },
      { label: "I'm not sure — I don't have enough experience with AI to answer this", value: 3, isUnsure: true },
    ],
  },
  {
    id: 'q9_pedagogical_identity',
    title: 'Pedagogical Identity',
    prompt: 'Which statement best describes how you see your role as an educator in relation to AI?',
    context: 'This is about your professional identity, not a policy question.',
    options: [
      { label: 'I teach students to think without technological shortcuts', value: 1 },
      { label: 'I teach foundational skills that must be learned before using tools', value: 2 },
      { label: 'I teach students when to use AI and when not to', value: 3 },
      { label: 'I teach students to use AI as a thinking partner', value: 4 },
      { label: 'I prepare students for a world where AI is fundamental', value: 5 },
    ],
  },
  {
    id: 'q10_what_you_need',
    title: 'What You Need',
    prompt: 'What would help you most right now?',
    context: '71% want workshops. 62% want assignment redesign help. 58% want integrity guidance.',
    options: [
      { label: 'Institutional backing: enforcement that works', value: 1 },
      { label: 'Practical examples from faculty in my discipline', value: 2 },
      { label: 'Assignment redesign: help rethinking assessments', value: 3 },
      { label: 'Curriculum integration: using AI as a pedagogical tool', value: 4 },
      { label: 'Advanced strategies: pushing the frontier', value: 5 },
    ],
  },
]

// ── Stance Practice Content ──────────────────────────────────────────────────

export interface StancePractice {
  canDo: string[]
  cantDo: string[]
  syllabus: string
}

export const STANCE_PRACTICE: Record<AIStance, StancePractice> = {
  PROHIBIT: {
    canDo: [
      'Use standard spell-check, search engines, and library databases',
      'Discuss ideas with classmates and visit the writing center',
      'Use AI tools for personal curiosity outside of graded work',
    ],
    cantDo: [
      'Use generative AI to draft, paraphrase, or edit submitted work',
      'Use AI to answer prompts, solve problem sets, or summarize readings',
      'Use AI-powered rewriting tools (e.g., Grammarly AI, QuillBot paraphraser)',
    ],
    syllabus: 'All submitted work must be entirely your own. The use of generative AI tools is not permitted for any coursework unless explicitly stated otherwise.',
  },
  CAUTIOUS: {
    canDo: [
      'Use AI for brainstorming ideas and exploring possible angles on a topic',
      'Use AI for grammar and sentence-level clarity (not rewriting)',
      'Ask AI to explain a concept you are struggling with',
    ],
    cantDo: [
      'Have AI generate draft text, paragraphs, or sections of any assignment',
      'Use AI to answer discussion questions or produce outlines you submit',
      'Copy AI explanations into your work or use AI to summarize assigned readings',
    ],
    syllabus: 'AI may be used for brainstorming and grammar checking only. All substantive content — your analysis, arguments, and ideas — must be your own.',
  },
  GUIDED: {
    canDo: [
      'Use AI at the level specified per assignment (Prohibited, Limited, Guided, or Required)',
      'Collaborate with AI on Guided-level assignments with full disclosure',
      'Use AI for research and iteration when the assignment permits it',
    ],
    cantDo: [
      'Use AI on assignments marked Prohibited or beyond the specified level',
      'Submit AI-assisted work without an AI Usage Statement',
      'Present AI-generated content as entirely your own original thinking',
    ],
    syllabus: 'Each assignment specifies its own AI use level. When AI is permitted, you must disclose what tools you used, how you used them, and how you verified the output.',
  },
  INTEGRATE: {
    canDo: [
      'Use AI as a standard tool for drafting, analyzing, and iterating on work',
      'Submit AI-assisted deliverables with process reflections',
      'Critically evaluate and build on AI output with your own domain expertise',
    ],
    cantDo: [
      'Submit raw, unreviewed AI output without critical engagement',
      'Skip process reflections documenting your AI collaboration',
      'Fabricate data, citations, or sources (whether by you or by AI)',
    ],
    syllabus: 'AI is a standard learning tool in this course. You are expected to use it critically, document your process, and bring your own judgment to every deliverable.',
  },
  REQUIRE: {
    canDo: [
      'Must use AI on every major assignment — not using AI is an incomplete submission',
      'Submit full prompt-response chains as part of your deliverable',
      'Compare outputs across AI platforms and evaluate their strengths',
    ],
    cantDo: [
      'Submit work without demonstrating AI engagement and critical reflection',
      'Let AI do the thinking — raw AI output without your value-add earns a low grade',
      'Use AI on assignments specifically marked as AI-free skill-building exercises',
    ],
    syllabus: 'AI use is mandatory. You will be assessed on prompt quality, critical evaluation of AI output, and the human expertise you bring to the collaboration.',
  },
}

// ── Stance Detail Content ────────────────────────────────────────────────────

export interface StanceDetail {
  stance: AIStance
  label: string
  philosophy: string
  syllabusLanguage: string
  assignmentImplications: string[]
  studentCommunication: string
  commonConcerns: string[]
  disciplineAffinity: string[]
  peerPractices: string[]
  color: string
}

export const STANCE_DETAILS: Record<AIStance, StanceDetail> = {
  PROHIBIT: {
    stance: 'PROHIBIT',
    label: 'Prohibit',
    philosophy: 'You believe students must develop skills without AI assistance. The learning process itself — struggling with ideas, finding your own voice, building from scratch — is the education.',
    syllabusLanguage: `This course is designed to develop your ability to think, write, analyze, and solve problems independently — skills that can only be built through sustained, unassisted practice. For that reason, the use of generative AI tools (including but not limited to ChatGPT, Claude, Copilot, Gemini, Perplexity, and similar systems) is not permitted for any coursework unless a specific assignment explicitly states otherwise in writing.

What this means in practice:
• You may not use AI to generate, draft, paraphrase, restructure, or substantially edit text, code, solutions, or other content that you submit as your own work.
• You may not use AI to answer discussion prompts, summarize assigned readings, solve problem sets, or produce analysis on your behalf.
• You may not use AI-powered grammar or editing tools that go beyond basic spell-check (e.g., Grammarly's AI rewrite features, QuillBot's paraphraser). Standard spell-check and autocorrect are fine.
• You may use AI tools for activities unrelated to graded coursework — for example, to explore a topic out of personal curiosity — but nothing produced by AI may appear in submitted work.

If you are uncertain whether a specific tool or use qualifies as generative AI, ask before the assignment is due — not after.

Why this policy: The learning outcomes of this course depend on developing skills through the process of doing the work yourself. Struggle, revision, and even productive failure are central to how expertise develops in this field. AI shortcuts bypass the very learning this course is designed to produce.`,
    assignmentImplications: [
      'Favor in-class, proctored, or embodied assessments where AI use is physically impossible',
      'Require process documentation (drafts, outlines, revision history) as evidence of authentic work',
      'Consider oral exams, presentations, or live demonstrations as alternative assessment',
      'Handwritten components where discipline-appropriate',
      'Design assignments around experiences AI cannot replicate (fieldwork, lab work, performances)',
    ],
    studentCommunication: 'I\'m asking you not to use AI in this course because the skills you\'re building here — original thinking, your own voice, working through difficulty — can only develop through practice. There are no shortcuts to learning to think, and the struggle is where the learning happens.',
    commonConcerns: [
      'Students will use it anyway and you can\'t prove it',
      'You may feel out of step with institutional messaging about AI adoption',
      'Some students may view the policy as outdated or unrealistic',
      'The line between "basic spell-check" and "AI editing" can be blurry',
    ],
    disciplineAffinity: ['Creative writing', 'Philosophy', 'Foreign languages', 'Mathematics (foundations)', 'Fine arts'],
    peerPractices: [
      'Shifting weight from take-home to in-class assessments',
      'Requiring handwritten drafts before typed submissions',
      'Designing assignments AI literally cannot do (embodied, experiential)',
      'Using in-class writing samples as baselines for comparison',
    ],
    color: 'red',
  },
  CAUTIOUS: {
    stance: 'CAUTIOUS',
    label: 'Cautious',
    philosophy: 'You allow AI for limited, low-stakes tasks (brainstorming, grammar checking) but want students to do the substantive intellectual work themselves.',
    syllabusLanguage: `This course permits the limited use of generative AI tools for low-stakes support tasks — brainstorming, grammar checking, and concept clarification. However, the substantive intellectual work of the course (your analysis, your arguments, your ideas, your writing) must be your own.

Permitted uses:
• Brainstorming: You may ask an AI tool to help you generate ideas, explore possible angles on a topic, or identify questions worth investigating. The ideas you develop from that brainstorming must be your own.
• Grammar and clarity: You may use AI to check grammar, punctuation, or sentence-level clarity — similar to how you might use a writing center tutor. You may not use AI to rewrite, restructure, or substantially revise your prose.
• Concept clarification: You may ask an AI tool to explain a concept you are struggling with, much as you would ask a classmate or look up a video. You may not copy the AI's explanation into your assignment.

Prohibited uses:
• Generating draft text, paragraphs, or sections of any assignment
• Having AI answer discussion questions, problem sets, or exam prompts
• Using AI to summarize readings you were assigned to read yourself
• Producing outlines or organizational structures that you submit as your own planning work
• Fabricating citations, data, or sources

Why this policy: AI is now part of the academic landscape, and there is space to use it responsibly for support tasks. At the same time, the core competencies of this course — critical thinking, original analysis, and clear written expression — require that you do the substantive work yourself. The line is this: AI can help you prepare and polish, but it cannot do the thinking for you.`,
    assignmentImplications: [
      'Clearly label which tasks allow AI and which don\'t',
      'Designate "AI-free" zones for core skill-building assignments',
      'Require disclosure of any AI use, even when permitted',
      'Add "How did you approach this?" reflection questions',
      'Require first drafts before any AI editing to establish baseline',
    ],
    studentCommunication: 'AI can help you brainstorm or clean up your writing, but the ideas, analysis, and arguments need to be yours. If you find yourself unsure where brainstorming ends and composing begins, that\'s a sign to stop and ask.',
    commonConcerns: [
      'The line between brainstorming and composing is fuzzy for students',
      'Enforcement is difficult for even "limited" use policies',
      'Students may not understand the distinction you\'re drawing',
      'Permitted uses may gradually expand through "scope creep"',
    ],
    disciplineAffinity: ['Sciences (lab courses)', 'Social sciences', 'Education', 'General education / UK Core'],
    peerPractices: [
      '"AI Use Scale" per assignment (adapted from CELT)',
      'Requiring first drafts before any AI editing',
      'In-class writing samples as baseline for comparison',
      'Pairing take-home work with in-class follow-up to verify understanding',
    ],
    color: 'amber',
  },
  GUIDED: {
    stance: 'GUIDED',
    label: 'Guided',
    philosophy: 'You believe AI should be part of the learning experience, but with explicit structure. Students need to learn how to use AI responsibly.',
    syllabusLanguage: `This course treats generative AI as a learning tool that you should understand how to use — and how not to use. Rather than a single blanket rule, each assignment will specify its own level of permitted AI use using the following framework:

• Prohibited — No AI tools may be used for any part of this assignment. Your work must be entirely your own.
• Limited — AI may be used for brainstorming and grammar/editing only. All substantive content, analysis, and arguments must be your own.
• Guided — AI may be used as a collaborative tool with full disclosure. You must describe what AI tools you used, how you used them, what the AI produced, and how you verified, modified, or built upon its output.
• Required — AI use is mandatory for this assignment. You will be assessed on the quality of your prompts, your critical evaluation of AI output, and how you shaped the final product.

Every assignment will be clearly labeled with its AI level. If an assignment does not specify a level, assume Limited as the default.

When AI use is permitted at the Guided or Required level, you must include an AI Usage Statement with your submission that addresses: (1) which AI tool(s) you used, (2) what task(s) you used them for, and (3) how you verified or modified the AI output. Failure to include a disclosure statement when required constitutes a violation of academic integrity, regardless of how the AI was used.

Why this policy: AI tools are powerful, imperfect, and increasingly unavoidable. Rather than pretend they do not exist, this course teaches you to be intentional about when and how you use them. Some skills are best built without AI assistance; others are enriched by learning to collaborate with AI critically. The assignment-level framework gives us the flexibility to match the right approach to each learning goal.`,
    assignmentImplications: [
      '4-level framework per assignment (Prohibited / Limited / Guided / Required)',
      'AI usage statements required on Guided and Required submissions',
      'Mix of AI-prohibited and AI-guided assignments within a course',
      'Reflection and critique components ("What did AI get wrong?")',
      'Default to Limited when no level is specified',
    ],
    studentCommunication: 'I expect you to learn to use AI wisely — that means knowing when it helps, when it gets in the way of your learning, and always being transparent about how you used it.',
    commonConcerns: [
      'Managing a mix of policies within one course is complex',
      'Students may apply "guided" assumptions to "prohibited" assignments',
      'More grading work when evaluating AI usage statements',
      'Students need to understand the 4-level framework clearly from day one',
    ],
    disciplineAffinity: ['Social sciences', 'Education', 'Health sciences', 'Interdisciplinary programs'],
    peerPractices: [
      'Co-writing AI policy with students on first day',
      'Having students critique AI-generated outputs for accuracy',
      'Pairing AI-assisted take-home work with in-class defenses',
      'Using reflection assignments to build metacognition about AI use',
    ],
    color: 'blue',
  },
  INTEGRATE: {
    stance: 'INTEGRATE',
    label: 'Integrate',
    philosophy: 'AI is a pedagogical tool, like a calculator or library database. Your focus is teaching students to use it well — to prompt effectively, evaluate critically, and produce better work because of AI.',
    syllabusLanguage: `Generative AI is integrated into this course as a standard learning tool — much like a calculator in a statistics course or a database in a research methods course. You will use AI tools regularly to brainstorm, draft, analyze, iterate, and refine your work. The goal is not to produce work without AI, but to produce excellent work with AI — which requires judgment, critical evaluation, and domain expertise that only you can provide.

What this means in practice:
• AI use is the default for most assignments in this course. Some specific assignments may restrict AI use to protect particular skill-building objectives — these will be clearly marked.
• You are expected to critically evaluate all AI-generated content before incorporating it into your work. AI tools hallucinate, oversimplify, miss context, and produce plausible-sounding nonsense. Your job is to catch that.
• You are the author of record for everything you submit. "The AI wrote it" is not a defense for errors, unsupported claims, fabricated citations, or low-quality work. AI is a tool; you are the professional using it.

Assessment approach: Your work will be evaluated on the quality of the final product and the quality of your process — including the sophistication of your prompts, your critical evaluation of AI output, your value-add (domain knowledge, ethical judgment, creative insight, audience awareness), and the iterative quality of your human-AI collaboration.

For each major assignment, include a brief process reflection describing your AI collaboration — what worked, what did not, and what you learned about effective human-AI partnership.

Ethical boundaries that still apply: Even in a course that integrates AI, fabricating data, citations, or sources (whether by you or by AI), submitting AI output without any review or critical engagement, using AI on assignments marked as AI-free, and misrepresenting your level of engagement with the AI process all remain violations.

Why this policy: Professionals in this field already use AI daily. Graduating without the ability to use AI effectively, critically, and ethically would be a disservice to you. This course treats AI competence as a skill to be taught, not a threat to be managed.`,
    assignmentImplications: [
      'AI is the default for most assignments (some may still be AI-free for skill-building)',
      'Assignments designed around AI interaction: prompt → evaluate → revise → reflect',
      'Assessment focuses on student judgment, critical evaluation, and value-add',
      'Portfolio approaches showing human-AI collaboration process',
      'Process reflections required documenting AI collaboration quality',
    ],
    studentCommunication: 'AI is a powerful tool and you\'ll use it throughout this course. But using AI well is a skill — it takes practice, judgment, and critical thinking. You will be assessed not just on what you produce, but on how thoughtfully you collaborate with AI.',
    commonConcerns: [
      'Students may lean on AI too heavily and miss foundational learning',
      'Hard to assess what the student actually contributed vs. the AI',
      'Staying current with rapidly evolving AI capabilities',
      'Students may submit raw AI output without critical engagement',
    ],
    disciplineAffinity: ['Business', 'Engineering', 'Computer science', 'Data science', 'Journalism', 'Design'],
    peerPractices: [
      'Students build AI simulations and verify against own calculations',
      'AI-generated first drafts with tracked student revisions',
      'Comparative analysis: student vs. AI vs. expert solution',
      'Process portfolios documenting iterative human-AI refinement',
    ],
    color: 'green',
  },
  REQUIRE: {
    stance: 'REQUIRE',
    label: 'Require',
    philosophy: 'AI fluency is a core learning outcome. Your graduates will use AI daily in their careers, and your course prepares them for that reality.',
    syllabusLanguage: `This course requires the use of generative AI tools as a core component of your professional preparation. You will be assessed not just on what you produce, but on how effectively you collaborate with AI systems — your ability to prompt strategically, evaluate output critically, iterate purposefully, and exercise professional judgment in human-AI workflows.

What is required:
• You must use at least one generative AI tool (ChatGPT, Claude, Copilot, or equivalent) on every major assignment unless the assignment specifically states otherwise.
• You must submit your full prompt-response chain (or a representative sample for lengthy interactions) alongside your final deliverable. Your prompting strategy is part of what is graded.
• You must include a critical reflection with each submission: What did the AI do well? Where did it fall short? What did you change and why? What would you do differently next time?

How you will be graded:
• Prompt quality — Clear context-setting, specific instructions, iterative refinement, strategic use of constraints and examples.
• Critical evaluation — Identifying errors, hallucinations, bias, oversimplification, or missing nuance in AI output.
• Human value-add — Domain expertise, ethical judgment, audience awareness, creative insight, and professional standards that you bring to the collaboration.
• Final product quality — A polished, professional-quality deliverable that meets the standards of the field.

What this does NOT mean: "Required" does not mean "let AI do it for you." Submitting raw, unreviewed AI output will result in a low grade — not because you used AI, but because you failed to do your job as the professional in the loop. "Required" also does not mean "any AI tool for any purpose." Specific assignments may designate which tools to use, especially when comparing outputs across platforms.

Equity and access: Free-tier tools (ChatGPT free, Claude free, Gemini) are sufficient for all course requirements. If you encounter access barriers, contact the instructor immediately — no student's grade will suffer because of tool access.

This course includes explicit instruction on AI ethics — bias, hallucination, appropriate use boundaries, data privacy, and the professional responsibility that comes with deploying AI in real-world contexts. Using AI effectively includes knowing when not to use it.`,
    assignmentImplications: [
      'AI is mandatory for most/all assignments — not using AI is an incomplete submission',
      'Prompt engineering is explicitly taught and assessed',
      'Output evaluation rubrics include AI collaboration quality across four dimensions',
      'Full prompt-response chains submitted as part of assignment deliverables',
      'Ethics component: bias, hallucination, appropriate use boundaries, data privacy',
    ],
    studentCommunication: 'Your future employers expect you to work with AI. This course teaches you how — not just the mechanics, but the judgment to know when AI helps, when it misleads, and when to rely on your own expertise instead.',
    commonConcerns: [
      'Equity: not all students have equal AI tool access (mitigate with free-tier sufficiency)',
      'Discipline may split on whether requiring AI is appropriate',
      'Rapidly changing tools make curriculum unstable',
      'Students may confuse "required" with "let AI do everything"',
    ],
    disciplineAffinity: ['Business analytics', 'Software engineering', 'Data science', 'Digital marketing', 'Instructional design'],
    peerPractices: [
      'Advisory board-aligned AI competency frameworks',
      'Full prompt-response chains submitted as part of assignment',
      'Cross-comparison: solve with AI vs. without → reflect on differences',
      'Peer review of prompting strategies and AI collaboration process',
    ],
    color: 'purple',
  },
}
