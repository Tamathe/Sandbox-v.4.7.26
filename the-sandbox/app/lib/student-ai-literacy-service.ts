// ── Student AI Literacy Module Content ────────────────────────────────────────

export interface LiteracyLesson {
  id: string
  title: string
  description: string
  estimatedMinutes: number
  sections: { heading: string; content: string }[]
  keyTakeaways: string[]
  quizQuestions: { question: string; options: string[]; correctIndex: number; explanation: string }[]
}

export const STUDENT_MODULES: LiteracyLesson[] = [
  {
    id: 'responsible-use',
    title: 'Using AI Responsibly',
    description: 'What responsible AI use looks like in an academic context — and why it matters for your learning.',
    estimatedMinutes: 12,
    sections: [
      { heading: 'AI is a Tool, Not a Shortcut', content: 'Generative AI tools like ChatGPT and Claude are powerful. They can write essays, solve problems, summarize readings, and generate code. But using them to bypass learning is like using a calculator before you understand math — you get answers without building the skills your degree is meant to develop.\n\nResponsible AI use means using these tools to enhance your learning, not replace it. A student who uses AI to brainstorm ideas and then writes their own argument is learning. A student who pastes a prompt and submits the output is not.' },
      { heading: 'Every Course Has Its Own Rules', content: 'There is no single university-wide rule about AI. Each of your professors sets their own policy, and those policies can vary — even within the same department. Some courses prohibit all AI use. Others require it. Most fall somewhere in between.\n\nYour responsibility: read each syllabus, understand the AI policy, and follow it. If you are not sure, ask before submitting.' },
      { heading: 'Disclosure is Non-Negotiable', content: 'When a course permits AI use, you must disclose it. This means stating what tool you used, what you used it for, and how you modified the output. Undisclosed AI use — even when AI is permitted — is a form of academic dishonesty.\n\nThink of it like citing a source: you did not write the original text, so you give credit. The same applies to AI-generated content.' },
      { heading: 'AI Gets Things Wrong', content: 'AI tools hallucinate — they generate confident-sounding text that is factually incorrect, cites sources that do not exist, and oversimplifies nuanced topics. If you submit AI output without verifying it, you are putting your name on someone else\'s mistakes.\n\nYou are responsible for the accuracy of everything you submit, regardless of whether AI was involved.' },
    ],
    keyTakeaways: [
      'AI is a tool, not a replacement for learning',
      'Check each course\'s specific AI policy',
      'Always disclose AI use when permitted',
      'You are responsible for the accuracy of AI output',
    ],
    quizQuestions: [
      { question: 'A course allows AI for "brainstorming only." You use ChatGPT to generate a full outline with topic sentences. Is this within policy?', options: ['Yes — an outline is just brainstorming', 'No — generating topic sentences goes beyond brainstorming', 'It depends on the professor\'s mood', 'Only if you change a few words'], correctIndex: 1, explanation: 'Brainstorming means generating raw ideas, not structured content. A full outline with topic sentences is substantive content, not brainstorming.' },
      { question: 'You use AI to check your grammar and submit the polished version. Do you need to disclose this?', options: ['No — grammar checking isn\'t "using AI"', 'Yes, if the course policy requires disclosure of any AI use', 'Only if the AI changed more than 5 words', 'No — everyone does it'], correctIndex: 1, explanation: 'Disclosure requirements vary by course. If the policy says "disclose any AI use," grammar checking counts. When in doubt, disclose.' },
      { question: 'AI generates a paragraph that sounds great but cites a source you can\'t find. What should you do?', options: ['Include it — the AI probably knows more sources than you', 'Remove the citation and keep the paragraph', 'Do not use the paragraph without verifying all claims', 'Ask the AI to fix the citation'], correctIndex: 2, explanation: 'AI frequently fabricates citations. You must verify all facts and sources independently. Submitting fabricated citations is academic misconduct.' },
    ],
  },
  {
    id: 'when-not-to-use',
    title: 'When NOT to Use AI',
    description: 'Understanding when AI hinders your learning — and why some skills require struggle.',
    estimatedMinutes: 10,
    sections: [
      { heading: 'The Skills That Require Struggle', content: 'Some skills only develop through practice — writing your own sentences, solving problems step by step, debugging code line by line, analyzing texts closely. These processes are uncomfortable, but the discomfort IS the learning.\n\nWhen AI does this work for you, you feel productive but learn nothing. It is the academic equivalent of watching someone else exercise.' },
      { heading: 'Foundational Knowledge', content: 'Before you can use AI wisely, you need foundational knowledge to evaluate its output. A first-year chemistry student who uses AI to answer problem sets never builds the intuition to recognize when AI gives a physically impossible answer.\n\nYour early courses build foundations. Skip them at your own risk — you will hit a wall later when nothing makes sense.' },
      { heading: 'When Your Professor Says No', content: 'If a course prohibits AI, that is the rule. The professor has a pedagogical reason. Maybe the course is specifically building a skill that AI would bypass. Maybe the assessment only works if the work is entirely yours.\n\nUsing AI against course policy is academic misconduct, regardless of how easy it would be.' },
    ],
    keyTakeaways: [
      'Struggle is learning — AI that removes struggle removes learning',
      'Build foundational knowledge before relying on tools',
      'Respect course-specific prohibitions — they exist for pedagogical reasons',
    ],
    quizQuestions: [
      { question: 'You\'re struggling with a calculus problem set. The most learning-effective approach is:', options: ['Use AI to solve it and study the solutions', 'Struggle with it yourself, then check specific steps you\'re stuck on', 'Copy a friend\'s work and try to understand it', 'Skip it — homework doesn\'t matter'], correctIndex: 1, explanation: 'The struggle itself builds mathematical intuition. Using AI for specific stuck points (after attempting) is learning; having AI solve everything is not.' },
    ],
  },
  {
    id: 'citing-ai',
    title: 'Citing AI Work',
    description: 'How to properly cite and disclose AI contributions in your academic work.',
    estimatedMinutes: 8,
    sections: [
      { heading: 'The AI Usage Statement', content: 'When AI use is permitted and you have used it, include an AI Usage Statement at the end of your submission. This statement should include:\n\n1. Which tool(s) you used (e.g., ChatGPT, Claude, Copilot)\n2. What you used them for (e.g., brainstorming, grammar checking, generating a first draft)\n3. How you modified or verified the output\n\nExample: "I used Claude to brainstorm 5 possible thesis directions. I selected one and wrote the full essay myself. I then used Grammarly for grammar checking."' },
      { heading: 'Formal Citations', content: 'If you quote or closely paraphrase AI output in your work, cite it. APA, MLA, and Chicago all have guidelines for citing AI:\n\n• APA: OpenAI. (2026). ChatGPT (Mar 2026 version) [Large language model]. https://chat.openai.com\n• MLA: "Prompt text" prompt. ChatGPT, 25 Mar. 2026 version, OpenAI.\n\nCheck your style guide for the latest format. When in doubt, over-cite rather than under-cite.' },
    ],
    keyTakeaways: [
      'Include an AI Usage Statement when you use AI in permitted contexts',
      'Cite AI output using your discipline\'s citation style',
      'Over-disclose rather than under-disclose',
    ],
    quizQuestions: [
      { question: 'Which of these is the best AI Usage Statement?', options: ['"I used AI."', '"I used ChatGPT for brainstorming thesis ideas. I selected the direction myself and wrote all content. I used Grammarly for final grammar check."', '"ChatGPT helped with my paper."', '"AI was involved in some parts."'], correctIndex: 1, explanation: 'A good AI Usage Statement is specific: which tool, what for, and what you did yourself.' },
    ],
  },
  {
    id: 'critical-evaluation',
    title: 'Critical Evaluation of AI Output',
    description: 'How to spot AI errors, hallucinations, and biases — and why you must verify everything.',
    estimatedMinutes: 12,
    sections: [
      { heading: 'AI Hallucinations Are Real', content: 'AI regularly generates text that is confidently wrong. It fabricates citations, invents historical events, produces incorrect calculations, and writes plausible-sounding nonsense. These are called "hallucinations."\n\nThe danger: AI output looks authoritative. It uses academic language, proper formatting, and confident tone. You cannot tell it is wrong just by reading it — you have to check.' },
      { heading: 'Verification Strategies', content: '1. Cross-reference every factual claim with a reliable source\n2. Check every citation — does the source exist? Does it say what the AI claims?\n3. Test calculations independently\n4. Look for vague hedging ("some scholars argue," "it is widely believed") — this often masks fabrication\n5. Ask: does this make specific, verifiable claims, or does it just sound smart?' },
      { heading: 'Bias in AI Output', content: 'AI systems reflect biases in their training data. They may underrepresent certain perspectives, default to Western/English-language sources, oversimplify complex cultural topics, or reproduce stereotypes.\n\nCritical evaluation means asking: whose perspective is missing? What assumptions is this output making? Would an expert in this field agree with this framing?' },
    ],
    keyTakeaways: [
      'AI hallucinations look authoritative — verification is essential',
      'Check every citation and factual claim independently',
      'AI has biases — question whose perspective is represented',
    ],
    quizQuestions: [
      { question: 'AI gives you a paragraph about a historical event with a citation to a journal article. You should:', options: ['Trust it — AI has access to lots of sources', 'Look up the journal article to verify it exists and says what the AI claims', 'Only check if it seems wrong', 'Replace the citation with a Wikipedia link'], correctIndex: 1, explanation: 'AI fabricates citations frequently. Always verify that cited sources (a) exist, (b) say what the AI claims, and (c) are appropriate for academic work.' },
    ],
  },
]

export function getModuleById(id: string): LiteracyLesson | undefined {
  return STUDENT_MODULES.find(m => m.id === id)
}
