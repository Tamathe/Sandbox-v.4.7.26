import { describe, expect, it } from 'vitest'

import { buildToolDeploymentSummary } from '../tool-deployment'

describe('buildToolDeploymentSummary', () => {
  it('marks unpublished tools as drafts', () => {
    const summary = buildToolDeploymentSummary({
      published: false,
      approvalStatus: 'COMMUNITY',
      courseLinkCount: 0,
      referenceDocUrls: [],
    })

    expect(summary.state).toBe('draft')
    expect(summary.badges[0]?.label).toBe('Draft')
  })

  it('marks unpublished linked tools as course-scoped', () => {
    const summary = buildToolDeploymentSummary({
      published: false,
      approvalStatus: 'APPROVED',
      courseLinkCount: 2,
      referenceDocUrls: ['course://BIO101'],
    })

    expect(summary.state).toBe('course-scoped')
    expect(summary.courseCount).toBe(2)
    expect(summary.usesInstitutionalData).toBe(true)
    expect(summary.badges.some((badge) => badge.kind === 'uses-institutional-data')).toBe(true)
  })

  it('marks unpublished private tools as private', () => {
    const summary = buildToolDeploymentSummary({
      published: false,
      approvalStatus: 'COMMUNITY',
      deploymentMode: 'PRIVATE',
      courseLinkCount: 0,
      referenceDocUrls: [],
    })

    expect(summary.state).toBe('private')
    expect(summary.label).toBe('Private')
    expect(summary.description).toContain('limited deployment')
  })

  it('marks unpublished storefront tools as department-scoped', () => {
    const summary = buildToolDeploymentSummary({
      published: false,
      approvalStatus: 'APPROVED',
      courseLinkCount: 0,
      storefrontPlacementCount: 2,
      storefrontDepartmentCount: 1,
      referenceDocUrls: [],
    })

    expect(summary.state).toBe('department-scoped')
    expect(summary.departmentCount).toBe(1)
    expect(summary.storefrontCount).toBe(2)
    expect(summary.badges.some((badge) => badge.kind === 'department-template')).toBe(true)
  })

  it('marks unpublished department deployment mode tools as department-scoped before storefront assignment', () => {
    const summary = buildToolDeploymentSummary({
      published: false,
      approvalStatus: 'COMMUNITY',
      deploymentMode: 'DEPARTMENT',
      courseLinkCount: 0,
      storefrontPlacementCount: 0,
      storefrontDepartmentCount: 0,
      referenceDocUrls: [],
    })

    expect(summary.state).toBe('department-scoped')
    expect(summary.description).toContain('Reserved for department rollout')
  })

  it('marks official approved tools as institution-approved', () => {
    const summary = buildToolDeploymentSummary({
      published: true,
      approvalStatus: 'APPROVED',
      isOfficialService: true,
      courseLinkCount: 0,
      referenceDocUrls: [],
    })

    expect(summary.state).toBe('institution-approved')
    expect(summary.badges.some((badge) => badge.kind === 'official')).toBe(true)
  })

  it('surfaces review requirements when review is still missing', () => {
    const summary = buildToolDeploymentSummary({
      published: true,
      approvalStatus: 'COMMUNITY',
      requiresInstitutionalReview: true,
      courseLinkCount: 0,
      referenceDocUrls: [],
    })

    expect(summary.badges.some((badge) => badge.kind === 'requires-approval')).toBe(true)
  })
})
