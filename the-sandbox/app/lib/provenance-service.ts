import {
  buildContentPermissionDecision,
  buildCourseAccessScope,
  buildEffectiveMaterialGovernance,
  getAccessScopeLabel,
  getApprovalBasisLabel,
  getOfficialityLabel,
  getOptInStatusLabel,
  getSourceSystemLabel,
  getUserConsentSnapshot,
} from './content-permissions'
import {
  getRelevantCoursePolicyContext,
  type CoursePolicyContextItem,
} from './course-policy-context'
import { prisma } from './prisma'
import type {
  ConsentSnapshot,
  CourseGovernanceApiResponse,
  CourseGovernanceFlags,
  SandyTrustPanelData,
  TrustPanelSource,
} from './provenance-types'

type ProvenanceViewer = {
  id: string
  role: string
}

type SandyCourseMaterial = {
  id: string
  courseCode: string
  title: string
  moduleNumber: number | null
  content: string
}

type SandyCourseContextResult = {
  selectedCourse: {
    courseCode: string
    title: string
    materials: SandyCourseMaterial[]
  } | null
  policyBlock: string | null
  promptBlock: string | null
  trustPanel: SandyTrustPanelData
}

const MATERIAL_LIMIT = 3
const POLICY_LIMIT = 2
const SOURCE_LIMIT = 6
const MATERIAL_EXCERPT_CHARS = 700

function normalizeQueryWords(query: string | null | undefined) {
  return (query ?? '')
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 2)
}

function scoreMaterial(
  material: { title: string; content: string; materialType: string; moduleNumber: number | null },
  queryWords: string[],
) {
  if (queryWords.length === 0) return 0

  const haystack = `${material.title} ${material.materialType} ${material.content}`.toLowerCase()
  return queryWords.reduce((score, word) => {
    if (!haystack.includes(word)) return score
    if (material.title.toLowerCase().includes(word)) return score + 5
    if (material.materialType.toLowerCase().includes(word)) return score + 2
    return score + 1
  }, 0)
}

function truncateText(content: string, maxChars: number) {
  return content.length > maxChars ? `${content.slice(0, maxChars)}...` : content
}

function toCourseFlags(course: {
  facultyAiRetrievalApproved: boolean
  studentUploadsAllowed: boolean
  transcriptGenerationAllowed: boolean
  classroomRecordingAllowed: boolean
}): CourseGovernanceFlags {
  return {
    facultyAiRetrievalApproved: course.facultyAiRetrievalApproved,
    studentUploadsAllowed: course.studentUploadsAllowed,
    transcriptGenerationAllowed: course.transcriptGenerationAllowed,
    classroomRecordingAllowed: course.classroomRecordingAllowed,
  }
}

function canViewerAccessCourse(
  course: { instructorId: string; isPublic: boolean; enrollments?: Array<{ studentId: string }> },
  viewer: ProvenanceViewer,
) {
  if (viewer.role === 'ADMIN') return true
  if (course.instructorId === viewer.id) return true
  if (course.isPublic) return true
  return (course.enrollments ?? []).some((enrollment) => enrollment.studentId === viewer.id)
}

function canViewerSeeMaterial(
  material: { isVisible: boolean },
  viewer: ProvenanceViewer,
  isInstructorOrAdmin: boolean,
) {
  if (isInstructorOrAdmin) return true
  if (viewer.role === 'STUDENT') return material.isVisible
  return material.isVisible
}

function summarizeSourceSummary(sources: TrustPanelSource[]) {
  return {
    totalSources: sources.length,
    officialSources: sources.filter((source) => source.provenanceType === 'official').length,
    userUploadedSources: sources.filter((source) => source.provenanceType === 'user-uploaded').length,
    simulatedSources: sources.filter((source) => source.provenanceType === 'simulated').length,
    inferredSources: sources.filter((source) => source.provenanceType === 'inferred').length,
    allowedSources: sources.filter((source) => source.allowed).length,
    blockedSources: sources.filter((source) => !source.allowed).length,
  }
}

function buildTrustSummary(
  course: { title: string; facultyAiRetrievalApproved: boolean },
  sources: TrustPanelSource[],
  viewerHasCourseAccess: boolean,
) {
  if (!viewerHasCourseAccess) {
    return {
      status: 'blocked' as const,
      summary: 'This course context is not available to the current user.',
    }
  }

  if (!course.facultyAiRetrievalApproved) {
    return {
      status: 'blocked' as const,
      summary: 'Faculty approval for AI retrieval is disabled for this course.',
    }
  }

  if (sources.length === 0) {
    return {
      status: 'none' as const,
      summary: `No approved ${course.title} sources were retrieved for this reply.`,
    }
  }

  const blockedCount = sources.filter((source) => !source.allowed).length
  const allowedCount = sources.length - blockedCount

  return {
    status: blockedCount > 0 ? 'blocked' as const : 'allowed' as const,
    summary:
      blockedCount > 0
        ? `${allowedCount} approved source${allowedCount === 1 ? '' : 's'} were used, and ${blockedCount} source${blockedCount === 1 ? ' was' : 's were'} withheld by governance.`
        : `${allowedCount} approved source${allowedCount === 1 ? '' : 's'} were used for this reply.`,
  }
}

function buildMaterialPromptBlock(
  courseCode: string,
  materials: Array<{
    id: string
    title: string
    moduleNumber: number | null
    content: string
    source: TrustPanelSource
  }>,
) {
  if (materials.length === 0) return null

  return [
    `## APPROVED COURSE EVIDENCE`,
    `Use only these approved ${courseCode} sources for course-specific claims. If the answer is not supported here, say so plainly.`,
    ...materials.map((material, index) => {
      const moduleLabel = material.moduleNumber ? `Module ${material.moduleNumber}` : 'General'
      return [
        `\n[Evidence ${index + 1}] [material:${material.id}] ${material.title}`,
        `Metadata: ${material.source.sourceSystemLabel}; ${material.source.approvalBasisLabel}; ${getOfficialityLabel(material.source.provenanceType)}; ${material.source.optInStatusLabel}`,
        `Section: ${moduleLabel}`,
        truncateText(material.content, MATERIAL_EXCERPT_CHARS),
      ].join('\n')
    }),
  ].join('\n')
}

function buildPolicyPromptBlock(
  courseCode: string,
  policyItems: CoursePolicyContextItem[],
) {
  if (policyItems.length === 0) return null

  const lines = [
    `## APPROVED COURSE POLICIES`,
    `These approved ${courseCode} policy excerpts may be used for grading, attendance, and deadline answers. Cite the policy title in your response when relevant.`,
  ]

  for (const item of policyItems) {
    lines.push(`\n[${item.kind === 'grading-weight' ? 'Grading Weights' : item.policyType ?? 'Policy'}] ${item.title}`)
    lines.push(truncateText(item.content, 500))
  }

  return lines.join('\n')
}

function buildMaterialSource(
  input: {
    id: string
    title: string
    sourceSystem: string
    provenanceType: TrustPanelSource['provenanceType']
    approvalBasis: string
    accessScope: TrustPanelSource['accessScope']
    optInStatus: TrustPanelSource['optInStatus']
    uploaderName: string | null
    uploaderRole: string | null
    courseId: string
    courseCode: string
    courseTitle: string
    isVisibleToStudents: boolean
    allowed: boolean
    permissionBasis: TrustPanelSource['permissionBasis']
    lastUpdatedAt: string | null
  },
): TrustPanelSource {
  return {
    id: input.id,
    kind: 'course-material',
    title: input.title,
    sourceSystem: input.sourceSystem,
    sourceSystemLabel: getSourceSystemLabel(input.sourceSystem),
    approvalBasis: input.approvalBasis,
    approvalBasisLabel: getApprovalBasisLabel(input.approvalBasis),
    accessScope: input.accessScope,
    accessScopeLabel: getAccessScopeLabel(input.accessScope),
    optInStatus: input.optInStatus,
    optInStatusLabel: getOptInStatusLabel(input.optInStatus),
    provenanceType: input.provenanceType,
    uploaderName: input.uploaderName,
    uploaderRole: input.uploaderRole,
    courseId: input.courseId,
    courseCode: input.courseCode,
    courseTitle: input.courseTitle,
    isVisibleToStudents: input.isVisibleToStudents,
    allowed: input.allowed,
    permissionBasis: input.permissionBasis,
    lastUpdatedAt: input.lastUpdatedAt,
  }
}

function buildPolicySource(
  course: { id: string; courseCode: string; title: string; isPublic: boolean },
  policyItem: CoursePolicyContextItem,
  courseFlags: CourseGovernanceFlags,
  viewer: ProvenanceViewer,
  viewerHasCourseAccess: boolean,
): TrustPanelSource {
  const accessScope = buildCourseAccessScope(course.isPublic)
  const permissionDecision = buildContentPermissionDecision({
    courseFlags,
    accessScope,
    provenanceType: 'official',
    approvalBasis: policyItem.sourceSystem === 'syllabus' ? 'syllabus_import' : 'course_owner',
    isVisibleToStudents: true,
    viewerRole: viewer.role,
    viewerHasCourseAccess,
    optInStatus: 'not_required',
  })

  return {
    id: policyItem.id,
    kind: policyItem.kind,
    title: policyItem.title,
    sourceSystem: policyItem.sourceSystem,
    sourceSystemLabel: getSourceSystemLabel(policyItem.sourceSystem),
    approvalBasis: policyItem.sourceSystem === 'syllabus' ? 'syllabus_import' : 'course_owner',
    approvalBasisLabel: getApprovalBasisLabel(
      policyItem.sourceSystem === 'syllabus' ? 'syllabus_import' : 'course_owner',
    ),
    accessScope,
    accessScopeLabel: getAccessScopeLabel(accessScope),
    optInStatus: 'not_required',
    optInStatusLabel: getOptInStatusLabel('not_required'),
    provenanceType: 'official',
    uploaderName: null,
    uploaderRole: null,
    courseId: course.id,
    courseCode: course.courseCode,
    courseTitle: course.title,
    isVisibleToStudents: true,
    allowed: permissionDecision.allowed,
    permissionBasis: permissionDecision.permissionBasis,
    lastUpdatedAt: policyItem.createdAt,
  }
}

async function getMaterialConsentSnapshots(
  materials: Array<{ uploadedById: string | null }>,
) {
  const snapshots = new Map<string, ConsentSnapshot | null>()

  for (const material of materials) {
    if (!material.uploadedById || snapshots.has(material.uploadedById)) continue
    snapshots.set(material.uploadedById, await getUserConsentSnapshot(material.uploadedById))
  }

  return snapshots
}

async function buildCourseMaterialSources(
  course: {
    id: string
    courseCode: string
    title: string
    isPublic: boolean
    instructorId: string
    facultyAiRetrievalApproved: boolean
    studentUploadsAllowed: boolean
    transcriptGenerationAllowed: boolean
    classroomRecordingAllowed: boolean
    materials: Array<{
      id: string
      title: string
      content: string
      moduleNumber: number | null
      materialType: string
      isVisible: boolean
      sourceSystem: string
      provenanceType: string
      approvalBasis: string
      accessScope: string
      aiOptInStatus: string
      updatedAt: Date
      uploadedById: string | null
      uploadedBy: { name: string | null; role: string | null } | null
    }>
  },
  viewer: ProvenanceViewer,
  viewerHasCourseAccess: boolean,
  query: string | null | undefined,
) {
  const queryWords = normalizeQueryWords(query)
  const isInstructorOrAdmin = viewer.role === 'ADMIN' || viewer.id === course.instructorId
  const courseFlags = toCourseFlags(course)

  if (!viewerHasCourseAccess) {
    return {
      viewerHasCourseAccess,
      materialsWithSources: [],
    }
  }

  const visibleMaterials = course.materials.filter((material) =>
    canViewerSeeMaterial(material, viewer, isInstructorOrAdmin),
  )
  const consentSnapshots = await getMaterialConsentSnapshots(visibleMaterials)

  const ranked = visibleMaterials
    .map((material, index) => ({
      material,
      index,
      score: scoreMaterial(material, queryWords),
    }))
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score
      if (left.material.moduleNumber !== right.material.moduleNumber) {
        return (left.material.moduleNumber ?? 999) - (right.material.moduleNumber ?? 999)
      }
      return left.index - right.index
    })

  const selectedMaterials =
    queryWords.length > 0
      ? ranked.filter((entry) => entry.score > 0).slice(0, MATERIAL_LIMIT).map((entry) => entry.material)
      : ranked.slice(0, MATERIAL_LIMIT).map((entry) => entry.material)

  const fallbackMaterials =
    selectedMaterials.length > 0
      ? selectedMaterials
      : ranked.slice(0, MATERIAL_LIMIT).map((entry) => entry.material)

  const materialsWithSources = fallbackMaterials.map((material) => {
    const consentSnapshot = material.uploadedById
      ? consentSnapshots.get(material.uploadedById) ?? null
      : null
    const effective = buildEffectiveMaterialGovernance({
      courseIsPublic: course.isPublic,
      courseFlags,
      sourceSystem: material.sourceSystem || 'manual',
      provenanceType: material.provenanceType as TrustPanelSource['provenanceType'],
      approvalBasis: material.approvalBasis,
      uploaderRole: material.uploadedBy?.role ?? null,
      consentSnapshot,
    })
    const permissionDecision = buildContentPermissionDecision({
      courseFlags,
      accessScope: effective.accessScope,
      provenanceType: effective.provenanceType,
      approvalBasis: effective.approvalBasis,
      isVisibleToStudents: material.isVisible,
      viewerRole: viewer.role,
      viewerHasCourseAccess,
      optInStatus: effective.aiOptInStatus,
      consentSnapshot,
    })

    return {
      material,
      source: buildMaterialSource({
        id: material.id,
        title: material.title,
        sourceSystem: material.sourceSystem || 'manual',
        provenanceType: effective.provenanceType,
        approvalBasis: effective.approvalBasis,
        accessScope: effective.accessScope,
        optInStatus: effective.aiOptInStatus,
        uploaderName: material.uploadedBy?.name ?? null,
        uploaderRole: material.uploadedBy?.role ?? null,
        courseId: course.id,
        courseCode: course.courseCode,
        courseTitle: course.title,
        isVisibleToStudents: material.isVisible,
        allowed: permissionDecision.allowed,
        permissionBasis: permissionDecision.permissionBasis,
        lastUpdatedAt: material.updatedAt.toISOString(),
      }),
    }
  })

  return {
    viewerHasCourseAccess,
    materialsWithSources,
  }
}

async function getCourseWithGovernance(courseId: string, viewer: ProvenanceViewer) {
  return prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      courseCode: true,
      title: true,
      isPublic: true,
      instructorId: true,
      facultyAiRetrievalApproved: true,
      studentUploadsAllowed: true,
      transcriptGenerationAllowed: true,
      classroomRecordingAllowed: true,
      instructor: {
        select: {
          name: true,
        },
      },
      ...(viewer.role === 'STUDENT'
        ? {
            enrollments: {
              where: { studentId: viewer.id },
              select: { studentId: true },
              take: 1,
            },
          }
        : {}),
      materials: {
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          title: true,
          content: true,
          moduleNumber: true,
          materialType: true,
          isVisible: true,
          sourceSystem: true,
          provenanceType: true,
          approvalBasis: true,
          accessScope: true,
          aiOptInStatus: true,
          createdAt: true,
          updatedAt: true,
          uploadedById: true,
          uploadedBy: {
            select: {
              name: true,
              role: true,
            },
          },
        },
      },
    },
  })
}

export async function buildSandyCourseContext(input: {
  courseId: string
  viewer: ProvenanceViewer
  query?: string | null
}): Promise<SandyCourseContextResult | null> {
  const course = await getCourseWithGovernance(input.courseId, input.viewer)
  if (!course) return null

  const courseFlags = toCourseFlags(course)
  const viewerHasCourseAccess = canViewerAccessCourse(
    {
      instructorId: course.instructorId,
      isPublic: course.isPublic,
      enrollments: 'enrollments' in course ? course.enrollments : [],
    },
    input.viewer,
  )
  const { materialsWithSources } = await buildCourseMaterialSources(
    course,
    input.viewer,
    viewerHasCourseAccess,
    input.query,
  )

  const relevantPolicyContext =
    viewerHasCourseAccess && course.facultyAiRetrievalApproved
      ? await getRelevantCoursePolicyContext(
          course.id,
          course.courseCode,
          input.query,
          POLICY_LIMIT,
        )
      : { items: [], text: null }

  const policySources = relevantPolicyContext.items.map((item) =>
    buildPolicySource(
      {
        id: course.id,
        courseCode: course.courseCode,
        title: course.title,
        isPublic: course.isPublic,
      },
      item,
      courseFlags,
      input.viewer,
      viewerHasCourseAccess,
    ),
  )

  const allSources = [
    ...materialsWithSources.map((entry) => entry.source),
    ...policySources,
  ].slice(0, SOURCE_LIMIT)

  const trustSummary = buildTrustSummary(course, allSources, viewerHasCourseAccess)
  const trustPanel: SandyTrustPanelData = {
    status: trustSummary.status,
    summary: trustSummary.summary,
    generatedAt: new Date().toISOString(),
    courseId: course.id,
    courseCode: course.courseCode,
    courseTitle: course.title,
    sources: allSources,
  }

  if (!viewerHasCourseAccess) {
    return {
      selectedCourse: null,
      policyBlock: null,
      promptBlock:
        `## COURSE ACCESS RESTRICTION\n` +
        `The current user does not have access to this course context. ` +
        `Do not claim you reviewed course materials or course policies.`,
      trustPanel,
    }
  }

  if (!course.facultyAiRetrievalApproved) {
    return {
      selectedCourse: {
        courseCode: course.courseCode,
        title: course.title,
        materials: [],
      },
      policyBlock: null,
      promptBlock:
        `## COURSE GOVERNANCE RESTRICTION\n` +
        `Faculty AI retrieval is disabled for ${course.courseCode}. ` +
        `Do not claim you reviewed course materials or policies. ` +
        `If asked about course-specific content, explain that AI retrieval is not approved for this course yet.`,
      trustPanel,
    }
  }

  const allowedMaterials = materialsWithSources.filter((entry) => entry.source.allowed)
  const selectedCourse = {
    courseCode: course.courseCode,
    title: course.title,
    materials: allowedMaterials.map(({ material }) => ({
      id: material.id,
      courseCode: course.courseCode,
      title: material.title,
      moduleNumber: material.moduleNumber,
      content: material.content,
    })),
  }

  const materialPromptBlock = buildMaterialPromptBlock(
    course.courseCode,
    allowedMaterials.map(({ material, source }) => ({ ...material, source })),
  )
  const policyBlock = relevantPolicyContext.text
  const policyPromptBlock = buildPolicyPromptBlock(
    course.courseCode,
    relevantPolicyContext.items.filter((_, index) => policySources[index]?.allowed),
  )
  const promptBlock = [materialPromptBlock, policyPromptBlock]
    .filter((block): block is string => Boolean(block))
    .join('\n\n')

  return {
    selectedCourse,
    policyBlock,
    promptBlock: promptBlock || null,
    trustPanel,
  }
}

export async function getCourseGovernanceSummary(input: {
  courseId: string
  viewer: ProvenanceViewer
}): Promise<CourseGovernanceApiResponse | null> {
  const course = await getCourseWithGovernance(input.courseId, input.viewer)
  if (!course) return null

  const viewerHasCourseAccess = canViewerAccessCourse(
    {
      instructorId: course.instructorId,
      isPublic: course.isPublic,
      enrollments: 'enrollments' in course ? course.enrollments : [],
    },
    input.viewer,
  )

  if (!viewerHasCourseAccess && input.viewer.role !== 'ADMIN') return null

  const courseFlags = toCourseFlags(course)
  const consentSnapshot = await getUserConsentSnapshot(input.viewer.id)
  const policyContext = await getRelevantCoursePolicyContext(
    course.id,
    course.courseCode,
    null,
    POLICY_LIMIT,
  )
  const policySources = policyContext.items.map((item) =>
    buildPolicySource(
      {
        id: course.id,
        courseCode: course.courseCode,
        title: course.title,
        isPublic: course.isPublic,
      },
      item,
      courseFlags,
      input.viewer,
      viewerHasCourseAccess,
    ),
  )

  const { materialsWithSources } = await buildCourseMaterialSources(
    course,
    input.viewer,
    viewerHasCourseAccess,
    null,
  )
  const recentSources = [
    ...materialsWithSources.map((entry) => entry.source),
    ...policySources,
  ]
    .sort((left, right) => {
      const rightTime = right.lastUpdatedAt ? new Date(right.lastUpdatedAt).getTime() : 0
      const leftTime = left.lastUpdatedAt ? new Date(left.lastUpdatedAt).getTime() : 0
      return rightTime - leftTime
    })
    .slice(0, SOURCE_LIMIT)

  const [policyCount, gradingWeightCount, ackCount, latestPolicyChange] = await Promise.all([
    prisma.coursePolicy.count({ where: { courseId: course.id } }),
    prisma.gradingWeight.count({ where: { courseId: course.id } }),
    prisma.coursePolicyAck.count({ where: { courseId: course.id } }),
    prisma.coursePolicyChange.findFirst({
      where: { courseId: course.id },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    }),
  ])

  return {
    course: {
      id: course.id,
      courseCode: course.courseCode,
      title: course.title,
      isPublic: course.isPublic,
      instructorName: course.instructor.name,
      flags: courseFlags,
    },
    consent: consentSnapshot,
    policySummary: {
      totalPolicies: policyCount,
      totalWeights: gradingWeightCount,
      ackCount,
      latestChangeAt: latestPolicyChange?.createdAt.toISOString() ?? null,
    },
    sourceSummary: summarizeSourceSummary(recentSources),
    recentSources,
  }
}

export function buildToolTrustMetadata(tool: {
  approvalStatus: string
  requiresInstitutionalReview: boolean
  reviewedBy: string | null
  reviewExpiresAt: Date | null
}) {
  const reviewStatus =
    tool.requiresInstitutionalReview && !tool.reviewedBy
      ? 'pending_review'
      : tool.reviewExpiresAt && tool.reviewExpiresAt.getTime() < Date.now()
        ? 'expired'
        : tool.approvalStatus === 'APPROVED'
          ? 'approved'
          : tool.approvalStatus.toLowerCase()

  return {
    reviewStatus,
    permissionBasis: tool.requiresInstitutionalReview
      ? 'institutional_review'
      : tool.approvalStatus.toLowerCase(),
    requiresInstitutionalReview: tool.requiresInstitutionalReview,
    reviewedBy: tool.reviewedBy,
    reviewExpiresAt: tool.reviewExpiresAt?.toISOString() ?? null,
  }
}

export function encodeTrustPanelHeader(payload: SandyTrustPanelData) {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
}
