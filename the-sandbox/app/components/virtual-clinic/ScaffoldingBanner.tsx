'use client'

import { Lightbulb, CheckCircle2 } from 'lucide-react'
import type { ScaffoldingPrompt } from '../../lib/virtual-clinic/types'

interface ScaffoldingBannerProps {
  prompt: ScaffoldingPrompt | null
  domainChecklist?: { domain: string; hit: boolean }[] | null
}

export default function ScaffoldingBanner({ prompt, domainChecklist }: ScaffoldingBannerProps) {
  if (!prompt) return null

  if (prompt.type === 'metacognitive') {
    return (
      <div className="mx-4 mb-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2.5">
        <Lightbulb className="size-4 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <div className="text-xs font-semibold text-amber-700 mb-0.5">Reflection Prompt</div>
          <p className="text-xs text-amber-800">{prompt.message}</p>
        </div>
      </div>
    )
  }

  if (prompt.type === 'domain-hint' && domainChecklist) {
    return (
      <div className="mx-4 mb-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
        <div className="text-xs font-semibold text-blue-700 mb-2">History Domains</div>
        <div className="grid grid-cols-2 gap-1.5">
          {domainChecklist.map((item) => (
            <div key={item.domain} className="flex items-center gap-1.5">
              <CheckCircle2 className={`size-3.5 ${item.hit ? 'text-emerald-500' : 'text-gray-300'}`} />
              <span className={`text-xs ${item.hit ? 'text-gray-700' : 'text-gray-400'}`}>
                {item.domain}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return null
}
