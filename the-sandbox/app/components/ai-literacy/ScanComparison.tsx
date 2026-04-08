'use client'

import { ArrowDown, ArrowUp, Minus } from 'lucide-react'

interface ScanResult {
  aiCompletability: number
  bloomLevel: string
  summary: string
  vulnerabilities: { type: string; description: string; severity: string }[]
}

interface ScanComparisonProps {
  original: ScanResult
  redesigned: ScanResult
}

export default function ScanComparison({ original, redesigned }: ScanComparisonProps) {
  const delta = original.aiCompletability - redesigned.aiCompletability
  const improved = delta > 0
  const unchanged = delta === 0

  return (
    <div className="space-y-4">
      {/* Delta badge */}
      <div className={`flex items-center justify-center gap-3 p-4 rounded-2xl ${
        improved ? 'bg-green-50 border border-green-200' :
        unchanged ? 'bg-gray-50 border border-gray-200' :
        'bg-red-50 border border-red-200'
      }`}>
        <div className={`size-10 rounded-full flex items-center justify-center ${
          improved ? 'bg-green-100' : unchanged ? 'bg-gray-100' : 'bg-red-100'
        }`}>
          {improved ? <ArrowDown className="size-5 text-green-600" /> :
           unchanged ? <Minus className="size-5 text-gray-500" /> :
           <ArrowUp className="size-5 text-red-600" />}
        </div>
        <div>
          <p className={`text-lg font-extrabold ${
            improved ? 'text-green-700' : unchanged ? 'text-gray-700' : 'text-red-700'
          }`}>
            AI Completability: {original.aiCompletability}% → {redesigned.aiCompletability}%
            <span className="ml-2 text-sm font-semibold">
              ({improved ? '-' : '+'}{Math.abs(delta)}%)
            </span>
          </p>
          <p className="text-sm text-gray-600">
            Bloom&apos;s Level: {original.bloomLevel} → {redesigned.bloomLevel}
          </p>
        </div>
      </div>

      {/* Side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 border rounded-2xl bg-red-50/30">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Original Assignment</h4>
          <div className="text-xs text-gray-600 mb-3">{original.summary}</div>
          <div className="space-y-1.5">
            {original.vulnerabilities.map((v, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className={`mt-0.5 size-1.5 rounded-full shrink-0 ${
                  v.severity === 'critical' ? 'bg-red-500' :
                  v.severity === 'high' ? 'bg-orange-500' :
                  v.severity === 'medium' ? 'bg-amber-500' : 'bg-gray-400'
                }`} />
                <span className="text-gray-600">{v.type}: {v.description}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border rounded-2xl bg-green-50/30">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Redesigned Assignment</h4>
          <div className="text-xs text-gray-600 mb-3">{redesigned.summary}</div>
          <div className="space-y-1.5">
            {redesigned.vulnerabilities.length === 0 ? (
              <p className="text-xs text-green-600 font-medium">No significant vulnerabilities detected.</p>
            ) : (
              redesigned.vulnerabilities.map((v, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <span className={`mt-0.5 size-1.5 rounded-full shrink-0 ${
                    v.severity === 'critical' ? 'bg-red-500' :
                    v.severity === 'high' ? 'bg-orange-500' :
                    v.severity === 'medium' ? 'bg-amber-500' : 'bg-gray-400'
                  }`} />
                  <span className="text-gray-600">{v.type}: {v.description}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
