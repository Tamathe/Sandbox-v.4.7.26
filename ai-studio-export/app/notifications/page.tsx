'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Bell, CheckCheck, ChevronRight, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useAuth } from '../lib/auth-context'
import type { InAppNotification } from '../lib/types'

export default function NotificationsPage() {
  const { currentUser } = useAuth()
  const [notifications, setNotifications] = useState<InAppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const loadNotifications = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications?limit=50', {
        headers: {
          'x-demo-user-email': currentUser.email,
        },
      })
      if (!response.ok) return
      const data = await response.json()
      setNotifications(data.notifications ?? [])
      setUnreadCount(data.unreadCount ?? 0)
    } finally {
      setLoading(false)
    }
  }, [currentUser.email])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  useEffect(() => {
    fetch('/api/notifications', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-demo-user-email': currentUser.email,
      },
      body: JSON.stringify({ markAll: true }),
    }).catch(() => {})
  }, [currentUser.email])

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[#0033A0]">
              <Bell className="h-3.5 w-3.5" />
              Notifications
            </div>
            <h1 className="mt-4 text-3xl font-black text-slate-900">Activity</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Follow comment replies and tool discussion without relying on email.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
            {unreadCount === 0 ? 'All caught up' : `${unreadCount} unread when loaded`}
          </div>
        </div>

        <div className="mt-8">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-16 text-center">
              <Bell className="mx-auto h-10 w-10 text-slate-300" />
              <h2 className="mt-4 text-lg font-bold text-slate-900">No notifications yet</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                When someone comments on your tool or replies to your discussion, it will show up here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <Link
                  key={notification.id}
                  href={notification.href || '/tools'}
                  className={`group flex items-start justify-between gap-4 rounded-3xl border px-5 py-4 transition ${
                    notification.readAt
                      ? 'border-slate-200 bg-white hover:bg-slate-50'
                      : 'border-blue-200 bg-blue-50/70 hover:bg-blue-50'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {!notification.readAt ? (
                        <span className="h-2.5 w-2.5 rounded-full bg-[#0033A0]" />
                      ) : null}
                      <h2 className="truncate text-sm font-bold text-slate-900">{notification.title}</h2>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{notification.body}</p>
                    <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#0033A0]">
                    {!notification.readAt ? <CheckCheck className="h-4 w-4" /> : null}
                    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
