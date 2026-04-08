'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '../lib/auth-context'
import PageHeader from '../components/PageHeader'
import AccreditationDashboard from '../components/accreditation/AccreditationDashboard'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function AccreditationPage() {
  const { currentUser } = useAuth()
  const router = useRouter()

  if (!currentUser || currentUser.role !== 'ADMIN') {
    if (typeof window !== 'undefined') router.push('/')
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Accreditation Autopilot"
        subtitle="Continuous SACSCOC compliance — always-on evidence collection, gap detection, and narrative generation"
        action={
          <Link href="/admin" className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
            <ArrowLeft className="size-4" />
            Back to Admin
          </Link>
        }
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AccreditationDashboard />
      </div>
    </div>
  )
}
