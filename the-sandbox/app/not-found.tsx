import Link from 'next/link'
import { Search, Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 text-center">
      <div className="w-full max-w-md rounded-2xl border-2 border-gray-200 bg-white p-8 shadow-sm">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-blue-50">
          <Search className="size-7 text-[#0033A0]" />
        </div>
        <h1 className="mb-2 text-xl font-extrabold text-gray-900">
          Page not found
        </h1>
        <p className="mb-6 text-sm text-gray-500">
          The page you are looking for does not exist or may have been moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl bg-[#0033A0] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#002580]"
        >
          <Home className="size-4" />
          Back to home
        </Link>
      </div>
    </div>
  )
}
