'use client'

import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, BookOpen, Users, GraduationCap, ChevronDown, ExternalLink, Plus } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '../../../lib/auth-context'
import PageHeader from '../../../components/PageHeader'
import { CASE_STUDIES, TRAINING_RESOURCES } from '../../../lib/pedagogy-hub-service'
import CaseStudySubmitForm from '../../../components/ai-literacy/CaseStudySubmitForm'
import Button from '../../../components/Button'
import PathwayNav from '../../../components/ai-literacy/PathwayNav'

type Tab = 'cases' | 'resources'

interface CommunityCase {
  id: string
  discipline: string
  stanceRange: string | null
  title: string
  challenge: string
  approach: string
  outcome: string
  lessonsLearned: string[]
  createdAt: string
}

export default function PedagogyHubPage() {
  const { currentUser } = useAuth()
  const [tab, setTab] = useState<Tab>('cases')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showSubmitForm, setShowSubmitForm] = useState(false)
  const [communityCases, setCommunityCases] = useState<CommunityCase[]>([])

  const loadCommunity = useCallback(async () => {
    const res = await fetch('/api/ai-literacy/case-studies', {
      headers: { 'x-demo-user-email': currentUser.email },
    }).catch(() => null)
    if (res?.ok) {
      const data = await res.json()
      setCommunityCases(data.approved ?? [])
    }
  }, [currentUser.email])

  useEffect(() => { void loadCommunity() }, [loadCommunity])

  return (
    <>
      <PageHeader
        title="Faculty AI Pedagogy Hub"
        subtitle="Case studies, peer examples, and training resources from faculty who are navigating AI"
        action={
          <Link href="/ai-literacy" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="size-4" />
            AI Literacy Hub
          </Link>
        }
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-1 border-b border-gray-200 mb-8">
          <button
            onClick={() => setTab('cases')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === 'cases' ? 'border-[#0033A0] text-[#0033A0]' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Users className="size-4" />
            Case Studies ({CASE_STUDIES.length + communityCases.length})
          </button>
          <button
            onClick={() => setTab('resources')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === 'resources' ? 'border-[#0033A0] text-[#0033A0]' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <GraduationCap className="size-4" />
            Training Resources ({TRAINING_RESOURCES.length})
          </button>
        </div>

        {tab === 'cases' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-600">
                Real examples from UK faculty who are doing innovative work with AI in their courses.
              </p>
              <Button onClick={() => setShowSubmitForm(!showSubmitForm)} icon={<Plus />}>
                Share Your Experience
              </Button>
            </div>

            {showSubmitForm && (
              <CaseStudySubmitForm
                onClose={() => setShowSubmitForm(false)}
                onSubmitted={() => { setShowSubmitForm(false); void loadCommunity() }}
              />
            )}

            {/* Community-submitted case studies */}
            {communityCases.map(cs => (
              <div key={cs.id} className="border rounded-2xl shadow-sm bg-white overflow-hidden">
                <button
                  onClick={() => setExpanded(expanded === cs.id ? null : cs.id)}
                  className="w-full text-left p-5 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{cs.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700">{cs.discipline}</span>
                        {cs.stanceRange && <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600">{cs.stanceRange}</span>}
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700">Community</span>
                      </div>
                    </div>
                    <ChevronDown className={`size-4 text-gray-400 transition-transform ${expanded === cs.id ? 'rotate-180' : ''}`} />
                  </div>
                </button>
                {expanded === cs.id && (
                  <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-4">
                    <div><h4 className="text-xs font-semibold uppercase text-gray-500 mb-1">The Challenge</h4><p className="text-sm text-gray-700">{cs.challenge}</p></div>
                    <div><h4 className="text-xs font-semibold uppercase text-gray-500 mb-1">The Approach</h4><p className="text-sm text-gray-700">{cs.approach}</p></div>
                    <div><h4 className="text-xs font-semibold uppercase text-gray-500 mb-1">The Outcome</h4><p className="text-sm text-gray-700">{cs.outcome}</p></div>
                    {cs.lessonsLearned.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold uppercase text-gray-500 mb-1">Lessons Learned</h4>
                        <ul className="space-y-1">
                          {cs.lessonsLearned.map((l, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                              <span className="mt-1.5 size-1.5 rounded-full bg-green-400 shrink-0" /> {l}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {CASE_STUDIES.map(cs => (
              <div key={cs.id} className="border rounded-2xl shadow-sm bg-white overflow-hidden">
                <button
                  onClick={() => setExpanded(expanded === cs.id ? null : cs.id)}
                  className="w-full text-left p-5 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{cs.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700">{cs.discipline}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600">{cs.stanceRange}</span>
                        <span className="text-[10px] text-gray-400">Source: {cs.source}</span>
                      </div>
                    </div>
                    <ChevronDown className={`size-4 text-gray-400 transition-transform ${expanded === cs.id ? 'rotate-180' : ''}`} />
                  </div>
                  <p className="text-sm text-gray-600 mt-2">{cs.summary}</p>
                </button>

                {expanded === cs.id && (
                  <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-4">
                    <div>
                      <h4 className="text-xs font-semibold uppercase text-gray-500 mb-1">The Challenge</h4>
                      <p className="text-sm text-gray-700">{cs.challenge}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold uppercase text-gray-500 mb-1">The Approach</h4>
                      <p className="text-sm text-gray-700">{cs.approach}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold uppercase text-gray-500 mb-1">The Outcome</h4>
                      <p className="text-sm text-gray-700">{cs.outcome}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold uppercase text-gray-500 mb-1">Lessons Learned</h4>
                      <ul className="space-y-1">
                        {cs.lessonsLearned.map((l, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                            <span className="mt-1.5 size-1.5 rounded-full bg-green-400 shrink-0" /> {l}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'resources' && (
          <div className="space-y-4">
            {TRAINING_RESOURCES.map(r => {
              const typeColors: Record<string, string> = {
                workshop: 'bg-purple-100 text-purple-700',
                guide: 'bg-blue-100 text-blue-700',
                template: 'bg-green-100 text-green-700',
                video: 'bg-amber-100 text-amber-700',
              }
              return (
                <div key={r.id} className="flex items-start gap-4 p-4 bg-white border rounded-2xl shadow-sm">
                  <div className="size-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                    <BookOpen className="size-5 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-900">{r.title}</h3>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${typeColors[r.type] ?? 'bg-gray-100 text-gray-600'}`}>
                        {r.type}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">Source: {r.source}</p>
                    <p className="text-sm text-gray-600 mt-1">{r.description}</p>
                  </div>
                  {r.url && (
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-gray-400 hover:text-gray-600">
                      <ExternalLink className="size-4" />
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <PathwayNav />
      </div>
    </>
  )
}
