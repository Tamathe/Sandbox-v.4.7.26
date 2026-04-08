'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { LogOut, FileText, BarChart3, Upload, Search } from 'lucide-react'

export default function Header() {
  const { user, logout, isAdmin } = useAuth()

  if (!user) return null

  return (
    <header className="bg-kch-blue text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Title */}
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <span className="text-kch-blue font-bold text-sm">KCH</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-tight">KCH Network</h1>
              <p className="text-xs text-blue-200 leading-tight">Document Search</p>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-1">
            <Link
              href="/"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-white/10 transition-colors"
            >
              <Search size={16} />
              <span className="hidden sm:inline">Search</span>
            </Link>

            {isAdmin && (
              <>
                <Link
                  href="/admin/upload"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-white/10 transition-colors"
                >
                  <Upload size={16} />
                  <span className="hidden sm:inline">Upload</span>
                </Link>
                <Link
                  href="/admin/documents"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-white/10 transition-colors"
                >
                  <FileText size={16} />
                  <span className="hidden sm:inline">Documents</span>
                </Link>
                <Link
                  href="/analytics"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-white/10 transition-colors"
                >
                  <BarChart3 size={16} />
                  <span className="hidden sm:inline">Analytics</span>
                </Link>
              </>
            )}

            {/* User info + logout */}
            <div className="ml-4 flex items-center gap-3 pl-4 border-l border-white/20">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium">{user.full_name}</p>
                <p className="text-xs text-blue-200">{user.role}</p>
              </div>
              <button
                onClick={logout}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                title="Sign out"
              >
                <LogOut size={18} />
              </button>
            </div>
          </nav>
        </div>
      </div>
    </header>
  )
}
