'use client'

import { AlertTriangle } from 'lucide-react'

interface ComplexCaseBannerProps {
  confidenceScore: number
  flags: string[]
}

export function ComplexCaseBanner({ confidenceScore, flags }: ComplexCaseBannerProps) {
  return (
    <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg flex gap-3">
      <AlertTriangle className="size-5 text-amber-600 flex-shrink-0 mt-0.5" />
      <div>
        <p className="font-semibold text-amber-800 text-sm">Complex Case — Staff Review Required</p>
        <p className="text-amber-700 text-xs mt-1">
          Confidence score: {confidenceScore}% · This audit requires human verification before sharing with the student.
        </p>
        {flags.length > 0 && (
          <ul className="mt-2 space-y-0.5">
            {flags.map((flag) => (
              <li key={flag} className="text-amber-700 text-xs flex gap-1.5">
                <span>•</span>
                <span>{flag}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
