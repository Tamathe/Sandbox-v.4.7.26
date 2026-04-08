'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../lib/auth-context'
import { RegistrarLayout } from '../../components/registrar/RegistrarLayout'
import ComplianceCalendar from '../../components/registrar/ComplianceCalendar'
import type { ComplianceCalendarData } from '../../lib/registrar/compliance-calendar'

export default function CompliancePage() {
  const { currentUser } = useAuth()
  const [data, setData] = useState<ComplianceCalendarData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null)
        const res = await fetch('/api/registrar/compliance-calendar', {
          headers: { 'x-demo-user-email': currentUser.email },
        })
        if (res.ok) setData(await res.json())
        else setError('Failed to load compliance calendar')
      } catch {
        setError('Failed to load compliance calendar')
      }
      setLoading(false)
    }
    void fetchData()
  }, [currentUser.email])

  return (
    <RegistrarLayout
      title="Compliance Calendar & Deadlines"
      subtitle="Track federal, state, and institutional reporting deadlines"
    >
      {error ? (
        <div className="text-center py-12">
          <p className="text-sm text-red-600 font-medium">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-2 text-xs text-[#0033A0] font-medium hover:underline">Try again</button>
        </div>
      ) : (
        <ComplianceCalendar data={data} loading={loading} />
      )}
    </RegistrarLayout>
  )
}
