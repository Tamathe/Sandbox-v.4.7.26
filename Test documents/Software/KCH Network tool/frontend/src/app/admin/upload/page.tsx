'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import Header from '@/components/layout/header'
import UploadForm from '@/components/admin/upload-form'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default function UploadPage() {
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
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-sm text-kch-gray-500 hover:text-kch-gray-700 mb-4"
        >
          <ChevronLeft size={16} />
          Back to Admin
        </Link>

        <h2 className="text-2xl font-bold text-kch-gray-900 mb-2">Upload Document</h2>
        <p className="text-kch-gray-500 mb-6">
          Upload a document to be indexed and made searchable. Supported formats: PDF, DOCX, TXT, MD.
        </p>

        <div className="card p-6">
          <UploadForm />
        </div>
      </main>
    </div>
  )
}
