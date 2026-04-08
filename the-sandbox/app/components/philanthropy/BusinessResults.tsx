'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { ArrowLeft, Download, ArrowRight, Search, AlertTriangle, MapPin } from 'lucide-react'
import type { Business } from '../../lib/philanthropy/types'
import { LIKELINESS_ORDER } from '../../lib/philanthropy/types'
import BusinessCard from './BusinessCard'

const BusinessMap = dynamic(() => import('./BusinessMap'), {
  ssr: false,
  loading: () => (
    <div className="h-64 sm:h-80 rounded-xl bg-gray-100 animate-pulse flex items-center justify-center">
      <p className="text-sm text-gray-400">Loading map...</p>
    </div>
  ),
})

interface BusinessResultsProps {
  businesses: Business[]
  selectedBusinesses: Business[]
  city: string
  organization: string
  onToggleBusiness: (biz: Business) => void
  onBack: () => void
  onNext: () => void
}

type SortMode = 'likeliness' | 'name' | 'type'

export default function BusinessResults({
  businesses,
  selectedBusinesses,
  city,
  organization,
  onToggleBusiness,
  onBack,
  onNext,
}: BusinessResultsProps) {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortMode>('likeliness')
  const [showMap, setShowMap] = useState(false)

  const selectedNames = new Set(selectedBusinesses.map((b) => b.name))

  // Filter
  const searchLower = search.toLowerCase().trim()
  let filtered = businesses
  if (searchLower) {
    filtered = businesses.filter(
      (b) =>
        b.name.toLowerCase().includes(searchLower) ||
        b.type.toLowerCase().includes(searchLower) ||
        b.mission.toLowerCase().includes(searchLower),
    )
  }

  // Sort
  filtered = [...filtered].sort((a, b) => {
    if (sort === 'likeliness') {
      const la = LIKELINESS_ORDER[a.likeliness.toLowerCase()] ?? 1
      const lb = LIKELINESS_ORDER[b.likeliness.toLowerCase()] ?? 1
      return la - lb
    }
    if (sort === 'name') return a.name.localeCompare(b.name)
    if (sort === 'type') return a.type.localeCompare(b.type)
    return 0
  })

  const countText =
    filtered.length === businesses.length
      ? `${businesses.length} businesses`
      : `${filtered.length} of ${businesses.length}`

  function exportCSV() {
    const headers = [
      'Name',
      'Type',
      'Mission',
      'Community Impact',
      'Donation Potential',
      'Location',
      'Phone',
      'Email',
      'Website',
      'Likeliness',
    ]
    const rows = businesses.map((b) => [
      b.name,
      b.type,
      b.mission,
      b.communityImpact,
      b.donationPotential,
      b.location,
      b.phone,
      b.email,
      b.website,
      b.likeliness,
    ])
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `philanthropy-businesses-${organization.replace(/\s+/g, '-').toLowerCase()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
          Step 2 of 3
        </p>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900">Select Your Top Businesses</h2>
            <p className="text-sm text-gray-500 mt-1">
              Matches in <span className="font-semibold">{city}</span> for{' '}
              <span className="font-semibold">{organization}</span>. Click cards to select up to 5.
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-1.5 rounded-full bg-[#0033A0]/10 px-3 py-1.5">
            <span className="text-lg font-bold text-[#0033A0]">{selectedBusinesses.length}</span>
            <span className="text-xs text-gray-500">/ 5</span>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <input
            type="text"
            className="w-full rounded-xl border border-gray-200 pl-9 pr-4 py-2 text-sm focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] outline-none"
            placeholder="Search by name, type, or mission…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-600 focus:border-[#0033A0] outline-none"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortMode)}
        >
          <option value="likeliness">Best Match First</option>
          <option value="name">Name A–Z</option>
          <option value="type">Business Type</option>
        </select>
        <span className="text-xs text-gray-400 self-center whitespace-nowrap">{countText}</span>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
        <AlertTriangle className="size-4 shrink-0 mt-0.5" />
        Contact info (phone, email, website) is AI-estimated — verify before reaching out.
      </div>

      {/* Map toggle + map */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowMap((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <MapPin className="size-3.5" />
          {showMap ? 'Hide Map' : 'Show Map'}
        </button>
      </div>

      {showMap && (
        <BusinessMap
          businesses={filtered}
          selectedNames={selectedNames}
          onSelectBusiness={onToggleBusiness}
        />
      )}

      {/* Business grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.map((biz) => (
          <BusinessCard
            key={biz.name}
            business={biz}
            selected={selectedNames.has(biz.name)}
            city={city}
            onToggle={() => onToggleBusiness(biz)}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-sm text-gray-400 py-8">
          No businesses match your search.
        </p>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="size-4" /> Back
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Download className="size-4" /> Export CSV
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={selectedBusinesses.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#0033A0] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#002878] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {selectedBusinesses.length === 0
              ? 'Select at Least One'
              : `Generate Outreach for ${selectedBusinesses.length} Business${selectedBusinesses.length > 1 ? 'es' : ''}`}
            <ArrowRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
