/**
 * Seed script for Study Buddy demo data.
 *
 * Creates a STUDY_BUDDY tool and seeds Tiana's study sessions,
 * flashcards, chat messages, and observation logs so the /study
 * page has rich demo content.
 *
 * Usage: npx tsx scripts/seed-study-buddy.ts
 */

import 'dotenv/config'
import { prisma } from '../app/lib/prisma'

const now = new Date()
const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 3600_000)
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600_000)
const daysFromNow = (d: number) => new Date(now.getTime() + d * 24 * 3600_000)

async function main() {
  console.log('📚 Seeding Study Buddy demo data...')

  // ── Find demo users ────────────────────────────────────────────────────
  const tiana = await prisma.user.findUnique({ where: { email: 'tiana.the.student@uky.edu' } })
  const katie = await prisma.user.findUnique({ where: { email: 'katie.thompson@uky.edu' } })

  if (!tiana || !katie) {
    console.error('❌ Demo users not found. Run npm run db:seed first.')
    process.exit(1)
  }

  const tek100 = await prisma.course.findUnique({ where: { courseCode: 'TEK-100' } })
  if (!tek100) {
    console.error('❌ TEK-100 course not found. Run npm run db:seed first.')
    process.exit(1)
  }

  // ── Create the Study Buddy tool ────────────────────────────────────────
  const studyBuddy = await prisma.tool.upsert({
    where: { id: 'study-buddy-main' },
    update: {},
    create: {
      id: 'study-buddy-main',
      name: 'Study Buddy',
      shortDescription: 'AI-powered study partner with 7 modes — tutor, quiz, flashcards, Socratic, teach-back, debate, and essay coach.',
      fullDescription: 'Your personal AI study companion that adapts to how you learn. Choose from 7 study modes, track concepts with spaced repetition flashcards, and get real-time feedback on your understanding. Sandy remembers your strengths and weaknesses across sessions.',
      toolType: 'STUDY_BUDDY',
      category: 'Education',
      difficultyLevel: 'Beginner',
      estimatedMinutes: 30,
      systemPrompt: 'You are Sandy, an AI study buddy at the University of Kentucky. You have 7 modes: Tutor (explain concepts), Quiz (adaptive questions), Flashcards (spaced repetition), Socratic (guided questioning), Teach-Back (student explains to you), Debate (argue positions), and Essay Coach (writing feedback). Adapt to the student\'s learning level and track their progress.',
      welcomeMessage: 'Hey! I\'m Sandy, your study buddy. Pick a mode and let\'s get to work — I\'ll adapt to your pace and remember what we cover.',
      starterQuestions: ['Quiz me on my weak concepts', 'Help me understand hallucination detection', 'Let\'s do flashcard review'],
      published: true,
      featured: true,
      approvalStatus: 'APPROVED',
      creatorId: katie.id,
    },
  })
  console.log('✅ Study Buddy tool created:', studyBuddy.id)

  // ── Link Study Buddy to TEK-100 ───────────────────────────────────────
  await prisma.courseToolLink.upsert({
    where: { courseId_toolId: { courseId: tek100.id, toolId: studyBuddy.id } },
    update: {},
    create: { courseId: tek100.id, toolId: studyBuddy.id },
  })
  console.log('✅ Linked Study Buddy to TEK-100')

  // ── Clean up existing study buddy sessions for Tiana ───────────────────
  const existingSessions = await prisma.toolSession.findMany({
    where: { toolId: studyBuddy.id, userId: tiana.id },
    select: { id: true },
  })
  if (existingSessions.length > 0) {
    const sessionIds = existingSessions.map(s => s.id)
    await prisma.learnerObservationLog.deleteMany({ where: { sessionId: { in: sessionIds } } })
    await prisma.chatMessage.deleteMany({ where: { sessionId: { in: sessionIds } } })
    await prisma.toolSession.deleteMany({ where: { id: { in: sessionIds } } })
    console.log(`🧹 Cleaned ${existingSessions.length} existing study buddy sessions`)
  }
  await prisma.flashcardState.deleteMany({ where: { userId: tiana.id, courseId: tek100.id } })

  // ── Tiana's Study Buddy Sessions ───────────────────────────────────────
  // 8 sessions across different modes showing her learning journey

  // Session 1: Tutor mode — learning about hallucination detection (3 days ago)
  const session1 = await prisma.toolSession.create({
    data: {
      toolId: studyBuddy.id,
      userId: tiana.id,
      courseId: tek100.id,
      startedAt: daysAgo(3),
      endedAt: new Date(daysAgo(3).getTime() + 25 * 60_000),
      messageCount: 14,
      status: 'completed',
      notes: 'tutor',
      summary: '**Covered:** Hallucination detection fundamentals, types of AI fabrication (citation hallucinations, statistical fabrication, confident confabulation). **Strong:** Can identify obvious fabricated statistics. **Review:** Struggle distinguishing plausible-but-false claims from accurate ones, needs practice with lateral reading.',
      score: 0.62,
      qualitySignal: 'partial',
      scoredAt: new Date(daysAgo(3).getTime() + 25 * 60_000),
      durationSeconds: 1500,
      hintCount: 3,
      exitReason: 'completed',
      conceptsTouched: ['hallucination-detection', 'source-verification', 'lateral-reading'],
      bloomLevel: 3,
      bloomConfidence: 0.75,
      cognitiveLoad: 0.65,
      frustrationScore: 0.35,
      isProductiveStruggle: true,
      metacognitionScore: 0.55,
    },
  })

  // Session 1 chat messages
  await prisma.chatMessage.createMany({
    data: [
      { sessionId: session1.id, role: 'assistant', content: "Hey Tiana! Let's work on hallucination detection today. I know this has been a tricky area — Module 4 stuff can be subtle. Let me start with a question: what's your current understanding of WHY AI systems hallucinate?", tokensUsed: 120, inputTokens: 800, outputTokens: 120, createdAt: daysAgo(3) },
      { sessionId: session1.id, role: 'user', content: "I think it's because the AI is just predicting the next word based on patterns, so sometimes it generates things that sound right but aren't actually true?", tokensUsed: 45, inputTokens: 45, outputTokens: 0, createdAt: new Date(daysAgo(3).getTime() + 60_000) },
      { sessionId: session1.id, role: 'assistant', content: "That's a solid foundation! You've got the core mechanism right — it's probabilistic text generation. Let me build on that with three categories:\n\n1. **Citation hallucinations** — fabricated author names, journal titles, or DOIs that look real\n2. **Statistical fabrication** — made-up percentages and study results\n3. **Confident confabulation** — the AI weaves true facts with false ones seamlessly\n\nWhich type do you think would be hardest to catch, and why?", tokensUsed: 180, inputTokens: 900, outputTokens: 180, createdAt: new Date(daysAgo(3).getTime() + 120_000) },
      { sessionId: session1.id, role: 'user', content: "Probably the third one — confident confabulation — because if the AI mixes real facts with fake ones, it's harder to tell which parts are wrong.", tokensUsed: 40, inputTokens: 40, outputTokens: 0, createdAt: new Date(daysAgo(3).getTime() + 180_000) },
      { sessionId: session1.id, role: 'assistant', content: "Exactly right! And that's precisely why lateral reading is so important. Instead of evaluating the text on its own, you open new tabs and verify claims independently. Let me give you a practice example:\n\n> \"According to a 2024 Georgetown Law review, 68% of law students reported using AI tools for case research, with the most popular being LexisNexis AI Assistant.\"\n\nWhat would you check first?", tokensUsed: 150, inputTokens: 1000, outputTokens: 150, createdAt: new Date(daysAgo(3).getTime() + 240_000) },
      { sessionId: session1.id, role: 'user', content: "I'd check if the Georgetown Law review actually published something like that, and if the 68% statistic is real.", tokensUsed: 35, inputTokens: 35, outputTokens: 0, createdAt: new Date(daysAgo(3).getTime() + 300_000) },
      { sessionId: session1.id, role: 'assistant', content: "Good instinct! Here's the trick though — checking the source AND the specific claim separately is key. The Georgetown Law Review is a real publication, so that part checks out. But the 68% stat and \"LexisNexis AI Assistant\" need independent verification.\n\nIn this case, both are fabricated. The AI chose a real, prestigious source to make the claim more believable. This is why you should:\n1. Verify the source exists ✅\n2. Verify the specific claim exists IN that source ✅\n3. Cross-reference the statistic with other sources ✅\n\nWant to try another one? I'll make it trickier.", tokensUsed: 200, inputTokens: 1100, outputTokens: 200, createdAt: new Date(daysAgo(3).getTime() + 360_000) },
      { sessionId: session1.id, role: 'user', content: "Yes, give me a harder one!", tokensUsed: 12, inputTokens: 12, outputTokens: 0, createdAt: new Date(daysAgo(3).getTime() + 420_000) },
      { sessionId: session1.id, role: 'assistant', content: "Here's one from a legal research context — right up your alley:\n\n> \"In *Terry v. Ohio* (1968), the Supreme Court established the 'reasonable suspicion' standard for stop-and-frisk encounters. Chief Justice Warren, writing for the 8-1 majority, noted that officers may conduct a brief pat-down when they have 'specific and articulable facts' suggesting criminal activity. Justice Harlan's concurrence further clarified that officers need not articulate their suspicion at the moment of the stop, but must be able to do so retroactively in court.\"\n\nIs any of this hallucinated?", tokensUsed: 180, inputTokens: 1200, outputTokens: 180, createdAt: new Date(daysAgo(3).getTime() + 480_000) },
      { sessionId: session1.id, role: 'user', content: "Hmm, Terry v. Ohio and reasonable suspicion are definitely real. The 8-1 majority and Chief Justice Warren sound right too. I'm not sure about the Harlan concurrence part though — I don't remember if that's accurate.", tokensUsed: 55, inputTokens: 55, outputTokens: 0, createdAt: new Date(daysAgo(3).getTime() + 600_000) },
      { sessionId: session1.id, role: 'assistant', content: "Great instinct to flag the Harlan concurrence! You're right to be uncertain. Here's what's real vs fabricated:\n\n✅ *Terry v. Ohio* (1968) — real case\n✅ Reasonable suspicion standard — accurate\n✅ Chief Justice Warren wrote the majority — true\n✅ 8-1 decision — true\n✅ \"Specific and articulable facts\" — actual quote from the opinion\n⚠️ **Harlan's concurrence** — this is where it gets tricky. Harlan DID write a concurrence, but the specific claim about \"retroactive articulation\" is a subtle fabrication. The concurrence focused on the \"reasonableness\" of the search, not retroactive justification.\n\nThis is a classic confident confabulation — 90% true, with a plausible-sounding detail woven in. In legal work, these are the most dangerous kind. How would you catch this in practice?", tokensUsed: 250, inputTokens: 1300, outputTokens: 250, createdAt: new Date(daysAgo(3).getTime() + 660_000) },
      { sessionId: session1.id, role: 'user', content: "I'd need to actually read the concurrence to verify, right? So I'd pull up the actual case on Westlaw or LexisNexis and check what Harlan actually said.", tokensUsed: 40, inputTokens: 40, outputTokens: 0, createdAt: new Date(daysAgo(3).getTime() + 720_000) },
      { sessionId: session1.id, role: 'assistant', content: "Exactly — and that's the gold standard for legal verification. **Always go to the primary source.** No amount of AI confidence substitutes for reading the actual opinion.\n\nKey takeaway from today:\n- You're good at identifying the STRUCTURE of hallucinations\n- Your instinct to question uncertain details is strong\n- Next step: build a habit of verifying EVERY specific claim against primary sources, even when 90% of the passage is correct\n\nWant to wrap up here, or do one more round?", tokensUsed: 160, inputTokens: 1400, outputTokens: 160, createdAt: new Date(daysAgo(3).getTime() + 780_000) },
      { sessionId: session1.id, role: 'user', content: "I think that's good for today. This was really helpful — the legal example made it click more than the generic ones.", tokensUsed: 30, inputTokens: 30, outputTokens: 0, createdAt: new Date(daysAgo(3).getTime() + 840_000) },
    ],
  })
  console.log('✅ Session 1: Tutor mode (hallucination detection)')

  // Session 2: Quiz mode — testing prompt engineering knowledge (2 days ago)
  const session2 = await prisma.toolSession.create({
    data: {
      toolId: studyBuddy.id,
      userId: tiana.id,
      courseId: tek100.id,
      startedAt: daysAgo(2),
      endedAt: new Date(daysAgo(2).getTime() + 18 * 60_000),
      messageCount: 12,
      status: 'completed',
      notes: 'quiz',
      summary: '**Covered:** RTCF framework, prompt iteration, context specificity. **Strong:** Role and Task pillars (100% accuracy), iterative refinement strategies. **Review:** Format pillar — tends to forget to specify output structure.',
      score: 0.85,
      qualitySignal: 'strong',
      scoredAt: new Date(daysAgo(2).getTime() + 18 * 60_000),
      durationSeconds: 1080,
      hintCount: 1,
      exitReason: 'completed',
      conceptsTouched: ['prompt-engineering', 'iterative-refinement'],
      bloomLevel: 4,
      bloomConfidence: 0.82,
      cognitiveLoad: 0.45,
      frustrationScore: 0.1,
      metacognitionScore: 0.75,
    },
  })

  await prisma.chatMessage.createMany({
    data: [
      { sessionId: session2.id, role: 'assistant', content: "Quiz time! I'm going to test your prompt engineering knowledge. I'll adapt difficulty based on your answers. Ready?\n\n**Question 1 (Recall):** What are the four pillars of the RTCF framework?\n\nConfidence check: How sure are you? (1-4)", tokensUsed: 90, inputTokens: 700, outputTokens: 90, createdAt: daysAgo(2) },
      { sessionId: session2.id, role: 'user', content: "Role, Task, Context, and Format. Confidence: 4", tokensUsed: 15, inputTokens: 15, outputTokens: 0, createdAt: new Date(daysAgo(2).getTime() + 30_000) },
      { sessionId: session2.id, role: 'assistant', content: "✅ **Correct!** And your confidence was well-calibrated.\n\n**Question 2 (Application):** You want an AI to help you prepare for a Constitutional Law exam. Write a prompt that uses all four RTCF pillars effectively.", tokensUsed: 80, inputTokens: 800, outputTokens: 80, createdAt: new Date(daysAgo(2).getTime() + 60_000) },
      { sessionId: session2.id, role: 'user', content: "\"You are a constitutional law professor specializing in the Bill of Rights. Create a study guide for my upcoming exam on the First Amendment, focusing on free speech cases from the last 20 years. I'm a 1L student. Use bullet points with case names and key holdings.\"", tokensUsed: 60, inputTokens: 60, outputTokens: 0, createdAt: new Date(daysAgo(2).getTime() + 180_000) },
      { sessionId: session2.id, role: 'assistant', content: "✅ **Excellent prompt!** Let me break down your RTCF coverage:\n- **Role:** \"constitutional law professor specializing in the Bill of Rights\" — specific and expert ✅\n- **Task:** \"Create a study guide\" — clear action verb ✅\n- **Context:** \"upcoming exam on First Amendment,\" \"1L student,\" \"last 20 years\" — well-scoped ✅\n- **Format:** \"bullet points with case names and key holdings\" — structured output ✅\n\nScore: 9/10. The only improvement? You could add \"limit to 10-15 cases\" to prevent an overwhelming response.\n\n**Question 3 (Analysis):** Which of these two prompts is better and why?\n\nA: \"Explain hearsay\"\nB: \"As a trial advocacy instructor, explain the hearsay rule to a 1L who understands FRE 801 but struggles with the exceptions in 803 and 804. Use a table format.\"", tokensUsed: 220, inputTokens: 1000, outputTokens: 220, createdAt: new Date(daysAgo(2).getTime() + 240_000) },
      { sessionId: session2.id, role: 'user', content: "B is way better. A has no role, minimal task, no context, and no format. B has all four pillars — the role is a trial advocacy instructor, the task is to explain hearsay, the context narrows to the specific struggle areas (803 and 804 exceptions), and the format requests a table.", tokensUsed: 65, inputTokens: 65, outputTokens: 0, createdAt: new Date(daysAgo(2).getTime() + 360_000) },
      { sessionId: session2.id, role: 'assistant', content: "✅ **Perfect analysis!** You identified every dimension correctly.\n\n**Question 4 (Synthesis):** A student writes this prompt and gets a poor response: \"Tell me about the 14th Amendment.\" Rewrite it three different ways — once for a research paper, once for exam prep, and once for a class presentation.\n\nThis tests whether you can apply RTCF differently depending on the use case.", tokensUsed: 100, inputTokens: 1100, outputTokens: 100, createdAt: new Date(daysAgo(2).getTime() + 420_000) },
      { sessionId: session2.id, role: 'user', content: "Research paper: \"You are a constitutional law scholar. Analyze the evolution of the Equal Protection Clause of the 14th Amendment, focusing on how courts have applied strict scrutiny vs. rational basis review from Brown v. Board (1954) through Students for Fair Admissions (2023). Cite specific cases and include a timeline.\"\n\nExam prep: \"You are a law school tutor. Create 10 practice questions about the 14th Amendment's Due Process and Equal Protection clauses at the level of a 1L constitutional law final. Mix multiple choice and short answer. Include answer explanations.\"\n\nPresentation: \"You are a public speaking coach. Help me create a 5-minute presentation outline about how the 14th Amendment shaped modern civil rights law. Target audience is undergraduate students with no legal background. Use simple language and include 3 compelling examples.\"", tokensUsed: 180, inputTokens: 180, outputTokens: 0, createdAt: new Date(daysAgo(2).getTime() + 600_000) },
      { sessionId: session2.id, role: 'assistant', content: "✅ **Outstanding!** All three prompts are well-crafted. Score: 10/10.\n\nWhat impresses me:\n- Each one has a different **Role** matched to the purpose\n- The **Context** shifts perfectly (academic depth vs exam level vs audience background)\n- The **Format** is tailored (timeline/citations vs Q&A vs outline)\n- You even specified audience and time constraints where relevant\n\nYou've clearly mastered RTCF. Your prompt engineering is one of your strongest areas.\n\n**Session Score: 85%** — Quiz Complete!\n\n| Dimension | Score |\n|-----------|-------|\n| Role | 100% |\n| Task | 100% |\n| Context | 90% |\n| Format | 70% |\n\n💡 One area to watch: **Format specificity.** In Q2 you nailed it, but I'd encourage you to always specify format constraints (length limits, structure) — it's easy to forget when you're focused on content.", tokensUsed: 250, inputTokens: 1300, outputTokens: 250, createdAt: new Date(daysAgo(2).getTime() + 660_000) },
    ],
  })
  console.log('✅ Session 2: Quiz mode (prompt engineering)')

  // Session 3: Flashcards mode — reviewing weak concepts (1 day ago)
  const session3 = await prisma.toolSession.create({
    data: {
      toolId: studyBuddy.id,
      userId: tiana.id,
      courseId: tek100.id,
      startedAt: daysAgo(1),
      endedAt: new Date(daysAgo(1).getTime() + 12 * 60_000),
      messageCount: 10,
      status: 'completed',
      notes: 'flashcards',
      summary: '**Covered:** 6 flashcard reviews (hallucination types, lateral reading steps, source verification, AI confidence vs accuracy). **Strong:** Recalled lateral reading steps perfectly. **Review:** Still confusing AI confidence with accuracy — revisit the distinction.',
      score: 0.70,
      qualitySignal: 'partial',
      scoredAt: new Date(daysAgo(1).getTime() + 12 * 60_000),
      durationSeconds: 720,
      hintCount: 0,
      exitReason: 'completed',
      conceptsTouched: ['hallucination-detection', 'source-verification', 'lateral-reading'],
      bloomLevel: 2,
      bloomConfidence: 0.85,
      cognitiveLoad: 0.40,
      frustrationScore: 0.15,
      metacognitionScore: 0.65,
    },
  })
  console.log('✅ Session 3: Flashcards mode (weak concept review)')

  // Session 4: Socratic mode — deep dive on AI ethics (2 days ago)
  const session4 = await prisma.toolSession.create({
    data: {
      toolId: studyBuddy.id,
      userId: tiana.id,
      courseId: tek100.id,
      startedAt: new Date(daysAgo(2).getTime() + 3 * 3600_000),
      endedAt: new Date(daysAgo(2).getTime() + 3 * 3600_000 + 20 * 60_000),
      messageCount: 16,
      status: 'completed',
      notes: 'socratic',
      summary: '**Covered:** AI ethics in legal practice — when AI assistance crosses the line, duty of competence with AI tools. **Strong:** Can articulate the "who benefits, who bears risk" framework clearly. **Review:** Difficulty applying ethical principles to novel scenarios vs. textbook cases.',
      score: 0.78,
      qualitySignal: 'partial',
      scoredAt: new Date(daysAgo(2).getTime() + 3 * 3600_000 + 20 * 60_000),
      durationSeconds: 1200,
      hintCount: 0,
      exitReason: 'completed',
      conceptsTouched: ['ai-ethics-personal', 'algorithmic-bias'],
      bloomLevel: 5,
      bloomConfidence: 0.70,
      cognitiveLoad: 0.70,
      frustrationScore: 0.20,
      metacognitionScore: 0.80,
    },
  })
  console.log('✅ Session 4: Socratic mode (AI ethics)')

  // Session 5: Teach-Back mode — explaining red-teaming (4 days ago)
  const session5 = await prisma.toolSession.create({
    data: {
      toolId: studyBuddy.id,
      userId: tiana.id,
      courseId: tek100.id,
      startedAt: daysAgo(4),
      endedAt: new Date(daysAgo(4).getTime() + 15 * 60_000),
      messageCount: 10,
      status: 'completed',
      notes: 'teach-back',
      summary: '**Covered:** Red-teaming concepts and stakeholder analysis. **Strong:** Excellent explanation of why adversarial thinking matters, used concrete legal examples. **Review:** Could improve explanation of HOW to systematically identify stakeholders.',
      score: 0.82,
      qualitySignal: 'strong',
      scoredAt: new Date(daysAgo(4).getTime() + 15 * 60_000),
      durationSeconds: 900,
      hintCount: 1,
      exitReason: 'completed',
      conceptsTouched: ['red-teaming', 'stakeholder-perspectives'],
      bloomLevel: 5,
      bloomConfidence: 0.78,
      cognitiveLoad: 0.55,
      frustrationScore: 0.10,
      metacognitionScore: 0.85,
    },
  })
  console.log('✅ Session 5: Teach-Back mode (red-teaming)')

  // Session 6: Debate mode — arguing about AI in legal research (5 days ago)
  const session6 = await prisma.toolSession.create({
    data: {
      toolId: studyBuddy.id,
      userId: tiana.id,
      courseId: tek100.id,
      startedAt: daysAgo(5),
      endedAt: new Date(daysAgo(5).getTime() + 22 * 60_000),
      messageCount: 18,
      status: 'completed',
      notes: 'debate',
      summary: '**Covered:** Should law students be allowed to use AI for case research? Tiana argued FOR with nuanced position. **Strong:** Strong evidence-based arguments, good use of real examples. **Review:** Needs to better anticipate counterarguments before they\'re raised.',
      score: 0.80,
      qualitySignal: 'strong',
      scoredAt: new Date(daysAgo(5).getTime() + 22 * 60_000),
      durationSeconds: 1320,
      hintCount: 0,
      exitReason: 'completed',
      conceptsTouched: ['ai-ethics-personal', 'ai-awareness'],
      bloomLevel: 5,
      bloomConfidence: 0.80,
      cognitiveLoad: 0.60,
      frustrationScore: 0.15,
      metacognitionScore: 0.72,
    },
  })
  console.log('✅ Session 6: Debate mode (AI in legal research)')

  // Session 7: Essay Coach — writing feedback (6 days ago)
  const session7 = await prisma.toolSession.create({
    data: {
      toolId: studyBuddy.id,
      userId: tiana.id,
      courseId: tek100.id,
      startedAt: daysAgo(6),
      endedAt: new Date(daysAgo(6).getTime() + 30 * 60_000),
      messageCount: 8,
      status: 'completed',
      notes: 'essay',
      summary: '**Covered:** Feedback on draft essay about AI transparency in journalism. **Strong:** Clear thesis statement, good use of evidence from course readings. **Review:** Transitions between paragraphs need work, conclusion restates thesis too directly.',
      score: 0.75,
      qualitySignal: 'partial',
      scoredAt: new Date(daysAgo(6).getTime() + 30 * 60_000),
      durationSeconds: 1800,
      hintCount: 0,
      exitReason: 'completed',
      conceptsTouched: ['ai-ethics-personal', 'training-data-bias'],
      bloomLevel: 4,
      bloomConfidence: 0.75,
      cognitiveLoad: 0.50,
      frustrationScore: 0.08,
      metacognitionScore: 0.70,
    },
  })
  console.log('✅ Session 7: Essay Coach mode')

  // Session 8: Recent tutor session — today (for "active" feel)
  const session8 = await prisma.toolSession.create({
    data: {
      toolId: studyBuddy.id,
      userId: tiana.id,
      courseId: tek100.id,
      startedAt: hoursAgo(4),
      endedAt: new Date(hoursAgo(4).getTime() + 20 * 60_000),
      messageCount: 12,
      status: 'completed',
      notes: 'tutor',
      summary: '**Covered:** Source verification techniques for legal research — CRAAP test, lateral reading, database cross-referencing. **Strong:** Applied lateral reading to a fabricated law review citation and caught it. **Review:** Speed — verification process is thorough but slow.',
      score: 0.72,
      qualitySignal: 'partial',
      scoredAt: new Date(hoursAgo(4).getTime() + 20 * 60_000),
      durationSeconds: 1200,
      hintCount: 2,
      exitReason: 'completed',
      conceptsTouched: ['source-verification', 'hallucination-detection'],
      bloomLevel: 3,
      bloomConfidence: 0.80,
      cognitiveLoad: 0.55,
      frustrationScore: 0.25,
      isProductiveStruggle: true,
      metacognitionScore: 0.60,
    },
  })

  await prisma.chatMessage.createMany({
    data: [
      { sessionId: session8.id, role: 'assistant', content: "Welcome back, Tiana! I can see you've been working on hallucination detection — let's build on that today with source verification techniques. When you encounter an AI-generated claim, what's your go-to verification process?", tokensUsed: 80, inputTokens: 600, outputTokens: 80, createdAt: hoursAgo(4) },
      { sessionId: session8.id, role: 'user', content: "I usually Google the claim or check if the source exists. But I know that's pretty basic.", tokensUsed: 25, inputTokens: 25, outputTokens: 0, createdAt: new Date(hoursAgo(4).getTime() + 60_000) },
      { sessionId: session8.id, role: 'assistant', content: "That's a good start! Let me teach you a more systematic approach — the **CRAAP Test** adapted for AI outputs:\n\n- **C**urrency — Is the date/year plausible for this claim?\n- **R**elevance — Does the source actually cover this specific topic?\n- **A**uthority — Is the cited author/institution real AND an expert in this area?\n- **A**ccuracy — Can you verify the specific numbers/quotes in the primary source?\n- **P**urpose — What would motivate someone to make this claim?\n\nCombine this with **lateral reading** (opening 3+ tabs to cross-reference) and you've got a robust verification workflow.\n\nLet me give you a legal citation to practice on:\n\n> \"In *Gonzalez v. Google LLC* (2023), the Supreme Court unanimously held that Section 230 provides absolute immunity for algorithmic content recommendations, with Justice Thomas writing that 'platforms bear no responsibility for the consequences of their recommendation algorithms.'\"", tokensUsed: 260, inputTokens: 900, outputTokens: 260, createdAt: new Date(hoursAgo(4).getTime() + 120_000) },
      { sessionId: session8.id, role: 'user', content: "Okay let me work through this. Currency — 2023 sounds right for a recent Supreme Court case. Relevance — Section 230 and algorithmic recommendations, that's a real legal issue. Authority — the Supreme Court is obviously authoritative. Accuracy — I need to check if the actual holding said 'absolute immunity' and if that's really a Thomas quote. Purpose — this seems like it could be used to argue platforms shouldn't be regulated.\n\nI'm suspicious of the 'absolute immunity' language and the Thomas quote. Let me check... Actually, I think Gonzalez v. Google was a real case but the Court didn't reach such a broad holding. They sent it back, right?", tokensUsed: 140, inputTokens: 140, outputTokens: 0, createdAt: new Date(hoursAgo(4).getTime() + 360_000) },
      { sessionId: session8.id, role: 'assistant', content: "Excellent work! You caught it! 🎯\n\nHere's the breakdown:\n\n✅ *Gonzalez v. Google LLC* (2023) — **real case**\n✅ It involved Section 230 and algorithmic recommendations — **accurate context**\n❌ \"Absolute immunity\" — **fabricated**. The Court actually issued a very narrow, per curiam opinion\n❌ \"Unanimously held\" — **misleading**. The opinion was narrow and procedural\n❌ Justice Thomas quote — **completely fabricated**\n❌ The broad holding — **fabricated**. The Court remanded for reconsideration in light of *Twitter v. Taamneh*\n\nYou correctly identified that the case exists but the holding was misrepresented. That's the hardest type of hallucination — a real case with a fabricated outcome.\n\nYour CRAAP analysis was methodical. The speed will come with practice. Want to try another one?", tokensUsed: 240, inputTokens: 1200, outputTokens: 240, createdAt: new Date(hoursAgo(4).getTime() + 420_000) },
      { sessionId: session8.id, role: 'user', content: "Yes! That felt good. I think the legal context helps me a lot because I have some baseline knowledge to work with.", tokensUsed: 30, inputTokens: 30, outputTokens: 0, createdAt: new Date(hoursAgo(4).getTime() + 480_000) },
    ],
  })
  console.log('✅ Session 8: Tutor mode today (source verification)')

  // ── Observation logs for key sessions ──────────────────────────────────
  // Session 1 observations (tutor — productive struggle)
  await prisma.learnerObservationLog.createMany({
    data: [
      { sessionId: session1.id, userId: tiana.id, turnNumber: 3, bloomLevel: 2, bloomConfidence: 0.70, cognitiveLoad: 0.55, frustrationScore: 0.20, isProductiveStruggle: true, metacognitionScore: 0.50, escalated: false, createdAt: new Date(daysAgo(3).getTime() + 180_000) },
      { sessionId: session1.id, userId: tiana.id, turnNumber: 5, bloomLevel: 3, bloomConfidence: 0.75, cognitiveLoad: 0.65, frustrationScore: 0.30, isProductiveStruggle: true, metacognitionScore: 0.55, escalated: false, createdAt: new Date(daysAgo(3).getTime() + 420_000) },
      { sessionId: session1.id, userId: tiana.id, turnNumber: 7, bloomLevel: 3, bloomConfidence: 0.80, cognitiveLoad: 0.70, frustrationScore: 0.40, isProductiveStruggle: true, metacognitionScore: 0.60, escalated: false, createdAt: new Date(daysAgo(3).getTime() + 660_000) },
    ],
  })

  // Session 2 observations (quiz — strong performance)
  await prisma.learnerObservationLog.createMany({
    data: [
      { sessionId: session2.id, userId: tiana.id, turnNumber: 2, bloomLevel: 2, bloomConfidence: 0.90, cognitiveLoad: 0.30, frustrationScore: 0.05, metacognitionScore: 0.70, escalated: false, createdAt: new Date(daysAgo(2).getTime() + 60_000) },
      { sessionId: session2.id, userId: tiana.id, turnNumber: 4, bloomLevel: 4, bloomConfidence: 0.85, cognitiveLoad: 0.45, frustrationScore: 0.08, metacognitionScore: 0.78, escalated: false, createdAt: new Date(daysAgo(2).getTime() + 300_000) },
      { sessionId: session2.id, userId: tiana.id, turnNumber: 6, bloomLevel: 5, bloomConfidence: 0.82, cognitiveLoad: 0.50, frustrationScore: 0.10, metacognitionScore: 0.80, escalated: false, createdAt: new Date(daysAgo(2).getTime() + 600_000) },
    ],
  })

  // Session 8 observations (today — improving)
  await prisma.learnerObservationLog.createMany({
    data: [
      { sessionId: session8.id, userId: tiana.id, turnNumber: 2, bloomLevel: 2, bloomConfidence: 0.75, cognitiveLoad: 0.50, frustrationScore: 0.20, isProductiveStruggle: true, metacognitionScore: 0.55, escalated: false, createdAt: new Date(hoursAgo(4).getTime() + 120_000) },
      { sessionId: session8.id, userId: tiana.id, turnNumber: 4, bloomLevel: 3, bloomConfidence: 0.80, cognitiveLoad: 0.55, frustrationScore: 0.25, isProductiveStruggle: true, metacognitionScore: 0.65, escalated: false, createdAt: new Date(hoursAgo(4).getTime() + 420_000) },
    ],
  })
  console.log('✅ Seeded observation logs for 3 sessions')

  // ── Flashcard State (spaced repetition cards) ──────────────────────────
  const flashcards = [
    // Due now (overdue) — these show up in "Due Now" on the dashboard
    { conceptSlug: 'hallucination-detection', cardFront: 'What are the 3 types of AI hallucinations?', cardBack: '1) Citation hallucinations (fabricated sources/DOIs), 2) Statistical fabrication (made-up percentages/studies), 3) Confident confabulation (true facts mixed with false ones)', stabilityDays: 1.0, nextReviewAt: daysAgo(2), easeFactor: 2.1, reviewCount: 3, lastQuality: 2 },
    { conceptSlug: 'hallucination-detection', cardFront: 'Why are AI hallucinations especially dangerous in legal research?', cardBack: 'AI can fabricate case citations, holdings, and quotes that sound authoritative. Citing a non-existent case can lead to sanctions (see Mata v. Avianca). Lawyers have a duty of competence to verify all AI-generated legal content.', stabilityDays: 0.5, nextReviewAt: daysAgo(1), easeFactor: 1.8, reviewCount: 4, lastQuality: 1 },
    { conceptSlug: 'source-verification', cardFront: 'What is the CRAAP test for evaluating AI outputs?', cardBack: 'Currency (is the date plausible?), Relevance (does the source cover this topic?), Authority (is the cited author/institution real and expert?), Accuracy (can specific claims be verified in primary sources?), Purpose (what would motivate this claim?)', stabilityDays: 1.0, nextReviewAt: daysAgo(1), easeFactor: 2.0, reviewCount: 2, lastQuality: 2 },
    { conceptSlug: 'source-verification', cardFront: 'What is lateral reading?', cardBack: 'Opening 3+ browser tabs to cross-reference a claim against independent sources instead of evaluating the text in isolation. Verify the source exists, the specific claim exists IN that source, and cross-reference statistics.', stabilityDays: 3.0, nextReviewAt: daysAgo(0), easeFactor: 2.5, reviewCount: 3, lastQuality: 3 },
    // Due tomorrow
    { conceptSlug: 'stakeholder-perspectives', cardFront: 'What is the "Who benefits, who bears risk?" framework?', cardBack: 'An ethical analysis tool: for any AI application, identify who gains value from the technology and who bears the potential negative consequences. Often the beneficiaries and risk-bearers are different populations, creating equity concerns.', stabilityDays: 3.0, nextReviewAt: daysFromNow(1), easeFactor: 2.5, reviewCount: 2, lastQuality: 3 },
    // Due this week
    { conceptSlug: 'prompt-engineering', cardFront: 'What are the four pillars of the RTCF framework?', cardBack: 'Role (who the AI should be), Task (what specific action to perform), Context (background info and constraints), Format (how to structure the output — bullet points, table, length limits, etc.)', stabilityDays: 7.0, nextReviewAt: daysFromNow(3), easeFactor: 2.8, reviewCount: 5, lastQuality: 5 },
    { conceptSlug: 'prompt-engineering', cardFront: 'What is the difference between Task and Context in a prompt?', cardBack: 'Task is the specific action (analyze, explain, create). Context is the surrounding information that helps the AI do it well — audience level, scope constraints, relevant background. Context acts as guardrails that control what to include and exclude.', stabilityDays: 7.0, nextReviewAt: daysFromNow(4), easeFactor: 2.7, reviewCount: 4, lastQuality: 4 },
    { conceptSlug: 'iterative-refinement', cardFront: 'What are 3 strategies for iterating on a weak AI prompt?', cardBack: '1) Add specificity — narrow the scope and add constraints. 2) Change the role — a different expert persona may yield better results. 3) Request structured output — tables, bullet points, or step-by-step format forces organized thinking.', stabilityDays: 5.0, nextReviewAt: daysFromNow(2), easeFactor: 2.6, reviewCount: 3, lastQuality: 4 },
    // Strong — far future
    { conceptSlug: 'ai-awareness', cardFront: 'What is the fundamental mechanism behind AI hallucinations?', cardBack: 'AI systems generate text through probabilistic prediction — predicting the most likely next token based on training data patterns. They have no understanding of truth or accuracy, so they can generate plausible-sounding but factually incorrect content.', stabilityDays: 14.0, nextReviewAt: daysFromNow(10), easeFactor: 2.8, reviewCount: 5, lastQuality: 5 },
    { conceptSlug: 'red-teaming', cardFront: 'What is red-teaming in the context of AI?', cardBack: 'Deliberately trying to find flaws, biases, or failure modes in an AI system or AI-generated output. Involves adopting an adversarial mindset and testing from multiple stakeholder perspectives to identify blind spots and weaknesses before they cause harm.', stabilityDays: 10.0, nextReviewAt: daysFromNow(7), easeFactor: 2.7, reviewCount: 4, lastQuality: 4 },
    { conceptSlug: 'ai-ethics-personal', cardFront: 'When should you disclose AI use in academic work?', cardBack: 'Always follow the course-specific AI policy. General rule: disclose when AI substantially shaped content, arguments, or research. Include what tool was used, how it was used, and what you verified independently. Transparency builds trust and satisfies academic integrity.', stabilityDays: 7.0, nextReviewAt: daysFromNow(5), easeFactor: 2.5, reviewCount: 3, lastQuality: 4 },
    { conceptSlug: 'algorithmic-bias', cardFront: 'What is the difference between individual bias and systemic algorithmic bias?', cardBack: 'Individual bias: personal prejudices of developers or users. Systemic algorithmic bias: patterns in training data or model architecture that systematically disadvantage certain groups — even without any individual intent. Training data reflects historical inequities.', stabilityDays: 5.0, nextReviewAt: daysFromNow(3), easeFactor: 2.4, reviewCount: 2, lastQuality: 3 },
  ]

  for (const fc of flashcards) {
    await prisma.flashcardState.upsert({
      where: { userId_courseId_conceptSlug_cardFront: { userId: tiana.id, courseId: tek100.id, conceptSlug: fc.conceptSlug, cardFront: fc.cardFront } },
      update: fc,
      create: { userId: tiana.id, courseId: tek100.id, ...fc },
    })
  }
  console.log(`✅ Seeded ${flashcards.length} flashcards for Tiana`)

  // ── Summary ────────────────────────────────────────────────────────────
  console.log('\n📊 Study Buddy seed summary:')
  console.log('  • 1 Study Buddy tool (STUDY_BUDDY type)')
  console.log('  • 8 study sessions across all 7 modes')
  console.log('  • 28 chat messages (detailed conversations)')
  console.log('  • 8 observation logs')
  console.log(`  • ${flashcards.length} flashcard states (4 due, 1 tomorrow, 7 this week+)`)
  console.log('  • Linked to TEK-100 course')
  console.log('\n✨ Done! Tiana\'s /study page should now show rich demo content.')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())