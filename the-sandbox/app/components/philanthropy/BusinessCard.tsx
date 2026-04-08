'use client'

import { MapPin, Phone, Mail, Globe, Search, Check } from 'lucide-react'
import type { Business } from '../../lib/philanthropy/types'

interface BusinessCardProps {
  business: Business
  selected: boolean
  onToggle: () => void
  city: string
}

const LIKELINESS_STYLES: Record<string, string> = {
  High: 'bg-green-100 text-green-700',
  Medium: 'bg-amber-100 text-amber-700',
  Low: 'bg-red-100 text-red-700',
}

export default function BusinessCard({ business, selected, onToggle, city }: BusinessCardProps) {
  const biz = business

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative text-left w-full rounded-2xl border p-4 transition-all ${
        selected
          ? 'border-[#0033A0] bg-blue-50/50 ring-1 ring-[#0033A0]'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
      }`}
    >
      {/* Selected overlay */}
      {selected && (
        <div className="absolute top-3 right-3 flex items-center justify-center size-6 rounded-full bg-[#0033A0]">
          <Check className="size-3.5 text-white" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm font-bold text-gray-900 leading-tight pr-6">{biz.name}</h3>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${LIKELINESS_STYLES[biz.likeliness] || LIKELINESS_STYLES.Medium}`}
        >
          {biz.likeliness}
        </span>
        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
          {biz.type}
        </span>
      </div>

      {/* Details */}
      <div className="space-y-1.5 text-xs text-gray-600">
        <p>
          <span className="font-semibold text-gray-700">Mission:</span> {biz.mission}
        </p>
        <p>
          <span className="font-semibold text-gray-700">Community:</span> {biz.communityImpact}
        </p>
        <p>
          <span className="font-semibold text-gray-700">Donation Potential:</span>{' '}
          {biz.donationPotential}
        </p>
      </div>

      {/* Location */}
      <p className="mt-3 flex items-center gap-1 text-xs text-gray-400">
        <MapPin className="size-3" />
        {biz.location}
      </p>

      {/* Contact links */}
      <div className="mt-3 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
        {biz.phone && (
          <a
            href={`tel:${biz.phone}`}
            className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-[#0033A0]"
          >
            <Phone className="size-3" />
            {biz.phone}
          </a>
        )}
        {biz.email && (
          <a
            href={`mailto:${biz.email}`}
            className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-[#0033A0]"
          >
            <Mail className="size-3" />
            {biz.email}
          </a>
        )}
        {biz.website && (
          <a
            href={`https://${biz.website.replace(/^https?:\/\//, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-[#0033A0]"
          >
            <Globe className="size-3" />
            {biz.website.replace(/^https?:\/\//, '')}
          </a>
        )}
        <a
          href={`https://www.google.com/search?q=${encodeURIComponent(biz.name + ' ' + city)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800"
        >
          <Search className="size-3" />
          Verify
        </a>
      </div>
    </button>
  )
}
