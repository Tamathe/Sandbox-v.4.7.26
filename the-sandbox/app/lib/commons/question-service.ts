/**
 * Question Service — AI-generated quiz questions for Challenges.
 *
 * Uses Haiku for fast, cost-effective question generation.
 * Returns structured JSON: question, 4 options, correct index, explanation.
 */

import Anthropic from '@anthropic-ai/sdk'

export type { GeneratedQuestion } from './types'
import type { GeneratedQuestion } from './types'

interface QuestionParams {
  topic: string
  courseName: string
  roundNumber: number
  totalRounds: number
  difficulty: string
  previousQuestions: string[]
}

const SYSTEM_PROMPT = `You are Sandy, the AI quiz master for a Challenge in The Commons at the University of Kentucky. Generate a multiple-choice question.

Rules:
- One clearly correct answer
- Three plausible distractors (not obviously wrong)
- Brief explanation (1-2 sentences, educational)
- Keep it fun — this is a game, not a final exam
- Vary question styles: definitions, applications, scenarios, comparisons
- Do NOT repeat topics from previous questions

Return ONLY valid JSON (no markdown, no backticks):
{"question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"correctIndex":0,"explanation":"..."}`

export async function generateQuestion(params: QuestionParams): Promise<GeneratedQuestion> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return getFallbackQuestion(params.roundNumber)
  }

  const client = new Anthropic()
  const previousList = params.previousQuestions.length > 0
    ? `\nPrevious questions (do NOT repeat these topics):\n${params.previousQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
    : ''

  const userMessage = `Course: ${params.courseName}
Topic: ${params.topic}
Difficulty: ${params.difficulty}
Round: ${params.roundNumber} of ${params.totalRounds}${previousList}

Generate one multiple-choice question.`

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    })

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('')

    const parsed = JSON.parse(text) as GeneratedQuestion

    // Validate structure
    if (
      typeof parsed.question !== 'string' ||
      !Array.isArray(parsed.options) ||
      parsed.options.length !== 4 ||
      typeof parsed.correctIndex !== 'number' ||
      parsed.correctIndex < 0 ||
      parsed.correctIndex > 3 ||
      typeof parsed.explanation !== 'string'
    ) {
      console.warn('[QuestionService] Invalid AI response structure, using fallback')
      return getFallbackQuestion(params.roundNumber)
    }

    return parsed
  } catch (err) {
    console.error('[QuestionService] AI generation failed:', err)
    return getFallbackQuestion(params.roundNumber)
  }
}

// Fallback questions for when API is unavailable
function getFallbackQuestion(roundNumber: number): GeneratedQuestion {
  const fallbacks: GeneratedQuestion[] = [
    {
      question: 'What is the primary function of mitochondria in a cell?',
      options: ['A) DNA replication', 'B) Energy production (ATP)', 'C) Protein synthesis', 'D) Cell division'],
      correctIndex: 1,
      explanation: 'Mitochondria are the powerhouses of the cell, converting nutrients into ATP through cellular respiration.',
    },
    {
      question: 'Which data structure uses FIFO (First In, First Out) ordering?',
      options: ['A) Stack', 'B) Queue', 'C) Binary Tree', 'D) Hash Table'],
      correctIndex: 1,
      explanation: 'A queue follows FIFO ordering — the first element added is the first one removed, like a line at a store.',
    },
    {
      question: 'What amendment to the U.S. Constitution guarantees freedom of speech?',
      options: ['A) Second Amendment', 'B) Fourth Amendment', 'C) First Amendment', 'D) Fifth Amendment'],
      correctIndex: 2,
      explanation: 'The First Amendment protects freedoms of speech, religion, press, assembly, and petition.',
    },
    {
      question: 'In economics, what does GDP stand for?',
      options: ['A) General Domestic Product', 'B) Gross Domestic Product', 'C) Global Development Program', 'D) Gross Distributed Profit'],
      correctIndex: 1,
      explanation: 'GDP (Gross Domestic Product) measures the total value of goods and services produced within a country.',
    },
    {
      question: 'What is the derivative of x² with respect to x?',
      options: ['A) x', 'B) 2x', 'C) x²', 'D) 2x²'],
      correctIndex: 1,
      explanation: 'Using the power rule, d/dx(x²) = 2x. The exponent comes down as a coefficient, and the power reduces by 1.',
    },
    {
      question: 'Which literary device involves an exaggerated statement not meant to be taken literally?',
      options: ['A) Metaphor', 'B) Hyperbole', 'C) Irony', 'D) Alliteration'],
      correctIndex: 1,
      explanation: 'Hyperbole is intentional exaggeration for emphasis or effect, like "I\'ve told you a million times."',
    },
    {
      question: 'What is the chemical formula for water?',
      options: ['A) CO₂', 'B) NaCl', 'C) H₂O', 'D) O₂'],
      correctIndex: 2,
      explanation: 'Water (H₂O) consists of two hydrogen atoms bonded to one oxygen atom.',
    },
  ]

  return fallbacks[(roundNumber - 1) % fallbacks.length]!
}
