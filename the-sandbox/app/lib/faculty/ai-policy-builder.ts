import { POLICY_TEMPLATES } from '../policy-templates'
import { getRelevantCoursePolicyContext } from '../course-policy-context'
import { prisma } from '../prisma'
import { getCourseGovernanceSummary } from '../provenance-service'
import { recordPolicyChange } from '../policy-change-service'
import type {
  PolicyBuilderCourseContext,
  PolicyBuilderCourseOption,
  PolicyBuilderDraft,
  PolicyBuilderDraftInput,
  PolicyBuilderGenerateResponse,
  PolicyBuilderPolicyRecord,
  PolicyBuilderPolicyType,
  PolicyBuilderPreflightResponse,
  PolicyBuilderSaveRequest,
  PolicyBuilderSaveResponse,
  PolicyBuilderStance,
  PolicyBuilderTemplateHint,
  PolicyBuilderTone,
  PolicyBuilderWeightRecord,
} from './policy-builder-types'

type Viewer = {
  id: string
  role: string
}

type PolicySnapshot = Pick<PolicyBuilderPolicyRecord, 'policyType' | 'title' | 'content'>

const DEFAULT_CONTEXT_QUERY = 'ai policy syllabus course expectations'

const POLICY_TYPE_LABELS: Record<PolicyBuilderPolicyType, string> = {
  late: 'late work',
  attendance: 'attendance',
  grading: 'grading',
  academic_integrity: 'academic integrity',
  communication: 'communication',
  other: 'course policy',
}

const DEFAULT_TITLES: Record<PolicyBuilderPolicyType, string> = {
  late: 'AI Use in Late and Make-Up Work',
  attendance: 'AI Use During Attendance-Dependent Work',
  grading: 'AI Use in Graded Work',
  academic_integrity: 'Generative AI Use and Academic Integrity',
  communication: 'AI Use, Disclosure, and Communication',
  other: 'Generative AI Course Policy',
}

function normalizePolicyType(value: string): PolicyBuilderPolicyType {
  switch (value) {
    case 'late':
    case 'attendance':
    case 'grading':
    case 'academic_integrity':
    case 'communication':
    case 'other':
      return value
    default:
      return 'other'
  }
}

function trimText(value: string | null | undefined) {
  return value?.trim() ?? ''
}

function compactSentences(parts: Array<string | null | undefined>) {
  return parts.map((part) => trimText(part)).filter(Boolean)
}

function formatListSentence(value: string | null | undefined, fallback: string) {
  const trimmed = trimText(value)
  if (!trimmed) return fallback
  const normalized = trimmed.replace(/\s+/g, ' ')
  return normalized.endsWith('.') ? normalized : `${normalized}.`
}

function courseWhereForViewer(viewer: Viewer, courseId?: string | null) {
  return {
    ...(courseId ? { id: courseId } : {}),
    ...(viewer.role === 'ADMIN' ? {} : { instructorId: viewer.id }),
  }
}

function mapCourseOption(course: {
  id: string
  courseCode: string
  title: string
  description: string | null
  semester: string | null
  facultyAiRetrievalApproved: boolean
  studentUploadsAllowed: boolean
  transcriptGenerationAllowed: boolean
  classroomRecordingAllowed: boolean
  _count: {
    policies: number
    gradingWeights: number
  }
}): PolicyBuilderCourseOption {
  return {
    id: course.id,
    courseCode: course.courseCode,
    title: course.title,
    description: course.description,
    semester: course.semester,
    flags: {
      facultyAiRetrievalApproved: course.facultyAiRetrievalApproved,
      studentUploadsAllowed: course.studentUploadsAllowed,
      transcriptGenerationAllowed: course.transcriptGenerationAllowed,
      classroomRecordingAllowed: course.classroomRecordingAllowed,
    },
    policyCount: course._count.policies,
    gradingWeightCount: course._count.gradingWeights,
  }
}

function mapPolicyRecord(policy: {
  id: string
  policyType: string
  title: string
  content: string
  source: string
  createdAt: Date
}): PolicyBuilderPolicyRecord {
  return {
    id: policy.id,
    policyType: normalizePolicyType(policy.policyType),
    title: policy.title,
    content: policy.content,
    source: policy.source,
    createdAt: policy.createdAt.toISOString(),
  }
}

function mapWeightRecord(weight: {
  id: string
  category: string
  weight: number
  description: string | null
  source: string
  createdAt: Date
}): PolicyBuilderWeightRecord {
  return {
    id: weight.id,
    category: weight.category,
    weight: weight.weight,
    description: weight.description,
    source: weight.source,
    createdAt: weight.createdAt.toISOString(),
  }
}

function pickRecommendedTemplate(course: {
  title: string
  description: string | null
  policies: PolicyBuilderPolicyRecord[]
}): PolicyBuilderTemplateHint | null {
  if (course.policies.length > 0) return null

  const haystack = `${course.title} ${course.description ?? ''}`.toLowerCase()

  const template =
    haystack.includes('lab') || haystack.includes('studio')
      ? POLICY_TEMPLATES.find((item) => item.id === 'lab')
      : haystack.includes('seminar') || haystack.includes('discussion')
        ? POLICY_TEMPLATES.find((item) => item.id === 'seminar')
        : haystack.includes('online') || haystack.includes('asynchronous')
          ? POLICY_TEMPLATES.find((item) => item.id === 'online')
          : POLICY_TEMPLATES.find((item) => item.id === 'standard')

  if (!template) return null

  return {
    id: template.id,
    name: template.name,
    description: template.description,
  }
}

async function buildCourseContext(
  viewer: Viewer,
  courseId: string,
  query: string,
): Promise<PolicyBuilderCourseContext | null> {
  const [course, governance, contextBundle, existingPolicies, existingWeights] = await Promise.all([
    prisma.course.findFirst({
      where: courseWhereForViewer(viewer, courseId),
      select: {
        id: true,
        courseCode: true,
        title: true,
        description: true,
        semester: true,
        facultyAiRetrievalApproved: true,
        studentUploadsAllowed: true,
        transcriptGenerationAllowed: true,
        classroomRecordingAllowed: true,
        _count: {
          select: {
            policies: true,
            gradingWeights: true,
          },
        },
      },
    }),
    getCourseGovernanceSummary({
      courseId,
      viewer,
    }),
    prisma.course.findFirst({
      where: courseWhereForViewer(viewer, courseId),
      select: {
        courseCode: true,
      },
    }).then(async (selectedCourse) => {
      if (!selectedCourse) return { items: [], text: null }
      return getRelevantCoursePolicyContext(courseId, selectedCourse.courseCode, query, 4)
    }),
    prisma.coursePolicy.findMany({
      where: { courseId },
      orderBy: [{ createdAt: 'asc' }],
      select: {
        id: true,
        policyType: true,
        title: true,
        content: true,
        source: true,
        createdAt: true,
      },
    }),
    prisma.gradingWeight.findMany({
      where: { courseId },
      orderBy: [{ createdAt: 'asc' }],
      select: {
        id: true,
        category: true,
        weight: true,
        description: true,
        source: true,
        createdAt: true,
      },
    }),
  ])

  if (!course || !governance) return null

  const courseOption = mapCourseOption(course)
  const policies = existingPolicies.map(mapPolicyRecord)

  return {
    course: courseOption,
    governance: governance.course,
    sourceSummary: governance.sourceSummary,
    recentSources: governance.recentSources,
    existingPolicies: policies,
    existingWeights: existingWeights.map(mapWeightRecord),
    relevantContextText: contextBundle.text,
    recommendedTemplate: pickRecommendedTemplate({
      title: course.title,
      description: course.description,
      policies,
    }),
  }
}

export async function getPolicyBuilderPreflight(
  viewer: Viewer,
  courseId?: string | null,
): Promise<PolicyBuilderPreflightResponse> {
  const courses = await prisma.course.findMany({
    where: courseWhereForViewer(viewer),
    orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      courseCode: true,
      title: true,
      description: true,
      semester: true,
      facultyAiRetrievalApproved: true,
      studentUploadsAllowed: true,
      transcriptGenerationAllowed: true,
      classroomRecordingAllowed: true,
      _count: {
        select: {
          policies: true,
          gradingWeights: true,
        },
      },
    },
  })

  const courseOptions = courses.map(mapCourseOption)
  const selectedCourseId =
    courseOptions.find((course) => course.id === courseId)?.id ??
    courseOptions[0]?.id ??
    null

  const context = selectedCourseId
    ? await buildCourseContext(viewer, selectedCourseId, DEFAULT_CONTEXT_QUERY)
    : null

  return {
    courses: courseOptions,
    selectedCourseId,
    context,
  }
}

function buildContextQuery(input: PolicyBuilderDraftInput) {
  return compactSentences([
    DEFAULT_CONTEXT_QUERY,
    POLICY_TYPE_LABELS[input.policyType],
    input.allowedUses,
    input.restrictedUses,
    input.disclosureRequirements,
    input.courseNotes,
  ]).join(' ')
}

function buildTitle(input: PolicyBuilderDraftInput) {
  const customTitle = trimText(input.title)
  if (customTitle) return customTitle
  return DEFAULT_TITLES[input.policyType]
}

function buildStanceParagraph(input: {
  stance: PolicyBuilderStance
  tone: PolicyBuilderTone
}) {
  switch (input.stance) {
    case 'prohibited':
      if (input.tone === 'supportive') {
        return 'Please assume generative AI is off-limits for graded work in this course unless a particular assignment explicitly opens space for it.'
      }
      if (input.tone === 'balanced') {
        return 'Generative AI should not be used to produce graded work in this course unless a particular assignment explicitly allows it.'
      }
      return 'Generative AI tools may not be used to produce graded work in this course unless I give written permission for a specific activity.'
    case 'limited':
      if (input.tone === 'supportive') {
        return 'Generative AI can help with early brainstorming, study support, and surface-level editing, but the final academic work you submit must remain your own thinking and expression.'
      }
      if (input.tone === 'balanced') {
        return 'Generative AI may be used for brainstorming, outlining, and light revision support, but submitted work must remain your own analysis, decisions, and course-specific writing.'
      }
      return 'Generative AI may be used only for limited support tasks such as brainstorming, outlining, or grammar checks; it may not replace your own analysis, problem-solving, or final written work.'
    case 'encouraged':
      if (input.tone === 'firm') {
        return 'Generative AI can be a productive learning partner in this course, but you remain fully accountable for accuracy, judgment, citation, and the final quality of any submitted work.'
      }
      if (input.tone === 'supportive') {
        return 'Generative AI can be a useful partner for brainstorming, revision planning, and practice in this course when you stay responsible for the substance, accuracy, and final form of your work.'
      }
      return 'Generative AI is welcome as a structured support tool in this course when you remain the author of record and take full responsibility for every claim, citation, and submitted decision.'
    case 'disclosed':
    default:
      if (input.tone === 'firm') {
        return 'Generative AI may be used in this course when the use is disclosed clearly and the submitted work still reflects your own judgment, verification, and final authorship.'
      }
      if (input.tone === 'supportive') {
        return 'Generative AI may be used in this course when you disclose it plainly, verify what it produces, and make sure the final submission still reflects your own learning and decisions.'
      }
      return 'Generative AI may be used in this course when the use is disclosed and the final submission still reflects your own judgment, verification, and authorship.'
  }
}

function buildAllowedUseFallback(stance: PolicyBuilderStance) {
  switch (stance) {
    case 'prohibited':
      return 'If you think an assignment needs an accessibility or process exception, ask before using any AI tool.'
    case 'limited':
      return 'Appropriate uses include brainstorming, generating study questions, outlining, and checking clarity after you have done the substantive course thinking yourself.'
    case 'encouraged':
      return 'Appropriate uses include brainstorming, generating alternative explanations, practice prompts, revision plans, and self-check questions that help you deepen your learning.'
    case 'disclosed':
    default:
      return 'Appropriate uses include brainstorming, outlining, revision support, and other limited help that you disclose honestly and verify carefully.'
  }
}

function buildRestrictedUseFallback(stance: PolicyBuilderStance) {
  switch (stance) {
    case 'prohibited':
      return 'Do not submit AI-generated text, analysis, code, solutions, or discussion responses as your own work.'
    case 'limited':
      return 'Do not use AI to generate a final answer, write a paper for you, solve graded problems for you, or fabricate citations, data, or sources.'
    case 'encouraged':
      return 'Even when AI use is encouraged, you may not use it to bypass assigned reading, invent evidence, fabricate citations, or submit unverified output as finished work.'
    case 'disclosed':
    default:
      return 'Do not use AI to replace your own reading, reasoning, data collection, or source verification, and do not submit unverified output as completed work.'
  }
}

function buildDisclosureFallback(stance: PolicyBuilderStance) {
  switch (stance) {
    case 'prohibited':
      return 'If AI use is approved for a specific assignment, include a brief note describing what tool you used and how you used it.'
    case 'limited':
      return 'When AI materially shapes your work, include a short disclosure describing the tool, the task, and the revisions you made afterward.'
    case 'encouraged':
      return 'Document meaningful AI use in a short note, appendix, or process log so your decision-making and revision work remain visible.'
    case 'disclosed':
    default:
      return 'Disclose any meaningful AI use by naming the tool, the task it supported, and the revisions or verification steps you completed yourself.'
  }
}

function buildGovernanceParagraph(flags: PolicyBuilderCourseContext['course']['flags']) {
  const sentences = compactSentences([
    flags.facultyAiRetrievalApproved
      ? 'Under the current course settings, the instructor may use institutionally approved AI retrieval on official course materials and policies.'
      : 'Under the current course settings, instructor AI retrieval over course materials is currently disabled.',
    flags.studentUploadsAllowed
      ? 'Student-uploaded materials may participate in approved course AI workflows only when course and consent rules remain current.'
      : 'Student-uploaded materials are not currently approved for reuse in course AI workflows.',
    flags.transcriptGenerationAllowed
      ? 'Transcript-style captures are currently approved for this course context.'
      : 'Transcript-style captures are not currently approved for this course context.',
    flags.classroomRecordingAllowed
      ? 'Classroom recording is currently approved for this course context.'
      : 'Classroom recording is not currently approved for this course context.',
  ])

  return sentences.join(' ')
}

function buildClosingSentence(tone: PolicyBuilderTone) {
  switch (tone) {
    case 'supportive':
      return 'If you are unsure whether a use is appropriate, ask early so we can keep the focus on learning rather than cleanup after the fact.'
    case 'balanced':
      return 'When a use case falls into a gray area, ask before submitting the work.'
    case 'firm':
    default:
      return 'When in doubt, ask before using an AI tool on graded work.'
  }
}

function buildRationale(context: PolicyBuilderCourseContext, draft: PolicyBuilderDraftInput) {
  const sameCategoryPolicies = context.existingPolicies.filter(
    (policy) => policy.policyType === draft.policyType,
  )
  const rationale = [
    `Grounded in ${context.sourceSummary.totalSources} recent governed source${context.sourceSummary.totalSources === 1 ? '' : 's'} and ${context.existingPolicies.length} stored syllabus polic${context.existingPolicies.length === 1 ? 'y' : 'ies'}.`,
    context.course.flags.studentUploadsAllowed
      ? 'Current course governance allows student-uploaded materials in AI workflows when consent remains current.'
      : 'Current course governance keeps student-uploaded materials out of course AI workflows.',
    context.course.flags.facultyAiRetrievalApproved
      ? 'Current course governance allows instructor AI retrieval over approved course materials.'
      : 'Current course governance currently blocks instructor AI retrieval over course materials.',
    sameCategoryPolicies.length > 0
      ? `Recommended save target: replace the existing ${POLICY_TYPE_LABELS[draft.policyType]} policy to avoid duplicate syllabus language.`
      : `Recommended save target: add this as a new ${POLICY_TYPE_LABELS[draft.policyType]} policy.`,
  ]

  if (context.recommendedTemplate) {
    rationale.push(`Template hint: ${context.recommendedTemplate.name} matched the current course setup.`)
  }

  return rationale
}

function buildDeterministicDraft(
  context: PolicyBuilderCourseContext,
  input: PolicyBuilderDraftInput,
): Omit<PolicyBuilderDraft, 'generatedAt' | 'generationMethod' | 'trustPanel' | 'saveCandidates'> {
  const title = buildTitle(input)
  const paragraphs = [
    buildStanceParagraph({
      stance: input.stance,
      tone: input.tone,
    }),
    formatListSentence(input.allowedUses, buildAllowedUseFallback(input.stance)),
    formatListSentence(input.restrictedUses, buildRestrictedUseFallback(input.stance)),
    formatListSentence(input.disclosureRequirements, buildDisclosureFallback(input.stance)),
    buildGovernanceParagraph(context.course.flags),
    trimText(input.courseNotes)
      ? formatListSentence(
          `Additional course-specific expectation: ${trimText(input.courseNotes)}`,
          '',
        )
      : null,
    buildClosingSentence(input.tone),
  ]
    .filter((paragraph): paragraph is string => Boolean(paragraph))
    .join('\n\n')

  return {
    title,
    policyType: input.policyType,
    content: paragraphs,
    rationale: buildRationale(context, input),
  }
}

function extractJsonObject(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced?.[1]) return fenced[1].trim()

  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null
  return text.slice(start, end + 1)
}

async function maybeRefineDraftWithAnthropic(input: {
  context: PolicyBuilderCourseContext
  draft: ReturnType<typeof buildDeterministicDraft>
  request: PolicyBuilderDraftInput
}) {
  if (!process.env.ANTHROPIC_API_KEY) return null

  try {
    const AnthropicModule = await import('@anthropic-ai/sdk')
    const anthropic = new AnthropicModule.default({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })

    const response = (await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 900,
      system:
        'You rewrite faculty syllabus policy drafts without inventing new governance facts. ' +
        'Stay faithful to the provided course flags and existing policy context. ' +
        'Return only compact JSON: {"title":"...","content":"..."}',
      messages: [
        {
          role: 'user',
          content:
            `Course: ${input.context.course.courseCode} - ${input.context.course.title}\n` +
            `Policy type: ${input.request.policyType}\n` +
            `Stance: ${input.request.stance}\n` +
            `Tone: ${input.request.tone}\n` +
            `Governance: ${JSON.stringify(input.context.course.flags)}\n` +
            `Relevant context: ${input.context.relevantContextText ?? 'None'}\n\n` +
            `Rewrite this draft into polished syllabus-ready language while preserving meaning:\n` +
            `${input.draft.content}`,
        },
      ],
    })) as { content?: Array<{ type?: string; text?: string }> }

    const responseText = (response.content ?? [])
      .filter((block) => block.type === 'text' && typeof block.text === 'string')
      .map((block) => block.text ?? '')
      .join('\n')

    const jsonText = extractJsonObject(responseText)
    if (!jsonText) return null

    const parsed = JSON.parse(jsonText) as { title?: string; content?: string }
    if (!trimText(parsed.title) || !trimText(parsed.content)) return null

    return {
      title: trimText(parsed.title),
      content: trimText(parsed.content),
    }
  } catch (error) {
    console.error('AI policy builder refinement failed:', error)
    return null
  }
}

export async function generatePolicyBuilderDraft(
  viewer: Viewer,
  input: PolicyBuilderDraftInput,
): Promise<PolicyBuilderGenerateResponse> {
  const context = await buildCourseContext(viewer, input.courseId, buildContextQuery(input))

  if (!context) {
    throw new Error('Course context not found')
  }

  const deterministicDraft = buildDeterministicDraft(context, input)
  const aiRefinement = await maybeRefineDraftWithAnthropic({
    context,
    draft: deterministicDraft,
    request: input,
  })

  const saveCandidates = context.existingPolicies.filter(
    (policy) => policy.policyType === input.policyType,
  )

  return {
    draft: {
      title: aiRefinement?.title ?? deterministicDraft.title,
      policyType: deterministicDraft.policyType,
      content: aiRefinement?.content ?? deterministicDraft.content,
      rationale: deterministicDraft.rationale,
      generatedAt: new Date().toISOString(),
      generationMethod: aiRefinement
        ? 'anthropic+template+governance'
        : 'template+governance',
      saveCandidates,
      trustPanel: {
        status:
          context.sourceSummary.totalSources === 0
            ? 'none'
            : context.sourceSummary.allowedSources > 0
              ? 'allowed'
              : 'blocked',
        summary:
          context.sourceSummary.allowedSources > 0
            ? `${context.sourceSummary.allowedSources} approved governed source${context.sourceSummary.allowedSources === 1 ? '' : 's'} informed this draft.`
            : context.sourceSummary.totalSources === 0
              ? 'No governed course sources were available for this draft.'
              : 'No approved governed sources were available for this draft.',
        generatedAt: new Date().toISOString(),
        courseId: context.course.id,
        courseCode: context.course.courseCode,
        courseTitle: context.course.title,
        sources: context.recentSources,
      },
    },
    context,
  }
}

function toPolicySnapshot(policies: PolicyBuilderPolicyRecord[]): PolicySnapshot[] {
  return policies.map((policy) => ({
    policyType: policy.policyType,
    title: policy.title,
    content: policy.content,
  }))
}

export function havePolicySnapshotsChanged(
  previousPolicies: PolicyBuilderPolicyRecord[],
  nextPolicies: PolicyBuilderPolicyRecord[],
) {
  const previous = toPolicySnapshot(previousPolicies)
  const next = toPolicySnapshot(nextPolicies)

  if (previous.length !== next.length) return true

  return previous.some((policy, index) => {
    const nextPolicy = next[index]
    return (
      !nextPolicy ||
      nextPolicy.policyType !== policy.policyType ||
      nextPolicy.title !== policy.title ||
      nextPolicy.content !== policy.content
    )
  })
}

export function applyPolicyDraftToList(
  existingPolicies: PolicyBuilderPolicyRecord[],
  input: PolicyBuilderSaveRequest,
) {
  const normalizedPolicy: PolicyBuilderPolicyRecord = {
    id: input.replacePolicyId ?? 'new-policy',
    policyType: input.policy.policyType,
    title: trimText(input.policy.title),
    content: trimText(input.policy.content),
    source: 'ai_policy_builder',
    createdAt: new Date().toISOString(),
  }

  if (input.saveMode === 'replace') {
    const target = existingPolicies.find((policy) => policy.id === input.replacePolicyId)
    if (!target) {
      throw new Error('Select a policy to replace before saving.')
    }

    return {
      nextPolicies: existingPolicies.map((policy) =>
        policy.id === target.id
          ? {
              ...policy,
              policyType: normalizedPolicy.policyType,
              title: normalizedPolicy.title,
              content: normalizedPolicy.content,
              source: 'ai_policy_builder',
            }
          : policy,
      ),
      replacedPolicyId: target.id,
    }
  }

  const duplicate = existingPolicies.find(
    (policy) =>
      policy.policyType === normalizedPolicy.policyType &&
      policy.title === normalizedPolicy.title &&
      policy.content === normalizedPolicy.content,
  )

  if (duplicate) {
    return {
      nextPolicies: existingPolicies,
      replacedPolicyId: null,
      duplicate,
    }
  }

  return {
    nextPolicies: [...existingPolicies, normalizedPolicy],
    replacedPolicyId: null,
  }
}

export async function savePolicyBuilderDraft(
  userId: string,
  input: PolicyBuilderSaveRequest,
): Promise<PolicyBuilderSaveResponse> {
  const [course, existingPolicies] = await Promise.all([
    prisma.course.findUnique({
      where: { id: input.courseId },
      select: {
        id: true,
        courseCode: true,
      },
    }),
    prisma.coursePolicy.findMany({
      where: { courseId: input.courseId },
      orderBy: [{ createdAt: 'asc' }],
      select: {
        id: true,
        policyType: true,
        title: true,
        content: true,
        source: true,
        createdAt: true,
      },
    }),
  ])

  if (!course) {
    throw new Error('Course not found')
  }

  const currentPolicies = existingPolicies.map(mapPolicyRecord)
  const { nextPolicies, replacedPolicyId, duplicate } = applyPolicyDraftToList(currentPolicies, input)
  const changed = havePolicySnapshotsChanged(currentPolicies, nextPolicies)

  if (!changed) {
    const existingPolicy =
      duplicate ??
      currentPolicies.find((policy) => policy.id === replacedPolicyId) ??
      currentPolicies[currentPolicies.length - 1]

    if (!existingPolicy) {
      throw new Error('No policy was available to save.')
    }

    return {
      savedPolicy: existingPolicy,
      saveMode: input.saveMode,
      replacedPolicyId: replacedPolicyId ?? null,
      changeRecorded: false,
      acknowledgmentReset: false,
      policiesCount: currentPolicies.length,
    }
  }

  let savedPolicy

  if (input.saveMode === 'replace') {
    savedPolicy = await prisma.coursePolicy.update({
      where: { id: replacedPolicyId ?? '' },
      data: {
        policyType: input.policy.policyType,
        title: trimText(input.policy.title),
        content: trimText(input.policy.content),
        source: 'ai_policy_builder',
      },
      select: {
        id: true,
        policyType: true,
        title: true,
        content: true,
        source: true,
        createdAt: true,
      },
    })
  } else {
    savedPolicy = await prisma.coursePolicy.create({
      data: {
        courseId: input.courseId,
        policyType: input.policy.policyType,
        title: trimText(input.policy.title),
        content: trimText(input.policy.content),
        source: 'ai_policy_builder',
      },
      select: {
        id: true,
        policyType: true,
        title: true,
        content: true,
        source: true,
        createdAt: true,
      },
    })
  }

  await recordPolicyChange(
    input.courseId,
    userId,
    currentPolicies.map((policy) => ({
      category: policy.policyType,
      title: policy.title,
      content: policy.content,
    })),
    nextPolicies.map((policy) => ({
      category: policy.policyType,
      title: policy.title,
      content: policy.content,
    })),
    course.courseCode,
  )

  return {
    savedPolicy: mapPolicyRecord(savedPolicy),
    saveMode: input.saveMode,
    replacedPolicyId: replacedPolicyId ?? null,
    changeRecorded: true,
    acknowledgmentReset: true,
    policiesCount: nextPolicies.length,
  }
}
