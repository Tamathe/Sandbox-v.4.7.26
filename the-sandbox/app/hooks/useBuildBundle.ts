// ─── useBuildBundle ─────────────────────────────────────────────
// Replaces 3 individual API calls on the Build page with one bundle.

import { useApiFetch } from './useApiFetch'

interface BuildBundleResponse {
  drafts: Array<{
    id: string
    name: string
    shortDescription: string | null
    fullDescription: string | null
    category: string
    toolType: string
    thumbnailUrl: string | null
    approvalStatus: string
    published: boolean
    isPortfolio: boolean
    updatedAt: string
    deployment: { state: string } | null
    _count: { sessions: number; upvotes: number }
  }>
  bounties: Array<{
    id: string
    title: string
    description: string
    category: string
    status: string
    createdAt: string
  }>
  courses: Array<{
    id: string
    courseCode: string
    title: string
    isPublic: boolean
    instructor: { email: string; name: string } | null
  }>
}

export interface BuildBundleData {
  drafts: BuildBundleResponse['drafts']
  bounties: BuildBundleResponse['bounties']
  courses: BuildBundleResponse['courses']
  loading: boolean
}

export function useBuildBundle(_userEmail: string): BuildBundleData {
  const { data, isLoading: loading } = useApiFetch<BuildBundleResponse>('/api/build/bundle')

  return {
    drafts: data?.drafts ?? [],
    bounties: data?.bounties ?? [],
    courses: data?.courses ?? [],
    loading,
  }
}
