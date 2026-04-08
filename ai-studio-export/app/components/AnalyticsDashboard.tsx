'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Users, MessageSquare, ArrowUp, Heart, Loader2, TrendingUp } from 'lucide-react'
import { AnalyticsData } from '../lib/types'
import { useAuth } from '../lib/auth-context'
import { format, parseISO } from 'date-fns'

interface AnalyticsDashboardProps {
  toolId: string
}

export default function AnalyticsDashboard({ toolId }: AnalyticsDashboardProps) {
  const { currentUser } = useAuth()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch(`/api/tools/${toolId}/analytics`, {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (!res.ok) {
        const err = await res.json()
        setError(err.error || 'Failed to load analytics')
        return
      }
      const json = await res.json()
      setData(json)
    } catch {
      setError('Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }, [toolId, currentUser.email])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Loading analytics...
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-600 font-medium">{error}</p>
      </div>
    )
  }

  if (!data) return null

  const formattedSessions = data.sessionsOverTime.map((item) => ({
    ...item,
    date: format(parseISO(item.date), 'MMM d'),
  }))

  const formattedUpvotes = data.upvotesOverTime.map((item) => ({
    ...item,
    date: format(parseISO(item.date), 'MMM d'),
  }))

  const statCards = [
    {
      label: 'Total Launches',
      value: data.totalSessions,
      icon: TrendingUp,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Unique Users',
      value: data.uniqueUsers,
      icon: Users,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Total Upvotes',
      value: data.upvotesCount,
      icon: ArrowUp,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      label: 'Total Favorites',
      value: data.favoritesCount,
      icon: Heart,
      color: 'text-pink-600',
      bg: 'bg-pink-50',
    },
  ]

  if (data.totalMessages > 0) {
    statCards.splice(1, 0, {
      label: 'Total Messages',
      value: data.totalMessages,
      icon: MessageSquare,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
    })
  }

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {statCards.slice(0, 4).map((card) => (
          <div key={card.label} className={`${card.bg} rounded-2xl p-4`}>
            <div className={`${card.color} mb-2`}>
              <card.icon className="w-5 h-5" />
            </div>
            <div className={`text-2xl font-bold ${card.color}`}>{card.value.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-0.5">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Sessions over time chart */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <h3 className="font-semibold text-gray-800 mb-4 text-sm">Sessions Over Time (Last 30 Days)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={formattedSessions} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              interval={4}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                fontSize: '12px',
              }}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#0033A0"
              strokeWidth={2}
              dot={false}
              name="Sessions"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Upvotes over time */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <h3 className="font-semibold text-gray-800 mb-4 text-sm">Upvotes Over Time (Last 30 Days)</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={formattedUpvotes} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              interval={4}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                fontSize: '12px',
              }}
            />
            <Bar dataKey="count" fill="#0033A0" radius={[4, 4, 0, 0]} name="Upvotes" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Custom metrics */}
      {data.customMetricsSummary.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <h3 className="font-semibold text-gray-800 mb-4 text-sm">Custom Metrics Summary</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={data.customMetricsSummary}
              margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="count" fill="#0033A0" radius={[4, 4, 0, 0]} name="Count" />
              <Bar dataKey="avg" fill="#6366f1" radius={[4, 4, 0, 0]} name="Average" />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.customMetricsSummary.map((metric) => (
              <div key={metric.name} className="bg-gray-50 rounded-xl p-3">
                <div className="font-medium text-gray-700 text-sm mb-1">{metric.name}</div>
                <div className="flex items-baseline gap-3">
                  <span className="text-lg font-bold text-[#0033A0]">{metric.count}</span>
                  <span className="text-xs text-gray-400">events</span>
                  {metric.avg !== null && (
                    <>
                      <span className="text-lg font-bold text-indigo-600">
                        {metric.avg.toFixed(1)}
                      </span>
                      <span className="text-xs text-gray-400">avg</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
