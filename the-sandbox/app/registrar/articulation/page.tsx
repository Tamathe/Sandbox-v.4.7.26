'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../lib/auth-context'
import { RegistrarLayout } from '../../components/registrar/RegistrarLayout'
import { ArticulationDashboard } from '../../components/registrar/ArticulationDashboard'
import { RoutingRulesEditor } from '../../components/registrar/RoutingRulesEditor'
import { RefreshCw } from 'lucide-react'

interface RoutingRule {
  id: string
  departmentName: string
  contactEmail: string
  autoApproveThreshold: number
  autoRouteThreshold: number
}

const TABS = ['Requests', 'Routing Rules'] as const
type Tab = (typeof TABS)[number]

export default function ArticulationPage() {
  const { currentUser } = useAuth()
  const [tab, setTab] = useState<Tab>('Requests')
  const [requests, setRequests] = useState([])
  const [rules, setRules] = useState<RoutingRule[]>([])
  const [loading, setLoading] = useState(true)

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    try {
      const [reqRes, ruleRes] = await Promise.all([
        fetch('/api/registrar/articulation', { headers: { 'x-demo-user-email': currentUser.email } }),
        fetch('/api/registrar/articulation/routing-rules', { headers: { 'x-demo-user-email': currentUser.email } }),
      ])
      if (reqRes.ok) setRequests((await reqRes.json()).requests)
      if (ruleRes.ok) setRules((await ruleRes.json()).rules)
    } catch {}
    setLoading(false)
  }, [currentUser.email])

  useEffect(() => { void fetchRequests() }, [fetchRequests])

  const handleDecide = async (id: string, decision: string) => {
    try {
      await fetch(`/api/articulation/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
        body: JSON.stringify({ status: decision }),
      })
      void fetchRequests()
    } catch {}
  }

  const handleSaveRules = async (updated: RoutingRule[]) => {
    const newRules = updated.filter((r) => r.id.startsWith('new-'))
    for (const rule of newRules) {
      try {
        await fetch('/api/registrar/articulation/routing-rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
          body: JSON.stringify(rule),
        })
      } catch {}
    }
    setRules(updated)
  }

  return (
    <RegistrarLayout title="Transfer Credit Review" subtitle="Evaluate AI articulation recommendations and manage routing rules">
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t ? 'border-[#0033A0] text-[#0033A0]' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
        <button onClick={fetchRequests} className="ml-auto px-2 py-2 text-gray-400 hover:text-gray-600">
          <RefreshCw className="size-4" />
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Loading…</div>
      ) : tab === 'Requests' ? (
        <div className="bg-white rounded-2xl border-2 border-gray-200 p-4">
          <ArticulationDashboard requests={requests} onDecide={handleDecide} />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border-2 border-gray-200 p-4">
          <h2 className="font-extrabold text-gray-900 text-base mb-4">Department Routing Rules</h2>
          <p className="text-xs text-gray-500 mb-4">
            Configure AI confidence thresholds per department. Requests above the auto-approve threshold
            are pre-approved for staff confirmation. Requests above auto-route go directly to department review.
          </p>
          <RoutingRulesEditor rules={rules} onSave={handleSaveRules} />
        </div>
      )}
    </RegistrarLayout>
  )
}
