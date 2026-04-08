'use client'

import StandardCard from './StandardCard'

interface StandardSummary {
  id: string
  standardNumber: string
  standardTitle: string
  evidenceCount: number
  quality: string
  gapCount: number
  narrativeStatus: string
  isAutoHarvestable: boolean
}

interface StandardsGridProps {
  standards: StandardSummary[]
  onSelect: (id: string) => void
}

export default function StandardsGrid({ standards, onSelect }: StandardsGridProps) {
  // Group by section
  const sections = new Map<string, StandardSummary[]>()
  for (const s of standards) {
    const section = s.standardNumber.split('.')[0]
    if (!sections.has(section)) sections.set(section, [])
    sections.get(section)!.push(s)
  }

  return (
    <div className="space-y-6">
      {Array.from(sections.entries()).map(([section, stds]) => (
        <div key={section}>
          <h3 className="mb-3 text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Section {section}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stds.map(s => (
              <StandardCard
                key={s.id}
                standardNumber={s.standardNumber}
                standardTitle={s.standardTitle}
                evidenceCount={s.evidenceCount}
                quality={s.quality}
                gapCount={s.gapCount}
                narrativeStatus={s.narrativeStatus}
                isAutoHarvestable={s.isAutoHarvestable}
                onClick={() => onSelect(s.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
