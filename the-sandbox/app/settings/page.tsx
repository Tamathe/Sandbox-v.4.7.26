'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react'
import { useAuth } from '../lib/auth-context'
import PageHeader from '../components/PageHeader'
import NotificationPreferences from '../components/settings/NotificationPreferences'
import SandyPreferences from '../components/settings/SandyPreferences'

export default function SettingsPage() {
  const { currentUser } = useAuth()
  const router = useRouter()
  const [deleteStep, setDeleteStep] = useState<'idle' | 'confirm1' | 'confirm2'>('idle')
  const [deleting, setDeleting] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  const handleDeleteAccount = async () => {
    setDeleting(true)
    try {
      const res = await fetch('/api/users/data-erasure', {
        method: 'DELETE',
        headers: { 'x-demo-user-email': currentUser.email },
      })
      if (res.ok) {
        router.push('/')
      }
    } catch {
      // silently fail
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader title="Settings" subtitle="Manage your account preferences and data" />

        <div className="mt-8 space-y-6">
          {/* Account Info */}
          <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
            <h2 className="text-base font-extrabold text-gray-900 mb-4">Account Information</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</div>
                <div className="mt-1 text-sm text-gray-900">{currentUser.name}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</div>
                <div className="mt-1 text-sm text-gray-900">{currentUser.email}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</div>
                <div className="mt-1 text-sm text-gray-900">{currentUser.role}</div>
              </div>
            </div>
          </section>

          {/* Sandy AI Preferences */}
          <SandyPreferences />

          {/* Notification Preferences */}
          <NotificationPreferences />

          {/* Delete Account */}
          <section className="rounded-2xl border-2 border-red-200 bg-white p-6">
            <h2 className="text-base font-extrabold text-red-900 mb-2">Delete My Account</h2>
            <p className="text-sm text-gray-600 mb-4">
              Permanently delete your account and erase your personal data. Your name and email will be anonymized.
              Tool sessions will be preserved in anonymized form for platform analytics. This action cannot be undone.
            </p>

            {deleteStep === 'idle' && (
              <button
                type="button"
                onClick={() => setDeleteStep('confirm1')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                <Trash2 className="size-4" />
                Delete My Account
              </button>
            )}

            {deleteStep === 'confirm1' && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="size-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-800">Are you sure?</p>
                    <p className="text-sm text-red-700 mt-1">
                      This will permanently delete your memories, notes, portfolio items, interests, and compliance records.
                      Your account will be anonymized and you will be logged out.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setDeleteStep('confirm2')}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                  >
                    Yes, I want to delete my account
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteStep('idle')}
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {deleteStep === 'confirm2' && (
              <div className="rounded-xl border border-red-300 bg-red-50 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="size-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-red-900">Final confirmation</p>
                    <p className="text-sm text-red-700 mt-1">
                      Type <span className="font-mono font-bold">DELETE</span> below to confirm permanent account deletion.
                    </p>
                  </div>
                </div>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Type DELETE to confirm"
                  className="w-full max-w-xs rounded-lg border border-red-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400"
                />
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void handleDeleteAccount()}
                    disabled={confirmText !== 'DELETE' || deleting}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                    Permanently Delete My Account
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDeleteStep('idle'); setConfirmText('') }}
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
