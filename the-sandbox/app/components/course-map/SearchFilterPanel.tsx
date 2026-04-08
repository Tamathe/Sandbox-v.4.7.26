'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  Search,
  X,
  Filter,
  ChevronDown,
  ChevronRight,
  Check,
  Trash2,
  Save,
  Bookmark,
  Calendar,
} from 'lucide-react'
import {
  SearchFilterService,
  searchFilterService,
  type SearchResult,
  type ActiveFilters,
  type FilterPreset,
  type NodeProgressStatus,
  type SearchableNode,
  type SearchableEdge,
} from '../../lib/course-map/search-filter-service'

// ── Types ────────────────────────────────────────────────────────────────────

interface SearchFilterPanelProps {
  nodes: SearchableNode[]
  edges: SearchableEdge[]
  progressMap?: Map<string, { status: NodeProgressStatus }>
  isStudent?: boolean
  onSelectNode: (nodeId: string) => void
  onFiltersChange: (filteredNodeIds: Set<string> | null, filteredEdgeIds: Set<string> | null) => void
  onSearchHighlight: (nodeIds: string[]) => void
  onClose: () => void
}

const UNIT_TYPES = ['WEEK', 'TOPIC', 'MODULE', 'CHAPTER', 'UNIT', 'SESSION', 'PHASE']
const EDGE_TYPES = ['PREREQUISITE', 'SEQUENCE', 'CONCURRENT']
const PROGRESS_OPTIONS: { value: NodeProgressStatus; label: string }[] = [
  { value: 'completed', label: 'Completed' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'not-started', label: 'Not Started' },
]

// ── Component ────────────────────────────────────────────────────────────────

export default function SearchFilterPanel({
  nodes,
  edges,
  progressMap,
  isStudent,
  onSelectNode,
  onFiltersChange,
  onSearchHighlight,
  onClose,
}: SearchFilterPanelProps) {
  // Search state
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const searchInputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Filter state
  const [filters, setFilters] = useState<ActiveFilters>({
    unitTypes: [],
    dateRange: null,
    edgeTypes: [],
    progressStatuses: [],
  })

  // Section collapse
  const [expandedSections, setExpandedSections] = useState({
    unitType: true,
    dateRange: false,
    edgeType: false,
    progress: false,
  })

  // Presets
  const [presets, setPresets] = useState<FilterPreset[]>([])
  const [showPresetSave, setShowPresetSave] = useState(false)
  const [presetName, setPresetName] = useState('')
  const [showPresetDropdown, setShowPresetDropdown] = useState(false)

  // Available unit types from actual data
  const availableUnitTypes = useMemo(() => {
    const types = new Set<string>()
    for (const node of nodes) {
      const t = (node.unitType || node.nodeType || '').toUpperCase()
      if (t) types.add(t)
    }
    return Array.from(types).sort()
  }, [nodes])

  // Available edge types from actual data
  const availableEdgeTypes = useMemo(() => {
    const types = new Set<string>()
    for (const edge of edges) {
      types.add(edge.edgeType.toUpperCase())
    }
    return Array.from(types).sort()
  }, [edges])

  // Load presets on mount
  useEffect(() => {
    setPresets(searchFilterService.loadFilterPresets())
  }, [])

  // Auto-focus search input
  useEffect(() => {
    searchInputRef.current?.focus()
  }, [])

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (query.trim()) {
        const results = searchFilterService.searchNodes(nodes, query)
        setSearchResults(results)
        onSearchHighlight(results.map((r) => r.nodeId))
      } else {
        setSearchResults([])
        onSearchHighlight([])
      }
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, nodes, onSearchHighlight])

  // Apply filters when they change
  useEffect(() => {
    if (!searchFilterService.hasActiveFilters(filters)) {
      onFiltersChange(null, null)
      return
    }
    const { filteredNodeIds, filteredEdgeIds } = searchFilterService.combineFilters(
      nodes, edges, filters, progressMap,
    )
    onFiltersChange(filteredNodeIds, filteredEdgeIds)
  }, [filters, nodes, edges, progressMap, onFiltersChange])

  const toggleUnitType = useCallback((type: string) => {
    setFilters((prev) => ({
      ...prev,
      unitTypes: prev.unitTypes.includes(type)
        ? prev.unitTypes.filter((t) => t !== type)
        : [...prev.unitTypes, type],
    }))
  }, [])

  const toggleEdgeType = useCallback((type: string) => {
    setFilters((prev) => ({
      ...prev,
      edgeTypes: prev.edgeTypes.includes(type)
        ? prev.edgeTypes.filter((t) => t !== type)
        : [...prev.edgeTypes, type],
    }))
  }, [])

  const toggleProgress = useCallback((status: NodeProgressStatus) => {
    setFilters((prev) => ({
      ...prev,
      progressStatuses: prev.progressStatuses.includes(status)
        ? prev.progressStatuses.filter((s) => s !== status)
        : [...prev.progressStatuses, status],
    }))
  }, [])

  const clearAllFilters = useCallback(() => {
    setFilters({ unitTypes: [], dateRange: null, edgeTypes: [], progressStatuses: [] })
  }, [])

  const toggleSection = useCallback((section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }, [])

  const handleSavePreset = useCallback(() => {
    if (!presetName.trim()) return
    searchFilterService.saveFilterPreset(presetName.trim(), filters)
    setPresets(searchFilterService.loadFilterPresets())
    setPresetName('')
    setShowPresetSave(false)
  }, [presetName, filters])

  const handleLoadPreset = useCallback((preset: FilterPreset) => {
    setFilters(searchFilterService.presetToActiveFilters(preset))
    setShowPresetDropdown(false)
  }, [])

  const handleDeletePreset = useCallback((name: string) => {
    searchFilterService.deleteFilterPreset(name)
    setPresets(searchFilterService.loadFilterPresets())
  }, [])

  const activeFilterCount =
    filters.unitTypes.length +
    (filters.dateRange ? 1 : 0) +
    filters.edgeTypes.length +
    filters.progressStatuses.length

  const filteredNodeCount = useMemo(() => {
    if (!searchFilterService.hasActiveFilters(filters)) return nodes.filter((n) => !n.archived).length
    const { filteredNodeIds } = searchFilterService.combineFilters(nodes, edges, filters, progressMap)
    return filteredNodeIds.size
  }, [filters, nodes, edges, progressMap])

  return (
    <div className="fixed left-0 top-0 h-full w-80 bg-white border-r-2 border-gray-200 shadow-xl z-50 flex flex-col print:hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Search className="size-4 text-[#0033A0]" />
          <h2 className="text-sm font-extrabold text-gray-900">Search & Filter</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          title="Close panel (Esc)"
        >
          <X className="size-4 text-gray-500" />
        </button>
      </div>

      {/* Search input */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search nodes..."
            className="w-full pl-9 pr-8 py-2 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0033A0] focus:border-[#0033A0]"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setSearchResults([]); onSearchHighlight([]) }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-gray-100"
            >
              <X className="size-3.5 text-gray-400" />
            </button>
          )}
        </div>
        {query && (
          <p className="mt-1.5 text-xs text-gray-500">
            {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
          </p>
        )}
      </div>

      {/* Search results */}
      {searchResults.length > 0 && (
        <div className="border-b border-gray-100 max-h-48 overflow-y-auto">
          {searchResults.slice(0, 20).map((result) => (
            <button
              key={result.nodeId}
              onClick={() => onSelectNode(result.nodeId)}
              className="w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-b-0"
            >
              <p className="text-sm font-semibold text-gray-900 truncate">{result.label}</p>
              {result.highlights.map((h, i) => (
                <p
                  key={i}
                  className="text-xs text-gray-500 truncate mt-0.5"
                  dangerouslySetInnerHTML={{
                    __html: `<span class="text-gray-400">${h.field.replace(/</g, '&lt;')}:</span> ${h.snippet}`,
                  }}
                />
              ))}
            </button>
          ))}
        </div>
      )}

      {/* Scrollable filter area */}
      <div className="flex-1 overflow-y-auto">
        {/* Active filter chips */}
        {activeFilterCount > 0 && (
          <div className="px-4 py-2 border-b border-gray-100">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-gray-600">
                Active Filters ({activeFilterCount})
              </span>
              <button
                onClick={clearAllFilters}
                className="text-xs text-red-600 hover:text-red-700 font-semibold"
              >
                Clear All
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {filters.unitTypes.map((t) => (
                <span
                  key={`ut-${t}`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium"
                >
                  {t}
                  <button onClick={() => toggleUnitType(t)} className="hover:text-blue-900">
                    <X className="size-3" />
                  </button>
                </span>
              ))}
              {filters.dateRange && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs font-medium">
                  Date Range
                  <button
                    onClick={() => setFilters((prev) => ({ ...prev, dateRange: null }))}
                    className="hover:text-green-900"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              )}
              {filters.edgeTypes.map((t) => (
                <span
                  key={`et-${t}`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-xs font-medium"
                >
                  {t}
                  <button onClick={() => toggleEdgeType(t)} className="hover:text-purple-900">
                    <X className="size-3" />
                  </button>
                </span>
              ))}
              {filters.progressStatuses.map((s) => (
                <span
                  key={`ps-${s}`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-medium"
                >
                  {s}
                  <button onClick={() => toggleProgress(s)} className="hover:text-amber-900">
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Result count */}
        <div className="px-4 py-2 border-b border-gray-100">
          <p className="text-xs text-gray-500">
            <span className="font-semibold text-gray-700">{filteredNodeCount}</span> of{' '}
            {nodes.filter((n) => !n.archived).length} nodes visible
          </p>
        </div>

        {/* Unit Type filter */}
        <div className="border-b border-gray-100">
          <button
            onClick={() => toggleSection('unitType')}
            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm font-semibold text-gray-700">Unit Type</span>
            {expandedSections.unitType ? (
              <ChevronDown className="size-4 text-gray-400" />
            ) : (
              <ChevronRight className="size-4 text-gray-400" />
            )}
          </button>
          {expandedSections.unitType && (
            <div className="px-4 pb-3 space-y-1">
              {availableUnitTypes.map((type) => (
                <label key={type} className="flex items-center gap-2 cursor-pointer py-0.5">
                  <div
                    className={`size-4 rounded border-2 flex items-center justify-center transition-colors ${
                      filters.unitTypes.includes(type)
                        ? 'bg-[#0033A0] border-[#0033A0]'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onClick={() => toggleUnitType(type)}
                  >
                    {filters.unitTypes.includes(type) && (
                      <Check className="size-3 text-white" />
                    )}
                  </div>
                  <span className="text-sm text-gray-700">{type}</span>
                </label>
              ))}
              {availableUnitTypes.length === 0 && (
                <p className="text-xs text-gray-400 italic">No unit types available</p>
              )}
            </div>
          )}
        </div>

        {/* Date Range filter */}
        <div className="border-b border-gray-100">
          <button
            onClick={() => toggleSection('dateRange')}
            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm font-semibold text-gray-700">Date Range</span>
            {expandedSections.dateRange ? (
              <ChevronDown className="size-4 text-gray-400" />
            ) : (
              <ChevronRight className="size-4 text-gray-400" />
            )}
          </button>
          {expandedSections.dateRange && (
            <div className="px-4 pb-3 space-y-2">
              <div>
                <label className="text-xs text-gray-500 font-medium">Start</label>
                <input
                  type="date"
                  value={filters.dateRange?.start || ''}
                  onChange={(e) => {
                    const start = e.target.value
                    setFilters((prev) => ({
                      ...prev,
                      dateRange: start
                        ? { start, end: prev.dateRange?.end || start }
                        : null,
                    }))
                  }}
                  className="w-full mt-0.5 px-2 py-1.5 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium">End</label>
                <input
                  type="date"
                  value={filters.dateRange?.end || ''}
                  onChange={(e) => {
                    const end = e.target.value
                    setFilters((prev) => ({
                      ...prev,
                      dateRange: end
                        ? { start: prev.dateRange?.start || end, end }
                        : null,
                    }))
                  }}
                  className="w-full mt-0.5 px-2 py-1.5 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
                />
              </div>
            </div>
          )}
        </div>

        {/* Edge Type filter */}
        <div className="border-b border-gray-100">
          <button
            onClick={() => toggleSection('edgeType')}
            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm font-semibold text-gray-700">Edge Type</span>
            {expandedSections.edgeType ? (
              <ChevronDown className="size-4 text-gray-400" />
            ) : (
              <ChevronRight className="size-4 text-gray-400" />
            )}
          </button>
          {expandedSections.edgeType && (
            <div className="px-4 pb-3 space-y-1">
              {availableEdgeTypes.map((type) => (
                <label key={type} className="flex items-center gap-2 cursor-pointer py-0.5">
                  <div
                    className={`size-4 rounded border-2 flex items-center justify-center transition-colors ${
                      filters.edgeTypes.includes(type)
                        ? 'bg-[#0033A0] border-[#0033A0]'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onClick={() => toggleEdgeType(type)}
                  >
                    {filters.edgeTypes.includes(type) && (
                      <Check className="size-3 text-white" />
                    )}
                  </div>
                  <span className="text-sm text-gray-700">{type}</span>
                </label>
              ))}
              {availableEdgeTypes.length === 0 && (
                <p className="text-xs text-gray-400 italic">No edges in map</p>
              )}
            </div>
          )}
        </div>

        {/* Progress filter (students only) */}
        {isStudent && (
          <div className="border-b border-gray-100">
            <button
              onClick={() => toggleSection('progress')}
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm font-semibold text-gray-700">Progress Status</span>
              {expandedSections.progress ? (
                <ChevronDown className="size-4 text-gray-400" />
              ) : (
                <ChevronRight className="size-4 text-gray-400" />
              )}
            </button>
            {expandedSections.progress && (
              <div className="px-4 pb-3 space-y-1">
                {PROGRESS_OPTIONS.map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer py-0.5">
                    <div
                      className={`size-4 rounded border-2 flex items-center justify-center transition-colors ${
                        filters.progressStatuses.includes(opt.value)
                          ? 'bg-[#0033A0] border-[#0033A0]'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      onClick={() => toggleProgress(opt.value)}
                    >
                      {filters.progressStatuses.includes(opt.value) && (
                        <Check className="size-3 text-white" />
                      )}
                    </div>
                    <span className="text-sm text-gray-700">{opt.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Presets footer */}
      <div className="border-t-2 border-gray-200 px-4 py-3 space-y-2">
        <div className="flex items-center gap-2">
          {/* Load preset */}
          <div className="relative flex-1">
            <button
              onClick={() => setShowPresetDropdown((v) => !v)}
              disabled={presets.length === 0}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              <Bookmark className="size-3.5" />
              Presets ({presets.length})
            </button>
            {showPresetDropdown && presets.length > 0 && (
              <div className="absolute bottom-full left-0 mb-1 w-full bg-white border-2 border-gray-200 rounded-xl shadow-lg overflow-hidden z-10 max-h-40 overflow-y-auto">
                {presets.map((preset) => (
                  <div
                    key={preset.name}
                    className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 transition-colors"
                  >
                    <button
                      onClick={() => handleLoadPreset(preset)}
                      className="text-sm text-gray-700 truncate flex-1 text-left"
                    >
                      {preset.name}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeletePreset(preset.name) }}
                      className="p-0.5 rounded hover:bg-red-50 transition-colors ml-1"
                    >
                      <Trash2 className="size-3 text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Save preset */}
          <button
            onClick={() => setShowPresetSave((v) => !v)}
            disabled={activeFilterCount === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-[#0033A0] text-white hover:bg-[#002680] transition-colors disabled:opacity-50"
          >
            <Save className="size-3.5" />
            Save
          </button>
        </div>

        {showPresetSave && (
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSavePreset() }}
              placeholder="Preset name..."
              className="flex-1 px-2 py-1.5 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0033A0]"
              autoFocus
            />
            <button
              onClick={handleSavePreset}
              disabled={!presetName.trim()}
              className="px-2 py-1.5 rounded-lg text-sm font-semibold bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors disabled:opacity-50"
            >
              <Check className="size-4" />
            </button>
            <button
              onClick={() => { setShowPresetSave(false); setPresetName('') }}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="size-3.5 text-gray-400" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
