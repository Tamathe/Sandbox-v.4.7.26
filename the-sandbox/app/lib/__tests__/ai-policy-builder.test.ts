import { describe, expect, it } from 'vitest'

import {
  applyPolicyDraftToList,
  havePolicySnapshotsChanged,
} from '../faculty/ai-policy-builder'
import type { PolicyBuilderPolicyRecord, PolicyBuilderSaveRequest } from '../faculty/policy-builder-types'

const EXISTING_POLICIES: PolicyBuilderPolicyRecord[] = [
  {
    id: 'policy-1',
    policyType: 'academic_integrity',
    title: 'Academic Integrity',
    content: 'Submit your own work.',
    source: 'syllabus',
    createdAt: '2026-03-20T12:00:00.000Z',
  },
  {
    id: 'policy-2',
    policyType: 'late',
    title: 'Late Work',
    content: 'Late work loses 10% per day.',
    source: 'syllabus',
    createdAt: '2026-03-20T12:05:00.000Z',
  },
]

describe('applyPolicyDraftToList', () => {
  it('replaces the selected policy without disturbing the rest of the list', () => {
    const input: PolicyBuilderSaveRequest = {
      courseId: 'course-1',
      saveMode: 'replace',
      replacePolicyId: 'policy-1',
      policy: {
        title: 'Generative AI Use and Academic Integrity',
        policyType: 'academic_integrity',
        content: 'AI support is allowed with disclosure.',
      },
    }

    const result = applyPolicyDraftToList(EXISTING_POLICIES, input)

    expect(result.replacedPolicyId).toBe('policy-1')
    expect(result.nextPolicies).toHaveLength(2)
    expect(result.nextPolicies[0]).toMatchObject({
      id: 'policy-1',
      policyType: 'academic_integrity',
      title: 'Generative AI Use and Academic Integrity',
      content: 'AI support is allowed with disclosure.',
      source: 'ai_policy_builder',
    })
    expect(result.nextPolicies[1]).toEqual(EXISTING_POLICIES[1])
  })

  it('appends a new policy when faculty choose add-as-new', () => {
    const input: PolicyBuilderSaveRequest = {
      courseId: 'course-1',
      saveMode: 'append',
      policy: {
        title: 'AI Disclosure',
        policyType: 'communication',
        content: 'Name the AI tool and explain what it helped with.',
      },
    }

    const result = applyPolicyDraftToList(EXISTING_POLICIES, input)

    expect(result.replacedPolicyId).toBeNull()
    expect(result.nextPolicies).toHaveLength(3)
    expect(result.nextPolicies[2]).toMatchObject({
      policyType: 'communication',
      title: 'AI Disclosure',
      content: 'Name the AI tool and explain what it helped with.',
      source: 'ai_policy_builder',
    })
  })
})

describe('havePolicySnapshotsChanged', () => {
  it('returns false when an append request duplicates an existing policy exactly', () => {
    const duplicateInput: PolicyBuilderSaveRequest = {
      courseId: 'course-1',
      saveMode: 'append',
      policy: {
        title: 'Academic Integrity',
        policyType: 'academic_integrity',
        content: 'Submit your own work.',
      },
    }

    const result = applyPolicyDraftToList(EXISTING_POLICIES, duplicateInput)

    expect(havePolicySnapshotsChanged(EXISTING_POLICIES, result.nextPolicies)).toBe(false)
  })
})
