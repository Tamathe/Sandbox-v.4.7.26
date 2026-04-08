'use client'

// ── Advising Dashboard ──────────────────────────────────────────
// Dedicated page for faculty advisee management with roster,
// holds, degree audit needs, and persistent advising notes.

import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  Bot,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  GraduationCap,
  Search,
  Shield,
  Users,
} from 'lucide-react'
import { useAuth } from '../lib/auth-context'
import PageHeader from '../components/PageHeader'
import StudentBriefingCard from '../components/faculty-home/StudentBriefingCard'

interface Advisee {
  id: string
  name: string
  email: string
  classStanding: string | null
  hasRegistrationHold: boolean
  holdReason: string | null
  needsDegreeAuditReview: boolean
}

type SortKey = 'name' | 'classStanding' | 'holds' | 'audit'

const standingOrder: Record<string, number> = {
  'First-Year': 1,
  'Sophomore': 2,
  'Junior': 3,
  'Senior': 4,
}

function SortIcon({ col, sortKey, sortAsc }: { col: SortKey; sortKey: SortKey; sortAsc: boolean }) {
  if (sortKey !== col) return null
  return sortAsc ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />
}

export default function AdvisingPage() {
  const { currentUser } = useAuth()
  const [advisees, setAdvisees] = useState<Advisee[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortAsc, setSortAsc] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'holds' | 'audit'>('all')

  useEffect(() => {
    fetch('/api/faculty/advisees', {
      headers: { 'x-demo-user-email': currentUser.email },
    })
      .then(r => r.ok ? r.json() : { advisees: [] })
      .then(data => setAdvisees(data.advisees ?? []))
      .catch(() => setAdvisees([]))
      .finally(() => setLoading(false))
  }, [currentUser.email])

  const filtered = advisees
    .filter(a => {
      if (filter === 'holds') return a.hasRegistrationHold
      if (filter === 'audit') return a.needsDegreeAuditReview
      return true
    })
    .filter(a => {
      if (!search) return true
      const q = search.toLowerCase()
      return a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q) || (a.classStanding ?? '').toLowerCase().includes(q)
    })
    .sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'name': cmp = a.name.localeCompare(b.name); break
        case 'classStanding': cmp = (standingOrder[a.classStanding ?? ''] ?? 99) - (standingOrder[b.classStanding ?? ''] ?? 99); break
        case 'holds': cmp = (a.hasRegistrationHold ? 0 : 1) - (b.hasRegistrationHold ? 0 : 1); break
        case 'audit': cmp = (a.needsDegreeAuditReview ? 0 : 1) - (b.needsDegreeAuditReview ? 0 : 1); break
      }
      return sortAsc ? cmp : -cmp
    })

  const holdsCount = advisees.filter(a => a.hasRegistrationHold).length
  const auditCount = advisees.filter(a => a.needsDegreeAuditReview).length

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc)
    else { setSortKey(key); setSortAsc(true) }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <PageHeader
        title="Advising Dashboard"
        subtitle={`${advisees.length} advisees — registration, holds, degree audits, and notes in one place.`}
      />

      {/* KPI strip */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard icon={Users} label="Total Advisees" value={advisees.length} />
        <KpiCard icon={Shield} label="With Holds" value={holdsCount} accent={holdsCount > 0 ? 'red' : undefined} />
        <KpiCard icon={ClipboardList} label="Need Audit" value={auditCount} accent={auditCount > 0 ? 'amber' : undefined} />
        <KpiCard icon={GraduationCap} label="Seniors" value={advisees.filter(a => a.classStanding === 'Senior').length} />
      </div>

      {/* Filters + search */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg bg-gray-100 p-0.5">
          {(['all', 'holds', 'audit'] as const).map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {f === 'all' ? 'All' : f === 'holds' ? `Holds (${holdsCount})` : `Audit (${auditCount})`}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search advisees..."
            className="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-1.5 text-sm focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('sandy-prefill', {
              detail: { message: 'Show me my advisees, especially anyone with registration holds or a degree-audit review coming up.', autoSend: true },
            }))
          }}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-[#0033A0] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#002880] transition-colors"
        >
          <Bot className="size-3.5" /> Ask Sandy
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="mt-8 flex items-center justify-center py-12 text-sm text-gray-500">Loading advisees...</div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80 text-left text-xs font-bold uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3 cursor-pointer" onClick={() => handleSort('name')}>
                  <span className="flex items-center gap-1">Name <SortIcon col="name" sortKey={sortKey} sortAsc={sortAsc} /></span>
                </th>
                <th className="px-4 py-3 cursor-pointer" onClick={() => handleSort('classStanding')}>
                  <span className="flex items-center gap-1">Standing <SortIcon col="classStanding" sortKey={sortKey} sortAsc={sortAsc} /></span>
                </th>
                <th className="px-4 py-3 cursor-pointer" onClick={() => handleSort('holds')}>
                  <span className="flex items-center gap-1">Hold <SortIcon col="holds" sortKey={sortKey} sortAsc={sortAsc} /></span>
                </th>
                <th className="px-4 py-3 cursor-pointer" onClick={() => handleSort('audit')}>
                  <span className="flex items-center gap-1">Audit <SortIcon col="audit" sortKey={sortKey} sortAsc={sortAsc} /></span>
                </th>
                <th className="px-4 py-3">Email</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(advisee => (
                <>
                  <tr
                    key={advisee.id}
                    onClick={() => setExpandedId(expandedId === advisee.id ? null : advisee.id)}
                    className={`cursor-pointer transition-colors ${expandedId === advisee.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{advisee.name}</td>
                    <td className="px-4 py-3 text-gray-600">{advisee.classStanding ?? '—'}</td>
                    <td className="px-4 py-3">
                      {advisee.hasRegistrationHold ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                          <AlertTriangle className="size-3" /> {advisee.holdReason ?? 'Hold'}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">None</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {advisee.needsDegreeAuditReview ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">Needs review</span>
                      ) : (
                        <span className="text-xs text-gray-400">OK</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{advisee.email}</td>
                  </tr>
                  {expandedId === advisee.id && (
                    <tr key={`${advisee.id}-detail`}>
                      <td colSpan={5} className="px-4 py-4 bg-blue-50/50">
                        <StudentBriefingCard studentId={advisee.id} studentName={advisee.name} />
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    {search ? 'No advisees match your search.' : 'No advisees found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function KpiCard({ icon: Icon, label, value, accent }: {
  icon: typeof Users
  label: string
  value: number
  accent?: 'red' | 'amber'
}) {
  const bgClass = accent === 'red' ? 'bg-red-50 border-red-200' : accent === 'amber' ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'
  const textClass = accent === 'red' ? 'text-red-700' : accent === 'amber' ? 'text-amber-700' : 'text-gray-900'

  return (
    <div className={`rounded-2xl border p-4 ${bgClass}`}>
      <div className="flex items-center gap-2">
        <Icon className={`size-4 ${accent ? textClass : 'text-gray-400'}`} />
        <span className="text-xs font-medium text-gray-500">{label}</span>
      </div>
      <p className={`mt-1 text-2xl font-extrabold ${textClass}`}>{value}</p>
    </div>
  )
}
