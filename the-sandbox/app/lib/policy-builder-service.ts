import { prisma } from './prisma'
import type { AIStance, DisciplineFamily } from '../generated/prisma'
import { STANCE_DETAILS } from './stance-service'

// ── AI Level Types ───────────────────────────────────────────────────────────

export type AssignmentAILevel = 'PROHIBITED' | 'LIMITED' | 'GUIDED' | 'REQUIRED'

export interface AssignmentLevelEntry {
  assignmentId: string
  title: string
  category: string | null
  suggestedLevel: AssignmentAILevel
  level: AssignmentAILevel // user-confirmed
}

// ── Level Heuristics ─────────────────────────────────────────────────────────

function suggestLevel(
  assignment: { title: string; category: string | null; type: string },
  stance: AIStance,
): AssignmentAILevel {
  const cat = (assignment.category ?? '').toLowerCase()
  const title = assignment.title.toLowerCase()

  // Stance-based defaults
  if (stance === 'PROHIBIT') return 'PROHIBITED'
  if (stance === 'REQUIRE') return 'REQUIRED'

  // In-class/proctored → always prohibited (no AI possible anyway)
  if (cat.includes('exam') || cat.includes('quiz') || cat.includes('midterm') || cat.includes('final')) {
    if (!title.includes('take-home') && !title.includes('take home')) return 'PROHIBITED'
  }

  if (cat.includes('presentation') || cat.includes('lab') || cat.includes('discussion')) {
    return stance === 'CAUTIOUS' ? 'PROHIBITED' : 'LIMITED'
  }

  // AI-experience type assignments
  if (assignment.type === 'AI_EXPERIENCE') return 'REQUIRED'

  // Written work
  if (cat.includes('paper') || cat.includes('essay') || title.includes('essay') || title.includes('paper')) {
    if (stance === 'CAUTIOUS') return 'LIMITED'
    if (stance === 'GUIDED') return 'GUIDED'
    return 'GUIDED'
  }

  if (cat.includes('homework') || cat.includes('problem')) {
    if (stance === 'CAUTIOUS') return 'LIMITED'
    return 'GUIDED'
  }

  if (cat.includes('project')) {
    if (stance === 'CAUTIOUS') return 'LIMITED'
    if (stance === 'GUIDED') return 'GUIDED'
    return 'GUIDED'
  }

  // Default by stance
  if (stance === 'CAUTIOUS') return 'LIMITED'
  if (stance === 'GUIDED') return 'GUIDED'
  if (stance === 'INTEGRATE') return 'GUIDED'
  return 'LIMITED'
}

// ── Course Data for Wizard ───────────────────────────────────────────────────

export interface CourseForWizard {
  id: string
  courseCode: string
  title: string
  hasAIPolicy: boolean
  assignments: AssignmentLevelEntry[]
}

export async function getCoursesForPolicyWizard(userId: string, stance: AIStance): Promise<CourseForWizard[]> {
  const courses = await prisma.course.findMany({
    where: { instructorId: userId },
    include: {
      assignments: { select: { id: true, title: true, category: true, type: true } },
      courseAIPolicy: { select: { id: true } },
    },
  })

  return courses.map(course => ({
    id: course.id,
    courseCode: course.courseCode,
    title: course.title,
    hasAIPolicy: !!course.courseAIPolicy,
    assignments: course.assignments.map(a => {
      const suggested = suggestLevel(a, stance)
      return {
        assignmentId: a.id,
        title: a.title,
        category: a.category,
        suggestedLevel: suggested,
        level: suggested,
      }
    }),
  }))
}

// ── Policy Text Generation ───────────────────────────────────────────────────

export interface GeneratedPolicy {
  mainParagraph: string
  assignmentTable: { title: string; level: AssignmentAILevel; explanation: string }[]
  disclosureRequirements: string
  consequencesLanguage: string
  fullText: string // Combined for syllabus insertion
}

const LEVEL_LABELS: Record<AssignmentAILevel, string> = {
  PROHIBITED: 'Prohibited',
  LIMITED: 'Limited',
  GUIDED: 'Guided',
  REQUIRED: 'Required',
}

const LEVEL_EXPLANATIONS: Record<AssignmentAILevel, string> = {
  PROHIBITED: 'No AI tools may be used for any part of this assignment. Your work must be entirely your own. This includes AI-powered grammar tools that go beyond basic spell-check.',
  LIMITED: 'AI may be used only for brainstorming, grammar checking, and concept clarification. All substantive content — your analysis, arguments, and writing — must be your own. Include a brief note disclosing any AI use.',
  GUIDED: 'AI may be used as a collaborative tool with full disclosure. You must include an AI Usage Statement describing which tools you used, what tasks you used them for, and how you verified or modified the AI output.',
  REQUIRED: 'AI tools are required for this assignment. Submit your prompt-response chain alongside your deliverable. You will be assessed on prompt quality, critical evaluation of AI output, and the professional judgment you bring to the final product.',
}

export function generatePolicy(
  stance: AIStance,
  courseName: string,
  assignmentLevels: { title: string; level: AssignmentAILevel }[],
  _disciplineFamily?: DisciplineFamily,
): GeneratedPolicy {
  const detail = STANCE_DETAILS[stance]

  // Main paragraph
  const mainParagraph = detail.syllabusLanguage

  // Assignment table
  const assignmentTable = assignmentLevels.map(a => ({
    title: a.title,
    level: a.level,
    explanation: LEVEL_EXPLANATIONS[a.level],
  }))

  // Disclosure requirements vary by stance
  let disclosureRequirements: string
  if (stance === 'PROHIBIT') {
    disclosureRequirements = 'Since AI use is not permitted in this course, no disclosure is required. If you are uncertain whether a specific tool or use qualifies as generative AI (e.g., Grammarly\'s AI features, browser-based AI assistants, or autocomplete tools), ask your instructor before the assignment is due — not after. Standard spell-check and autocorrect are permitted without disclosure.'
  } else if (stance === 'CAUTIOUS') {
    disclosureRequirements = 'When you use AI for a permitted purpose (brainstorming, grammar checking, or concept clarification), include a brief note at the end of your submission: "AI tools were used for [brainstorming / grammar checking / concept clarification]." No formal citation is needed for these limited uses, but transparency is expected. If you find yourself unsure where brainstorming ends and composing begins, that is a sign to stop and ask.'
  } else if (stance === 'GUIDED') {
    disclosureRequirements = 'For any assignment at the Guided or Required level, you must include an AI Usage Statement with your submission that addresses: (1) which AI tool(s) you used (name and version, if known), (2) what task(s) you used them for (e.g., "generating an initial outline," "checking statistical reasoning," "producing three alternative introductions"), and (3) what the AI produced and what you changed — specifically, how you verified, revised, corrected, or extended the AI\'s output. Failure to include a disclosure statement when required constitutes a violation of academic integrity, regardless of how the AI was used.'
  } else if (stance === 'INTEGRATE') {
    disclosureRequirements = 'For each major assignment, include a brief process reflection describing your AI collaboration — what tools you used, what worked, what did not, and what you learned about effective human-AI partnership. This documentation is not busywork; it is a core learning outcome of the course. Your reflection should address the sophistication of your prompts, your critical evaluation of AI output, and what you contributed that the AI could not (domain knowledge, ethical judgment, creative insight, audience awareness).'
  } else {
    disclosureRequirements = 'Submit your full prompt-response chain (or a representative sample for lengthy interactions) alongside your final deliverable. Your prompting strategy is part of what is graded. You must also include a critical reflection with each submission: What did the AI do well? Where did it fall short? What did you change and why? What would you do differently next time? Your grade will reflect prompt quality, critical evaluation, human value-add, and final product quality.'
  }

  // Consequences
  let consequencesLanguage: string
  if (stance === 'PROHIBIT') {
    consequencesLanguage = 'Unauthorized use of generative AI will be treated as a violation of academic integrity under university policy. Consequences may include a zero on the assignment, a failing course grade, or referral to the Academic Ombud. This policy exists not to be punitive, but because it protects the value of the degree you are earning and the skills this course is designed to build.'
  } else if (stance === 'CAUTIOUS') {
    consequencesLanguage = 'Using AI beyond the permitted scope — particularly using AI to generate submitted content — will be treated as a violation of academic integrity under university policy. Consequences may include a zero on the assignment, a failing course grade, or referral to the Academic Ombud. If you find yourself uncertain about whether a particular use crosses the line, ask before submitting.'
  } else if (stance === 'GUIDED') {
    consequencesLanguage = 'Using AI beyond the specified level for an assignment — or failing to disclose AI use when required — will be treated as a violation of academic integrity under university policy. This includes using AI on Prohibited assignments, exceeding the scope of Limited assignments, or submitting AI-generated content without disclosure on Guided assignments.'
  } else if (stance === 'INTEGRATE') {
    consequencesLanguage = 'Even in a course that integrates AI, the following remain violations of academic integrity: fabricating data, citations, or sources (whether by you or by AI); submitting AI output without any review, editing, or critical engagement; using AI on assignments specifically marked as AI-free; and misrepresenting your level of engagement with the AI process.'
  } else {
    consequencesLanguage = 'Failing to use AI when required (submitting work without any AI engagement) will result in an incomplete assignment. Fabricating prompt-response chains or misrepresenting your AI interaction will be treated as academic dishonesty. Submitting unreviewed AI output without critical engagement will be graded accordingly — this is a skill course, and passive acceptance of AI output demonstrates a lack of that skill.'
  }

  // Combined full text
  const fullText = buildFullText(courseName, mainParagraph, assignmentTable, disclosureRequirements, consequencesLanguage)

  return {
    mainParagraph,
    assignmentTable,
    disclosureRequirements,
    consequencesLanguage,
    fullText,
  }
}

function buildFullText(
  courseName: string,
  mainParagraph: string,
  assignmentTable: { title: string; level: AssignmentAILevel; explanation: string }[],
  disclosure: string,
  consequences: string,
): string {
  let text = `Generative AI Policy — ${courseName}\n\n`
  text += `${mainParagraph}\n\n`

  if (assignmentTable.length > 0) {
    text += `AI Use Levels by Assignment:\n`
    for (const a of assignmentTable) {
      text += `  • ${a.title}: ${LEVEL_LABELS[a.level]} — ${a.explanation}\n`
    }
    text += `\n`
  }

  text += `Disclosure Requirements:\n${disclosure}\n\n`
  text += `Consequences:\n${consequences}`

  return text
}

// ── Save Policy ──────────────────────────────────────────────────────────────

export interface SavePolicyInput {
  courseId: string
  userId: string
  stance: AIStance
  policyText: string
  policyJson: {
    assignmentLevels: { assignmentId: string; title: string; level: AssignmentAILevel }[]
    disclosureRequirements: string
    consequencesLanguage: string
  }
  publishToStudents: boolean
  addToCoursePolicy: boolean
}

export async function savePolicy(input: SavePolicyInput) {
  // Upsert CourseAIPolicy
  const policy = await prisma.courseAIPolicy.upsert({
    where: { courseId: input.courseId },
    create: {
      courseId: input.courseId,
      createdById: input.userId,
      stance: input.stance,
      policyText: input.policyText,
      policyJson: input.policyJson,
      publishedToStudents: input.publishToStudents,
      publishedAt: input.publishToStudents ? new Date() : null,
    },
    update: {
      stance: input.stance,
      policyText: input.policyText,
      policyJson: input.policyJson,
      publishedToStudents: input.publishToStudents,
      publishedAt: input.publishToStudents ? new Date() : undefined,
      updatedAt: new Date(),
    },
  })

  // Optionally add/update as a CoursePolicy record (academic_integrity category)
  if (input.addToCoursePolicy) {
    const existing = await prisma.coursePolicy.findFirst({
      where: {
        courseId: input.courseId,
        title: 'Generative AI Policy',
      },
    })

    if (existing) {
      await prisma.coursePolicy.update({
        where: { id: existing.id },
        data: { content: input.policyText },
      })
    } else {
      await prisma.coursePolicy.create({
        data: {
          courseId: input.courseId,
          policyType: 'academic_integrity',
          title: 'Generative AI Policy',
          content: input.policyText,
          source: 'ai-literacy-builder',
        },
      })
    }
  }

  // Update AILiteracyProfile policyCoverage
  const totalCourses = await prisma.course.count({ where: { instructorId: input.userId } })
  const coursesWithPolicy = await prisma.courseAIPolicy.count({
    where: { course: { instructorId: input.userId } },
  })
  const coverage = totalCourses > 0 ? coursesWithPolicy / totalCourses : 0

  await prisma.aILiteracyProfile.upsert({
    where: { userId: input.userId },
    create: { userId: input.userId, policyCoverage: coverage },
    update: { policyCoverage: coverage },
  })

  return policy
}

// ── Gap Analysis ─────────────────────────────────────────────────────────────

export interface PolicyGapItem {
  courseId: string
  courseCode: string
  title: string
  instructorName: string
  hasAIPolicy: boolean
}

export async function getPolicyGapData(userId: string, role: string) {
  // Admin sees all courses, educator sees own
  const where = role === 'ADMIN' ? {} : { instructorId: userId }

  const courses = await prisma.course.findMany({
    where,
    include: {
      instructor: { select: { name: true } },
      courseAIPolicy: { select: { id: true } },
    },
    orderBy: { courseCode: 'asc' },
  })

  const items: PolicyGapItem[] = courses.map(c => ({
    courseId: c.id,
    courseCode: c.courseCode,
    title: c.title,
    instructorName: c.instructor.name,
    hasAIPolicy: !!c.courseAIPolicy,
  }))

  const total = items.length
  const withPolicy = items.filter(i => i.hasAIPolicy).length

  return {
    items,
    total,
    withPolicy,
    coverage: total > 0 ? Math.round((withPolicy / total) * 100) : 0,
  }
}

// ── Get Existing Policy ──────────────────────────────────────────────────────

export async function getCourseAIPolicy(courseId: string) {
  return prisma.courseAIPolicy.findUnique({
    where: { courseId },
    include: { course: { select: { courseCode: true, title: true } } },
  })
}
