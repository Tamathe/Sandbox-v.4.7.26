import Anthropic from '@anthropic-ai/sdk'
import { classifyConversationTurn, getTokenTotals } from './admin-control-tower'
import { getDatasetById, parseReference } from './datasets'
import { prisma } from './prisma'
import { embeddingAvailable, getEmbeddingProvider } from './embedding-service'
import { getVectorStore } from './vector-store'
import { graphRagSearch, surfaceMisconceptionContext } from './graph-rag-service'
import { getStudentContextForTool } from './student-context-api'
import { observeLearnerState } from './learning-observer'

// ── Types ─────────────────────────────────────────────────────────────────

export interface ChatTool {
  id: string
  name: string
  toolType: string
  systemPrompt: string | null
  referenceDocUrls: string[]
  audioEnabled: boolean
  audioSystemSuffix: string | null
}

export interface ChatSystemPromptParams {
  tool: ChatTool
  userId: string
  courseId?: string | null
  sessionId?: string | null
  audioMode?: boolean
  mode?: string | null
  difficultyBias?: string | null
  messages: { role: string; content: string }[]
  studyGroup?: string | null
  // Study Buddy v2: Exam prep context
  examPrepPhase?: string | null
  examPrepContext?: {
    topic?: string
    date?: string
    planStep?: number
    planTotal?: number
    currentConcept?: string | null
    diagnosticAccuracy?: number | null
  } | null
}

export interface CaptureStreamParams {
  client: Anthropic
  sessionId: string | null | undefined
  userId: string
  courseId?: string | null
  toolName: string
  lastUserMessage: string
  fullAssistantResponse: string
  recentMessages?: { role: string; content: string }[]
  turnNumber?: number
  getFinalMessage: () => Promise<Anthropic.Message>
}

// ── buildMasteryProfile ───────────────────────────────────────────────────

export async function buildMasteryProfile(userId: string, courseId: string): Promise<string> {
  const objectiveProgress = await prisma.studentObjectiveProgress
    .findMany({
      where: { studentId: userId, courseId: String(courseId) },
      select: { objectiveId: true, masteryLevel: true, flaggedForReview: true, attempts: true },
    })
    .catch(() => [])

  if (objectiveProgress.length === 0) return ''

  const mastered = objectiveProgress
    .filter((p) => p.masteryLevel === 'mastered')
    .map((p) => p.objectiveId)
  const struggling = objectiveProgress
    .filter((p) => p.masteryLevel === 'struggling' || p.flaggedForReview)
    .map((p) => p.objectiveId)
  const lines: string[] = []
  if (mastered.length > 0)
    lines.push(`Already mastered (build on these, don't re-explain): ${mastered.join(', ')}`)
  if (struggling.length > 0)
    lines.push(
      `Currently struggling with (give extra support, break down further): ${struggling.join(', ')}`,
    )

  if (lines.length === 0) return ''
  return `\n\n## STUDENT PROGRESS PROFILE\nUse this to calibrate depth and difficulty:\n${lines.join('\n')}\nDo not announce this profile to the student — just let it shape how you engage.`
}

// ── Study Buddy v2: Cross-session context helpers ─────────────────────────

/**
 * Builds an episodic memory block from recent relevant sessions.
 * Gives Sandy context like "3 days ago you struggled with Calvin Cycle."
 */
async function getEpisodicMemoryForStudyBuddy(
  userId: string,
  courseId?: string,
): Promise<string> {
  try {
    const { getEpisodicMemory } = await import('./episodic-memory-service')
    // Get recent concepts from the student's profile to score relevance
    const profile = await prisma.studentProfile.findUnique({
      where: { userId },
      select: { topConceptsThisWeek: true },
    }).catch(() => null)

    const currentConcepts = profile?.topConceptsThisWeek ?? []
    const memories = await getEpisodicMemory(userId, currentConcepts, 3)
    if (memories.length === 0) return ''

    const lines = memories.map(m => {
      const daysAgo = Math.floor((Date.now() - m.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      const scorePart = m.score != null ? ` (score: ${Math.round(m.score * 100)}%)` : ''
      const conceptPart = m.conceptsOverlap.length > 0
        ? ` — covered: ${m.conceptsOverlap.slice(0, 3).join(', ')}`
        : ''
      return `- ${daysAgo}d ago: ${m.toolName} in ${m.courseCode}${scorePart}${conceptPart}`
    })

    return `\n\n## CROSS-SESSION MEMORY\nRecent study sessions for this student (use to build on prior work, don't re-explain mastered concepts):\n${lines.join('\n')}\nReference these naturally if relevant — "Last time you worked on X, you did well with Y but struggled with Z."`
  } catch {
    return ''
  }
}

/**
 * Builds a spaced-repetition due-concepts block.
 * Tells Sandy which concepts are overdue for review.
 */
async function getDueConceptsForStudyBuddy(
  userId: string,
  courseId?: string,
): Promise<string> {
  try {
    const { getDueConcepts } = await import('./sr-scheduler')
    const due = await getDueConcepts(userId, courseId)
    if (due.length === 0) return ''

    const lines = due.slice(0, 5).map(d => {
      const name = d.conceptSlug.replace(/-/g, ' ')
      const overdue = d.daysOverdue > 0 ? ` (${d.daysOverdue}d overdue)` : ''
      const hint = d.remediationHints.length > 0
        ? ` — known issue: ${d.remediationHints[0]}`
        : ''
      return `- ${name}${overdue}${hint}`
    })

    return `\n\n## SPACED REPETITION — DUE FOR REVIEW\nThese concepts are scheduled for review. Weave them into the session when natural:\n${lines.join('\n')}\nDo not announce "these are due for review" — just naturally steer toward these topics.`
  } catch {
    return ''
  }
}

/**
 * Builds a concise student context block from the student profile.
 * Gives Sandy high-level signals: risk, velocity, bloom, modality.
 */
async function getStudentContextForStudyBuddy(
  userId: string,
  courseId?: string,
): Promise<string> {
  try {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId },
      select: {
        riskScore: true,
        learningVelocity: true,
        dominantBloomLevel: true,
        avgCognitiveLoad: true,
        preferredModality: true,
        peakEngagementHour: true,
        srDueCount: true,
      },
    }).catch(() => null)

    if (!profile) return ''

    const signals: string[] = []

    if (profile.riskScore != null && profile.riskScore > 0.4) {
      const level = profile.riskScore > 0.7 ? 'high' : 'moderate'
      signals.push(`Risk: ${level} — be extra supportive, check understanding frequently`)
    }

    if (profile.learningVelocity != null) {
      if (profile.learningVelocity > 0.1) signals.push('Momentum: improving — keep pushing')
      else if (profile.learningVelocity < -0.1) signals.push('Momentum: declining — slow down, re-scaffold')
    }

    if (profile.dominantBloomLevel != null) {
      if (profile.dominantBloomLevel >= 4) signals.push(`Bloom: ${profile.dominantBloomLevel}/6 — push toward synthesis/evaluation`)
      else if (profile.dominantBloomLevel <= 2) signals.push(`Bloom: ${profile.dominantBloomLevel}/6 — focus on understanding before application`)
    }

    if (profile.avgCognitiveLoad != null && profile.avgCognitiveLoad > 0.7) {
      signals.push('Cognitive load: high — break concepts into smaller pieces, pause between ideas')
    }

    if (signals.length === 0) return ''

    return `\n\n## LEARNER SIGNALS (use to calibrate your approach — never recite these)\n${signals.join('\n')}`
  } catch {
    return ''
  }
}

// ── buildRagContext ────────────────────────────────────────────────────────

export async function buildRagContext(
  courseId: string,
  messages: { role: string; content: string }[],
): Promise<string> {
  const ragAvailable = embeddingAvailable()
  let courseMaterialContext = ''
  let usedRag = false

  if (ragAvailable) {
    try {
      const chunkCount = await prisma.$queryRawUnsafe<[{ count: string }]>(
        `SELECT COUNT(*)::text AS count FROM "DocumentChunk" WHERE "courseId" = $1 LIMIT 1`,
        String(courseId),
      )
      const hasChunks = parseInt((chunkCount as [{ count: string }])[0]?.count ?? '0') > 0

      if (hasChunks) {
        const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')
        if (lastUserMsg?.content) {
          const embedder = getEmbeddingProvider()
          const queryVec = await embedder.embed(String(lastUserMsg.content))
          const store = getVectorStore()
          const results = await store.similaritySearch(queryVec, String(courseId), 6)

          if (results.length > 0) {
            courseMaterialContext = results
              .map(
                (r) =>
                  `--- Relevant excerpt (similarity: ${r.similarity.toFixed(2)}) ---\n${r.content}`,
              )
              .join('\n\n')
            usedRag = true
          }

          // Augment with graph RAG for complex multi-hop questions
          const graphContext = await graphRagSearch(
            String(courseId),
            String(lastUserMsg.content),
            5,
          ).catch(() => '')
          if (graphContext) {
            courseMaterialContext += '\n\n' + graphContext
          }
        }
      }
    } catch (ragErr) {
      console.error('[chat] RAG retrieval failed, falling back to full-doc:', ragErr)
    }
  }

  if (!usedRag) {
    const courseMaterials = await prisma.courseMaterial
      .findMany({
        where: { courseId: String(courseId), isVisible: true },
        select: { title: true, content: true, moduleNumber: true },
        orderBy: [{ moduleNumber: 'asc' }, { createdAt: 'asc' }],
      })
      .catch(() => [])

    let charCount = 0
    for (const mat of courseMaterials) {
      const section = `\n\n--- ${mat.moduleNumber ? `Module ${mat.moduleNumber}: ` : ''}${mat.title} ---\n${mat.content}`
      if (charCount + section.length > 80000) break
      courseMaterialContext += section
      charCount += section.length
    }
  }

  return courseMaterialContext
}

// ── STUDY_BUDDY_MODES ─────────────────────────────────────────────────────

// ── buildAdaptiveGuardrail ─────────────────────────────────────────────────

/**
 * Returns a variant of SCAFFOLD_GUARDRAIL tuned to the student's Bloom level
 * and cognitive load. Called only when override is 'adaptive' or null (default).
 */
function buildAdaptiveGuardrail(
  dominantBloomLevel: number | null,
  avgCognitiveLoad: number | null,
): string {
  if (
    dominantBloomLevel !== null &&
    dominantBloomLevel >= 4 &&
    (avgCognitiveLoad === null || avgCognitiveLoad < 0.5)
  ) {
    return (
      '\nScaffold lightly: this student works at higher Bloom levels. Push toward synthesis and evaluation rather than just scaffolding basics.' +
      SCAFFOLD_GUARDRAIL
    )
  }
  if (
    (dominantBloomLevel !== null && dominantBloomLevel <= 2) ||
    (avgCognitiveLoad !== null && avgCognitiveLoad > 0.7)
  ) {
    return (
      '\nScaffold strictly: this student is at foundational levels or showing high cognitive load. Break down every concept step by step.' +
      SCAFFOLD_GUARDRAIL
    )
  }
  return SCAFFOLD_GUARDRAIL
}

// Pedagogical guardrail injected for course-linked non-STUDY_BUDDY tools
const SCAFFOLD_GUARDRAIL = `

## PEDAGOGICAL GUARDRAIL — SCAFFOLD, DON'T SOLVE
This is a university educational platform. When responding to academic questions:
- Before answering a direct question, ask what the student already knows or has tried
- Offer hints and guiding questions rather than complete answers
- Never complete assignments, write essays, or solve exam problems for the student
- Short factual lookups, policy questions, and logistics can be answered directly
Research is clear: students who struggle productively retain knowledge far longer than those who are handed answers.`

const STUDY_BUDDY_MODES: Record<string, string> = {
  tutor: `You are a knowledgeable tutor. Your core job is to GUIDE the student to understanding — not to hand them answers.

When a student asks a direct academic question:
1. First, activate their prior knowledge: ask "What do you think this might mean?" or "What have you tried so far?"
2. If they're stuck after a genuine attempt, offer a targeted hint from the materials — a pointer, not the solution
3. Provide a full explanation only after the student has made a real attempt

Answer using ONLY the provided course materials below. Reference specific sections when relevant. If the answer isn't in the materials, say so honestly. Be encouraging and patient.

ERROR ANALYSIS: When the student says something incorrect or shows confusion, classify the error and tailor your response:
- Misconception (they believe something false): Directly address the false belief with evidence from the materials
- Knowledge gap (they never learned the prerequisite): Teach the prerequisite concept before returning to the original question
- Partial understanding (they're partly right but missing depth): Build on what they got right, guide them to the rest
- Transfer failure (they know the concept but can't apply it here): Provide a worked example in the new context
Emit this hidden tag on the same line as your QUIZ signal (or alone if no quiz signal):
<!--ERROR:misconception|brief description--> OR <!--ERROR:knowledge-gap|prerequisite they need--> OR <!--ERROR:careless|what they almost had right--> OR <!--ERROR:transfer-failure|concept they know but can't apply--> OR <!--ERROR:partial|what's missing-->
Only emit when the student made an error. Do not emit for correct answers.

ELABORATIVE INTERROGATION: After explaining a concept, periodically ask ONE deepening question (every 3-4 exchanges):
- "Why does this make sense given what you know about [related concept]?"
- "Can you think of a real-world example where this applies?"
- "What would happen if [key assumption] were different?"
- "How is this similar to or different from [related concept]?"
Use these sparingly and naturally. They force deeper processing and improve retention 2-3x over passive re-reading.`,
  quiz: `You are a quiz master. Generate questions drawn exclusively from the provided course materials. Present ONE question at a time. After the student answers, give detailed feedback — what they got right, what they missed, and the correct answer with context. Then ask if they want another question. Vary question types (multiple choice, short answer, concept application).

CONFIDENCE AWARENESS: The student may indicate their confidence level before answering (e.g., "[CONFIDENCE:4]" = "Pretty sure"). After evaluating their answer:
- If they were confident but WRONG (overconfident): Gently flag it — "You felt sure about this one, but it wasn't quite right. This is a good concept to revisit — overconfidence here could cost you on exam day."
- If they were unconfident but RIGHT (underconfident): Encourage — "You knew more than you thought! Trust your understanding here."
- If calibrated correctly: Don't comment on confidence — just give normal feedback.

SCORING SIGNAL: When you respond to a student's answer (not when asking a new question), you MUST append exactly one of the following hidden tags at the very end of your response — after all text, on its own line:
- If the student's answer was correct: <!--QUIZ:correct-->
- If the student's answer was incorrect or partially wrong: <!--QUIZ:incorrect-->
Only emit this tag when evaluating an answer. Never emit it when asking a question or asking if they want to continue.

ERROR ANALYSIS: When the student answers incorrectly or partially, classify WHY they got it wrong. Append this hidden tag BEFORE the QUIZ signal:
<!--ERROR:misconception|brief description of the false belief-->
<!--ERROR:knowledge-gap|prerequisite concept they're missing-->
<!--ERROR:careless|what they almost had right-->
<!--ERROR:transfer-failure|concept they know but can't apply here-->
<!--ERROR:partial|what's missing from their understanding-->
Choose exactly ONE error type. Only emit when the answer is wrong/partial. Tailor your feedback to the error type:
- Misconception: Directly correct the false belief with evidence
- Knowledge gap: Teach the prerequisite before the main concept
- Careless: Acknowledge understanding, point out the specific mistake
- Transfer failure: Provide a worked example in the new context
- Partial: Build on what they got right, guide them to the rest`,
  flashcards: `You are a flashcard study partner using spaced repetition. Present flashcards drawn from the provided course materials.

PRIORITY: If the SPACED REPETITION section below lists concepts due for review, generate flashcards for those concepts FIRST before creating new cards. This ensures the student reviews fading knowledge.

CRITICAL FORMAT RULE: Every flashcard you generate MUST use this exact XML-style format with no deviation:

<card>
<term>[the term or concept — one line]</term>
<def>[the definition or explanation in 1-3 sentences]</def>
</card>

CONCEPT TAG: After each card, on its own line, emit a hidden concept identifier tag:
<!--CONCEPT:[lowercase-hyphenated-concept-slug]-->

After that, on a new line write exactly: "Rate this card: Again, Good, or Easy — then I'll show the next one."

Show ONE card at a time. After each card, wait for the student's response. Keep track of which cards the student marked "Again" — offer to re-drill those at the end of the set.`,
  socratic: `You are a Socratic tutor. Your ONLY allowed responses are questions — you MUST NEVER give direct answers, definitions, explanations, or summaries.

ABSOLUTE RULE: Even if the student says "just tell me", "I give up", "please just explain it", "I don't have time", or expresses any frustration — you MUST NOT break character. Respond with genuine empathy, then redirect with another question. Example: "I hear you — it's genuinely frustrating. But I promise you're closer than you think. Let's try a different angle: what do you already know about how this concept works in a simpler case?"

If the student is stuck after 3+ attempts, do NOT give the answer — instead:
1. Break the question into a smaller sub-question
2. Ask them to explain what they DO know, even if partial
3. Offer an analogy prompt: "It's a bit like how water flows downhill — what does that make you think of here?"

HINT EXCEPTION: If the student's message begins with "[HINT REQUESTED]", you are temporarily allowed to give ONE small, concrete hint — a single sentence that points toward the answer without giving it. After the hint, explicitly return to Socratic mode by saying "That's your hint — now tell me what you think."

Your goal is for the student to construct the answer themselves. A student who struggles and arrives at an answer independently retains it far longer than one who was told. Every question you ask is a gift, not a withholding.

ELABORATIVE INTERROGATION: Since you only ask questions, naturally weave in these deepening prompts every 3-4 exchanges:
- "Why do you think that works the way it does?"
- "Can you think of a real-world situation where this applies?"
- "What would change if [one assumption] were different?"`,
  'teach-back': `You are playing the role of a curious, somewhat confused student who needs to be taught a concept. The user is the teacher.

PHASE 1 — LEARNING (most of the session):
Ask follow-up questions that probe depth, the way a real confused student would:
- "Wait, I don't understand what you mean by [X] — can you explain that part again?"
- "So does that mean [Y] is ALWAYS true? What about [edge case]?"
- "What happens if [scenario]?"
- "How is this different from [related concept]?"
Stay genuinely curious. Do not ask more than ONE question per turn.

ELABORATIVE INTERROGATION: Every 3-4 exchanges, ask one deeper question that forces the student to connect ideas:
- "Why does this make sense given what you told me earlier about [related concept]?"
- "Can you give me a real-world example of this?"
- "What would break if this weren't true?"

PHASE 2 — FEEDBACK (only after at least 5 exchanges AND the student says something like "did I explain it well?" or "how did I do?" or "am I on the right track?" OR if the student has sent 8+ messages):
When transitioning to Phase 2, ALWAYS start your response with exactly this line on its own: "**[Phase 2: Feedback]**"
Then break out of the student persona and give honest, structured feedback:
1. What they explained clearly and accurately
2. Any gaps, inaccuracies, or missing nuance
3. One thing they could add to make the explanation complete

After your written feedback, emit this hidden scoring tag at the very end of your response:
<!--TEACHBACK_SCORE:{"accuracy":X,"completeness":X,"depth":X,"clarity":X,"overallGrade":"A/B/C/D"}-->
Where each dimension is a score from 0.0 to 1.0:
- accuracy: Did they get the facts right?
- completeness: Did they cover the key points?
- depth: Did they explain WHY, not just WHAT?
- clarity: Could a peer understand their explanation?
- overallGrade: Letter grade based on weighted average (accuracy 30%, completeness 25%, depth 25%, clarity 20%)

IMPORTANT: Do NOT give feedback in Phase 1. Do NOT break character to correct mistakes — just ask a question that surfaces the mistake. Let the student find it.`,
  debate: `You are a rigorous debate opponent. The student will state a position. Your job is to argue the OPPOSING side as compellingly as possible — steelman the counterargument, cite relevant reasoning, and challenge weak points in the student's logic. Do not agree with them even if they make good points — push harder, ask for evidence, expose assumptions. After 3-4 exchanges, you may briefly acknowledge the strongest parts of their argument before delivering a final counterargument. The goal is to make the student defend and strengthen their position under pressure.

ELABORATIVE INTERROGATION: When challenging the student, periodically use these deepening techniques:
- "What evidence would you need to see to change your mind?"
- "How does your position hold up in [edge case scenario]?"
- "Your opponent would say [steelman counterargument] — how do you respond?"

DEBATE SCORING: After 4+ student exchanges, when the student asks "how did I do?" or says they want to end the debate, or after 8+ exchanges total, emit a final assessment:
Start with "**[Debate Assessment]**" on its own line, then give structured feedback on their argumentation.
At the very end, emit this hidden scoring tag:
<!--DEBATE_SCORE:{"argumentStrength":X,"evidenceUse":X,"logicalConsistency":X,"counterargumentHandling":X,"overallGrade":"A/B/C/D"}-->
Where each dimension is 0.0 to 1.0:
- argumentStrength: How compelling was their central argument?
- evidenceUse: Did they cite evidence and use it well?
- logicalConsistency: Was their reasoning free of fallacies and contradictions?
- counterargumentHandling: How well did they address your challenges?
- overallGrade: Letter grade based on weighted average`,
  essay: `You are an expert writing coach and editor. When the student shares an essay draft or writing question, give structured, actionable feedback across these dimensions: (1) Thesis clarity — is the central argument clear and specific? (2) Argument structure — does the logic flow? Are claims supported? (3) Evidence quality — is evidence relevant and properly used? (4) Prose clarity — flag confusing sentences, passive voice, or jargon. (5) Conclusion — does it synthesize rather than just restate? Be honest but constructive. After feedback, offer to work through any specific section in detail. Do not rewrite the essay for them — coach them to improve it themselves.

ELABORATIVE INTERROGATION: After giving feedback, ask one question that pushes the student's thinking:
- "Why did you choose this particular thesis angle over alternatives?"
- "What's the strongest counterargument to your position, and how would you address it?"
- "If you had to cut this essay in half, which parts carry the most weight?"`,
}

// ── buildLinkedDatasetContext (moved from route) ──────────────────────────

function buildLinkedDatasetContext(referenceDocUrls: string[]): string {
  const datasetSections: string[] = []

  for (const reference of referenceDocUrls) {
    const parsed = parseReference(reference)
    if (parsed.type !== 'dataset') continue

    const dataset = getDatasetById(parsed.id)
    if (!dataset) continue

    datasetSections.push(
      [
        `### ${dataset.title}`,
        `Owner: ${dataset.owner}`,
        `Summary: ${dataset.summary}`,
        `Coverage: ${dataset.coverage}`,
        `Tags: ${dataset.tags.join(', ')}`,
      ].join('\n'),
    )
  }

  if (datasetSections.length === 0) return ''

  return (
    `\n\n## Linked Dataset Context\n` +
    `Use the linked public dataset notes below to ground your answers when relevant. ` +
    `These notes are not student-specific records. If a question requires account access, ` +
    `personal data, or an official determination, direct the user to the appropriate office.\n\n` +
    datasetSections.join('\n\n')
  )
}

// ── buildChatSystemPrompt ─────────────────────────────────────────────────

export async function buildChatSystemPrompt(params: ChatSystemPromptParams): Promise<string> {
  const { tool, userId, courseId, sessionId, audioMode, mode, difficultyBias, messages, studyGroup } = params
  const isStudyBuddy = tool.toolType === 'STUDY_BUDDY'

  let systemPrompt =
    tool.systemPrompt ||
    `You are Sandy, a helpful educational AI assistant at the University of Kentucky. You help students learn by asking good questions, providing clear explanations, and encouraging deeper thinking. Always be encouraging, accurate, and pedagogically sound.`

  if (audioMode && tool.audioEnabled && tool.audioSystemSuffix?.trim()) {
    systemPrompt = `${systemPrompt}\n\nAUDIO MODE INSTRUCTIONS:\n${tool.audioSystemSuffix.trim()}`
  }

  // Adaptive difficulty state — populated inside the courseId block below
  let adaptiveDifficultyOverride: string | null = null
  let dominantBloomLevel: number | null = null
  let avgCognitiveLoad: number | null = null

  if (courseId) {
    const [courseLink, objectives, studentProfile] = await Promise.all([
      prisma.courseToolLink
        .findUnique({
          where: { courseId_toolId: { courseId: String(courseId), toolId: tool.id } },
          select: { syllabusContext: true, adaptiveDifficultyOverride: true },
        })
        .catch(() => null),
      prisma.learningObjective
        .findMany({
          where: { courseId: String(courseId) },
          orderBy: [{ moduleNumber: 'asc' }, { orderIndex: 'asc' }],
          select: { id: true, title: true, moduleNumber: true },
        })
        .catch(() => [] as { id: string; title: string; moduleNumber: number | null }[]),
      prisma.studentProfile
        .findUnique({
          where: { userId },
          select: { dominantBloomLevel: true, avgCognitiveLoad: true },
        })
        .catch(() => null),
    ])

    adaptiveDifficultyOverride = courseLink?.adaptiveDifficultyOverride ?? null
    dominantBloomLevel = studentProfile?.dominantBloomLevel ?? null
    avgCognitiveLoad = studentProfile?.avgCognitiveLoad ?? null

    if (courseLink?.syllabusContext?.trim()) {
      systemPrompt = `${systemPrompt}\n\n---\nINSTRUCTOR CONTEXT FOR THIS SESSION:\n${courseLink.syllabusContext.trim()}\n---`
    }

    if (objectives.length > 0) {
      const objList = objectives
        .map(
          (o) =>
            `- [${o.id}] ${o.moduleNumber ? `(Module ${o.moduleNumber}) ` : ''}${o.title}`,
        )
        .join('\n')
      systemPrompt = `${systemPrompt}

## COURSE LEARNING OBJECTIVES
The following learning objectives are mapped to this course. When your response addresses one or more learning objectives, append a hidden tag at the very end (never visible to student):
<!--OBJECTIVES:[{"id":"id1","quality":"green"},{"id":"id2","quality":"yellow"}]-->
- Use "green" when the student demonstrated clear mastery or understanding of the objective.
- Use "yellow" when the student engaged with the objective but showed uncertainty, confusion, or partial understanding.
- Only include objectives your response genuinely covers. Omit objectives not addressed.

${objList}`
    }
  }

  if (isStudyBuddy) {
    const docWhere = sessionId
      ? { OR: [{ toolId: tool.id }, { sessionId }] }
      : { toolId: tool.id }
    const docs = await prisma.toolDocument
      .findMany({
        where: docWhere,
        select: { filename: true, content: true },
        orderBy: { createdAt: 'asc' },
      })
      .catch(() => [])

    const modePrompt =
      STUDY_BUDDY_MODES[mode as keyof typeof STUDY_BUDDY_MODES] || STUDY_BUDDY_MODES.tutor
    const toolContext = tool.systemPrompt
      ? `\n\nAdditional context from the educator: ${tool.systemPrompt}`
      : ''

    let courseMaterialContext = ''
    if (courseId) {
      courseMaterialContext = await buildRagContext(String(courseId), messages)
    }

    let toolDocContext = ''
    if (docs.length > 0) {
      let charCount = courseMaterialContext.length
      for (const doc of docs) {
        const section = `\n\n--- Document: ${doc.filename} ---\n${doc.content}`
        if (charCount + section.length > 120000) break
        toolDocContext += section
        charCount += section.length
      }
    }

    const combinedContext = courseMaterialContext + toolDocContext

    if (combinedContext.trim()) {
      systemPrompt = `${modePrompt}${toolContext}\n\n## Course Materials\n${combinedContext}`
    } else {
      systemPrompt = `${modePrompt}${toolContext}\n\nNote: No course documents have been loaded yet. Let the student know they can upload their materials using the upload button, or answer general questions as best you can.`
    }

    if (courseId) {
      const masteryBlock = await buildMasteryProfile(userId, String(courseId))
      if (masteryBlock) systemPrompt = `${systemPrompt}${masteryBlock}`
    }

    // Study Buddy v2: Inject cross-session episodic memory + learner context
    // This makes Sandy aware of the student's history across sessions
    {
      const [episodicMem, dueSR, studentCtx] = await Promise.all([
        getEpisodicMemoryForStudyBuddy(userId, courseId ? String(courseId) : undefined),
        getDueConceptsForStudyBuddy(userId, courseId ? String(courseId) : undefined),
        getStudentContextForStudyBuddy(userId, courseId ? String(courseId) : undefined),
      ])
      if (episodicMem) systemPrompt = `${systemPrompt}${episodicMem}`
      if (dueSR) systemPrompt = `${systemPrompt}${dueSR}`
      if (studentCtx) systemPrompt = `${systemPrompt}${studentCtx}`
    }

    if (difficultyBias) {
      const biasInstruction =
        difficultyBias === 'easier'
          ? 'DIFFICULTY CALIBRATION: The student has asked for easier content this session — use simpler vocabulary, more relatable analogies, smaller conceptual steps, and more encouragement. Scaffold heavily.'
          : 'DIFFICULTY CALIBRATION: The student has asked for harder content this session — use precise technical language, introduce edge cases and nuance, ask follow-up questions that push beyond surface understanding, and hold them to a higher bar.'
      systemPrompt = `${systemPrompt}\n\n${biasInstruction}`
    }

    // Study Buddy v2: Exam prep phase-specific system prompt injection
    if (params.examPrepPhase) {
      const ep = params.examPrepContext ?? {}
      const examPrepPrompts: Record<string, string> = {
        intake: `
## EXAM PREP MODE — INTAKE PHASE
You are helping a student prepare for an exam. Gather this information conversationally:
1. What topics/chapters the exam covers
2. When the exam is (date or time until)
3. How confident they feel (1-5 scale)
Once you have all three, confirm the details and tell the student: "Great, let's start with a quick diagnostic to see where you stand." Then begin asking diagnostic questions.
When you start the diagnostic, emit: <!--EXAMPREP:diagnostic-->`,

        diagnostic: `
## EXAM PREP MODE — DIAGNOSTIC PHASE
${ep.topic ? `Exam topic: ${ep.topic}` : ''}
${ep.date ? `Exam date: ${ep.date}` : ''}
You are giving a DIAGNOSTIC QUIZ. Ask 8-10 broad questions covering the exam material to identify the student's weak areas.
- Mix question types: recall, application, analysis (Bloom levels 1-4)
- After EACH student answer, evaluate it and emit BOTH:
  1. <!--QUIZ:correct--> or <!--QUIZ:incorrect--> (for score tracking)
  2. <!--DIAGNOSTIC_RESULT:correct|concept-name--> or <!--DIAGNOSTIC_RESULT:incorrect|concept-name-->
- Keep questions moving — don't over-explain during diagnostic
- After asking 8 questions, say "That's the diagnostic complete!" The client will show a "Generate Study Plan" button.`,

        plan: `
## EXAM PREP MODE — STUDY PLAN PHASE
${ep.topic ? `Exam topic: ${ep.topic}` : ''}
Diagnostic accuracy: ${ep.diagnosticAccuracy ?? 'unknown'}%
The student has completed a diagnostic quiz. You now have a personalized study plan.
Present the plan clearly:
1. List each concept with its priority (critical/high/medium/low)
2. For each concept, explain briefly why it needs attention
3. Give the total estimated time
Then say: "Ready? Let's start with [first concept]." and begin teaching.
When you start teaching the first concept, emit: <!--EXAMPREP:execution-->`,

        execution: `
## EXAM PREP MODE — GUIDED STUDY PHASE
${ep.topic ? `Exam topic: ${ep.topic}` : ''}
You are teaching concept ${(ep.planStep ?? 0) + 1} of ${ep.planTotal ?? '?'}: "${ep.currentConcept ?? 'unknown'}"
RULES:
- Focus entirely on this one concept
- Explain clearly, use examples from the course materials
- Check understanding with 1-2 questions before the student moves on
- Be concise — the student has limited time before their exam
- When the student says they understand or asks to move on, confirm and wait for them to click "Next Step"
- Use the tutor approach: guide, don't lecture. Ask what they already know first.`,

        'final-check': `
## EXAM PREP MODE — FINAL CHECK PHASE
${ep.topic ? `Exam topic: ${ep.topic}` : ''}
Diagnostic accuracy was: ${ep.diagnosticAccuracy ?? 'unknown'}%
The student has completed all study plan steps. Now re-quiz them on the concepts they were WEAKEST on during the diagnostic.
- Ask 5-8 targeted questions on concepts they got wrong initially
- After EACH answer, emit: <!--FINAL_RESULT:correct|concept-name--> or <!--FINAL_RESULT:incorrect|concept-name-->
- Also emit <!--QUIZ:correct--> or <!--QUIZ:incorrect-->
- After all questions, summarize: "You went from X% to Y%. [encouragement or advice]"`,
      }

      const phasePrompt = examPrepPrompts[params.examPrepPhase]
      if (phasePrompt) {
        systemPrompt = `${systemPrompt}${phasePrompt}`
      }
    }
  }

  // RAG context injection for Knowledge Base avatar tools
  if (!isStudyBuddy) {
    const kbMatch = systemPrompt.match(/\[COURSE_KB_ID:([^\]]+)\]/)
    if (kbMatch && embeddingAvailable()) {
      const kbCourseId = kbMatch[1]
      systemPrompt = systemPrompt.replace(/\[COURSE_KB_ID:[^\]]+\]\n?/, '')
      try {
        const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')
        if (lastUserMsg?.content) {
          const embedder = getEmbeddingProvider()
          const queryVec = await embedder.embed(String(lastUserMsg.content))
          const store = getVectorStore()
          const results = await store.similaritySearch(queryVec, kbCourseId, 5)
          if (results.length > 0) {
            const context = results
              .map((r) => `--- Relevant excerpt ---\n${r.content}`)
              .join('\n\n')
            systemPrompt = `${systemPrompt}\n\n## Relevant Course Materials\n${context}`
          }
        }
      } catch (ragErr) {
        console.error('[chat] Avatar RAG retrieval failed:', ragErr)
      }
    }
  }

  // Linked dataset context
  const linkedDatasetContext = buildLinkedDatasetContext(tool.referenceDocUrls)
  if (linkedDatasetContext) {
    systemPrompt = `${systemPrompt}${linkedDatasetContext}`
  }

  // Misconception context injection — surfaces active remediation hints for this student+course
  if (courseId && userId) {
    const misconceptionCtx = await surfaceMisconceptionContext(
      String(courseId),
      userId,
      [...messages].reverse().find((m) => m.role === 'user')?.content ?? '',
    ).catch(() => '')
    if (misconceptionCtx) {
      systemPrompt = `${systemPrompt}${misconceptionCtx}`
    }
  }

  // Cross-tool student learning context — gated behind A/B treatment group
  if (userId && studyGroup === 'treatment') {
    const crossToolCtx = await getStudentContextForTool(userId, courseId ? String(courseId) : undefined).catch(() => '')
    if (crossToolCtx) {
      systemPrompt = `${systemPrompt}${crossToolCtx}`
    }
  }

  // Adaptive pedagogical guardrail for course-linked educational tools (not STUDY_BUDDY)
  if (courseId && !isStudyBuddy) {
    if (adaptiveDifficultyOverride === 'off') {
      // Educator has disabled the guardrail for this tool
    } else if (adaptiveDifficultyOverride === 'strict') {
      const strictPrefix =
        '\nScaffold strictly: this student is at foundational levels or showing high cognitive load. Break down every concept step by step.'
      systemPrompt = `${systemPrompt}${strictPrefix}${SCAFFOLD_GUARDRAIL}`
    } else {
      // 'adaptive' or null (default): use student profile signals
      systemPrompt = `${systemPrompt}${buildAdaptiveGuardrail(dominantBloomLevel, avgCognitiveLoad)}`
    }
  }

  // User memories
  const memories = await prisma.userMemory
    .findMany({
      where: { userId },
      select: { content: true },
      orderBy: { createdAt: 'asc' },
    })
    .catch(() => [])

  if (memories.length > 0) {
    const memoryBlock = `ABOUT THIS STUDENT (use naturally to personalize — do not repeat back verbatim):\n${memories
      .map((memory) => `- ${memory.content}`)
      .join('\n')}`
    systemPrompt = `${systemPrompt}\n\n---\n${memoryBlock}\n---`
  }

  // Engagement fingerprint — learner profile context for personalized responses
  if (userId) {
    try {
      const { buildFingerprintBlock } = await import('./fingerprint/sandy-context')
      const fpBlock = await buildFingerprintBlock(userId)
      if (fpBlock) {
        systemPrompt = `${systemPrompt}${fpBlock}`
      }
    } catch {
      // Non-fatal — chat works without fingerprint context
    }
  }

  return systemPrompt
}

// ── captureStreamCompletion ────────────────────────────────────────────────

export async function captureStreamCompletion(params: CaptureStreamParams): Promise<void> {
  const {
    client, sessionId, userId, courseId, toolName,
    lastUserMessage, fullAssistantResponse, recentMessages, turnNumber, getFinalMessage,
  } = params

  let inputTokens = 0
  let outputTokens = 0
  let tokensUsed = 0
  let flagged = false
  let flagCategory: string | null = null
  let flagReason: string | null = null

  try {
    const finalMessage = await getFinalMessage()
    const totals = getTokenTotals(finalMessage.usage)
    inputTokens = totals.inputTokens
    outputTokens = totals.outputTokens
    tokensUsed = totals.tokensUsed
  } catch (usageError) {
    console.error('Failed to capture Anthropic usage:', usageError)
  }

  if (lastUserMessage && fullAssistantResponse.trim()) {
    try {
      const moderation = await classifyConversationTurn({
        client,
        toolName,
        userMessage: lastUserMessage,
        assistantResponse: fullAssistantResponse,
      })
      flagged = moderation.flagged
      flagCategory = moderation.category
      flagReason = moderation.reason
    } catch (moderationError) {
      console.error('Chat moderation failed:', moderationError)
    }
  }

  if (sessionId && lastUserMessage && fullAssistantResponse.trim()) {
    Promise.all([
      prisma.chatMessage.create({
        data: { sessionId, role: 'user', content: lastUserMessage },
      }),
      prisma.chatMessage.create({
        data: {
          sessionId,
          role: 'assistant',
          content: fullAssistantResponse,
          flagged,
          flagCategory,
          flagReason,
          tokensUsed,
          inputTokens,
          outputTokens,
        },
      }),
    ]).catch(console.error)

    // Learning observer — fire-and-forget sidecar; never awaited
    if (userId) {
      observeLearnerState({
        sessionId,
        userId,
        courseId: courseId ?? null,
        turnNumber: turnNumber ?? 1,
        recentMessages: recentMessages ?? [{ role: 'user', content: lastUserMessage }],
        lastUserMessage,
        lastAssistantResponse: fullAssistantResponse,
      }).catch(console.error)
    }
  }
}
