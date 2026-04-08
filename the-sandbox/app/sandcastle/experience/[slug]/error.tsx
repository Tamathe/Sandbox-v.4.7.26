'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function SandcastleError() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      <div className="text-5xl mb-4">🏰</div>
      <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Something went wrong</h1>
      <p className="text-gray-500 mb-6">This experience encountered an error. Please try again.</p>
      <Link
        href="/campus"
        className="inline-flex items-center gap-2 bg-[#0033A0] text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-[#002680] transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to Community
      </Link>
    </div>
  )
}
