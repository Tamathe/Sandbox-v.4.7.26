export type ToolDeploymentState =
  | 'draft'
  | 'private'
  | 'catalog'
  | 'course-scoped'
  | 'department-scoped'
  | 'institution-approved'
  | 'external-packaged'

export type ToolDeploymentBadgeKind =
  | 'state'
  | 'department-template'
  | 'official'
  | 'reviewed'
  | 'requires-approval'
  | 'review-expired'
  | 'uses-institutional-data'

export type ToolDeploymentBadgeTone = 'slate' | 'blue' | 'green' | 'amber' | 'red'

export interface ToolDeploymentBadge {
  kind: ToolDeploymentBadgeKind
  label: string
  tone: ToolDeploymentBadgeTone
}

export interface ToolDeploymentSummary {
  state: ToolDeploymentState
  label: string
  description: string
  courseCount: number
  departmentCount: number
  storefrontCount: number
  usesInstitutionalData: boolean
  badges: ToolDeploymentBadge[]
}

export interface ToolDeploymentCourse {
  id: string
  courseCode: string
  title: string
  instructorName: string
}

export interface ToolDeploymentResponse {
  deployment: ToolDeploymentSummary
  visibleAssignedCourses: ToolDeploymentCourse[]
  availableCourses: ToolDeploymentCourse[]
  canAssign: boolean
}

type DateLike = Date | string | null | undefined

type ToolDeploymentInput = {
  published: boolean
  approvalStatus: string
  deploymentMode?: string | null
  toolType?: string | null
  externalUrl?: string | null
  isOfficialService?: boolean | null
  requiresInstitutionalReview?: boolean | null
  reviewedAt?: DateLike
  reviewExpiresAt?: DateLike
  referenceDocUrls?: string[] | null
  courseLinkCount?: number | null
  storefrontPlacementCount?: number | null
  storefrontDepartmentCount?: number | null
  _count?: {
    courseLinks?: number | null
  } | null
}

function normalizeDate(value: DateLike) {
  if (!value) return null
  const parsed = value instanceof Date ? value : new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function getCourseLinkCount(input: ToolDeploymentInput) {
  return Math.max(0, Number(input.courseLinkCount ?? input._count?.courseLinks ?? 0))
}

function getStorefrontPlacementCount(input: ToolDeploymentInput) {
  return Math.max(0, Number(input.storefrontPlacementCount ?? 0))
}

function getStorefrontDepartmentCount(input: ToolDeploymentInput) {
  return Math.max(0, Number(input.storefrontDepartmentCount ?? 0))
}

function usesInstitutionalReferences(referenceDocUrls: string[] | null | undefined) {
  return (referenceDocUrls ?? []).some(
    (reference) =>
      reference.startsWith('course://') ||
      reference.startsWith('dataset://'),
  )
}

function getReviewState(input: ToolDeploymentInput) {
  const reviewedAt = normalizeDate(input.reviewedAt)
  const reviewExpiresAt = normalizeDate(input.reviewExpiresAt)
  const isExpired = Boolean(
    reviewExpiresAt && reviewExpiresAt.getTime() < Date.now(),
  )
  const isReviewed = Boolean(reviewedAt) && !isExpired

  return {
    isExpired,
    isReviewed,
  }
}

function getDeploymentState(
  input: ToolDeploymentInput,
  courseCount: number,
  departmentCount: number,
): ToolDeploymentState {
  if (!input.published) {
    if (departmentCount > 0 || input.deploymentMode === 'DEPARTMENT') {
      return 'department-scoped'
    }
    if (courseCount > 0) {
      return 'course-scoped'
    }
    return input.deploymentMode === 'PRIVATE' ? 'private' : 'draft'
  }

  if (input.isOfficialService && input.approvalStatus === 'APPROVED') {
    return 'institution-approved'
  }

  if ((input.toolType === 'EXTERNAL' || input.toolType === 'PORTFOLIO') && input.externalUrl) {
    return 'external-packaged'
  }

  return 'catalog'
}

function getStateLabel(state: ToolDeploymentState) {
  switch (state) {
    case 'draft':
      return 'Draft'
    case 'private':
      return 'Private'
    case 'course-scoped':
      return 'Course-Scoped'
    case 'department-scoped':
      return 'Department-Scoped'
    case 'institution-approved':
      return 'Institution Approved'
    case 'external-packaged':
      return 'External Packaged'
    case 'catalog':
    default:
      return 'Marketplace'
  }
}

function getStateDescription(
  state: ToolDeploymentState,
  courseCount: number,
  departmentCount: number,
  storefrontCount: number,
  deploymentMode?: string | null,
) {
  switch (state) {
    case 'draft':
      return 'Work in progress. Only you and admins can open it until you deliberately deploy or publish it.'
    case 'private':
      return 'Ready for limited deployment. Keep it out of the marketplace while you assign it to courses or share it through department storefronts.'
    case 'course-scoped':
      return `Installed in ${courseCount} course${courseCount === 1 ? '' : 's'} without appearing in the public marketplace.`
    case 'department-scoped':
      if (storefrontCount === 0 && deploymentMode === 'DEPARTMENT') {
        return 'Reserved for department rollout. Share it into at least one department storefront collection to make it visible beyond the builder.'
      }
      return `Shared in ${storefrontCount} collection${storefrontCount === 1 ? '' : 's'} across ${departmentCount} department storefront${departmentCount === 1 ? '' : 's'} without appearing in the public marketplace.`
    case 'institution-approved':
      return 'Published with institution-approved status and ready for broader deployment.'
    case 'external-packaged':
      return 'Published in the marketplace as an external or packaged experience.'
    case 'catalog':
    default:
      return 'Published in the marketplace and ready to be assigned to courses.'
  }
}

export function buildToolDeploymentSummary(input: ToolDeploymentInput): ToolDeploymentSummary {
  const courseCount = getCourseLinkCount(input)
  const storefrontCount = getStorefrontPlacementCount(input)
  const departmentCount = getStorefrontDepartmentCount(input)
  const { isExpired, isReviewed } = getReviewState(input)
  const usesInstitutionalData =
    courseCount > 0 ||
    usesInstitutionalReferences(input.referenceDocUrls)

  const state = getDeploymentState(input, courseCount, departmentCount)

  const badges: ToolDeploymentBadge[] = [
    {
      kind: 'state',
      label: getStateLabel(state),
      tone:
        state === 'draft'
          ? 'slate'
          : state === 'private'
            ? 'blue'
          : state === 'institution-approved'
            ? 'green'
            : state === 'course-scoped' || state === 'department-scoped'
              ? 'blue'
              : state === 'external-packaged'
                ? 'amber'
                : 'slate',
    },
  ]

  if (departmentCount > 0) {
    badges.push({
      kind: 'department-template',
      label:
        departmentCount === 1
          ? 'Department template'
          : `${departmentCount} storefronts`,
      tone: 'blue',
    })
  }

  if (input.isOfficialService) {
    badges.push({
      kind: 'official',
      label: 'Official',
      tone: 'blue',
    })
  }

  if (isExpired) {
    badges.push({
      kind: 'review-expired',
      label: 'Review expired',
      tone: 'red',
    })
  } else if (isReviewed) {
    badges.push({
      kind: 'reviewed',
      label: 'Reviewed',
      tone: 'green',
    })
  } else if (input.requiresInstitutionalReview) {
    badges.push({
      kind: 'requires-approval',
      label: 'Requires approval',
      tone: 'amber',
    })
  }

  if (usesInstitutionalData) {
    badges.push({
      kind: 'uses-institutional-data',
      label: 'Uses institutional data',
      tone: 'blue',
    })
  }

  return {
    state,
    label: getStateLabel(state),
    description: getStateDescription(
      state,
      courseCount,
      departmentCount,
      storefrontCount,
      input.deploymentMode,
    ),
    courseCount,
    departmentCount,
    storefrontCount,
    usesInstitutionalData,
    badges,
  }
}
