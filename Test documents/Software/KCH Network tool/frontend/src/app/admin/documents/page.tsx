'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import Header from '@/components/layout/header'
import DocumentTable from '@/components/admin/document-table'
import Link from 'next/link'
import { ChevronLeft, Upload } from 'lucide-react'

export default function DocumentsPage() {
  const { user, isLoading, isAdmin } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && (!user || !isAdmin)) {
      router.push('/')
    }
  }, [isLoading, user, isAdmin, router])

  if (isLoading || !user) return null

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1 text-sm text-kch-gray-500 hover:text-kch-gray-700 mb-2"
            >
              <ChevronLeft size={16} />
              Back to Admin
            </Link>
            <h2 className="text-2xl font-bold text-kch-gray-900">Documents</h2>
          </div>
          <Link href="/admin/upload" className="btn-primary flex items-center gap-2">
            <Upload size={16} />
            Upload
          </Link>
        </div>

        <DocumentTable />
      </main>
    </div>
  )
}
