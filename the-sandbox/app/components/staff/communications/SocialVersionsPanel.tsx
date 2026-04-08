'use client'

import { useState } from 'react'
import { Twitter, Instagram, Linkedin, Copy, Check } from 'lucide-react'

interface SocialVersions {
  twitter: string
  instagram: string
  linkedin: string
}

interface SocialVersionsPanelProps {
  versions: SocialVersions
}

const TABS = [
  { key: 'twitter' as const,   label: 'Twitter / X', icon: Twitter,   maxChars: 280 },
  { key: 'instagram' as const, label: 'Instagram',   icon: Instagram, maxChars: null },
  { key: 'linkedin' as const,  label: 'LinkedIn',    icon: Linkedin,  maxChars: null },
]

export default function SocialVersionsPanel({ versions }: SocialVersionsPanelProps) {
  const [activeTab, setActiveTab] = useState<keyof SocialVersions>('twitter')
  const [copied, setCopied] = useState<string | null>(null)

  const handleCopy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    } catch { /* clipboard unavailable */ }
  }

  const activeContent = versions[activeTab] || ''

  return (
    <div className="border border-gray-200 rounded-xl bg-gray-50 overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-gray-200">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold transition-colors ${
                isActive
                  ? 'text-[#0033A0] bg-white border-b-2 border-[#0033A0]'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Icon className="size-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div className="p-4">
        <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
          {activeContent || 'No version generated yet.'}
        </p>

        {/* Footer: char count + copy */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
          {/* Character count (Twitter only) */}
          {activeTab === 'twitter' ? (
            <span
              className={`text-xs font-medium ${
                activeContent.length > 280 ? 'text-red-600' : 'text-gray-400'
              }`}
            >
              {activeContent.length} / 280 characters
              {activeContent.length > 280 && ' (over limit)'}
            </span>
          ) : (
            <span className="text-xs text-gray-400">{activeContent.length} characters</span>
          )}

          <button
            onClick={() => void handleCopy(activeTab, activeContent)}
            className="flex items-center gap-1 text-xs font-medium text-[#0033A0] hover:text-[#0033A0]/80 transition-colors"
          >
            {copied === activeTab ? (
              <>
                <Check className="size-3.5" />
                Copied
              </>
            ) : (
              <>
                <Copy className="size-3.5" />
                Copy
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
