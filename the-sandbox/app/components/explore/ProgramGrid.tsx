'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import ProgramCard, { type ProgramCardData } from './ProgramCard'

interface ProgramGridProps {
  programs: ProgramCardData[]
  currentProgramCode: string | null
  onExplore: (programCode: string) => void
}

export default function ProgramGrid({ programs, currentProgramCode, onExplore }: ProgramGridProps) {
  const [search, setSearch] = useState('')
  const [collegeFilter, setCollegeFilter] = useState('')

  const colleges = [...new Set(programs.map((p) => p.college))].sort()

  const filtered = programs.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) &&
        !p.code.toLowerCase().includes(search.toLowerCase()) &&
        !p.department.toLowerCase().includes(search.toLowerCase())) {
      return false
    }
    if (collegeFilter && p.college !== collegeFilter) return false
    return true
  })

  // Sort: current program first, then alphabetical
  const sorted = [...filtered].sort((a, b) => {
    if (a.code === currentProgramCode) return -1
    if (b.code === currentProgramCode) return 1
    return a.name.localeCompare(b.name)
  })

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search programs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-xl
                       focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] outline-none"
          />
        </div>
        <select
          value={collegeFilter}
          onChange={(e) => setCollegeFilter(e.target.value)}
          className="px-4 py-2.5 text-sm border border-gray-300 rounded-xl
                     focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0] outline-none"
        >
          <option value="">All Colleges</option>
          {colleges.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          No programs match your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {sorted.map((p) => (
            <ProgramCard
              key={p.id}
              program={p}
              isCurrent={p.code === currentProgramCode}
              onExplore={onExplore}
            />
          ))}
        </div>
      )}
    </div>
  )
}
