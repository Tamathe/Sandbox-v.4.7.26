'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../lib/auth-context'
import { RegistrarLayout } from '../../components/registrar/RegistrarLayout'
import HoldsManagement from '../../components/registrar/HoldsManagement'
import type { HoldsManagementData } from '../../lib/registrar/holds-management'

export default function HoldsPage() {
  const { currentUser } = useAuth()
  const [data, setData] = useState<HoldsManagementData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null)
        const res = await fetch('/api/registrar/holds', {
          headers: { 'x-demo-user-email': currentUser.email },
        })
        if (res.ok) setData(await res.json())
        else setError('Failed to load holds data')
      } catch {
        setError('Failed to load holds data')
      }
      setLoading(false)
    }
    void fetchData()
  }, [currentUser.email])

  return (
    <RegistrarLayout
      title="Holds Management"
      subtitle="View, manage, and bulk-release student account holds"
    >
      {error ? (
        <div className="text-center py-12">
          <p className="text-sm text-red-600 font-medium">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-2 text-xs text-[#0033A0] font-medium hover:underline">Try again</button>
        </div>
      ) : (
        <HoldsManagement data={data} loading={loading} />
      )}
    </RegistrarLayout>
  )
}
