'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, RefreshCw, Network } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '../../lib/auth-context'
import { apiFetch } from '../../lib/api-client'
import PageHeader from '../../components/PageHeader'
import NetworkGraph from '../../components/curriculum-intel/NetworkGraph'
import InsightList from '../../components/curriculum-intel/InsightList'
import BloomBreakdown from '../../components/curriculum-intel/BloomBreakdown'
import NodeDetail from '../../components/curriculum-intel/NodeDetail'
import type {
  CurriculumGraphData,
  NodeDetail as NodeDetailType,
  InsightStatus,
  BloomLevel,
} from '../../lib/curriculum-intel/types'

const UK_BLUE = '#0033A0'

interface InsightRow {
  id: string
  type: string
  severity: string
  title: string
  description: string
  recommendation: string | null
  status: string
  discoveredAt: string
}

interface BloomRow {
  department: string
  counts: Record<BloomLevel, number>
  total: number
}

export default function CurriculumIntelligencePage() {
  const { currentUser } = useAuth()
  const router = useRouter()

  const [graphData, setGraphData] = useState<CurriculumGraphData | null>(null)
  const [insights, setInsights] = useState<InsightRow[]>([])
  const [bloomData, setBloomData] = useState<BloomRow[]>([])
  const [selectedNode, setSelectedNode] = useState<NodeDetailType | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [graph, insightRes] = await Promise.all([
        apiFetch<CurriculumGraphData>(currentUser.email, '/api/curriculum-intel/graph'),
        apiFetch<{ insights: InsightRow[] }>(currentUser.email, '/api/curriculum-intel/insights'),
      ])

      setGraphData(graph)
      setInsights(insightRes.insights)

      // Extract bloom data from graph stats
      if (graph.stats.departments.length > 0) {
        const deptViews = await Promise.all(
          graph.stats.departments.map(dept =>
            apiFetch<{
              department: string
              bloomBreakdown: Record<BloomLevel, number>
              nodeCount: number
            }>(currentUser.email, `/api/curriculum-intel/department/${encodeURIComponent(dept)}`),
          ),
        )
        setBloomData(
          deptViews.map(v => ({
            department: v.department,
            counts: v.bloomBreakdown,
            total: v.nodeCount,
          })),
        )
      }
    } catch (err) {
      console.error('Failed to load curriculum intelligence data:', err)
    } finally {
      setLoading(false)
    }
  }, [currentUser.email])

  useEffect(() => {
    if (currentUser.role !== 'ADMIN') {
      router.replace('/')
      return
    }
    void fetchData()
  }, [currentUser.role, fetchData, router])

  const handleNodeClick = useCallback(
    async (nodeId: string) => {
      try {
        const detail = await apiFetch<NodeDetailType>(
          currentUser.email,
          `/api/curriculum-intel/node/${nodeId}`,
        )
        setSelectedNode(detail)
      } catch (err) {
        console.error('Failed to load node detail:', err)
      }
    },
    [currentUser.email],
  )

  const handleInsightAction = useCallback(
    async (id: string, status: InsightStatus) => {
      try {
        await apiFetch(currentUser.email, `/api/curriculum-intel/insights/${id}/action`, {
          method: 'POST',
          body: JSON.stringify({ status }),
        })
        setInsights(prev => prev.map(i => (i.id === id ? { ...i, status } : i)))
      } catch (err) {
        console.error('Failed to update insight:', err)
      }
    },
    [currentUser.email],
  )

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await apiFetch(currentUser.email, '/api/cron/curriculum-intel-refresh', {
        method: 'POST',
        headers: { 'x-cron-secret': 'manual-trigger' } as Record<string, string>,
      })
      await fetchData()
    } catch (err) {
      console.error('Failed to refresh:', err)
    } finally {
      setRefreshing(false)
    }
  }, [currentUser.email, fetchData])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <>
      <PageHeader
        title="Curriculum Intelligence Network"
        subtitle="Knowledge flow analysis across the university"
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="size-4" /> Admin
            </Link>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-[#0033A0] rounded-lg hover:bg-[#002a80] disabled:opacity-50"
            >
              <RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Rebuild Graph'}
            </button>
          </div>
        }
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Stats summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Nodes', value: graphData?.stats.totalNodes ?? 0 },
            { label: 'Edges', value: graphData?.stats.totalEdges ?? 0 },
            { label: 'Departments', value: graphData?.stats.departments.length ?? 0 },
            {
              label: 'Avg Mastery',
              value:
                graphData?.stats.avgMastery != null
                  ? `${(graphData.stats.avgMastery * 100).toFixed(0)}%`
                  : '--',
            },
          ].map(stat => (
            <div
              key={stat.label}
              className="border rounded-2xl shadow-sm bg-white p-4 text-center"
            >
              <div className="text-2xl font-extrabold text-gray-900">{stat.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Network graph + node detail */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={selectedNode ? 'lg:col-span-2' : 'lg:col-span-3'}>
            <NetworkGraph
              nodes={graphData?.nodes ?? []}
              edges={graphData?.edges ?? []}
              departments={graphData?.stats.departments ?? []}
              onNodeClick={handleNodeClick}
            />
          </div>
          {selectedNode && (
            <div className="lg:col-span-1">
              <NodeDetail
                node={selectedNode}
                onClose={() => setSelectedNode(null)}
                onNavigate={handleNodeClick}
              />
            </div>
          )}
        </div>

        {/* Insights */}
        <InsightList
          insights={insights.filter(i => i.status !== 'dismissed')}
          onAction={handleInsightAction}
        />

        {/* Bloom Breakdown */}
        <BloomBreakdown data={bloomData} />
      </div>
    </>
  )
}
