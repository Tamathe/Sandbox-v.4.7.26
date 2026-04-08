'use client'

import { useState, useEffect, useCallback } from 'react'
import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import { StaffCard } from './StaffCard'

export interface StaffAlert {
  id: string
  alertType?: string
  severity: string
  title: string
  body: string
  actionUrl?: string | null
  expiresAt?: string | null
}

interface AlertsCardProps {
  /** If provided, uses these instead of fetching. */
  alerts?: StaffAlert[]
  /** Required when self-fetching; ignored when alerts prop is provided. */
  userEmail?: string
}

const SEVERITY_STYLES: Record<string, { border: string; bg: string; Icon: typeof AlertTriangle }> = {
  critical: { border: 'border-l-red-500', bg: 'bg-red-50', Icon: AlertTriangle },
  warning: { border: 'border-l-amber-500', bg: 'bg-amber-50', Icon: AlertCircle },
  info: { border: 'border-l-blue-500', bg: 'bg-blue-50', Icon: Info },
}

export default function AlertsCard({ alerts: propAlerts, userEmail }: AlertsCardProps = {}) {
  const { currentUser } = useAuth()
  const email = userEmail ?? currentUser.email
  const [fetchedAlerts, setFetchedAlerts] = useState<StaffAlert[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(!propAlerts)

  const alerts = propAlerts ?? fetchedAlerts

  const fetchAlerts = useCallback(async () => {
    if (propAlerts) return
    setLoading(true)
    try {
      const res = await fetch('/api/staff/alerts', {
        headers: { 'x-demo-user-email': email },
      })
      if (res.ok) {
        const data = await res.json() as { alerts: StaffAlert[] }
        setFetchedAlerts(data.alerts ?? [])
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [email, propAlerts])

  useEffect(() => { void fetchAlerts() }, [fetchAlerts])

  const handleDismiss = useCallback((id: string) => {
    setDismissed(prev => {
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }, [])

  const visible = alerts.filter(a => !dismissed.has(a.id))

  return (
    <StaffCard
      title="Alerts"
      loading={loading}
      isEmpty={visible.length === 0}
      emptyMessage="No active alerts."
      headerRight={
        visible.length > 0 ? (
          <span className="bg-red-100 text-red-700 text-xs font-bold rounded-full px-2 py-0.5 min-w-[20px] text-center">
            {visible.length}
          </span>
        ) : undefined
      }
      loadingSkeleton={
        <div className="animate-pulse space-y-2">
          {[1, 2].map(i => (
            <div key={i} className="h-14 bg-gray-100 rounded-xl" />
          ))}
        </div>
      }
    >
      <div className="space-y-2">
        {visible.map(alert => {
          const style = SEVERITY_STYLES[alert.severity] ?? SEVERITY_STYLES.info
          const { Icon } = style
          return (
            <div
              key={alert.id}
              className={`border-l-4 ${style.border} ${style.bg} rounded-xl px-3 py-2.5 group`}
            >
              <div className="flex items-start gap-2">
                <Icon className="size-4 mt-0.5 flex-shrink-0 text-gray-600" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{alert.title}</p>
                  <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{alert.body}</p>
                </div>
                <button
                  onClick={() => handleDismiss(alert.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 transition-opacity flex-shrink-0"
                  aria-label="Dismiss alert"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </StaffCard>
  )
}
