'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import Header from '@/components/layout/header'
import { Upload, FileText, BarChart3 } from 'lucide-react'
import Link from 'next/link'

export default function AdminPage() {
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
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold text-kch-gray-900 mb-6">Admin Dashboard</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/admin/upload"
            className="card p-6 hover:border-kch-blue hover:shadow-md transition-all group"
          >
            <Upload size={24} className="text-kch-blue mb-3" />
            <h3 className="font-semibold text-kch-gray-900 group-hover:text-kch-blue">Upload Documents</h3>
            <p className="text-sm text-kch-gray-500 mt-1">Add new documents to the knowledge base</p>
          </Link>

          <Link
            href="/admin/documents"
            className="card p-6 hover:border-kch-blue hover:shadow-md transition-all group"
          >
            <FileText size={24} className="text-kch-blue mb-3" />
            <h3 className="font-semibold text-kch-gray-900 group-hover:text-kch-blue">Manage Documents</h3>
            <p className="text-sm text-kch-gray-500 mt-1">View, edit, and remove indexed documents</p>
          </Link>

          <Link
            href="/analytics"
            className="card p-6 hover:border-kch-blue hover:shadow-md transition-all group"
          >
            <BarChart3 size={24} className="text-kch-blue mb-3" />
            <h3 className="font-semibold text-kch-gray-900 group-hover:text-kch-blue">Analytics</h3>
            <p className="text-sm text-kch-gray-500 mt-1">View usage statistics and insights</p>
          </Link>
        </div>
      </main>
    </div>
  )
}
