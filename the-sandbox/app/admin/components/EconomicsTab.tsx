'use client'

import { AdminStats } from '../../lib/types'

function formatUsd(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

interface EconomicsTabProps {
  stats: AdminStats
}

export default function EconomicsTab({ stats }: EconomicsTabProps) {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border-2 border-gray-200 bg-white p-6">
          <div className="text-xs uppercase tracking-[0.2em] text-gray-500">This Month</div>
          <div className="mt-3 text-3xl font-bold text-gray-900">{stats.economics.totalTokens.toLocaleString()}</div>
          <div className="mt-1 text-sm text-gray-500">Total tokens</div>
        </div>
        <div className="rounded-2xl border-2 border-gray-200 bg-white p-6">
          <div className="text-xs uppercase tracking-[0.2em] text-gray-500">Estimated Cost</div>
          <div className="mt-3 text-3xl font-bold text-gray-900">{formatUsd(stats.economics.totalEstimatedCostUsd)}</div>
          <div className="mt-1 text-sm text-gray-500">Based on Haiku pricing</div>
        </div>
        <div className="rounded-2xl border-2 border-gray-200 bg-white p-6">
          <div className="text-xs uppercase tracking-[0.2em] text-gray-500">Input / Output</div>
          <div className="mt-3 text-3xl font-bold text-gray-900">{stats.economics.totalInputTokens.toLocaleString()} / {stats.economics.totalOutputTokens.toLocaleString()}</div>
          <div className="mt-1 text-sm text-gray-500">Tokens</div>
        </div>
      </div>
      <div className="grid gap-8 lg:grid-cols-2">
        <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-base font-extrabold text-gray-900">Top Expensive Tools</h2>
          <div className="space-y-3">
            {stats.economics.topTools.map((tool) => (
              <div key={tool.toolId} className="rounded-2xl border border-gray-200 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-900">{tool.toolName}</div>
                    <div className="text-xs text-slate-500">{tool.tokensUsed.toLocaleString()} tokens</div>
                  </div>
                  <div className="text-sm font-semibold text-slate-800">{formatUsd(tool.estimatedCostUsd)}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-base font-extrabold text-gray-900">Top Heavy Users</h2>
          <div className="space-y-3">
            {stats.economics.topUsers.map((entry) => (
              <div key={entry.userId} className="rounded-2xl border border-gray-200 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-900">{entry.userName}</div>
                    <div className="text-xs text-slate-500">{entry.userEmail} · {entry.tokensUsed.toLocaleString()} tokens</div>
                  </div>
                  <div className="text-sm font-semibold text-slate-800">{formatUsd(entry.estimatedCostUsd)}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
