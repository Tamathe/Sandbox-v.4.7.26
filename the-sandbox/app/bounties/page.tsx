'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Plus, Trophy, Clock, CheckCircle, XCircle, User } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useAuth } from '../lib/auth-context'

type Bounty = {
  id: string
  title: string
  description: string
  category: string
  difficulty: string | null
  estimatedHours: number | null
  rewardSand: number
  status: 'OPEN' | 'CLAIMED' | 'FULFILLED' | 'CLOSED'
  createdAt: string
  postedBy: { id: string; name: string; department: string | null; role: string }
  claimedBy: { id: string; name: string; department: string | null } | null
  _count?: { reviews: number }
}

const STATUS_STYLES = {
  OPEN: 'bg-green-100 text-green-700',
  CLAIMED: 'bg-yellow-100 text-yellow-700',
  FULFILLED: 'bg-blue-100 text-blue-700',
  CLOSED: 'bg-gray-100 text-gray-500',
}

const STATUS_ICONS = {
  OPEN: Trophy,
  CLAIMED: Clock,
  FULFILLED: CheckCircle,
  CLOSED: XCircle,
}

const CATEGORIES = ['All', 'Law', 'History', 'STEM', 'Medicine', 'Business', 'Arts', 'University', 'General']
const STATUSES = ['All', 'OPEN', 'CLAIMED', 'FULFILLED']

export default function BountiesPage() {
  const { currentUser } = useAuth()
  const [bounties, setBounties] = useState<Bounty[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('All')
  const [status, setStatus] = useState('All')

  const fetchBounties = useCallback(async () => {
    setLoading(true)

    try {
      const params = new URLSearchParams()
      if (category !== 'All') params.set('category', category)
      if (status !== 'All') params.set('status', status)

      const res = await fetch(`/api/bounties?${params.toString()}`, {
        headers: { 'x-demo-user-email': currentUser.email },
      })

      if (res.ok) {
        const data = await res.json()
        setBounties(data.bounties)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [category, status, currentUser.email])

  useEffect(() => {
    fetchBounties()
  }, [fetchBounties])

  const openCount = bounties.filter((bounty) => bounty.status === 'OPEN').length

  return (
    <div>
      <div className="bg-gradient-to-r from-[#0033A0] to-[#1a4db5] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-6 h-6 text-yellow-300" />
                <span className="text-yellow-300 font-semibold text-sm uppercase tracking-wider">Tool Bounties</span>
              </div>
              <h1 className="text-3xl font-extrabold mb-2">Request a Tool</h1>
              <p className="text-blue-100 max-w-xl">
                Educators post challenges, builders claim them, and strong ideas turn into tools.
                Have a teaching need that no tool addresses? Post a bounty.
              </p>
              {openCount > 0 && (
                <p className="mt-3 text-sm text-blue-200">
                  <span className="text-white font-bold">{openCount}</span> open {openCount === 1 ? 'bounty' : 'bounties'} waiting to be built
                </p>
              )}
            </div>

            {currentUser.role !== 'STUDENT' && (
              <Link
                href="/bounties/new"
                className="flex items-center gap-2 bg-white text-[#0033A0] px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-50 transition-colors flex-shrink-0 shadow"
              >
                <Plus className="w-4 h-4" />
                Post a Bounty
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white border-b border-gray-200 sticky top-24 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  category === cat ? 'bg-[#0033A0] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="w-px h-5 bg-gray-200 hidden sm:block" />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 border-0 outline-none cursor-pointer hover:bg-gray-200 transition-colors"
          >
            {STATUSES.map((item) => (
              <option key={item} value={item}>
                {item === 'All' ? 'All Statuses' : item}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 p-6 animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-1/3 mb-3" />
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : bounties.length === 0 ? (
          <div className="text-center py-20">
            <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No bounties yet</h3>
            <p className="text-gray-500 mb-6">Be the first to post a tool request.</p>
            {currentUser.role !== 'STUDENT' && (
              <Link
                href="/bounties/new"
                className="inline-flex items-center gap-2 bg-[#0033A0] text-white px-6 py-2.5 rounded-xl font-medium hover:bg-[#002580] transition-colors"
              >
                <Plus className="w-4 h-4" />
                Post the first bounty
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {bounties.map((bounty) => {
              const StatusIcon = STATUS_ICONS[bounty.status]

              return (
                <Link
                  key={bounty.id}
                  href={`/bounties/${bounty.id}`}
                  className="block bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md hover:border-[#0033A0]/30 transition-all group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${STATUS_STYLES[bounty.status]}`}>
                          <StatusIcon className="w-3 h-3" />
                          {bounty.status}
                        </span>
                        {bounty.status === 'OPEN' && (() => {
                          const daysOld = Math.floor((Date.now() - new Date(bounty.createdAt).getTime()) / 86400000)
                          if (daysOld >= 14) {
                            return (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 ml-1">
                                <Clock className="w-3 h-3" />
                                {daysOld}d open
                              </span>
                            )
                          }
                          return null
                        })()}
                        <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full font-medium">
                          {bounty.category}
                        </span>
                        {bounty.difficulty && (
                          <span className="text-xs bg-gray-100 text-gray-500 px-2.5 py-0.5 rounded-full">
                            {bounty.difficulty}
                          </span>
                        )}
                        {bounty.estimatedHours && (
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            ~{bounty.estimatedHours}h
                          </span>
                        )}
                        <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-0.5 rounded-full font-semibold">
                          {bounty.rewardSand} Sand
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-[#0033A0] transition-colors mb-1">
                        {bounty.title}
                      </h3>
                      <p className="text-gray-500 text-sm line-clamp-2">{bounty.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100 text-xs text-gray-400 flex-wrap">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {bounty.postedBy.name}
                      {bounty.postedBy.department && ` - ${bounty.postedBy.department}`}
                    </span>
                    <span>{formatDistanceToNow(new Date(bounty.createdAt), { addSuffix: true })}</span>
                    {bounty.claimedBy && <span className="text-yellow-600 font-medium">Claimed by {bounty.claimedBy.name}</span>}
                    {bounty._count && (
                      <span>
                        {bounty._count.reviews} review{bounty._count.reviews === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
