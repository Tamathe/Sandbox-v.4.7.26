/**
 * Sandy AI Literacy Tools — Stance Navigator
 *
 * Tools for faculty to explore their AI teaching stance via Sandy.
 */

import type { ToolModule, ToolHandler } from '../agent-types'
import { getStanceProfile, getStanceDistribution, STANCE_DETAILS, STANCE_QUESTIONS } from '../../stance-service'
import { getCoursesForPolicyWizard, generatePolicy, getPolicyGapData } from '../../policy-builder-service'
import { scanAssignment } from '../../assignment-redesign-service'
import { getCoachingBrief } from '../../ai-literacy/coaching-service'
import { getCampusAIPulse } from '../../ai-literacy/campus-pulse-service'
import { getUserProgress as getPromptLabProgress, getChallenges } from '../../prompt-lab-service'
import { getUserProgress as getOutputEvalProgress, getScenario } from '../../output-eval-service'
import { PROMPT_LAB_LEVELS } from '../../prompt-lab-constants'
import { prisma } from '../../prisma'
import { recalculateProfile, getReadinessBand } from '../../progressive-profile-service'
import { getEnrolledCoursePolicies } from '../../ai-literacy/student-policies-service'
import { getOrCreateProfile, getStudentReadinessBand } from '../../ai-literacy/student-literacy-profile-service'
import { startSession as startCoachSession } from '../../ai-literacy/study-coach-service'
import { getStudentModuleProgress } from '../../ai-literacy/student-progress-service'
import type { AIStance } from '../../../generated/prisma'

const getStanceProfileHandler: ToolHandler = async (_args, user) => {
  const profile = await getStanceProfile(user.id)

  if (!profile.hasCompletedAssessment) {
    return {
      message: 'You haven\'t taken the AI stance assessment yet. It\'s a 10-question reflection (about 5 minutes) that helps you figure out where you stand on AI in your teaching. No right answers — every position is supported equally.',
      action: '<!--ACTION:{"type":"navigate","path":"/ai-literacy/stance"}-->',
      hasStance: false,
    }
  }

  const detail = profile.stance ? STANCE_DETAILS[profile.stance] : null
  return {
    stance: profile.stance,
    label: detail?.label ?? 'Unknown',
    philosophy: detail?.philosophy ?? '',
    stanceUpdatedAt: profile.stanceUpdatedAt,
    historyCount: profile.historyCount,
    hasStance: true,
    action: '<!--ACTION:{"type":"navigate","path":"/ai-literacy/stance"}-->',
  }
}

const startStanceAssessmentHandler: ToolHandler = async (_args, _user) => {
  const firstQuestion = STANCE_QUESTIONS[0]
  return {
    message: `Let's start the AI Stance Reflection. I'll walk you through 10 questions — there are no right or wrong answers.\n\n**Question 1: ${firstQuestion.title}**\n${firstQuestion.prompt}\n\n_${firstQuestion.context}_`,
    options: firstQuestion.options.map(o => o.label),
    action: '<!--ACTION:{"type":"navigate","path":"/ai-literacy/stance"}-->',
    note: 'For the best experience with all 10 questions, interactive scoring, and results visualization, use the full Stance Navigator page.',
  }
}

const getStanceDistributionHandler: ToolHandler = async (_args, user) => {
  const profile = await getStanceProfile(user.id)
  const dist = await getStanceDistribution(
    profile.disciplineFamily ?? undefined,
  )

  if (!dist.sufficientData) {
    return {
      message: 'Not enough faculty have completed the assessment yet to show meaningful distributions. As more people participate, you\'ll be able to see how your stance compares.',
    }
  }

  return {
    total: dist.total,
    distribution: dist.distribution,
    filtered: dist.filtered,
    yourStance: profile.stance,
  }
}

const analyzeAssignmentRiskHandler: ToolHandler = async (args, _user) => {
  const text = args.description as string | undefined
  if (!text || text.trim().length < 10) {
    return {
      message: 'Please provide the assignment text or description (at least 10 characters) so I can analyze it for AI vulnerability.',
      action: '<!--ACTION:{"type":"navigate","path":"/ai-literacy/assignments"}-->',
    }
  }
  const result = await scanAssignment(text, args.assignmentType as string | undefined, args.discipline as string | undefined)
  return {
    aiCompletability: result.aiCompletability,
    bloomLevel: result.bloomLevel,
    summary: result.summary,
    vulnerabilities: result.vulnerabilities,
    suggestions: result.suggestions.slice(0, 3),
    action: '<!--ACTION:{"type":"navigate","path":"/ai-literacy/assignments"}-->',
    note: 'For the full interactive experience with templates, use the Assignment Redesign Studio.',
  }
}

const generateAIPolicyHandler: ToolHandler = async (args, user) => {
  const courseId = args.courseId as string | undefined

  // Get stance
  const profile = await prisma.aILiteracyProfile.findUnique({ where: { userId: user.id } })
  const stance = (args.stance as AIStance) ?? profile?.stance ?? 'GUIDED'

  if (!courseId) {
    // Show gap data instead
    const gap = await getPolicyGapData(user.id, user.role)
    const missing = gap.items.filter(i => !i.hasAIPolicy)
    return {
      message: `You have ${gap.withPolicy} of ${gap.total} courses with AI policies (${gap.coverage}% coverage).${missing.length > 0 ? ` Courses without policies: ${missing.map(c => c.courseCode).join(', ')}.` : ' All courses have policies!'}`,
      action: '<!--ACTION:{"type":"navigate","path":"/ai-literacy/policy"}-->',
    }
  }

  // Generate for specific course
  const courses = await getCoursesForPolicyWizard(user.id, stance)
  const course = courses.find(c => c.id === courseId)
  if (!course) {
    return { message: 'Course not found or you don\'t have access to it.' }
  }

  const policy = generatePolicy(
    stance,
    `${course.courseCode} — ${course.title}`,
    course.assignments.map(a => ({ title: a.title, level: a.level })),
    profile?.disciplineFamily ?? undefined,
  )

  return {
    message: `Here's a generated AI policy for ${course.courseCode} based on your "${stance}" stance:\n\n${policy.fullText}`,
    action: '<!--ACTION:{"type":"navigate","path":"/ai-literacy/policy"}-->',
    note: 'Use the Policy Builder page to customize and save this policy.',
  }
}

// ── New Optimization Tool Handlers ───────────────────────────────────────────

const aiLiteracyCoachHandler: ToolHandler = async (_args, user) => {
  const brief = await getCoachingBrief(user.id)
  return {
    readinessScore: brief.readinessScore,
    stanceStatus: brief.stanceStatus,
    stance: brief.stance,
    policyCoverage: brief.policyCoverage,
    coursesWithPolicy: brief.coursesWithPolicy,
    totalCourses: brief.totalCourses,
    coursesWithoutPolicy: brief.coursesWithoutPolicy,
    quickStartCompleted: brief.quickStartCompleted,
    recommendedNextStep: brief.recommendedNextStep,
    action: `<!--ACTION:{"type":"navigate","path":"${brief.recommendedNextStep.path}"}-->`,
  }
}

const getCampusPulseHandler: ToolHandler = async (_args, user) => {
  if (user.role !== 'ADMIN' && user.role !== 'EDUCATOR') {
    return { message: 'Campus pulse data is available to faculty and administrators.' }
  }
  const pulse = await getCampusAIPulse()
  return {
    policyCoverage: `${pulse.policyCoverage}%`,
    coursesWithPolicy: pulse.coursesWithPolicy,
    totalCourses: pulse.totalCourses,
    totalFacultyWithStances: pulse.totalProfilesWithStance,
    stanceDistribution: pulse.stanceDistribution,
    trendVsLastMonth: pulse.trendVsLastMonth,
    action: '<!--ACTION:{"type":"navigate","path":"/ai-literacy/pulse"}-->',
  }
}

const suggestRedesignFromGradingHandler: ToolHandler = async (args, _user) => {
  const text = args.assignmentDescription as string | undefined
  if (!text || text.trim().length < 10) {
    return {
      message: 'Instead of trying to detect AI use, consider redesigning this assignment to make it AI-resilient. I can scan it for vulnerabilities and suggest alternatives.',
      action: '<!--ACTION:{"type":"navigate","path":"/ai-literacy/assignments"}-->',
    }
  }
  const result = await scanAssignment(text)
  return {
    aiCompletability: result.aiCompletability,
    summary: result.summary,
    topSuggestion: result.suggestions[0] ?? null,
    message: `This assignment is ${result.aiCompletability}% AI-completable. ${result.summary} ${result.suggestions[0] ? `Top suggestion: ${result.suggestions[0].title} — ${result.suggestions[0].description}` : ''}`,
    action: '<!--ACTION:{"type":"navigate","path":"/ai-literacy/assignments"}-->',
  }
}

const startAdvisingPracticeHandler: ToolHandler = async (args, _user) => {
  const scenario = args.scenario as string | undefined
  return {
    message: 'Let\'s practice an advising conversation about AI. I\'ll roleplay as a student or colleague and you respond as you would in real life. Choose a scenario or I\'ll pick one.',
    action: scenario
      ? `<!--ACTION:{"type":"navigate","path":"/ai-literacy/advising/practice?scenario=${scenario}"}-->`
      : '<!--ACTION:{"type":"navigate","path":"/ai-literacy/advising/practice"}-->',
  }
}

// ── Prompt Lab & Output Eval Tool Handlers ──────────────────────────────────

const getPromptLabProgressHandler: ToolHandler = async (_args, user) => {
  const progress = await getPromptLabProgress(user.id)
  if (progress.totalAttempts === 0) {
    return {
      message: 'You haven\'t tried the Prompt Lab yet! It teaches you to write better AI prompts across 5 skill levels: Clarity, Constraints, Context, Chain of Thought, and Evaluation.',
      action: '<!--ACTION:{"type":"navigate","path":"/ai-literacy/prompt-lab"}-->',
    }
  }
  const levelSummary = progress.levelProgress
    .map((l) => {
      const name = PROMPT_LAB_LEVELS.find((lv) => lv.id === l.level)?.name ?? `Level ${l.level}`
      return `${name}: ${l.attempts} attempts, best ${l.bestScore}/10, avg ${l.avgScore}/10`
    })
    .join('\n')
  return {
    totalAttempts: progress.totalAttempts,
    avgScore: progress.avgScore,
    levelProgress: levelSummary,
    action: '<!--ACTION:{"type":"navigate","path":"/ai-literacy/prompt-lab"}-->',
  }
}

const getOutputEvalProgressHandler: ToolHandler = async (_args, user) => {
  const progress = await getOutputEvalProgress(user.id)
  if (progress.totalAttempts === 0) {
    return {
      message: 'You haven\'t tried the Output Evaluator yet! It teaches you to spot errors in AI-generated responses — hallucinations, bias, unsupported claims, and missing context across 3 difficulty tiers.',
      action: '<!--ACTION:{"type":"navigate","path":"/ai-literacy/output-eval"}-->',
    }
  }
  const tierSummary = progress.tierProgress
    .map((t) => `Tier ${t.tier}: ${t.attempts} attempts, best ${t.bestScore}%, avg ${t.avgScore}%`)
    .join('\n')
  return {
    totalAttempts: progress.totalAttempts,
    avgScore: progress.avgScore,
    tierProgress: tierSummary,
    action: '<!--ACTION:{"type":"navigate","path":"/ai-literacy/output-eval"}-->',
  }
}

const suggestPromptLabChallengeHandler: ToolHandler = async (_args, user) => {
  const progress = await getPromptLabProgress(user.id)

  // Find weakest level or first unattempted
  let targetLevel = 1
  if (progress.levelProgress.length > 0) {
    const attempted = new Set(progress.levelProgress.map((l) => l.level))
    const unattempted = [1, 2, 3, 4, 5].find((l) => !attempted.has(l))
    if (unattempted) {
      targetLevel = unattempted
    } else {
      const weakest = progress.levelProgress.reduce((a, b) => (a.avgScore < b.avgScore ? a : b))
      targetLevel = weakest.level
    }
  }

  const challenges = getChallenges(targetLevel)
  const challenge = challenges[Math.floor(Math.random() * challenges.length)]
  const levelName = PROMPT_LAB_LEVELS.find((l) => l.id === targetLevel)?.name ?? `Level ${targetLevel}`

  return {
    message: `I recommend a **${levelName}** challenge: ${challenge.scenario}\n\nThe original prompt is: "${challenge.originalPrompt}" — your job is to rewrite it to get a much better result.`,
    level: targetLevel,
    challengeId: challenge.id,
    action: '<!--ACTION:{"type":"navigate","path":"/ai-literacy/prompt-lab"}-->',
  }
}

const getOutputEvalScenarioHandler: ToolHandler = async (args, user) => {
  const progress = await getOutputEvalProgress(user.id)

  // Find weakest tier or default to 1
  let targetTier = (args.tier as number) || 1
  if (!args.tier && progress.tierProgress.length > 0) {
    const attempted = new Set(progress.tierProgress.map((t) => t.tier))
    const unattempted = [1, 2, 3].find((t) => !attempted.has(t))
    if (unattempted) {
      targetTier = unattempted
    } else {
      const weakest = progress.tierProgress.reduce((a, b) => (a.avgScore < b.avgScore ? a : b))
      targetTier = weakest.tier
    }
  }

  const scenario = getScenario(targetTier)
  if (!scenario) {
    return {
      message: `No seeded scenarios available for Tier ${targetTier}. Head to the Output Evaluator to generate a fresh one!`,
      action: '<!--ACTION:{"type":"navigate","path":"/ai-literacy/output-eval"}-->',
    }
  }

  return {
    message: `Here's a Tier ${targetTier} scenario: "${scenario.question}"\n\nHead to the Output Evaluator to read the AI response and try to spot the errors!`,
    tier: targetTier,
    scenarioId: scenario.id,
    action: '<!--ACTION:{"type":"navigate","path":"/ai-literacy/output-eval"}-->',
  }
}

// ── Starter Pack Tool Handlers ───────────────────────────────────────────────

const buildStarterPackHandler: ToolHandler = async (_args, user) => {
  const existingPacks = await prisma.customStarterPack.count({ where: { userId: user.id } })

  const coursesWithPacks = await prisma.customStarterPack.findMany({
    where: { userId: user.id },
    select: { courseId: true },
  })
  const packCourseIds = new Set(coursesWithPacks.map(p => p.courseId))

  const allCourses = await prisma.course.findMany({
    where: { instructorId: user.id },
    select: { id: true, courseCode: true, title: true },
  })
  const coursesWithoutPacks = allCourses
    .filter(c => !packCourseIds.has(c.id))
    .map(c => ({ courseCode: c.courseCode, title: c.title }))

  return {
    existingPacks,
    coursesWithoutPacks,
    action: '<!--ACTION:{"type":"navigate","href":"/ai-literacy/starter-packs/builder","label":"Build My Pack"}-->',
  }
}

const getPackStatusHandler: ToolHandler = async (args, user) => {
  const courseId = args.courseId as string | undefined

  const pack = courseId
    ? await prisma.customStarterPack.findFirst({
        where: { userId: user.id, courseId },
        include: { items: { include: { implementation: true } }, course: { select: { title: true } } },
      })
    : await prisma.customStarterPack.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        include: { items: { include: { implementation: true } }, course: { select: { title: true } } },
      })

  if (!pack) {
    return {
      message: 'No active starter pack found. Want to build one?',
      action: '<!--ACTION:{"type":"navigate","href":"/ai-literacy/starter-packs/builder","label":"Build My Pack"}-->',
    }
  }

  const total = pack.items.length
  const started = pack.items.filter(i => i.implementation && i.implementation.status !== 'NOT_STARTED').length
  const completed = pack.items.filter(i => i.implementation?.status === 'COMPLETED' || i.implementation?.status === 'REFLECTED').length
  const reflected = pack.items.filter(i => i.implementation?.status === 'REFLECTED').length

  return {
    packName: pack.name,
    courseName: pack.course.title,
    status: pack.status,
    total,
    started,
    completed,
    reflected,
    action: `<!--ACTION:{"type":"navigate","href":"/ai-literacy/starter-packs/${pack.id}","label":"View Pack"}-->`,
  }
}

const suggestNextAssignmentHandler: ToolHandler = async (args, user) => {
  const packId = args.packId as string | undefined

  const pack = packId
    ? await prisma.customStarterPack.findFirst({
        where: { id: packId, userId: user.id },
        include: {
          items: {
            include: { implementation: true, template: { select: { title: true, description: true, aiTier: true, aiLevel: true } } },
            orderBy: { sortOrder: 'asc' },
          },
        },
      })
    : await prisma.customStarterPack.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: { implementation: true, template: { select: { title: true, description: true, aiTier: true, aiLevel: true } } },
            orderBy: { sortOrder: 'asc' },
          },
        },
      })

  if (!pack) {
    return {
      message: 'No active starter pack found. Want to build one?',
      action: '<!--ACTION:{"type":"navigate","href":"/ai-literacy/starter-packs/builder","label":"Build My Pack"}-->',
    }
  }

  const nextItem = pack.items.find(i => !i.implementation || i.implementation.status === 'NOT_STARTED')

  if (!nextItem) {
    return {
      message: 'All assignments in your pack have been started! Great progress.',
      action: `<!--ACTION:{"type":"navigate","href":"/ai-literacy/starter-packs/${pack.id}","label":"View Pack"}-->`,
    }
  }

  const title = nextItem.customTitle ?? nextItem.template?.title ?? 'Untitled'
  const description = nextItem.customDescription ?? nextItem.template?.description ?? ''
  const tier = nextItem.template?.aiTier ?? 'FOUNDATIONAL'
  const aiLevel = nextItem.customAiLevel ?? nextItem.template?.aiLevel ?? 'GUIDED'

  return {
    nextAssignment: { title, description, tier, aiLevel },
    reason: `This is your next ${tier.toLowerCase()} assignment — a good progression from your completed work.`,
    action: `<!--ACTION:{"type":"navigate","href":"/ai-literacy/starter-packs/${pack.id}","label":"View Pack"}-->`,
  }
}

// ── Progressive AI Profile Tool Handlers ────────────────────────────────────

const getProgressiveProfileHandler: ToolHandler = async (args, user) => {
  let targetUserId = user.id

  if (args.targetEmail) {
    if (user.role !== 'ADMIN') {
      return { error: 'Only admins can look up other users\' profiles.' }
    }
    const target = await prisma.user.findUnique({
      where: { email: args.targetEmail as string },
      select: { id: true, name: true },
    })
    if (!target) return { error: 'User not found.' }
    targetUserId = target.id
  }

  const profile = await prisma.aILiteracyProfile.findUnique({
    where: { userId: targetUserId },
    select: {
      comfort: true, pedagogyAlignment: true, curiosity: true,
      ethicalAwareness: true, currentUsage: true, readiness: true,
      modulesCompleted: true, profileMaterialized: true, lastScoredAt: true,
    },
  })

  if (!profile || !profile.profileMaterialized) {
    return {
      materialized: false,
      modulesCompleted: profile?.modulesCompleted ?? 0,
      message: `AI Profile hasn't materialized yet — ${2 - (profile?.modulesCompleted ?? 0)} more module(s) needed.`,
      action: '<!--ACTION:{"type":"navigate","path":"/ai-literacy"}-->',
    }
  }

  const band = getReadinessBand(profile.readiness)
  return {
    materialized: true,
    comfort: profile.comfort,
    pedagogyAlignment: profile.pedagogyAlignment,
    curiosity: profile.curiosity,
    ethicalAwareness: profile.ethicalAwareness,
    currentUsage: profile.currentUsage,
    readiness: profile.readiness,
    readinessBand: band.label,
    readinessBandKey: band.key,
    modulesCompleted: profile.modulesCompleted,
    lastScoredAt: profile.lastScoredAt?.toISOString() ?? null,
  }
}

const recalculateProfileHandler: ToolHandler = async (args, user) => {
  const completions = Array.isArray(args.studentLessonCompletions)
    ? (args.studentLessonCompletions as string[])
    : undefined

  const updated = await recalculateProfile(user.id, { studentLessonCompletions: completions })
  const band = getReadinessBand(updated.readiness)

  return {
    materialized: updated.profileMaterialized,
    comfort: updated.comfort,
    pedagogyAlignment: updated.pedagogyAlignment,
    curiosity: updated.curiosity,
    ethicalAwareness: updated.ethicalAwareness,
    currentUsage: updated.currentUsage,
    readiness: updated.readiness,
    readinessBand: band.label,
    readinessBandKey: band.key,
    modulesCompleted: updated.modulesCompleted,
    lastScoredAt: updated.lastScoredAt?.toISOString() ?? null,
    message: updated.profileMaterialized
      ? `Profile recalculated. Readiness: ${updated.readiness}/100 (${band.label}).`
      : `Profile updated but not yet materialized — ${2 - updated.modulesCompleted} more module(s) needed.`,
  }
}

// ── Student AI Literacy Tool Handlers ────────────────────────────────────────

const getStudentAIPoliciesHandler: ToolHandler = async (_args, user) => {
  const policies = await getEnrolledCoursePolicies(user.id)
  if (policies.length === 0) {
    return {
      message: 'You don\'t appear to be enrolled in any courses yet.',
      action: '<!--ACTION:{"type":"navigate","path":"/ai-literacy/student/policies"}-->',
    }
  }
  const summary = policies.map(p => ({
    course: `${p.course.code} — ${p.course.title}`,
    instructor: p.course.instructor,
    hasPolicy: !!p.policy,
    stance: p.policy?.stance ?? 'No policy set',
    publishedToStudents: p.policy?.publishedToStudents ?? false,
    clarityScore: p.clarityScore,
    hasTakenClarityCheck: p.hasTakenClarityCheck,
  }))
  const reviewed = summary.filter(s => s.hasTakenClarityCheck).length
  return {
    totalCourses: summary.length,
    reviewed,
    unreviewed: summary.length - reviewed,
    courses: summary,
    action: '<!--ACTION:{"type":"navigate","path":"/ai-literacy/student/policies"}-->',
  }
}

const checkAssignmentAIPolicyHandler: ToolHandler = async (args, user) => {
  const courseName = (args.courseName as string)?.trim()
  if (!courseName) {
    return { message: 'Please provide a course name so I can look up its AI policy.' }
  }

  const policies = await getEnrolledCoursePolicies(user.id)
  const match = policies.find(p =>
    p.course.title.toLowerCase().includes(courseName.toLowerCase()) ||
    p.course.code.toLowerCase().includes(courseName.toLowerCase()),
  )

  if (!match) {
    return { message: `I couldn't find a course matching "${courseName}" in your enrollments.` }
  }

  if (!match.policy) {
    return {
      message: `${match.course.code} — ${match.course.title} doesn't have a published AI policy yet. Ask your instructor (${match.course.instructor}) about their expectations.`,
    }
  }

  const excerpt = match.policy.policyText.length > 500
    ? match.policy.policyText.slice(0, 500) + '…'
    : match.policy.policyText

  return {
    course: `${match.course.code} — ${match.course.title}`,
    stance: match.policy.stance,
    aiAllowed: match.policy.stance !== 'PROHIBIT',
    excerpt,
    clarityScore: match.clarityScore,
    hasTakenClarityCheck: match.hasTakenClarityCheck,
    action: '<!--ACTION:{"type":"navigate","path":"/ai-literacy/student/policies"}-->',
  }
}

const getStudentLiteracyProfileHandler: ToolHandler = async (_args, user) => {
  const profile = await getOrCreateProfile(user.id)
  const band = getStudentReadinessBand(profile.readiness)
  const progress = await getStudentModuleProgress(user.id)

  if (!profile.profileMaterialized) {
    const completedCount = Object.values(progress).filter(s => s === 'completed').length
    return {
      materialized: false,
      modulesCompleted: completedCount,
      message: `Your AI literacy profile hasn't materialized yet — complete ${Math.max(0, 2 - completedCount)} more module(s) to unlock it.`,
      moduleProgress: progress,
      action: '<!--ACTION:{"type":"navigate","path":"/ai-literacy/student"}-->',
    }
  }

  return {
    materialized: true,
    practicalSkill: profile.practicalSkill,
    communication: profile.communication,
    skepticism: profile.skepticism,
    judgment: profile.judgment,
    readiness: profile.readiness,
    readinessBand: band.label,
    readinessBandKey: band.key,
    modulesCompleted: profile.modulesCompleted,
    moduleProgress: progress,
    lastScoredAt: profile.lastScoredAt?.toISOString() ?? null,
  }
}

const AI_STRATEGY_MAP: Record<string, string[]> = {
  PROHIBIT: [
    'Use AI to study and review concepts OUTSIDE of assignments',
    'Practice explaining topics to AI to test your understanding',
    'Use AI to generate practice quiz questions for self-testing',
  ],
  CAUTIOUS: [
    'Use AI for brainstorming initial ideas, but write everything yourself',
    'Have AI quiz you on key concepts before exams',
    'Use AI to explain difficult readings in simpler terms',
  ],
  GUIDED: [
    'Use AI as a study partner — ask it to challenge your reasoning',
    'Draft your work first, then use AI for feedback and revision ideas',
    'Use AI to generate practice problems similar to homework',
    'Ask AI to explain your mistakes when you get something wrong',
  ],
  INTEGRATE: [
    'Use AI to draft outlines and then expand with your own analysis',
    'Pair-program with AI — write code together and learn from its suggestions',
    'Use AI to find connections between concepts across your courses',
    'Have AI help you prepare study materials and flashcards',
    'Use AI to simulate professional scenarios relevant to your field',
  ],
  REQUIRE: [
    'Use AI as a core part of your workflow — the course expects it',
    'Experiment with different prompting strategies and document what works',
    'Use AI to iterate on drafts and track how your prompts improve output',
    'Build a personal prompt library for recurring assignment types',
    'Compare outputs from different AI tools to understand their strengths',
  ],
}

const suggestAIStrategyForCourseHandler: ToolHandler = async (args, user) => {
  const courseName = (args.courseName as string)?.trim()
  if (!courseName) {
    return { message: 'Please provide a course name so I can suggest AI strategies.' }
  }

  const policies = await getEnrolledCoursePolicies(user.id)
  const match = policies.find(p =>
    p.course.title.toLowerCase().includes(courseName.toLowerCase()) ||
    p.course.code.toLowerCase().includes(courseName.toLowerCase()),
  )

  if (!match) {
    return { message: `I couldn't find a course matching "${courseName}" in your enrollments.` }
  }

  const stance = match.policy?.stance ?? 'GUIDED'
  const strategies = AI_STRATEGY_MAP[stance] ?? AI_STRATEGY_MAP.GUIDED

  return {
    course: `${match.course.code} — ${match.course.title}`,
    stance,
    strategies,
    note: stance === 'PROHIBIT'
      ? 'This course prohibits AI in assignments, but you can still use AI for personal study.'
      : `This course has a "${stance}" AI stance — here are ways to use AI effectively.`,
  }
}

const startStudyCoachSessionHandler: ToolHandler = async (args, user) => {
  const topic = (args.topic as string)?.trim()
  if (!topic) {
    return { message: 'What topic would you like to practice studying with AI?' }
  }

  const courseName = (args.courseName as string)?.trim()
  let courseId: string | undefined

  if (courseName) {
    const enrollment = await prisma.courseEnrollment.findFirst({
      where: {
        studentId: user.id,
        course: {
          OR: [
            { title: { contains: courseName, mode: 'insensitive' } },
            { courseCode: { contains: courseName, mode: 'insensitive' } },
          ],
        },
      },
      select: { courseId: true },
    })
    courseId = enrollment?.courseId
  }

  const session = await startCoachSession(user.id, topic, courseId)

  return {
    sessionId: session.id,
    topic: session.topic,
    message: `Study coach session started! Head to the Study Coach to begin practicing.`,
    action: `<!--ACTION:{"type":"navigate","path":"/ai-literacy/student/study-coach/${session.id}"}-->`,
  }
}

const getStudentModuleRecommendationsHandler: ToolHandler = async (_args, user) => {
  const profile = await getOrCreateProfile(user.id)
  const progress = await getStudentModuleProgress(user.id)

  // Find modules not yet completed
  const incomplete = Object.entries(progress)
    .filter(([, status]) => status !== 'completed')
    .map(([key]) => key)

  if (incomplete.length === 0) {
    return {
      message: 'You\'ve completed all 5 modules — impressive! Try revisiting your weakest dimension to push your readiness higher.',
      action: '<!--ACTION:{"type":"navigate","path":"/ai-literacy/student"}-->',
    }
  }

  // Map dimensions to the modules that improve them
  const dimensionModuleMap: Record<string, { modules: string[]; label: string }> = {
    practicalSkill: { modules: ['prompt-craft', 'study-coach'], label: 'Practical Skill' },
    communication: { modules: ['prompt-craft', 'study-coach'], label: 'Communication' },
    skepticism: { modules: ['output-detective', 'judgment-calls'], label: 'Skepticism' },
    judgment: { modules: ['policies', 'judgment-calls'], label: 'Judgment' },
  }

  // Find lowest dimension
  const dimensions = [
    { key: 'practicalSkill', value: profile.practicalSkill },
    { key: 'communication', value: profile.communication },
    { key: 'skepticism', value: profile.skepticism },
    { key: 'judgment', value: profile.judgment },
  ].sort((a, b) => a.value - b.value)

  const weakest = dimensions[0]
  const mapping = dimensionModuleMap[weakest.key]
  const recommended = mapping.modules.filter(m => incomplete.includes(m))

  const moduleLabels: Record<string, string> = {
    policies: 'My AI Policies',
    'judgment-calls': 'Judgment Calls',
    'prompt-craft': 'Prompt Craft',
    'output-detective': 'Output Detective',
    'study-coach': 'AI Study Coach',
  }

  if (recommended.length > 0) {
    return {
      weakestDimension: mapping.label,
      weakestScore: weakest.value,
      recommendedModules: recommended.map(m => moduleLabels[m] ?? m),
      message: `Your weakest area is ${mapping.label} (${weakest.value}/100). Try ${recommended.map(m => moduleLabels[m] ?? m).join(' or ')} to improve it.`,
      action: `<!--ACTION:{"type":"navigate","path":"/ai-literacy/student/${recommended[0]}"}-->`,
    }
  }

  // Fallback: recommend any incomplete module
  const fallback = incomplete[0]
  return {
    weakestDimension: mapping.label,
    weakestScore: weakest.value,
    recommendedModules: [moduleLabels[fallback] ?? fallback],
    message: `Try ${moduleLabels[fallback] ?? fallback} next — it's still incomplete.`,
    action: `<!--ACTION:{"type":"navigate","path":"/ai-literacy/student/${fallback}"}-->`,
  }
}

const aiLiteracyToolModule: ToolModule = {
  tools: [
    {
      name: 'get_stance_profile',
      description: 'Get the faculty member\'s current AI teaching stance — their position on the spectrum from Prohibit to Require, plus when they last assessed and how many times they\'ve reassessed.',
      category: 'academic',
      permission: 'auto',
      roles: ['EDUCATOR', 'ADMIN'],
      input_schema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'start_stance_assessment',
      description: 'Begin the guided AI stance reflection. Returns the first question of the 10-question assessment. Best used to introduce the concept; for the full interactive experience, direct faculty to /ai-literacy/stance.',
      category: 'academic',
      permission: 'auto',
      roles: ['EDUCATOR', 'ADMIN'],
      input_schema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'get_stance_distribution',
      description: 'Show anonymized campus-wide distribution of AI teaching stances — how many faculty have chosen Prohibit, Cautious, Guided, Integrate, or Require. Optionally filtered by discipline family.',
      category: 'analytics',
      permission: 'auto',
      roles: ['EDUCATOR', 'ADMIN'],
      input_schema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'analyze_assignment_ai_risk',
      description: 'Analyze an assignment for AI completability. Provide the assignment text/description and get a vulnerability score, specific weaknesses, and redesign suggestions.',
      category: 'academic',
      permission: 'auto',
      roles: ['EDUCATOR', 'ADMIN'],
      input_schema: {
        type: 'object',
        properties: {
          description: { type: 'string', description: 'The assignment text or prompt to analyze.' },
          assignmentType: { type: 'string', description: 'Type of assignment (essay, problem set, etc.)' },
          discipline: { type: 'string', description: 'Academic discipline for context' },
        },
        required: ['description'],
      },
    },
    {
      name: 'generate_ai_policy',
      description: 'Generate an AI policy for a specific course based on the instructor\'s stance. If no courseId is provided, shows policy gap data (which courses need policies). Requires user confirmation before saving.',
      category: 'academic',
      permission: 'confirm',
      roles: ['EDUCATOR', 'ADMIN'],
      input_schema: {
        type: 'object',
        properties: {
          courseId: { type: 'string', description: 'The course ID to generate a policy for. Omit to see gap data.' },
          stance: { type: 'string', enum: ['PROHIBIT', 'CAUTIOUS', 'GUIDED', 'INTEGRATE', 'REQUIRE'], description: 'Override stance for this course (optional).' },
        },
        required: [],
      },
    },
    {
      name: 'ai_literacy_coach',
      description: 'Get a comprehensive AI literacy readiness assessment — stance status, policy coverage, recommended next step. Use when faculty asks "what should I do for AI literacy?" or "how ready am I?"',
      category: 'academic',
      permission: 'auto',
      roles: ['EDUCATOR', 'ADMIN'],
      input_schema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'get_campus_ai_pulse',
      description: 'Show campus-wide AI readiness metrics — policy coverage %, stance distribution, department breakdown, month-over-month trends. For faculty and administrators.',
      category: 'analytics',
      permission: 'auto',
      roles: ['EDUCATOR', 'ADMIN'],
      input_schema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'suggest_assignment_redesign_from_grading',
      description: 'When a faculty member flags suspicious AI work while grading, suggest redesigning the assignment instead of trying to detect AI. Can scan the assignment text for vulnerabilities and suggest alternatives.',
      category: 'academic',
      permission: 'auto',
      roles: ['EDUCATOR', 'ADMIN'],
      input_schema: {
        type: 'object',
        properties: {
          assignmentDescription: { type: 'string', description: 'The assignment text to analyze for AI vulnerability' },
        },
        required: [],
      },
    },
    {
      name: 'start_advising_practice',
      description: 'Start an interactive advising practice session where Sandy roleplays as a student or colleague in an AI-related advising scenario. Faculty can practice their responses and get coaching feedback.',
      category: 'academic',
      permission: 'auto',
      roles: ['EDUCATOR', 'ADMIN'],
      input_schema: {
        type: 'object',
        properties: {
          scenario: { type: 'string', description: 'Scenario ID: admits-ai, asks-about-tools, struggling-reliance, ethical-use, colleague-frustrated' },
        },
        required: [],
      },
    },
    {
      name: 'get_prompt_lab_progress',
      description: 'Get the user\'s Prompt Lab progress — total attempts, average score, and per-level breakdown across 5 prompt engineering skill levels.',
      category: 'academic',
      permission: 'auto',
      roles: ['STUDENT', 'EDUCATOR', 'ADMIN', 'STAFF'],
      input_schema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'get_output_eval_progress',
      description: 'Get the user\'s Output Evaluator progress — total evaluations, average score, and per-tier breakdown for spotting AI errors.',
      category: 'academic',
      permission: 'auto',
      roles: ['STUDENT', 'EDUCATOR', 'ADMIN', 'STAFF'],
      input_schema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'suggest_prompt_lab_challenge',
      description: 'Recommend a Prompt Lab challenge based on the user\'s weakest skill level. Returns a specific challenge scenario to try.',
      category: 'academic',
      permission: 'auto',
      roles: ['STUDENT', 'EDUCATOR', 'ADMIN', 'STAFF'],
      input_schema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'get_output_eval_scenario',
      description: 'Get an Output Evaluator scenario for the user to practice. Picks from their weakest tier or a specified tier. Good when a user asks to practice spotting AI errors.',
      category: 'academic',
      permission: 'auto',
      roles: ['STUDENT', 'EDUCATOR', 'ADMIN', 'STAFF'],
      input_schema: {
        type: 'object',
        properties: {
          tier: { type: 'number', description: 'Difficulty tier (1=Obvious, 2=Subtle, 3=Expert). Omit to auto-select weakest.' },
        },
        required: [],
      },
    },
    {
      name: 'get_progressive_profile',
      description: 'Get a user\'s progressive AI profile — 5 dimension scores (comfort, pedagogy alignment, curiosity, ethical awareness, current usage), readiness band, and materialization status. Works for the current user, or an admin can look up any user by email.',
      category: 'academic',
      permission: 'auto',
      roles: ['STUDENT', 'EDUCATOR', 'ADMIN', 'STAFF'],
      input_schema: {
        type: 'object',
        properties: {
          targetEmail: { type: 'string', description: 'Email of user to look up (admin only). Omit for own profile.' },
        },
        required: [],
      },
    },
    {
      name: 'recalculate_profile',
      description: 'Recalculate the current user\'s progressive AI profile based on their latest activity across all AI Literacy modules. Returns updated dimension scores and readiness band.',
      category: 'academic',
      permission: 'auto',
      roles: ['STUDENT', 'EDUCATOR', 'ADMIN', 'STAFF'],
      input_schema: {
        type: 'object',
        properties: {
          studentLessonCompletions: {
            type: 'array',
            items: { type: 'string' },
            description: 'Optional array of completed student lesson IDs (e.g. "responsible-use", "when-not-to-use", "citing-ai", "critical-evaluation").',
          },
        },
        required: [],
      },
    },
    // ── Student AI Literacy Tools ──────────────────────────────────────────────
    {
      name: 'get_student_ai_policies',
      description: 'Get a student\'s enrolled course AI policies — each course\'s AI stance, summary, and whether the student has taken the clarity check.',
      category: 'academic',
      permission: 'auto',
      roles: ['STUDENT', 'ADMIN'],
      input_schema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'check_assignment_ai_policy',
      description: 'Check whether AI is allowed for a specific course and return the AI policy excerpts. Students can ask "Can I use AI for my biology class?" and get the answer.',
      category: 'academic',
      permission: 'auto',
      roles: ['STUDENT', 'ADMIN'],
      input_schema: {
        type: 'object',
        properties: {
          courseName: { type: 'string', description: 'Course name or code to look up (e.g. "BIO 101" or "Intro to Biology")' },
          assignmentDescription: { type: 'string', description: 'Optional assignment description for more specific advice' },
        },
        required: ['courseName'],
      },
    },
    {
      name: 'get_student_literacy_profile',
      description: 'Get the student\'s AI Literacy profile — 4 dimension scores (Practical Skill, Communication, Skepticism, Judgment), readiness band, and module completion status.',
      category: 'academic',
      permission: 'auto',
      roles: ['STUDENT', 'ADMIN'],
      input_schema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'suggest_ai_strategy_for_course',
      description: 'Suggest 3-5 ways a student can use AI effectively in a specific course, based on the course\'s AI policy stance. Good when a student asks "How should I use AI in my chemistry class?"',
      category: 'academic',
      permission: 'auto',
      roles: ['STUDENT', 'ADMIN'],
      input_schema: {
        type: 'object',
        properties: {
          courseName: { type: 'string', description: 'Course name or code to look up' },
        },
        required: ['courseName'],
      },
    },
    {
      name: 'start_study_coach_session',
      description: 'Start a new AI Study Coach session for the student. Creates a coaching session on a topic (optionally linked to a course) and returns the URL to begin.',
      category: 'academic',
      permission: 'auto',
      roles: ['STUDENT', 'ADMIN'],
      input_schema: {
        type: 'object',
        properties: {
          topic: { type: 'string', description: 'The study topic (e.g. "photosynthesis", "linear algebra")' },
          courseName: { type: 'string', description: 'Optional course name/code to link the session to' },
        },
        required: ['topic'],
      },
    },
    {
      name: 'get_student_module_recommendations',
      description: 'Recommend the next best AI Literacy module(s) for the student based on their profile gaps. Finds the weakest dimension and recommends the module(s) that improve it.',
      category: 'academic',
      permission: 'auto',
      roles: ['STUDENT', 'ADMIN'],
      input_schema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'build_starter_pack',
      description: 'Launch the Starter Pack Builder to create a personalized AI integration pack for the faculty member\'s course',
      category: 'academic',
      permission: 'auto',
      roles: ['EDUCATOR', 'ADMIN'],
      input_schema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'get_pack_status',
      description: 'Check implementation progress on a faculty member\'s starter pack',
      category: 'academic',
      permission: 'auto',
      roles: ['EDUCATOR', 'ADMIN'],
      input_schema: {
        type: 'object',
        properties: {
          courseId: { type: 'string', description: 'Course ID to check pack for. Omit for most recent pack.' },
        },
        required: [],
      },
    },
    {
      name: 'suggest_next_assignment',
      description: 'Suggest the next assignment from the faculty member\'s starter pack to implement',
      category: 'academic',
      permission: 'auto',
      roles: ['EDUCATOR', 'ADMIN'],
      input_schema: {
        type: 'object',
        properties: {
          packId: { type: 'string', description: 'Pack ID to check. Omit for most recent pack.' },
        },
        required: [],
      },
    },
  ],
  handlers: {
    get_stance_profile: getStanceProfileHandler,
    start_stance_assessment: startStanceAssessmentHandler,
    get_stance_distribution: getStanceDistributionHandler,
    analyze_assignment_ai_risk: analyzeAssignmentRiskHandler,
    generate_ai_policy: generateAIPolicyHandler,
    ai_literacy_coach: aiLiteracyCoachHandler,
    get_campus_ai_pulse: getCampusPulseHandler,
    suggest_assignment_redesign_from_grading: suggestRedesignFromGradingHandler,
    start_advising_practice: startAdvisingPracticeHandler,
    get_prompt_lab_progress: getPromptLabProgressHandler,
    get_output_eval_progress: getOutputEvalProgressHandler,
    suggest_prompt_lab_challenge: suggestPromptLabChallengeHandler,
    get_output_eval_scenario: getOutputEvalScenarioHandler,
    get_progressive_profile: getProgressiveProfileHandler,
    recalculate_profile: recalculateProfileHandler,
    get_student_ai_policies: getStudentAIPoliciesHandler,
    check_assignment_ai_policy: checkAssignmentAIPolicyHandler,
    get_student_literacy_profile: getStudentLiteracyProfileHandler,
    suggest_ai_strategy_for_course: suggestAIStrategyForCourseHandler,
    start_study_coach_session: startStudyCoachSessionHandler,
    get_student_module_recommendations: getStudentModuleRecommendationsHandler,
    build_starter_pack: buildStarterPackHandler,
    get_pack_status: getPackStatusHandler,
    suggest_next_assignment: suggestNextAssignmentHandler,
  },
}

export default aiLiteracyToolModule
