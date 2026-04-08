'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Activity } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import PageHeader from '../../components/PageHeader'
import PulseDashboard from '../../components/campus-pulse/PulseDashboard'

export default function CampusPulsePage() {
  const { currentUser } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (currentUser && currentUser.role !== 'ADMIN' && currentUser.role !== 'STAFF') {
      router.push('/')
    }
  }, [currentUser, router])

  if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'STAFF')) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Campus Pulse"
        subtitle="Multi-signal early warning system -- institutional radar"
        action={
          <div className="flex items-center gap-2 text-[#0033A0]">
            <Activity className="size-5" />
            <span className="text-sm font-medium">Live</span>
          </div>
        }
      />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PulseDashboard />
      </div>
    </div>
  )
}
