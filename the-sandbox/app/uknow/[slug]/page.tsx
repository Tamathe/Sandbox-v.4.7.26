'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, ExternalLink, Sparkles, MessageSquare, Newspaper } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useAuth } from '../../lib/auth-context'
import type { UknowArticleFull, UknowArticleSummary } from '../../lib/uknow-service'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(date: Date | string | null) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ArticleSkeleton() {
  return (
    <div className="animate-pulse flex flex-col gap-4">
      <div className="h-4 bg-gray-200 rounded w-24" />
      <div className="h-8 bg-gray-200 rounded w-full" />
      <div className="h-8 bg-gray-200 rounded w-3/4" />
      <div className="h-4 bg-gray-200 rounded w-48" />
      <div className="mt-4 flex flex-col gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-4 bg-gray-200 rounded w-full" />
        ))}
        <div className="h-4 bg-gray-200 rounded w-2/3" />
      </div>
    </div>
  )
}

// ─── Related card ─────────────────────────────────────────────────────────────

function RelatedCard({ article }: { article: UknowArticleSummary }) {
  return (
    <Link href={`/uknow/${article.slug}`} className="block border-2 border-gray-200 rounded-2xl p-4 hover:border-gray-300 transition-colors">
      <span className="inline-flex text-xs font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full mb-2">
        {article.sectionLabel}
      </span>
      <p className="font-semibold text-gray-900 text-sm line-clamp-2 leading-snug mb-1">{article.title}</p>
      {article.publishedAt && (
        <p className="text-xs text-gray-500">{formatDate(article.publishedAt)}</p>
      )}
    </Link>
  )
}

// ─── Related Questions ─────────────────────────────────────────────────────────

function RelatedQuestions({ title }: { title: string }) {
  const [questions, setQuestions] = useState<string[]>([])

  useEffect(() => {
    // Generate 3 Ask AI prompts based on article title
    const prompts = [
      `What else has UK announced about ${title.split(' ').slice(0, 5).join(' ')}?`,
      `How does this relate to other recent campus developments?`,
      `What impact might this have on students and faculty?`,
    ]
    setQuestions(prompts)
  }, [title])

  if (questions.length === 0) return null

  return (
    <div className="border-2 border-gray-200 rounded-2xl p-5 bg-white">
      <h3 className="text-sm font-extrabold text-gray-900 mb-3 flex items-center gap-2">
        <MessageSquare className="size-4 text-[#0033A0]" />
        Ask AI about this
      </h3>
      <div className="flex flex-col gap-2">
        {questions.map((q) => (
          <Link
            key={q}
            href={`/uknow?tab=ask&q=${encodeURIComponent(q)}`}
            className="text-sm text-[#0033A0] hover:underline flex items-center gap-1.5 py-1"
          >
            <span className="text-gray-400">&rarr;</span> {q}
          </Link>
        ))}
      </div>
    </div>
  )
}

// ─── Sandy Callout ────────────────────────────────────────────────────────────

function SandyCallout({ articleId, userEmail }: { articleId: string; userEmail: string }) {
  const [citation, setCitation] = useState<{ snippet: string; citedAt: string } | null>(null)

  useEffect(() => {
    fetch(`/api/uknow/sandy-citation?articleId=${articleId}`, {
      headers: { 'x-demo-user-email': userEmail },
    })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.citation) setCitation(data.citation) })
      .catch(() => {})
  }, [articleId, userEmail])

  if (!citation) return null

  return (
    <div className="border-2 border-blue-200 rounded-2xl bg-blue-50/50 p-4 flex gap-3">
      <Newspaper className="size-4 text-[#0033A0] shrink-0 mt-0.5" />
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[#0033A0] mb-1">Sandy cited this article</p>
        <p className="text-sm text-gray-700 leading-relaxed line-clamp-3">{citation.snippet}</p>
        <p className="text-xs text-gray-400 mt-1">Cited {formatDate(citation.citedAt)}</p>
      </div>
    </div>
  )
}

// ─── Share to Sandy button ──────────────────────────────────────────────────

function ShareToSandy({ title }: { title: string }) {
  const handleClick = () => {
    // Open concierge panel with pre-filled query
    const event = new CustomEvent('open-concierge', {
      detail: { message: `Tell me more about "${title}"` },
    })
    window.dispatchEvent(event)
  }

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0033A0] hover:underline transition-colors"
    >
      <Sparkles className="size-3.5" />
      Ask Sandy about this
    </button>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UKNowArticlePage() {
  const { slug } = useParams<{ slug: string }>()
  const { currentUser } = useAuth()
  const [article, setArticle] = useState<UknowArticleFull | null>(null)
  const [related, setRelated] = useState<UknowArticleSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!slug) return
    const load = async () => {
      setLoading(true)
      setNotFound(false)
      try {
        const res = await fetch(`/api/uknow/articles/${slug}`, {
          headers: { 'x-demo-user-email': currentUser.email },
        })
        if (res.status === 404) { setNotFound(true); return }
        if (!res.ok) return
        const data = await res.json()
        setArticle(data.article)
        setRelated(data.related ?? [])
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [slug, currentUser.email])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Back nav */}
        <Link
          href="/uknow"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#0033A0] mb-8 transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to UKNow
        </Link>

        {/* Not found */}
        {notFound && (
          <div className="flex flex-col items-center gap-3 py-20 text-gray-400">
            <p className="text-lg font-medium text-gray-600">Article not found</p>
            <Link href="/uknow" className="text-[#0033A0] text-sm hover:underline">
              &larr; Back to UKNow
            </Link>
          </div>
        )}

        {/* Main layout */}
        {!notFound && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Main column */}
            <div className="md:col-span-2">
              {loading ? (
                <ArticleSkeleton />
              ) : article ? (
                <article className="flex flex-col gap-4">
                  {/* Section pill */}
                  <span className="inline-flex self-start text-xs font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                    {article.sectionLabel}
                  </span>

                  {/* Title */}
                  <h1 className="text-2xl font-extrabold text-gray-900 leading-tight">{article.title}</h1>

                  {/* Meta row */}
                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                    {article.author && <span>{article.author}</span>}
                    {article.publishedAt && (
                      <>
                        {article.author && <span>&middot;</span>}
                        <span>{formatDate(article.publishedAt)}</span>
                      </>
                    )}
                    {article.embeddedAt && (
                      <>
                        <span>&middot;</span>
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[#0033A0] hover:underline"
                        >
                          Read on UKNow <ExternalLink className="size-3" />
                        </a>
                      </>
                    )}
                    <ShareToSandy title={article.title} />
                  </div>

                  {/* Sandy Callout — if recently cited by Sandy */}
                  <SandyCallout articleId={article.id} userEmail={currentUser.email} />

                  {/* AI Summary */}
                  {article.summary && (
                    <div className="border-2 border-blue-200 rounded-2xl bg-blue-50 p-5 flex gap-3">
                      <Sparkles className="size-4 text-[#0033A0] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#0033A0] mb-1">AI Summary</p>
                        <p className="text-sm text-gray-800 leading-relaxed">{article.summary}</p>
                      </div>
                    </div>
                  )}

                  {/* Entity Tags */}
                  {article.entities && (() => {
                    const ent = article.entities as { people?: string[]; departments?: string[]; programs?: string[]; topics?: string[] }
                    const hasAny = (ent.people?.length ?? 0) + (ent.departments?.length ?? 0) + (ent.programs?.length ?? 0) + (ent.topics?.length ?? 0) > 0
                    if (!hasAny) return null
                    const tagColors: Record<string, string> = {
                      people: 'bg-blue-50 text-blue-700 border-blue-200',
                      departments: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                      programs: 'bg-amber-50 text-amber-700 border-amber-200',
                      topics: 'bg-blue-50 text-blue-700 border-blue-200',
                    }
                    return (
                      <div className="flex flex-wrap gap-1.5">
                        {(Object.entries(ent) as [string, string[]][]).map(([category, items]) =>
                          items?.map((item) => (
                            <span
                              key={`${category}-${item}`}
                              className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${tagColors[category] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}
                            >
                              {item}
                            </span>
                          ))
                        )}
                      </div>
                    )
                  })()}

                  {/* Body */}
                  <div className="mt-2 border-t border-gray-100 pt-6">
                    {article.bodyText ? (
                      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-[15px]">
                        {article.bodyText}
                      </p>
                    ) : article.embeddedAt ? (
                      <p className="text-gray-400 italic">
                        Full article available at{' '}
                        <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-[#0033A0] hover:underline">
                          UKNow &nearr;
                        </a>
                      </p>
                    ) : (
                      <p className="text-gray-400 italic">
                        Article content not yet available.
                      </p>
                    )}
                  </div>

                  {/* Related Questions — loops user back to Ask AI tab */}
                  <RelatedQuestions title={article.title} />
                </article>
              ) : null}
            </div>

            {/* Sidebar */}
            <aside className="md:col-span-1">
              <h2 className="font-bold text-gray-900 mb-4">Related Stories</h2>
              {loading ? (
                <div className="flex flex-col gap-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="border-2 border-gray-200 rounded-2xl p-4 animate-pulse flex flex-col gap-2">
                      <div className="h-3 bg-gray-200 rounded w-20" />
                      <div className="h-4 bg-gray-200 rounded w-full" />
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                    </div>
                  ))}
                </div>
              ) : related.length === 0 ? (
                <p className="text-gray-400 italic text-sm">No related articles found.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {related.slice(0, 4).map((a) => <RelatedCard key={a.id} article={a} />)}
                </div>
              )}
            </aside>
          </div>
        )}
      </div>
    </div>
  )
}
