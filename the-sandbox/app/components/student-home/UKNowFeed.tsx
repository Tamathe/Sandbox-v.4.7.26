'use client'

import { useState, useEffect } from 'react'
import { Newspaper, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface UKNowArticle {
  id: string
  slug: string
  section: string
  sectionLabel: string
  title: string
  publishedAt: string | null
}

interface UKNowFeedProps {
  userEmail: string
}

const SECTION_COLORS: Record<string, string> = {
  Research: 'bg-blue-50 text-blue-700',
  News: 'bg-gray-100 text-gray-600',
  HealthCare: 'bg-emerald-50 text-emerald-700',
  Athletics: 'bg-amber-50 text-amber-700',
  Arts: 'bg-purple-50 text-purple-700',
  Law: 'bg-indigo-50 text-indigo-700',
}

function relativeDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return '1d ago'
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  return weeks === 1 ? '1w ago' : `${weeks}w ago`
}

export default function UKNowFeed({ userEmail }: UKNowFeedProps) {
  const [articles, setArticles] = useState<UKNowArticle[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userEmail) return
    const headers = { 'x-demo-user-email': userEmail }

    fetch('/api/uknow/recommended', { headers })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.articles?.length) {
          setArticles(data.articles.slice(0, 4))
        } else {
          // Fallback to recent articles
          return fetch('/api/uknow/articles?q=university&pageSize=4', { headers })
            .then(r => r.ok ? r.json() : { articles: [] })
            .then(fallback => setArticles((fallback.articles || []).slice(0, 4)))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [userEmail])

  if (!loading && articles.length === 0) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Newspaper className="size-4 text-[#0033A0]" />
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">From Around Campus</h3>
        </div>
        <Link href="/uknow" className="text-xs font-semibold text-[#0033A0] hover:underline flex items-center gap-1">
          More <ArrowRight className="size-3" />
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-32 animate-pulse rounded-2xl border-2 border-gray-100 bg-gray-50" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {articles.slice(0, 3).map(article => {
            const colors = SECTION_COLORS[article.section] || 'bg-gray-50 text-gray-600'
            return (
              <Link
                key={article.id}
                href={`/uknow/${article.slug}`}
                className="bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-4 flex flex-col gap-2 hover:border-[#0033A0]/30 hover:shadow-md transition-all"
              >
                <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full w-fit ${colors}`}>
                  {article.sectionLabel || article.section}
                </span>
                <p className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug flex-1">
                  {article.title}
                </p>
                {article.publishedAt && (
                  <span className="text-xs text-gray-400">{relativeDate(article.publishedAt)}</span>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
