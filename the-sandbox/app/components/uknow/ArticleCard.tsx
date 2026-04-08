'use client'

import Link from 'next/link'
import type { UknowArticleSummary } from '../../lib/uknow-service'
import { formatDate } from './uknow-helpers'
export { SkeletonCard } from '../ui/SkeletonCard'

export function ArticleCard({ article }: { article: UknowArticleSummary }) {
  return (
    <div className="border-2 border-gray-200 rounded-2xl p-5 flex flex-col gap-2 hover:border-gray-300 transition-colors">
      <span className="inline-flex self-start text-xs font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
        {article.sectionLabel}
      </span>
      <Link href={`/uknow/${article.slug}`} className="font-bold text-gray-900 hover:text-[#0033A0] leading-snug line-clamp-2">
        {article.title}
      </Link>
      <p className="text-sm text-gray-500">
        {article.author && <span>{article.author} · </span>}
        {formatDate(article.publishedAt)}
      </p>
      {article.excerpt && <p className="text-sm text-gray-600 line-clamp-2">{article.excerpt}</p>}
    </div>
  )
}

export function HeroArticleCard({ article }: { article: UknowArticleSummary }) {
  return (
    <Link
      href={`/uknow/${article.slug}`}
      className="border-2 border-gray-200 rounded-2xl p-6 flex flex-col gap-3 hover:border-[#0033A0] hover:shadow-lg transition-all bg-white group"
    >
      <span className="inline-flex self-start text-xs font-semibold bg-[#0033A0] text-white px-2.5 py-0.5 rounded-full">
        {article.sectionLabel}
      </span>
      <h3 className="font-extrabold text-gray-900 group-hover:text-[#0033A0] leading-snug line-clamp-2 text-lg">
        {article.title}
      </h3>
      {article.excerpt && <p className="text-sm text-gray-600 line-clamp-3">{article.excerpt}</p>}
      <p className="text-xs text-gray-500 mt-auto">
        {article.author && <span>{article.author} · </span>}
        {formatDate(article.publishedAt)}
      </p>
    </Link>
  )
}

export function HeroSkeletonCard() {
  return (
    <div className="border-2 border-gray-200 rounded-2xl p-6 flex flex-col gap-3 animate-pulse">
      <div className="h-5 bg-gray-200 rounded w-28" />
      <div className="h-7 bg-gray-200 rounded w-full" />
      <div className="h-7 bg-gray-200 rounded w-3/4" />
      <div className="h-4 bg-gray-200 rounded w-full" />
      <div className="h-4 bg-gray-200 rounded w-5/6" />
      <div className="h-4 bg-gray-200 rounded w-48" />
    </div>
  )
}
