'use client'

import { Check } from 'lucide-react'
import type { CampaignFormData } from '../../lib/philanthropy/types'
import { DONATION_TYPES, DONATION_ITEMS } from '../../lib/philanthropy/types'

interface CampaignFormProps {
  form: CampaignFormData
  onChange: (update: Partial<CampaignFormData>) => void
  onSubmit: () => void
  isDisabled: boolean
}

export default function CampaignForm({ form, onChange, onSubmit, isDisabled }: CampaignFormProps) {
  const showItems = form.donationType.includes('Silent Auction Items')
  const showOther = form.donationType.includes('Other')

  function toggleDonationType(label: string) {
    const next = form.donationType.includes(label)
      ? form.donationType.filter((t) => t !== label)
      : [...form.donationType, label]
    onChange({ donationType: next })
  }

  function toggleItem(item: string) {
    const next = form.desiredItems.includes(item)
      ? form.desiredItems.filter((i) => i !== item)
      : [...form.desiredItems, item]
    onChange({ desiredItems: next })
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
          Step 1 of 3
        </p>
        <h2 className="text-2xl font-extrabold text-gray-900">Tell Us About Your Campaign</h2>
        <p className="text-sm text-gray-500 mt-1">
          Fill this out once and we&apos;ll generate everything you need.
        </p>
      </div>

      {/* Organization */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="org-input">
          Organization Name
        </label>
        <input
          id="org-input"
          type="text"
          className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] outline-none"
          placeholder="e.g., Alpha Chi Omega"
          value={form.organization}
          onChange={(e) => onChange({ organization: e.target.value })}
        />
      </div>

      {/* Donation Type */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          What do you need donations for?
        </label>
        <p className="text-xs text-gray-400 mb-2">Select all that apply</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {DONATION_TYPES.map((t) => {
            const selected = form.donationType.includes(t.label)
            return (
              <button
                key={t.label}
                type="button"
                onClick={() => toggleDonationType(t.label)}
                className={`relative flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
                  selected
                    ? 'border-[#0033A0] bg-blue-50 text-[#0033A0]'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
                {selected && (
                  <Check className="absolute top-1.5 right-1.5 size-3.5 text-[#0033A0]" />
                )}
              </button>
            )
          })}
        </div>

        {/* Other type input */}
        {showOther && (
          <input
            type="text"
            className="mt-3 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] outline-none"
            placeholder="Describe your donation need…"
            value={form.otherDonationType}
            onChange={(e) => onChange({ otherDonationType: e.target.value })}
          />
        )}

        {/* Silent Auction Items */}
        {showItems && (
          <div className="mt-4">
            <p className="text-sm font-semibold text-gray-700 mb-2">
              What kind of items? <span className="text-gray-400 font-normal">(optional)</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              {DONATION_ITEMS.map((item) => {
                const checked = form.desiredItems.includes(item)
                return (
                  <label
                    key={item}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-all ${
                      checked
                        ? 'border-[#0033A0] bg-blue-50 text-[#0033A0]'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={() => toggleItem(item)}
                    />
                    {checked && <Check className="size-3.5 text-[#0033A0] shrink-0" />}
                    <span>{item}</span>
                  </label>
                )
              })}
            </div>
            <input
              type="text"
              className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] outline-none"
              placeholder="Anything else? (e.g., local art prints, gym memberships…)"
              value={form.otherItems}
              onChange={(e) => onChange({ otherItems: e.target.value })}
            />
          </div>
        )}
      </div>

      {/* Mission / Philanthropy */}
      <div>
        <label
          className="block text-sm font-semibold text-gray-700 mb-1"
          htmlFor="philanthropy-input"
        >
          Philanthropy / Mission Focus
        </label>
        <textarea
          id="philanthropy-input"
          className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] outline-none resize-none"
          placeholder="e.g., Domestic violence awareness and supporting Greenhouse 17"
          rows={3}
          value={form.philanthropy}
          onChange={(e) => onChange({ philanthropy: e.target.value })}
        />
      </div>

      {/* Event Name + Date */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            className="block text-sm font-semibold text-gray-700 mb-1"
            htmlFor="event-name-input"
          >
            Event Name <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            id="event-name-input"
            type="text"
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] outline-none"
            placeholder="e.g., Spring Gala Fundraiser"
            value={form.eventName}
            onChange={(e) => onChange({ eventName: e.target.value })}
          />
        </div>
        <div>
          <label
            className="block text-sm font-semibold text-gray-700 mb-1"
            htmlFor="event-date-input"
          >
            Event Date <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            id="event-date-input"
            type="date"
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] outline-none"
            value={form.eventDate}
            onChange={(e) => onChange({ eventDate: e.target.value })}
          />
        </div>
      </div>

      {/* City */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="city-input">
          City, State
        </label>
        <input
          id="city-input"
          type="text"
          className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] outline-none"
          placeholder="e.g., Lexington, KY"
          value={form.city}
          onChange={(e) => onChange({ city: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSubmit()
          }}
        />
      </div>

      {/* Submit */}
      <button
        type="button"
        onClick={onSubmit}
        disabled={isDisabled || form.donationType.length === 0}
        className="w-full rounded-xl bg-[#0033A0] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#002878] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Find Businesses →
      </button>
    </div>
  )
}
