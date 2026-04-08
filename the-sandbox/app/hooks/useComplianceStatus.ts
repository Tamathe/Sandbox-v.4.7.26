'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../lib/auth-context'

interface ComplianceStatus {
  tosAccepted: boolean
  dataConsented: boolean
  ferpaAcked: boolean
  tosAcceptedAt: string | null
  dataConsentAt: string | null
  ferpaAckAt: string | null
  loading: boolean
  recordAcceptance: (action: 'accept-tos' | 'accept-consent' | 'accept-ferpa') => Promise<void>
}

export function useComplianceStatus(): ComplianceStatus {
  const { currentUser } = useAuth()
  const [tosAcceptedAt, setTosAcceptedAt] = useState<string | null>(null)
  const [dataConsentAt, setDataConsentAt] = useState<string | null>(null)
  const [ferpaAckAt, setFerpaAckAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function fetchStatus() {
      try {
        const res = await fetch('/api/auth/status', {
          headers: { 'x-demo-user-email': currentUser.email },
        })
        if (!res.ok) return
        const data = await res.json()
        if (cancelled) return
        setTosAcceptedAt(data.user.tosAcceptedAt ?? null)
        setDataConsentAt(data.user.dataConsentAt ?? null)
        setFerpaAckAt(data.user.ferpaAckAt ?? null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void fetchStatus()
    return () => { cancelled = true }
  }, [currentUser.email])

  const recordAcceptance = useCallback(
    async (action: 'accept-tos' | 'accept-consent' | 'accept-ferpa') => {
      const now = new Date().toISOString()
      // Optimistic update
      if (action === 'accept-tos') setTosAcceptedAt(now)
      else if (action === 'accept-consent') setDataConsentAt(now)
      else if (action === 'accept-ferpa') setFerpaAckAt(now)

      await fetch('/api/users/compliance', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-email': currentUser.email,
        },
        body: JSON.stringify({ action }),
      })
    },
    [currentUser.email],
  )

  return {
    tosAccepted: !!tosAcceptedAt,
    dataConsented: !!dataConsentAt,
    ferpaAcked: !!ferpaAckAt,
    tosAcceptedAt,
    dataConsentAt,
    ferpaAckAt,
    loading,
    recordAcceptance,
  }
}
