'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Code2, ExternalLink, Loader2, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '../lib/auth-context'

type SavedApp = {
  id: string
  title: string
  description: string | null
  createdAt: string
  updatedAt: string
}

export default function MyAppsPage() {
  const { currentUser } = useAuth()
  const [apps, setApps] = useState<SavedApp[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchApps = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/playground/apps', {
        headers: { 'x-demo-user-email': currentUser.email },
      })
      const data = (await res.json()) as { apps?: SavedApp[] }
      setApps(data.apps ?? [])
    } catch {
      setApps([])
    } finally {
      setLoading(false)
    }
  }, [currentUser.email])

  useEffect(() => {
    void fetchApps()
  }, [fetchApps])

  const handleDelete = useCallback(
    async (appId: string) => {
      if (!confirm('Delete this app? This cannot be undone.')) return
      setDeletingId(appId)
      try {
        await fetch(`/api/playground/apps/${appId}`, {
          method: 'DELETE',
          headers: { 'x-demo-user-email': currentUser.email },
        })
        setApps((prev) => prev.filter((a) => a.id !== appId))
      } finally {
        setDeletingId(null)
      }
    },
    [currentUser.email]
  )

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Apps</h1>
          <p className="mt-1 text-sm text-gray-500">
            Apps you&apos;ve built in the Playground. Open any to keep iterating.
          </p>
        </div>
        <Link
          href="/playground"
          className="inline-flex items-center gap-2 rounded-2xl bg-[#0033A0] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#002580]"
        >
          <Plus className="h-4 w-4" />
          New App
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : apps.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl border-2 border-dashed border-gray-200 py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-[#0033A0]">
            <Code2 className="h-7 w-7" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">No saved apps yet</p>
            <p className="mt-1 text-sm text-gray-500">
              Build something in the Playground and hit Save — it will appear here.
            </p>
          </div>
          <Link
            href="/playground"
            className="inline-flex items-center gap-2 rounded-2xl bg-[#0033A0] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#002580]"
          >
            <Plus className="h-4 w-4" />
            Open Playground
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {apps.map((app) => (
            <div
              key={app.id}
              className="flex flex-col rounded-3xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-[#0033A0]">
                <Code2 className="h-5 w-5" />
              </div>

              <h2 className="text-sm font-semibold text-gray-900 leading-snug">{app.title}</h2>

              {app.description ? (
                <p className="mt-1 text-xs text-gray-500 leading-relaxed line-clamp-2">
                  {app.description}
                </p>
              ) : null}

              <p className="mt-2 text-xs text-gray-400">
                Updated {formatDistanceToNow(new Date(app.updatedAt), { addSuffix: true })}
              </p>

              <div className="mt-auto flex items-center gap-2 pt-4">
                <Link
                  href={`/playground?app=${app.id}`}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-[#0033A0] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#002580]"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open
                </Link>
                <button
                  type="button"
                  onClick={() => void handleDelete(app.id)}
                  disabled={deletingId === app.id}
                  className="flex h-8 w-8 items-center justify-center rounded-2xl border border-gray-200 text-gray-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
                  aria-label="Delete app"
                >
                  {deletingId === app.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
