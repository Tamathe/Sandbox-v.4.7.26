import Anthropic from '@anthropic-ai/sdk'
import { prisma } from './prisma'
import type { AIStance } from '../generated/prisma'

const anthropic = new Anthropic()
const HAIKU_MODEL = 'claude-haiku-4-5-20251001'

// ── Types ────────────────────────────────────────────────────────────────────

export interface Vulnerability {
  type: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export interface RedesignSuggestion {
  title: string
  description: string
  effort: 'low' | 'medium' | 'high'
  bloomShift: string | null
  example: string
}

export interface ScanResult {
  aiCompletability: number // 0-100
  bloomLevel: string
  vulnerabilities: Vulnerability[]
  suggestions: RedesignSuggestion[]
  summary: string
}

// ── Scan Assignment via Haiku ────────────────────────────────────────────────

export async function scanAssignment(
  assignmentText: string,
  assignmentType?: string,
  discipline?: string,
): Promise<ScanResult> {
  const systemPrompt = `You are an expert in AI-resilient assessment design at a university. You analyze assignment prompts to determine how easily a student could use generative AI (ChatGPT, Claude, etc.) to complete them without learning.

Respond ONLY with valid JSON matching this exact schema:
{
  "aiCompletability": <number 0-100, where 100 means AI can fully complete it>,
  "bloomLevel": "<primary Bloom's level: Remember, Understand, Apply, Analyze, Evaluate, Create>",
  "vulnerabilities": [
    {"type": "<short label>", "description": "<1-2 sentences>", "severity": "<low|medium|high|critical>"}
  ],
  "suggestions": [
    {"title": "<short title>", "description": "<2-3 sentences>", "effort": "<low|medium|high>", "bloomShift": "<e.g. 'Remember → Analyze' or null>", "example": "<concrete example text for the redesigned element>"}
  ],
  "summary": "<2-3 sentence overall assessment>"
}

Provide 2-5 vulnerabilities and 3-6 suggestions. Be specific and actionable. Reference the discipline if provided.`

  const userPrompt = `Analyze this assignment for AI vulnerability:

${assignmentType ? `Assignment type: ${assignmentType}` : ''}
${discipline ? `Discipline: ${discipline}` : ''}

Assignment text:
"""
${assignmentText.slice(0, 3000)}
"""`

  try {
    const response = await anthropic.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('')

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')

    const parsed = JSON.parse(jsonMatch[0]) as ScanResult
    return {
      aiCompletability: Math.min(100, Math.max(0, parsed.aiCompletability)),
      bloomLevel: parsed.bloomLevel || 'Unknown',
      vulnerabilities: (parsed.vulnerabilities || []).slice(0, 5),
      suggestions: (parsed.suggestions || []).slice(0, 6),
      summary: parsed.summary || 'Analysis complete.',
    }
  } catch {
    // Fallback heuristic analysis if Haiku fails
    return heuristicScan(assignmentText, assignmentType)
  }
}

// ── Heuristic Fallback ───────────────────────────────────────────────────────

function heuristicScan(text: string, assignmentType?: string): ScanResult {
  const lower = text.toLowerCase()
  const vulnerabilities: Vulnerability[] = []
  const suggestions: RedesignSuggestion[] = []
  let score = 50

  // Check for AI-vulnerable patterns
  if (lower.includes('essay') || lower.includes('write a') || lower.includes('write an')) {
    score += 20
    vulnerabilities.push({ type: 'Generic writing prompt', description: 'Open-ended writing prompts are highly completable by AI without deep understanding.', severity: 'high' })
    suggestions.push({
      title: 'Add process checkpoints',
      description: 'Require submission of brainstorm notes, outline, and first draft before the final version. Grade the process, not just the output.',
      effort: 'medium',
      bloomShift: 'Remember → Analyze',
      example: 'Submit: (1) annotated bibliography by Week 3, (2) thesis + outline by Week 5, (3) first draft by Week 7 with tracked changes, (4) final draft with reflection on revisions.',
    })
  }

  if (lower.includes('summarize') || lower.includes('summary')) {
    score += 15
    vulnerabilities.push({ type: 'Summarization task', description: 'AI excels at summarizing text. Students can complete this without reading the source material.', severity: 'high' })
    suggestions.push({
      title: 'Replace with critical analysis',
      description: 'Instead of summarizing, ask students to identify what the author got wrong, what\'s missing, or how the argument applies to a specific scenario.',
      effort: 'low',
      bloomShift: 'Understand → Evaluate',
      example: 'Read [source]. Identify two claims the author makes that you disagree with. For each, explain why using evidence from a different source.',
    })
  }

  if (lower.includes('research paper') || lower.includes('research report')) {
    score += 15
    vulnerabilities.push({ type: 'Traditional research paper', description: 'Standard research papers can be AI-generated with minimal student input. The format rewards information assembly over original thinking.', severity: 'critical' })
    suggestions.push({
      title: 'Add oral defense component',
      description: 'Pair the written submission with a 10-minute oral defense where students must explain their methodology, defend their claims, and answer questions.',
      effort: 'medium',
      bloomShift: null,
      example: 'After submitting your paper, you will present a 10-minute defense to the class. Be prepared to explain why you chose your sources, how you evaluated conflicting evidence, and what limitations your analysis has.',
    })
  }

  if (!lower.includes('class') && !lower.includes('in-person') && !lower.includes('proctored')) {
    vulnerabilities.push({ type: 'No in-class component', description: 'Entirely take-home work has no verification that the student did the work themselves.', severity: 'medium' })
    suggestions.push({
      title: 'Add in-class writing sample',
      description: 'Have students write a brief response in class that connects to their take-home work. This creates a baseline for comparison.',
      effort: 'low',
      bloomShift: null,
      example: 'In-class warm-up (15 min): Write a one-paragraph response connecting [topic from homework] to today\'s reading. This is graded for completion and compared to your submitted work.',
    })
  }

  if (!lower.includes('reflect') && !lower.includes('reflection') && !lower.includes('metacognit')) {
    vulnerabilities.push({ type: 'No metacognitive element', description: 'Without reflection, students bypass the learning process even when they do the work themselves.', severity: 'low' })
    suggestions.push({
      title: 'Add reflection prompts',
      description: 'Ask students to describe their process: what was hard, what surprised them, how their thinking changed. AI-generated reflections are noticeably generic.',
      effort: 'low',
      bloomShift: 'Apply → Evaluate',
      example: 'Reflection (200 words): What was the hardest part of this assignment? What did you learn that you didn\'t expect? If you used any AI tools, describe specifically what you used them for and what you changed in the output.',
    })
  }

  score = Math.min(95, Math.max(10, score))

  return {
    aiCompletability: score,
    bloomLevel: score > 70 ? 'Remember/Understand' : score > 40 ? 'Apply/Analyze' : 'Evaluate/Create',
    vulnerabilities,
    suggestions,
    summary: score > 70
      ? 'This assignment has significant AI vulnerability. Most of it could be completed by AI with minimal student learning.'
      : score > 40
        ? 'This assignment has moderate AI vulnerability. Some components are AI-completable but others require genuine engagement.'
        : 'This assignment has relatively low AI vulnerability. It includes elements that are difficult for AI to replicate.',
  }
}

// ── Fetch Existing Assignments ───────────────────────────────────────────────

export async function getAssignmentsForUser(userId: string) {
  const courses = await prisma.course.findMany({
    where: { instructorId: userId },
    select: {
      id: true,
      courseCode: true,
      title: true,
      assignments: { select: { id: true, title: true, description: true, category: true, type: true } },
    },
  })
  return courses
}

// ── Redesign with Template ──────────────────────────────────────────────────

export async function redesignWithTemplate(
  assignmentText: string,
  suggestionTitle: string,
  suggestionDescription: string,
): Promise<{ redesigned: string; explanation: string }> {
  const systemPrompt = `You are an expert in AI-resilient assessment design. A faculty member wants to redesign their assignment based on a specific suggestion. Generate a complete redesigned assignment prompt and a brief explanation of the changes.

Respond ONLY with valid JSON:
{
  "redesigned": "<the full redesigned assignment text>",
  "explanation": "<2-3 sentences explaining what changed and why it improves AI-resilience>"
}`

  const userPrompt = `Original assignment:
"""
${assignmentText.slice(0, 3000)}
"""

Redesign approach: ${suggestionTitle}
Details: ${suggestionDescription}

Generate the redesigned assignment.`

  try {
    const response = await anthropic.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('')

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')

    return JSON.parse(jsonMatch[0])
  } catch {
    return {
      redesigned: `[Redesigned using "${suggestionTitle}"]\n\n${assignmentText}`,
      explanation: `Applied the "${suggestionTitle}" approach: ${suggestionDescription}`,
    }
  }
}

// ── Redesign Templates ───────────────────────────────────────────────────────

export interface RedesignTemplate {
  id: string
  originalType: string
  redesignApproach: string
  description: string
  bloomShift: string
  effort: 'low' | 'medium' | 'high'
  before: string
  after: string
}

export const REDESIGN_TEMPLATES: RedesignTemplate[] = [
  {
    id: 'essay-to-portfolio',
    originalType: 'Take-home essay',
    redesignApproach: 'Process Portfolio',
    description: 'Replace a single final essay with a staged portfolio: brainstorm → annotated outline → peer-reviewed draft → revised final with change log.',
    bloomShift: 'Remember → Analyze/Evaluate',
    effort: 'medium',
    before: 'Write a 2000-word essay on [topic]. Due Friday.',
    after: 'Portfolio submission (4 stages):\n• Week 1: Submit 3 possible thesis statements with 1-paragraph rationale for each\n• Week 3: Annotated outline with source annotations (what each source contributes)\n• Week 5: Full draft submitted for peer review (2 peers provide written feedback)\n• Week 7: Final version with tracked changes + 300-word reflection on how feedback changed your argument',
  },
  {
    id: 'problem-set-hybrid',
    originalType: 'Take-home problem set',
    redesignApproach: 'In-class + take-home hybrid',
    description: 'Split problem sets: routine practice done at home (AI-ok), conceptual problems done in class with explanation.',
    bloomShift: 'Apply → Analyze',
    effort: 'low',
    before: 'Complete problems 1-20 from Chapter 5. Show your work.',
    after: 'Part A (take-home, AI permitted): Problems 1-10. Use any tools. Document what you used.\nPart B (in-class, no devices): 3 conceptual problems requiring explanation of WHY the method works.\nGrading: Part A = 30%, Part B = 70%',
  },
  {
    id: 'research-paper-staged',
    originalType: 'Research paper',
    redesignApproach: 'Staged submission with oral defense',
    description: 'Break the research paper into checkpoints with an oral defense. Students explain their choices, not just present findings.',
    bloomShift: 'Understand → Evaluate/Create',
    effort: 'high',
    before: 'Write a 10-page research paper on a topic of your choice. APA format. Due end of semester.',
    after: 'Research project (5 checkpoints):\n• Proposal: 1-page topic + research question + why it matters to you personally\n• Source audit: 8 sources with 2-sentence evaluation of each (reliability, bias, relevance)\n• Draft with methodology section explaining how you found and filtered sources\n• Final paper (8-10 pages)\n• 10-minute oral defense: explain your methodology, defend claims, answer 3 questions from instructor',
  },
  {
    id: 'group-project-accountability',
    originalType: 'Group project',
    redesignApproach: 'Individual accountability layers',
    description: 'Keep the group collaboration but add individual deliverables: personal reflection, individual quiz on group content, peer evaluation with specifics.',
    bloomShift: 'Apply → Evaluate',
    effort: 'medium',
    before: 'Work in groups of 4 to create a presentation on [topic]. Present to the class.',
    after: 'Group presentation (team grade: 50%) + Individual components (individual grade: 50%):\n• Individual: 1-page written analysis of YOUR specific contribution + what you learned from teammates\n• Individual: 5-question quiz on ALL parts of the presentation (not just your section)\n• Peer evaluation: Rate each teammate on 3 criteria with specific examples\n• Presentation includes Q&A where instructor can direct questions to any member',
  },
  {
    id: 'reading-response-to-dialogue',
    originalType: 'Reading response',
    redesignApproach: 'Socratic dialogue journal',
    description: 'Replace generic reading responses with a dialogue format: student writes a question, attempts an answer, then identifies what they\'re still unsure about.',
    bloomShift: 'Understand → Analyze',
    effort: 'low',
    before: 'Write a 500-word response to this week\'s reading.',
    after: 'Dialogue journal entry:\n1. Write one genuine question the reading raised for you (not a summary question)\n2. Attempt to answer it using evidence from the reading (200 words)\n3. Identify what you\'re still unsure about and why (100 words)\n4. In class: share your question with a partner and compare answers',
  },
  {
    id: 'lab-report-to-error-analysis',
    originalType: 'Lab report',
    redesignApproach: 'Error analysis + AI comparison',
    description: 'Have students write their analysis, then compare it to an AI-generated version. Grade the comparison and error identification, not the initial write-up.',
    bloomShift: 'Apply → Evaluate',
    effort: 'medium',
    before: 'Write a lab report following the standard format: Introduction, Methods, Results, Discussion.',
    after: 'Lab report + AI comparison:\n1. Write your Discussion section (500 words)\n2. Prompt an AI to write a Discussion section for the same experiment\n3. Compare: What did the AI get right? What did it get wrong or oversimplify? What does it miss about YOUR specific data?\n4. Final submission: Your Discussion + AI Discussion + 400-word comparative analysis\nGrading rubric: 30% your analysis, 70% your evaluation of AI output',
  },
]
