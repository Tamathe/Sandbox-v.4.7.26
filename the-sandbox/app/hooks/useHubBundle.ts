// ─── useHubBundle ───────────────────────────────────────────────
// Replaces 5 individual API calls on the Hub/Explore page with one bundle.

import type { ToolWithDetails } from '../lib/types'
import type { DBCollection } from '../components/hub/SwimLane'
import { useApiFetch } from './useApiFetch'

interface DepartmentSummary {
  id: string
  name: string
  shortName: string
  slug: string
  description: string | null
  logoUrl: string | null
  themeColor: string | null
  _count: { collections: number; followers: number; members: number }
}

interface Recommendation {
  id: string
  name: string
  shortDescription: string | null
  category: string
  toolType: string
  thumbnailUrl: string | null
  reason: string
}

interface HubBundleResponse {
  communityTools: ToolWithDetails[]
  myDepartments: DepartmentSummary[]
  featuredDepartments: DepartmentSummary[]
  collections: DBCollection[]
  recommendations: Recommendation[]
}

interface HubBundleData {
  communityTools: ToolWithDetails[]
  communityLoading: boolean
  myDepartments: DepartmentSummary[]
  featuredDepartments: DepartmentSummary[]
  deptsLoading: boolean
  dbCollections: DBCollection[]
  collectionsLoaded: boolean
  recommendations: Recommendation[]
  recsLoaded: boolean
}

export function useHubBundle(_userEmail: string): HubBundleData {
  const { data, isLoading: loading } = useApiFetch<HubBundleResponse>('/api/hub/explore-bundle')

  return {
    communityTools: data?.communityTools ?? [],
    communityLoading: loading,
    myDepartments: data?.myDepartments ?? [],
    featuredDepartments: data?.featuredDepartments ?? [],
    deptsLoading: loading,
    dbCollections: data?.collections ?? [],
    collectionsLoaded: !loading,
    recommendations: data?.recommendations ?? [],
    recsLoaded: !loading,
  }
}
