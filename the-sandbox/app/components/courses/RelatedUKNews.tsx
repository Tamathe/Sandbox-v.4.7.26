'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Newspaper,
} from 'lucide-react'

type UKNewsArticle = { id: string; slug: string; title: string; sectionLabel: string; publishedAt: string | null; excerpt: string }

export default function RelatedUKNews({ courseId, userEmail }: { courseId: string; userEmail: string }) {
  const [articles, setArticles] = useState<UKNewsArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    setLoading(true)
    setArticles([])
    fetch(`/api/uknow/course-articles?courseId=${courseId}`, {
      headers: { 'x-demo-user-email': userEmail },
    })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.articles) setArticles(data.articles) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [courseId, userEmail])

  if (loading) return null
  if (articles.length === 0) return null

  return (
    <div className="mt-4 border-t border-gray-100 pt-4 px-6 pb-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left group"
      >
        <Newspaper className="size-4 text-[#0033A0]" />
        <span className="text-sm font-bold text-gray-900">Related UK News</span>
        <span className="text-xs text-gray-400 ml-1">({articles.length})</span>
        <span className="ml-auto">
          {expanded ? <ChevronUp className="size-4 text-gray-400" /> : <ChevronDown className="size-4 text-gray-400" />}
        </span>
      </button>
      {expanded && (
        <div className="mt-3 space-y-2">
          {articles.map((a) => (
            <Link
              key={a.id}
              href={`/uknow/${a.slug}`}
              className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 group-hover:text-[#0033A0] leading-snug line-clamp-2">{a.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {a.sectionLabel}
                  {a.publishedAt && ` · ${new Date(a.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                </p>
                <p className="text-xs text-gray-400 mt-1 line-clamp-1">{a.excerpt}</p>
              </div>
              <ExternalLink className="size-3.5 text-gray-300 shrink-0 mt-1" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
