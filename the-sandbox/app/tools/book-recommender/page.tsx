'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '../../lib/auth-context'
import { BookOpen, Plus, Trash2, Sparkles, BookMarked, Check, X, Bell, BellOff, RefreshCw, ThumbsDown } from 'lucide-react'

interface BookEntry { id: string; title: string; author: string; likedReason: string | null; disliked: boolean }
interface Recommendation { id: string; title: string; author: string; year: string | null; reason: string; status: string }
type DigestSub = { email: string; active: boolean } | null
interface Profile {
  books: BookEntry[]
  recommendations: Recommendation[]
  digestSub: DigestSub | null
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  WANT:  { label: 'Want to Read', color: 'text-blue-600 bg-blue-50' },
  READ:  { label: 'Already Read', color: 'text-green-600 bg-green-50' },
  SKIP:  { label: 'Not for Me',   color: 'text-gray-500 bg-gray-100' },
}

export default function BookRecommenderPage() {
  const { currentUser } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [genDone, setGenDone] = useState(false)

  // Add book form
  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newAuthor, setNewAuthor] = useState('')
  const [newReason, setNewReason] = useState('')
  const [newDisliked, setNewDisliked] = useState(false)
  const [addingBook, setAddingBook] = useState(false)

  // Digest
  const [showDigestForm, setShowDigestForm] = useState(false)
  const [digestEmail, setDigestEmail] = useState('')

  const headers = { 'Content-Type': 'application/json', 'x-demo-user-email': currentUser?.email ?? '' }

  async function loadProfile() {
    const res = await fetch('/api/book-recommender/profile', { headers })
    const data = await res.json()
    setProfile(data.profile ?? { books: [], recommendations: [], digestSub: null })
    setLoading(false)
  }

  useEffect(() => { loadProfile() }, [currentUser])

  async function addBook(e: React.FormEvent) {
    e.preventDefault()
    setAddingBook(true)
    await fetch('/api/book-recommender/profile', {
      method: 'POST',
      headers,
      body: JSON.stringify({ title: newTitle, author: newAuthor, likedReason: newReason || null, disliked: newDisliked }),
    })
    setAddingBook(false)
    setNewTitle(''); setNewAuthor(''); setNewReason(''); setNewDisliked(false)
    setShowAdd(false)
    await loadProfile()
  }

  async function removeBook(bookId: string) {
    await fetch(`/api/book-recommender/profile?bookId=${bookId}`, { method: 'DELETE', headers })
    await loadProfile()
  }

  async function generateRecs() {
    setGenerating(true)
    setGenDone(false)
    await fetch('/api/book-recommender/recommend', { method: 'POST', headers })
    setGenerating(false)
    setGenDone(true)
    await loadProfile()
    setTimeout(() => setGenDone(false), 3000)
  }

  async function updateStatus(recommendationId: string, status: string) {
    await fetch('/api/book-recommender/profile', {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ recommendationId, status }),
    })
    setProfile(p => p ? {
      ...p,
      recommendations: p.recommendations.map(r => r.id === recommendationId ? { ...r, status } : r),
    } : p)
  }

  async function subscribeDigest(e: React.FormEvent) {
    e.preventDefault()
    await fetch('/api/book-recommender/profile', {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ digestEmail }),
    })
    setShowDigestForm(false)
    await loadProfile()
  }

  async function unsubscribeDigest() {
    await fetch('/api/book-recommender/profile', {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ digestActive: false }),
    })
    await loadProfile()
  }

  const likedBooks = profile?.books.filter(b => !b.disliked) ?? []
  const dislikedBooks = profile?.books.filter(b => b.disliked) ?? []
  const wantRecs = profile?.recommendations.filter(r => r.status === 'WANT') ?? []
  const otherRecs = profile?.recommendations.filter(r => r.status !== 'WANT') ?? []

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Hero */}
      <div className="bg-[#0033A0] text-white px-6 py-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="w-8 h-8 text-yellow-300" />
            <h1 className="text-3xl font-bold">Book Recommender</h1>
          </div>
          <p className="text-blue-200 text-lg">Tell us what you love. Get personalized recommendations — and a weekly digest of new releases matched to your taste.</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: Taste Profile */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Your Reading Taste</h2>
              <button onClick={() => setShowAdd(!showAdd)} className="text-[#0033A0] hover:text-blue-800">
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {/* Add book form */}
            {showAdd && (
              <div className="px-5 py-4 border-b border-gray-100 bg-blue-50">
                <form onSubmit={addBook} className="space-y-3">
                  <input
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    required
                    placeholder="Book title"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <input
                    value={newAuthor}
                    onChange={e => setNewAuthor(e.target.value)}
                    required
                    placeholder="Author"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <input
                    value={newReason}
                    onChange={e => setNewReason(e.target.value)}
                    placeholder="Why did you love/hate it? (optional)"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                    <input type="checkbox" checked={newDisliked} onChange={e => setNewDisliked(e.target.checked)} className="rounded" />
                    <ThumbsDown className="w-3.5 h-3.5" /> I didn't like this book
                  </label>
                  <div className="flex gap-2">
                    <button type="submit" disabled={addingBook} className="bg-[#0033A0] text-white px-4 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-60">
                      {addingBook ? 'Adding…' : 'Add'}
                    </button>
                    <button type="button" onClick={() => setShowAdd(false)} className="text-sm text-gray-500">Cancel</button>
                  </div>
                </form>
              </div>
            )}

            <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
              {loading ? (
                <div className="px-5 py-6 text-sm text-gray-400 text-center">Loading…</div>
              ) : likedBooks.length === 0 && dislikedBooks.length === 0 ? (
                <div className="px-5 py-6 text-sm text-gray-400 text-center">
                  <BookMarked className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  Add your favorite books to get started.
                </div>
              ) : (
                <>
                  {likedBooks.map(b => (
                    <div key={b.id} className="px-5 py-3 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{b.title}</p>
                        <p className="text-xs text-gray-500">{b.author}</p>
                        {b.likedReason && <p className="text-xs text-blue-600 mt-0.5 italic">"{b.likedReason}"</p>}
                      </div>
                      <button onClick={() => removeBook(b.id)} className="text-gray-300 hover:text-red-500 shrink-0 mt-0.5">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {dislikedBooks.length > 0 && (
                    <>
                      <div className="px-5 py-2 bg-gray-50">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Didn't like</p>
                      </div>
                      {dislikedBooks.map(b => (
                        <div key={b.id} className="px-5 py-3 flex items-start justify-between gap-2 opacity-60">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate line-through">{b.title}</p>
                            <p className="text-xs text-gray-500">{b.author}</p>
                          </div>
                          <button onClick={() => removeBook(b.id)} className="text-gray-300 hover:text-red-500 shrink-0">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Generate button */}
          <button
            onClick={generateRecs}
            disabled={generating || likedBooks.length === 0}
            className="w-full flex items-center justify-center gap-2 bg-[#0033A0] text-white py-3 rounded-xl font-bold hover:bg-blue-900 transition disabled:opacity-50"
          >
            {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : genDone ? <Check className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            {generating ? 'Finding books…' : genDone ? 'Done! See your recs →' : 'Get Recommendations'}
          </button>
          {likedBooks.length === 0 && (
            <p className="text-xs text-center text-gray-400">Add at least one book first</p>
          )}

          {/* Weekly Digest */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="font-bold text-gray-900 mb-1">Weekly New Release Digest</h3>
            <p className="text-xs text-gray-500 mb-3">Every Friday: new books matched to your taste, delivered to your inbox.</p>
            {profile?.digestSub?.active ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-green-700">
                  <Check className="w-4 h-4" />
                  <span>Subscribed — {profile.digestSub.email}</span>
                </div>
                <button onClick={unsubscribeDigest} className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500">
                  <BellOff className="w-3.5 h-3.5" /> Unsubscribe
                </button>
              </div>
            ) : showDigestForm ? (
              <form onSubmit={subscribeDigest} className="space-y-2">
                <input
                  value={digestEmail}
                  onChange={e => setDigestEmail(e.target.value)}
                  type="email"
                  required
                  placeholder="you@uky.edu"
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                />
                <div className="flex gap-2">
                  <button type="submit" className="bg-[#0033A0] text-white px-3 py-1.5 rounded text-sm font-semibold">Subscribe</button>
                  <button type="button" onClick={() => setShowDigestForm(false)} className="text-sm text-gray-500">Cancel</button>
                </div>
              </form>
            ) : (
              <button onClick={() => setShowDigestForm(true)} className="flex items-center gap-2 text-sm text-[#0033A0] font-medium hover:underline">
                <Bell className="w-4 h-4" /> Subscribe to weekly digest
              </button>
            )}
          </div>
        </div>

        {/* Right: Recommendations */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Recommended For You</h2>

          {wantRecs.length === 0 && !generating ? (
            <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
              <Sparkles className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="font-medium text-gray-700">No recommendations yet</p>
              <p className="text-sm text-gray-500 mt-1">Add books you love on the left, then click "Get Recommendations".</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {wantRecs.map(rec => (
                <div key={rec.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-900">{rec.title}</h3>
                      <p className="text-sm text-gray-500">{rec.author}{rec.year ? ` · ${rec.year}` : ''}</p>
                      <p className="text-sm text-gray-700 mt-2">{rec.reason}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => updateStatus(rec.id, 'READ')}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-full border border-green-300 text-green-700 hover:bg-green-50 transition"
                    >
                      <Check className="w-3 h-3" /> Mark Read
                    </button>
                    <button
                      onClick={() => updateStatus(rec.id, 'SKIP')}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-full border border-gray-300 text-gray-500 hover:bg-gray-50 transition"
                    >
                      <X className="w-3 h-3" /> Not for Me
                    </button>
                    <a
                      href={`https://www.goodreads.com/search?q=${encodeURIComponent(rec.title + ' ' + rec.author)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto flex items-center gap-1 px-3 py-1.5 text-xs rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50 transition"
                    >
                      Goodreads →
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Read / Skipped */}
          {otherRecs.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 mb-3">Previously Marked</h3>
              <div className="grid gap-3">
                {otherRecs.map(rec => (
                  <div key={rec.id} className="bg-white border border-gray-100 rounded-xl px-5 py-4 flex items-center justify-between gap-3 opacity-60">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{rec.title}</p>
                      <p className="text-xs text-gray-500">{rec.author}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_LABELS[rec.status]?.color}`}>
                        {STATUS_LABELS[rec.status]?.label}
                      </span>
                      <button onClick={() => updateStatus(rec.id, 'WANT')} className="text-xs text-gray-400 hover:text-blue-600">Restore</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
