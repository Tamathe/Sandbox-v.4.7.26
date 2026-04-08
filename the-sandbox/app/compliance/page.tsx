'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '../lib/auth-context'
import PageHeader from '../components/PageHeader'
import {
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  BookOpen,
  Bell,
  Download,
  Trash2,
  Loader2,
  FileText,
  ToggleLeft,
  ToggleRight,
  MessageSquare,
  Settings,
} from 'lucide-react'
import { format } from 'date-fns'

type ConsentStatus = {
  tosAcceptedAt: string | null
  dataConsentAt: string | null
  ferpaAckAt: string | null
  acceptedTosVersion: string | null
  acceptedConsentVersion: string | null
  acceptedFerpaVersion: string | null
}

type ComplianceScore = {
  overall: number
  breakdown: { category: string; score: number; maxScore: number }[]
}

type ConsentCategory = {
  id: string
  category: string
  granted: boolean
  grantedAt: string | null
  description: string | null
}

type TrainingModule = {
  id: string
  title: string
  description: string
  type: string
  requiredForRoles: string[]
  passingScore: number
  completed: boolean
  completion: { score: number; passed: boolean; completedAt: string } | null
}

type CompNotification = {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  createdAt: string
}

type CompCommunication = {
  id: string
  type: string
  subject: string
  body: string
  priority: string
  sentAt: string
}

export default function CompliancePage() {
  const { currentUser } = useAuth()

  const [consentStatus, setConsentStatus] = useState<ConsentStatus | null>(null)
  const [complianceScore, setComplianceScore] = useState<ComplianceScore | null>(null)
  const [consentCategories, setConsentCategories] = useState<ConsentCategory[]>([])
  const [trainingModules, setTrainingModules] = useState<TrainingModule[]>([])
  const [notifications, setNotifications] = useState<CompNotification[]>([])
  const [communications, setCommunications] = useState<CompCommunication[]>([])
  const [loading, setLoading] = useState(true)

  // Notification preferences
  type NotifPrefs = {
    channel: string
    consentReminders: boolean
    ferpaAlerts: boolean
    policyUpdates: boolean
    incidentNotifications: boolean
    trainingReminders: boolean
    digestFrequency: string
  }
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs | null>(null)
  const [notifPrefsSaving, setNotifPrefsSaving] = useState(false)

  useEffect(() => {
    if (!currentUser) return
    const headers = { 'x-demo-user-email': currentUser.email }
    setLoading(true)

    Promise.allSettled([
      fetch('/api/users/compliance', { headers }).then(async (r) => {
        if (r.ok) {
          const data = await r.json()
          setConsentStatus(data)
        }
      }),
      fetch('/api/users/compliance-score', { headers }).then(async (r) => {
        if (r.ok) setComplianceScore(await r.json())
      }),
      fetch('/api/users/consent-categories', { headers }).then(async (r) => {
        if (r.ok) {
          const data = await r.json()
          setConsentCategories(data.categories || [])
        }
      }),
      fetch('/api/compliance-training', { headers }).then(async (r) => {
        if (r.ok) {
          const data = await r.json()
          setTrainingModules(data.modules || [])
        }
      }),
      fetch('/api/users/compliance-notifications', { headers }).then(async (r) => {
        if (r.ok) {
          const data = await r.json()
          setNotifications(data.notifications || [])
        }
      }),
      fetch('/api/users/compliance-communications', { headers }).then(async (r) => {
        if (r.ok) {
          const data = await r.json()
          setCommunications(data.communications || [])
        }
      }),
      fetch('/api/users/compliance-notification-preferences', { headers }).then(async (r) => {
        if (r.ok) setNotifPrefs(await r.json())
      }),
    ]).finally(() => setLoading(false))
  }, [currentUser])

  if (!currentUser) return null

  const updateNotifPref = async (updates: Partial<NotifPrefs>) => {
    if (!currentUser || !notifPrefs) return
    setNotifPrefsSaving(true)
    const optimistic = { ...notifPrefs, ...updates }
    setNotifPrefs(optimistic)
    try {
      const res = await fetch('/api/users/compliance-notification-preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser.email },
        body: JSON.stringify(updates),
      })
      if (res.ok) setNotifPrefs(await res.json())
    } finally { setNotifPrefsSaving(false) }
  }

  const scoreColor = (score: number) =>
    score >= 80 ? 'text-emerald-600' : score >= 50 ? 'text-amber-600' : 'text-red-600'
  const scoreBorder = (score: number) =>
    score >= 80 ? 'border-emerald-400' : score >= 50 ? 'border-amber-400' : 'border-red-400'

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <PageHeader title="My Compliance Status" subtitle="View your personal compliance standing, consents, and training progress." />

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="space-y-6 mt-6">
          {/* Compliance Score */}
          {complianceScore && (
            <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
              <h2 className="text-base font-extrabold text-gray-900 mb-4">Personal Compliance Score</h2>
              <div className="flex flex-col sm:flex-row items-start gap-6">
                <div className="flex flex-col items-center shrink-0">
                  <div className={`relative flex items-center justify-center rounded-full border-4 ${scoreBorder(complianceScore.overall)}`} style={{ width: 96, height: 96 }}>
                    <span className={`text-3xl font-extrabold ${scoreColor(complianceScore.overall)}`}>{complianceScore.overall}</span>
                  </div>
                  <span className="mt-2 text-xs text-gray-500">out of 100</span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 flex-1">
                  {complianceScore.breakdown.map((b) => (
                    <div key={b.category} className="rounded-xl border border-gray-100 p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-gray-500">{b.category}</span>
                        <span className={`text-sm font-bold ${scoreColor(Math.round((b.score / b.maxScore) * 100))}`}>{b.score}/{b.maxScore}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-100">
                        <div
                          className={`h-1.5 rounded-full transition-all ${b.score / b.maxScore >= 0.8 ? 'bg-emerald-400' : b.score / b.maxScore >= 0.5 ? 'bg-amber-400' : 'bg-red-400'}`}
                          style={{ width: `${Math.round((b.score / b.maxScore) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Consent Status Cards */}
          {consentStatus && (
            <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
              <h2 className="text-base font-extrabold text-gray-900 mb-4">Consent Status</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: 'Terms of Service', date: consentStatus.tosAcceptedAt, version: consentStatus.acceptedTosVersion },
                  { label: 'Data Consent', date: consentStatus.dataConsentAt, version: consentStatus.acceptedConsentVersion },
                  { label: 'FERPA Acknowledgement', date: consentStatus.ferpaAckAt, version: consentStatus.acceptedFerpaVersion },
                ].map((card) => (
                  <div key={card.label} className="rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      {card.date ? (
                        <CheckCircle2 className="size-5 text-emerald-500" />
                      ) : (
                        <XCircle className="size-5 text-red-400" />
                      )}
                      <span className="text-sm font-semibold text-gray-900">{card.label}</span>
                    </div>
                    {card.date ? (
                      <div className="text-xs text-gray-500">
                        <p>Accepted {format(new Date(card.date), 'MMM d, yyyy')}</p>
                        {card.version && <p className="mt-0.5">Version: {card.version}</p>}
                      </div>
                    ) : (
                      <p className="text-xs text-red-500">Not yet accepted</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Consent Categories */}
          {consentCategories.length > 0 && (
            <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
              <h2 className="text-base font-extrabold text-gray-900 mb-4">Consent Categories</h2>
              <div className="space-y-2">
                {consentCategories.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{cat.category}</p>
                      {cat.description && <p className="text-xs text-gray-500 mt-0.5">{cat.description}</p>}
                      {cat.grantedAt && <p className="text-[10px] text-gray-400 mt-0.5">Granted {format(new Date(cat.grantedAt), 'MMM d, yyyy')}</p>}
                    </div>
                    <div>
                      {cat.granted ? (
                        <ToggleRight className="size-6 text-emerald-500" />
                      ) : (
                        <ToggleLeft className="size-6 text-gray-300" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Training Modules */}
          <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
            <h2 className="text-base font-extrabold text-gray-900 mb-4">Training Modules</h2>
            {trainingModules.length === 0 ? (
              <p className="text-sm text-gray-500">No training modules available at this time.</p>
            ) : (
              <div className="space-y-2">
                {trainingModules.map((mod) => (
                  <div key={mod.id} className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <BookOpen className="size-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{mod.title}</p>
                        <p className="text-xs text-gray-500">{mod.type} &middot; Passing: {mod.passingScore}%</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {mod.completed ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                          <CheckCircle2 className="size-3.5" /> Completed
                          {mod.completion && <span className="ml-1">({mod.completion.score}%)</span>}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                          <Clock className="size-3.5" /> Pending
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Notifications */}
          <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="size-5 text-gray-500" />
              <h2 className="text-base font-extrabold text-gray-900">Compliance Notifications</h2>
            </div>
            {notifications.length === 0 ? (
              <p className="text-sm text-gray-500">No compliance notifications.</p>
            ) : (
              <div className="space-y-2">
                {notifications.slice(0, 10).map((n) => (
                  <div key={n.id} className={`flex items-start justify-between rounded-xl border px-4 py-3 ${n.read ? 'border-gray-200 bg-white' : 'border-blue-200 bg-blue-50'}`}>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{n.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{format(new Date(n.createdAt), 'MMM d, yyyy h:mm a')}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      n.type === 'consent-expiring' ? 'bg-amber-100 text-amber-700' :
                      n.type === 'ferpa-overdue' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>{n.type.replace(/-/g, ' ')}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Data Rights */}
          <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="size-5 text-gray-500" />
              <h2 className="text-base font-extrabold text-gray-900">Data Rights</h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Under applicable regulations (FERPA, GDPR, KY Privacy Act), you have the right to access, export, and request erasure of your personal data.
            </p>
            <div className="flex gap-3">
              <a
                href="/settings/privacy"
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                <Download className="size-4" /> Export My Data
              </a>
              <a
                href="/settings/privacy"
                className="inline-flex items-center gap-1.5 rounded-xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                <Trash2 className="size-4" /> Request Erasure
              </a>
            </div>
          </section>

          {/* Notification Preferences */}
          {notifPrefs && (
            <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="size-5 text-gray-500" />
                <h2 className="text-base font-extrabold text-gray-900">Notification Preferences</h2>
                {notifPrefsSaving && <Loader2 className="size-4 animate-spin text-gray-400" />}
              </div>

              {/* Channel + Digest */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Delivery Channel</label>
                  <select value={notifPrefs.channel} onChange={(e) => void updateNotifPref({ channel: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm w-full">
                    <option value="in-app">In-App Only</option>
                    <option value="email">Email Only</option>
                    <option value="both">Both</option>
                    <option value="none">None</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Digest Frequency</label>
                  <select value={notifPrefs.digestFrequency} onChange={(e) => void updateNotifPref({ digestFrequency: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm w-full">
                    <option value="immediate">Immediate</option>
                    <option value="daily">Daily Digest</option>
                    <option value="weekly">Weekly Digest</option>
                    <option value="none">None</option>
                  </select>
                </div>
              </div>

              {/* Toggle switches */}
              <div className="space-y-2">
                {([
                  { key: 'consentReminders' as const, label: 'Consent Expiry Reminders', desc: 'Get notified before your data consent expires' },
                  { key: 'ferpaAlerts' as const, label: 'FERPA Alerts', desc: 'Receive alerts about FERPA compliance issues' },
                  { key: 'policyUpdates' as const, label: 'Policy Updates', desc: 'Notifications when compliance policies change' },
                  { key: 'incidentNotifications' as const, label: 'Incident Notifications', desc: 'Alerts for compliance incidents' },
                  { key: 'trainingReminders' as const, label: 'Training Reminders', desc: 'Reminders for upcoming or overdue training' },
                ]).map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{label}</p>
                      <p className="text-xs text-gray-500">{desc}</p>
                    </div>
                    <button onClick={() => void updateNotifPref({ [key]: !notifPrefs[key] })} className="shrink-0">
                      {notifPrefs[key] ? (
                        <ToggleRight className="size-6 text-emerald-500" />
                      ) : (
                        <ToggleLeft className="size-6 text-gray-300" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Communications */}
          <section className="rounded-2xl border-2 border-gray-200 bg-white p-6">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="size-5 text-gray-500" />
              <h2 className="text-base font-extrabold text-gray-900">Compliance Communications</h2>
            </div>
            {communications.length === 0 ? (
              <p className="text-sm text-gray-500">No compliance communications received.</p>
            ) : (
              <div className="space-y-2">
                {communications.slice(0, 10).map((c) => (
                  <div key={c.id} className="rounded-xl border border-gray-200 px-4 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        c.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                        c.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>{c.priority}</span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">{c.type}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{c.subject}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{c.body}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{format(new Date(c.sentAt), 'MMM d, yyyy h:mm a')}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
