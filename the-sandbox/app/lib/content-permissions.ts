import { prisma } from './prisma'
import type {
  ConsentSnapshot,
  CourseGovernanceFlags,
  GovernanceAccessScope,
  GovernanceOfficiality,
  GovernanceOptInStatus,
  PermissionBasisEntry,
} from './provenance-types'

export type { ConsentSnapshot, CourseGovernanceFlags }

export type ContentPermissionDecision = {
  allowed: boolean
  accessScope: GovernanceAccessScope
  optInStatus: GovernanceOptInStatus
  permissionBasis: PermissionBasisEntry[]
}

type GovernanceDefaultsInput = {
  courseIsPublic: boolean
  facultyAiRetrievalApproved: boolean
  studentUploadsAllowed: boolean
  uploaderId?: string | null
  uploaderRole?: string | null
  sourceSystem: string
  provenanceType?: GovernanceOfficiality
  approvalBasis?: string
}

type PermissionDecisionInput = {
  courseFlags: CourseGovernanceFlags
  accessScope: GovernanceAccessScope
  provenanceType: GovernanceOfficiality
  approvalBasis: string
  isVisibleToStudents: boolean
  viewerRole: string
  viewerHasCourseAccess: boolean
  optInStatus: GovernanceOptInStatus
  consentSnapshot?: ConsentSnapshot | null
}

type EffectiveMaterialGovernanceInput = {
  courseIsPublic: boolean
  courseFlags: CourseGovernanceFlags
  sourceSystem: string
  provenanceType?: GovernanceOfficiality | null
  approvalBasis?: string | null
  uploaderRole?: string | null
  consentSnapshot?: ConsentSnapshot | null
}

const APPROVAL_BASIS_LABELS: Record<string, string> = {
  course_owner: 'Uploaded by the course owner',
  syllabus_import: 'Parsed from the syllabus',
  canvas_sync: 'Synced from Canvas',
  system_generated: 'Generated from approved course content',
  user_upload: 'Uploaded by a course participant',
  institutional_review: 'Institutionally reviewed',
}

const ACCESS_SCOPE_LABELS: Record<GovernanceAccessScope, string> = {
  public_course: 'Anyone with course access can retrieve this source.',
  course_members: 'Retrieval is limited to the course owner, admins, and enrolled users.',
  instructor_only: 'Only course managers should retrieve this source.',
}

const OPT_IN_STATUS_LABELS: Record<GovernanceOptInStatus, string> = {
  approved: 'AI use is approved for this source.',
  not_required: 'No extra opt-in is required for this source.',
  consent_required: 'A current opt-in is required before this source should be used.',
  blocked: 'Course governance currently blocks AI use for this source.',
}

const OFFICIALITY_LABELS: Record<GovernanceOfficiality, string> = {
  official: 'Official',
  'user-uploaded': 'User uploaded',
  simulated: 'Simulated',
  inferred: 'Inferred',
}

export function getApprovalBasisLabel(code: string) {
  return APPROVAL_BASIS_LABELS[code] ?? code.replace(/_/g, ' ')
}

export function getAccessScopeLabel(scope: GovernanceAccessScope) {
  return ACCESS_SCOPE_LABELS[scope]
}

export function getOptInStatusLabel(status: GovernanceOptInStatus) {
  return OPT_IN_STATUS_LABELS[status]
}

export function getOfficialityLabel(type: GovernanceOfficiality) {
  return OFFICIALITY_LABELS[type]
}

export function getSourceSystemLabel(sourceSystem: string) {
  return sourceSystem.replace(/[-_]/g, ' ')
}

export function buildCourseAccessScope(courseIsPublic: boolean): GovernanceAccessScope {
  return courseIsPublic ? 'public_course' : 'course_members'
}

export function deriveMaterialProvenanceType(input: {
  sourceSystem: string
  uploaderRole?: string | null
  explicitType?: GovernanceOfficiality | null
}): GovernanceOfficiality {
  if (input.explicitType) return input.explicitType
  if (input.uploaderRole === 'STUDENT') return 'user-uploaded'
  if (input.sourceSystem === 'simulated') return 'simulated'
  if (input.sourceSystem === 'course-map' || input.sourceSystem === 'avatar') return 'inferred'

  return 'official'
}

export function deriveApprovalBasis(input: {
  sourceSystem: string
  uploaderRole?: string | null
  explicitBasis?: string | null
}) {
  if (input.explicitBasis) return input.explicitBasis
  if (input.uploaderRole === 'STUDENT') return 'user_upload'

  switch (input.sourceSystem) {
    case 'canvas':
      return 'canvas_sync'
    case 'syllabus':
      return 'syllabus_import'
    case 'course-map':
    case 'avatar':
      return 'system_generated'
    default:
      return 'course_owner'
  }
}

export function deriveUserUploadOptInStatus(
  consent: ConsentSnapshot | null | undefined,
): GovernanceOptInStatus {
  if (!consent?.dataConsentAt) return 'consent_required'
  if (consent.aiPersonalizationGranted === false) return 'consent_required'

  if (
    consent.latestConsentVersion &&
    consent.acceptedConsentVersion &&
    consent.acceptedConsentVersion !== consent.latestConsentVersion
  ) {
    return 'consent_required'
  }

  return 'approved'
}

export function resolveMaterialOptInStatus(input: {
  courseFlags: CourseGovernanceFlags
  provenanceType: GovernanceOfficiality
  consentSnapshot?: ConsentSnapshot | null
}): GovernanceOptInStatus {
  if (!input.courseFlags.facultyAiRetrievalApproved) return 'blocked'
  if (input.provenanceType === 'simulated') return 'not_required'
  if (input.provenanceType === 'user-uploaded') {
    if (!input.courseFlags.studentUploadsAllowed) return 'blocked'
    return deriveUserUploadOptInStatus(input.consentSnapshot)
  }

  return 'approved'
}

export function buildCourseMaterialGovernanceDefaults(input: GovernanceDefaultsInput) {
  const accessScope = buildCourseAccessScope(input.courseIsPublic)
  const provenanceType = deriveMaterialProvenanceType({
    sourceSystem: input.sourceSystem,
    uploaderRole: input.uploaderRole,
    explicitType: input.provenanceType,
  })
  const approvalBasis = deriveApprovalBasis({
    sourceSystem: input.sourceSystem,
    uploaderRole: input.uploaderRole,
    explicitBasis: input.approvalBasis,
  })
  const aiOptInStatus = resolveMaterialOptInStatus({
    courseFlags: {
      facultyAiRetrievalApproved: input.facultyAiRetrievalApproved,
      studentUploadsAllowed: input.studentUploadsAllowed,
      transcriptGenerationAllowed: false,
      classroomRecordingAllowed: false,
    },
    provenanceType,
  })

  return {
    sourceSystem: input.sourceSystem,
    provenanceType,
    approvalBasis,
    accessScope,
    aiOptInStatus,
    uploadedById: input.uploaderId ?? null,
  }
}

export function buildEffectiveMaterialGovernance(input: EffectiveMaterialGovernanceInput) {
  const provenanceType = deriveMaterialProvenanceType({
    sourceSystem: input.sourceSystem,
    uploaderRole: input.uploaderRole,
    explicitType: input.provenanceType,
  })
  const approvalBasis = deriveApprovalBasis({
    sourceSystem: input.sourceSystem,
    uploaderRole: input.uploaderRole,
    explicitBasis: input.approvalBasis,
  })
  const accessScope = buildCourseAccessScope(input.courseIsPublic)
  const optInStatus = resolveMaterialOptInStatus({
    courseFlags: input.courseFlags,
    provenanceType,
    consentSnapshot: input.consentSnapshot,
  })

  return {
    provenanceType,
    approvalBasis,
    accessScope,
    aiOptInStatus: optInStatus,
  }
}

export function buildContentPermissionDecision(
  input: PermissionDecisionInput,
): ContentPermissionDecision {
  const permissionBasis: PermissionBasisEntry[] = [
    {
      code: 'course_ai_retrieval',
      label: 'Faculty AI retrieval',
      detail: input.courseFlags.facultyAiRetrievalApproved
        ? 'The course owner has enabled AI retrieval for course content.'
        : 'The course owner has disabled AI retrieval for this course.',
      status: input.courseFlags.facultyAiRetrievalApproved ? 'allowed' : 'blocked',
    },
    {
      code: 'access_scope',
      label: 'Access scope',
      detail: input.viewerHasCourseAccess
        ? getAccessScopeLabel(input.accessScope)
        : 'The current user does not have access to this course context.',
      status: input.viewerHasCourseAccess ? 'allowed' : 'blocked',
    },
    {
      code: 'student_visibility',
      label: 'Student visibility',
      detail:
        input.viewerRole === 'STUDENT' && !input.isVisibleToStudents
          ? 'This item is hidden from students.'
          : input.isVisibleToStudents
            ? 'This item is visible to students.'
            : 'This item is hidden from students but visible to course managers.',
      status:
        input.viewerRole === 'STUDENT' && !input.isVisibleToStudents
          ? 'blocked'
          : 'allowed',
    },
    {
      code: 'approval_basis',
      label: 'Approval basis',
      detail: getApprovalBasisLabel(input.approvalBasis),
      status: 'allowed',
    },
  ]

  if (input.provenanceType === 'user-uploaded') {
    permissionBasis.push({
      code: 'student_upload_policy',
      label: 'Student uploads',
      detail: input.courseFlags.studentUploadsAllowed
        ? 'This course allows student-uploaded material to participate in AI retrieval.'
        : 'This course does not allow student-uploaded material in AI retrieval.',
      status: input.courseFlags.studentUploadsAllowed ? 'allowed' : 'blocked',
    })
    permissionBasis.push({
      code: 'opt_in_status',
      label: 'Uploader opt-in',
      detail:
        input.optInStatus === 'approved'
          ? input.consentSnapshot?.latestConsentVersion
            ? `Uploader has current consent (${input.consentSnapshot.latestConsentVersion}).`
            : 'Uploader has current consent for AI use.'
          : getOptInStatusLabel(input.optInStatus),
      status:
        input.optInStatus === 'approved'
          ? 'allowed'
          : input.optInStatus === 'blocked'
            ? 'blocked'
            : 'warning',
    })
  } else {
    permissionBasis.push({
      code: 'opt_in_status',
      label: 'Opt-in status',
      detail: getOptInStatusLabel(input.optInStatus),
      status: input.optInStatus === 'blocked' ? 'blocked' : 'not_required',
    })
  }

  const allowed = permissionBasis.every((entry) => entry.status !== 'blocked')

  return {
    allowed,
    accessScope: input.accessScope,
    optInStatus: input.optInStatus,
    permissionBasis,
  }
}

export async function getUserConsentSnapshot(
  userId: string | null | undefined,
): Promise<ConsentSnapshot | null> {
  if (!userId) return null

  const [user, latestConsentVersion] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        acceptedConsentVersion: true,
        dataConsentAt: true,
        consentCategories: {
          where: { category: 'ai-personalization' },
          select: {
            consentedAt: true,
            revokedAt: true,
          },
          orderBy: { consentedAt: 'desc' },
          take: 1,
        },
      },
    }),
    prisma.consentVersion.findFirst({
      where: { type: 'consent' },
      orderBy: { effectiveAt: 'desc' },
      select: {
        version: true,
        effectiveAt: true,
      },
    }),
  ])

  if (!user) return null

  const latestConsent = user.consentCategories[0] ?? null
  const aiPersonalizationGranted =
    latestConsent == null
      ? null
      : latestConsent.revokedAt == null

  return {
    latestConsentVersion: latestConsentVersion?.version ?? null,
    latestConsentEffectiveAt: latestConsentVersion?.effectiveAt.toISOString() ?? null,
    acceptedConsentVersion: user.acceptedConsentVersion ?? null,
    dataConsentAt: user.dataConsentAt?.toISOString() ?? null,
    aiPersonalizationGranted,
  }
}

export async function syncCourseMaterialGovernance(courseId: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      isPublic: true,
      facultyAiRetrievalApproved: true,
      studentUploadsAllowed: true,
      transcriptGenerationAllowed: true,
      classroomRecordingAllowed: true,
      materials: {
        select: {
          id: true,
          sourceSystem: true,
          provenanceType: true,
          approvalBasis: true,
          uploadedById: true,
          uploadedBy: {
            select: {
              role: true,
            },
          },
        },
      },
    },
  })

  if (!course) return

  const consentSnapshots = new Map<string, ConsentSnapshot | null>()
  const courseFlags: CourseGovernanceFlags = {
    facultyAiRetrievalApproved: course.facultyAiRetrievalApproved,
    studentUploadsAllowed: course.studentUploadsAllowed,
    transcriptGenerationAllowed: course.transcriptGenerationAllowed,
    classroomRecordingAllowed: course.classroomRecordingAllowed,
  }

  for (const material of course.materials) {
    let consentSnapshot: ConsentSnapshot | null = null
    if (material.uploadedById) {
      if (!consentSnapshots.has(material.uploadedById)) {
        consentSnapshots.set(
          material.uploadedById,
          await getUserConsentSnapshot(material.uploadedById),
        )
      }
      consentSnapshot = consentSnapshots.get(material.uploadedById) ?? null
    }

    const effective = buildEffectiveMaterialGovernance({
      courseIsPublic: course.isPublic,
      courseFlags,
      sourceSystem: material.sourceSystem || 'manual',
      provenanceType: material.provenanceType as GovernanceOfficiality | null,
      approvalBasis: material.approvalBasis,
      uploaderRole: material.uploadedBy?.role ?? null,
      consentSnapshot,
    })

    await prisma.courseMaterial.update({
      where: { id: material.id },
      data: {
        sourceSystem: material.sourceSystem || 'manual',
        provenanceType: effective.provenanceType,
        approvalBasis: effective.approvalBasis,
        accessScope: effective.accessScope,
        aiOptInStatus: effective.aiOptInStatus,
      },
    })
  }
}

export async function syncUserUploadedMaterialGovernanceForUser(userId: string) {
  const materials = await prisma.courseMaterial.findMany({
    where: { uploadedById: userId },
    select: {
      id: true,
      sourceSystem: true,
      provenanceType: true,
      approvalBasis: true,
      course: {
        select: {
          isPublic: true,
          facultyAiRetrievalApproved: true,
          studentUploadsAllowed: true,
          transcriptGenerationAllowed: true,
          classroomRecordingAllowed: true,
        },
      },
      uploadedBy: {
        select: {
          role: true,
        },
      },
    },
  })

  if (materials.length === 0) return

  const consentSnapshot = await getUserConsentSnapshot(userId)

  for (const material of materials) {
    const effective = buildEffectiveMaterialGovernance({
      courseIsPublic: material.course.isPublic,
      courseFlags: {
        facultyAiRetrievalApproved: material.course.facultyAiRetrievalApproved,
        studentUploadsAllowed: material.course.studentUploadsAllowed,
        transcriptGenerationAllowed: material.course.transcriptGenerationAllowed,
        classroomRecordingAllowed: material.course.classroomRecordingAllowed,
      },
      sourceSystem: material.sourceSystem || 'manual',
      provenanceType: material.provenanceType as GovernanceOfficiality | null,
      approvalBasis: material.approvalBasis,
      uploaderRole: material.uploadedBy?.role ?? null,
      consentSnapshot,
    })

    await prisma.courseMaterial.update({
      where: { id: material.id },
      data: {
        sourceSystem: material.sourceSystem || 'manual',
        provenanceType: effective.provenanceType,
        approvalBasis: effective.approvalBasis,
        accessScope: effective.accessScope,
        aiOptInStatus: effective.aiOptInStatus,
      },
    })
  }
}
