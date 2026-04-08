'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '../../lib/auth-context'
import { useRouter } from 'next/navigation'
import { Trophy, Plus, LogIn, Copy, Check, Users } from 'lucide-react'

interface PoolSummary {
  pool: { id: string; name: string; year: number; locked: boolean; joinCode?: string; creatorName: string }
  myEntry: { id: string; score: number; rank: number | null }
  memberCount: number
}

export default function NcaaBracketPage() {
  const { currentUser } = useAuth()
  const router = useRouter()
  const [pools, setPools] = useState<PoolSummary[]>([])
  const [loading, setLoading] = useState(true)

  // Create pool form
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [creating, setCreating] = useState(false)
  const [createdCode, setCreatedCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Join form
  const [showJoin, setShowJoin] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [joinEmail, setJoinEmail] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState('')

  const headers = { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser?.email ?? '' }

  useEffect(() => {
    fetch('/api/brackets', { headers })
      .then(r => r.json())
      .then(d => setPools(d.pools ?? []))
      .finally(() => setLoading(false))
  }, [currentUser])

  async function createPool(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    const res = await fetch('/api/brackets', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: newName, emailForDigest: newEmail || undefined }),
    })
    const data = await res.json()
    setCreating(false)
    if (res.ok) {
      setCreatedCode(data.joinCode)
      setPools(p => [{ pool: data.pool, myEntry: { id: '', score: 0, rank: null }, memberCount: 1 }, ...p])
    }
  }

  async function joinPool(e: React.FormEvent) {
    e.preventDefault()
    setJoining(true)
    setJoinError('')
    const res = await fetch('/api/brackets/join', {
      method: 'POST',
      headers,
      body: JSON.stringify({ joinCode: joinCode.toUpperCase(), emailForDigest: joinEmail || undefined }),
    })
    const data = await res.json()
    setJoining(false)
    if (res.ok) {
      router.push(`/tools/ncaa-bracket/${data.poolId}`)
    } else {
      setJoinError(data.error ?? 'Could not join pool')
    }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Hero */}
      <div className="bg-[#0033A0] text-white px-6 py-10">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-8 h-8 text-yellow-300" />
            <h1 className="text-3xl font-bold">NCAA Bracket Challenge</h1>
          </div>
          <p className="text-blue-200 text-lg">Create a pool, invite friends, fill your bracket — weekly email updates all tournament long.</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 mt-8 space-y-6">

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => { setShowCreate(true); setShowJoin(false) }}
            className="flex items-center gap-2 bg-[#0033A0] text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-blue-900 transition"
          >
            <Plus className="w-4 h-4" /> Create Pool
          </button>
          <button
            onClick={() => { setShowJoin(true); setShowCreate(false) }}
            className="flex items-center gap-2 border border-[#0033A0] text-[#0033A0] px-5 py-2.5 rounded-lg font-semibold hover:bg-blue-50 transition"
          >
            <LogIn className="w-4 h-4" /> Join Pool
          </button>
        </div>

        {/* Create form */}
        {showCreate && !createdCode && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold mb-4">Create a New Pool</h2>
            <form onSubmit={createPool} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pool Name</label>
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  required
                  placeholder="e.g. Law School Bracket 2026"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Email for Weekly Updates <span className="text-gray-400">(optional)</span></label>
                <input
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  type="email"
                  placeholder="you@uky.edu"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={creating} className="bg-[#0033A0] text-white px-5 py-2 rounded-lg font-semibold text-sm disabled:opacity-60">
                  {creating ? 'Creating…' : 'Create Pool'}
                </button>
                <button type="button" onClick={() => setShowCreate(false)} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Created — show join code */}
        {createdCode && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6">
            <h2 className="text-lg font-bold text-green-800 mb-1">Pool Created!</h2>
            <p className="text-sm text-green-700 mb-3">Share this code with your friends so they can join:</p>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-mono font-bold tracking-widest text-green-900 bg-white border border-green-300 px-4 py-2 rounded-lg">{createdCode}</span>
              <button onClick={() => copyCode(createdCode)} className="flex items-center gap-1 text-sm text-green-700 hover:text-green-900">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <button onClick={() => { setCreatedCode(null); setShowCreate(false); setNewName(''); setNewEmail('') }} className="mt-4 text-sm text-green-700 underline">
              Done
            </button>
          </div>
        )}

        {/* Join form */}
        {showJoin && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold mb-4">Join a Pool</h2>
            <form onSubmit={joinPool} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Join Code</label>
                <input
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  required
                  placeholder="ABC123"
                  maxLength={8}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Email for Weekly Updates <span className="text-gray-400">(optional)</span></label>
                <input
                  value={joinEmail}
                  onChange={e => setJoinEmail(e.target.value)}
                  type="email"
                  placeholder="you@uky.edu"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              {joinError && <p className="text-sm text-red-600">{joinError}</p>}
              <div className="flex gap-3">
                <button type="submit" disabled={joining} className="bg-[#0033A0] text-white px-5 py-2 rounded-lg font-semibold text-sm disabled:opacity-60">
                  {joining ? 'Joining…' : 'Join Pool'}
                </button>
                <button type="button" onClick={() => setShowJoin(false)} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* My Pools */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3">My Pools</h2>
          {loading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : pools.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500">
              <Trophy className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No pools yet</p>
              <p className="text-sm mt-1">Create one above or enter a join code from a friend.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pools.map(({ pool, myEntry, memberCount }) => (
                <button
                  key={pool.id}
                  onClick={() => router.push(`/tools/ncaa-bracket/${pool.id}`)}
                  className="w-full text-left bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-400 hover:shadow-sm transition"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-gray-900">{pool.name}</h3>
                      <p className="text-sm text-gray-500 mt-0.5">{pool.year} Tournament · Created by {pool.creatorName}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-[#0033A0]">{myEntry.score} pts</div>
                      {myEntry.rank && <div className="text-xs text-gray-500">Rank #{myEntry.rank}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {memberCount} members</span>
                    <span className={pool.locked ? 'text-red-500 font-medium' : 'text-green-600 font-medium'}>
                      {pool.locked ? '🔒 Locked' : '🟢 Open'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
