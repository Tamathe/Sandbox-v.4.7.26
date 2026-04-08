'use client'

import { useState, useEffect } from 'react'
import { Loader2, Users } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import type { AIStance, DisciplineFamily } from '../../generated/prisma'

interface DistributionData {
  total: number
  distribution: Record<string, number>
  filtered: {
    label: string
    total: number
    distribution: Record<string, number>
  } | null
  sufficientData: boolean
}

const STANCE_ORDER: AIStance[] = ['PROHIBIT', 'CAUTIOUS', 'GUIDED', 'INTEGRATE', 'REQUIRE']
const STANCE_LABELS: Record<string, string> = {
  PROHIBIT: 'Prohibit', CAUTIOUS: 'Cautious', GUIDED: 'Guided', INTEGRATE: 'Integrate', REQUIRE: 'Require',
}
const STANCE_COLORS: Record<string, string> = {
  PROHIBIT: 'bg-red-400', CAUTIOUS: 'bg-amber-400', GUIDED: 'bg-blue-400', INTEGRATE: 'bg-green-400', REQUIRE: 'bg-purple-400',
}

interface PeerDistributionProps {
  currentStance: AIStance | null
  disciplineFamily?: DisciplineFamily | null
}

export default function PeerDistribution({ currentStance, disciplineFamily }: PeerDistributionProps) {
  const { currentUser } = useAuth()
  const [data, setData] = useState<DistributionData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const params = new URLSearchParams()
        if (disciplineFamily) params.set('disciplineFamily', disciplineFamily)
        const res = await fetch(`/api/ai-literacy/stance/distribution?${params}`, {
          headers: { 'x-demo-user-email': currentUser.email },
        })
        if (res.ok) {
          setData(await res.json())
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [currentUser.email, disciplineFamily])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-4 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!data || !data.sufficientData) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-center">
        <Users className="size-5 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-600">
          Not enough data yet. As more faculty complete the assessment, you&apos;ll see how your stance compares.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <DistributionChart
        label={`All Faculty (n=${data.total})`}
        distribution={data.distribution}
        total={data.total}
        currentStance={currentStance}
      />
      {data.filtered && (
        <DistributionChart
          label={`${data.filtered.label} (n=${data.filtered.total})`}
          distribution={data.filtered.distribution}
          total={data.filtered.total}
          currentStance={currentStance}
        />
      )}
    </div>
  )
}

function DistributionChart({
  label,
  distribution,
  total,
  currentStance,
}: {
  label: string
  distribution: Record<string, number>
  total: number
  currentStance: AIStance | null
}) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-900 mb-3">{label}</h4>
      <div className="space-y-2.5">
        {STANCE_ORDER.map(stance => {
          const count = distribution[stance] ?? 0
          const pct = total > 0 ? Math.round((count / total) * 100) : 0
          const isCurrent = currentStance === stance

          return (
            <div key={stance} className="flex items-center gap-3">
              <span className={`text-xs w-16 shrink-0 ${isCurrent ? 'font-bold text-gray-900' : 'text-gray-500'}`}>
                {STANCE_LABELS[stance]}
              </span>
              <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden relative">
                <div
                  className={`h-full rounded-full transition-all ${STANCE_COLORS[stance]}`}
                  style={{ width: `${Math.max(pct, 2)}%` }}
                />
                {isCurrent && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#0033A0]">
                    You
                  </span>
                )}
              </div>
              <span className={`text-xs w-8 text-right ${isCurrent ? 'font-bold text-gray-900' : 'text-gray-500'}`}>
                {pct}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
