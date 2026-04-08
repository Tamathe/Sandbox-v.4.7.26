import { describe, expect, it, vi } from 'vitest'

vi.mock('../prisma', () => ({
  prisma: {},
}))

import {
  buildEffectiveMaterialGovernance,
  deriveUserUploadOptInStatus,
  resolveMaterialOptInStatus,
} from '../content-permissions'

describe('content-permissions', () => {
  it('requires renewed consent when the accepted version is stale', () => {
    expect(
      deriveUserUploadOptInStatus({
        latestConsentVersion: 'consent-v2',
        latestConsentEffectiveAt: '2026-03-20T00:00:00.000Z',
        acceptedConsentVersion: 'consent-v1',
        dataConsentAt: '2026-01-01T00:00:00.000Z',
        aiPersonalizationGranted: true,
      }),
    ).toBe('consent_required')
  })

  it('blocks user-uploaded content when student uploads are disabled', () => {
    expect(
      resolveMaterialOptInStatus({
        courseFlags: {
          facultyAiRetrievalApproved: true,
          studentUploadsAllowed: false,
          transcriptGenerationAllowed: false,
          classroomRecordingAllowed: false,
        },
        provenanceType: 'user-uploaded',
      }),
    ).toBe('blocked')
  })

  it('derives effective governance for generated course-map material', () => {
    const result = buildEffectiveMaterialGovernance({
      courseIsPublic: false,
      courseFlags: {
        facultyAiRetrievalApproved: true,
        studentUploadsAllowed: false,
        transcriptGenerationAllowed: false,
        classroomRecordingAllowed: false,
      },
      sourceSystem: 'course-map',
      provenanceType: 'inferred',
      approvalBasis: 'system_generated',
      uploaderRole: 'EDUCATOR',
    })

    expect(result).toMatchObject({
      provenanceType: 'inferred',
      approvalBasis: 'system_generated',
      accessScope: 'course_members',
      aiOptInStatus: 'approved',
    })
  })
})
