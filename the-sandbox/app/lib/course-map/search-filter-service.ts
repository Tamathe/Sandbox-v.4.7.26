// ── Course Map Search & Filter Service ──────────────────────────────────────
// Full-text fuzzy search, multi-filter panel, and filter presets for course map
// nodes and edges. All state is client-side; presets persist via localStorage.

// ── Types ────────────────────────────────────────────────────────────────────

export interface SearchableNode {
  id: string
  label: string
  description?: string | null
  nodeType: string
  courseUnitId: string | null
  xPos: number
  yPos: number
  archived: boolean
  unitType?: string
  startDate?: string | null
  endDate?: string | null
}

export interface SearchableEdge {
  id: string
  fromNodeId: string
  toNodeId: string
  edgeType: string
}

export type NodeProgressStatus = 'completed' | 'in-progress' | 'not-started'

export interface SearchResult {
  nodeId: string
  label: string
  score: number
  highlights: { field: string; snippet: string }[]
}

export interface FilterCriteria {
  type: 'unitType' | 'dateRange' | 'edgeType' | 'progress'
  unitTypes?: string[]
  startDate?: string
  endDate?: string
  edgeTypes?: string[]
  progressStatuses?: NodeProgressStatus[]
}

export interface FilterPreset {
  name: string
  filters: FilterCriteria[]
  createdAt: string
}

export interface ActiveFilters {
  unitTypes: string[]
  dateRange: { start: string; end: string } | null
  edgeTypes: string[]
  progressStatuses: NodeProgressStatus[]
}

const PRESET_STORAGE_KEY = 'course-map-filter-presets'

// ── Fuzzy Search ─────────────────────────────────────────────────────────────

function fuzzyMatch(text: string, query: string): { match: boolean; score: number; indices: number[] } {
  const lower = text.toLowerCase()
  const q = query.toLowerCase()
  const indices: number[] = []
  let qi = 0
  let score = 0

  for (let i = 0; i < lower.length && qi < q.length; i++) {
    if (lower[i] === q[qi]) {
      indices.push(i)
      // Consecutive matches score higher
      if (indices.length > 1 && indices[indices.length - 1] === indices[indices.length - 2] + 1) {
        score += 3
      } else {
        score += 1
      }
      // Bonus for match at start of word
      if (i === 0 || text[i - 1] === ' ' || text[i - 1] === '-' || text[i - 1] === '_') {
        score += 2
      }
      qi++
    }
  }

  const match = qi === q.length
  // Bonus for shorter strings (closer to exact match)
  if (match) {
    score += Math.max(0, 10 - (text.length - query.length))
  }

  return { match, score, indices }
}

function escapeHtml(char: string): string {
  switch (char) {
    case '&': return '&amp;'
    case '<': return '&lt;'
    case '>': return '&gt;'
    case '"': return '&quot;'
    default: return char
  }
}

function highlightMatch(text: string, indices: number[]): string {
  if (indices.length === 0) return text
  let result = ''
  let idxPos = 0
  for (let i = 0; i < text.length; i++) {
    const safe = escapeHtml(text[i])
    if (idxPos < indices.length && i === indices[idxPos]) {
      result += `<mark>${safe}</mark>`
      idxPos++
    } else {
      result += safe
    }
  }
  return result
}

// ── SearchFilterService ──────────────────────────────────────────────────────

export class SearchFilterService {
  /**
   * Fuzzy-match nodes against a query string on label, description, and unitType.
   * Returns ranked results with highlight snippets.
   */
  searchNodes(nodes: SearchableNode[], query: string): SearchResult[] {
    if (!query.trim()) return []
    const q = query.trim()
    const results: SearchResult[] = []

    for (const node of nodes) {
      if (node.archived) continue

      let bestScore = 0
      const highlights: { field: string; snippet: string }[] = []

      // Match label
      const labelMatch = fuzzyMatch(node.label, q)
      if (labelMatch.match) {
        bestScore = Math.max(bestScore, labelMatch.score + 10) // label gets priority
        highlights.push({ field: 'label', snippet: highlightMatch(node.label, labelMatch.indices) })
      }

      // Match description
      if (node.description) {
        const descMatch = fuzzyMatch(node.description, q)
        if (descMatch.match) {
          bestScore = Math.max(bestScore, descMatch.score)
          const snippet = node.description.length > 80
            ? node.description.substring(0, 80) + '...'
            : node.description
          highlights.push({ field: 'description', snippet: highlightMatch(snippet, descMatch.indices.filter((i) => i < snippet.length)) })
        }
      }

      // Match unitType
      const unitType = node.unitType || node.nodeType
      if (unitType) {
        const typeMatch = fuzzyMatch(unitType, q)
        if (typeMatch.match) {
          bestScore = Math.max(bestScore, typeMatch.score)
          highlights.push({ field: 'unitType', snippet: highlightMatch(unitType, typeMatch.indices) })
        }
      }

      if (highlights.length > 0) {
        results.push({ nodeId: node.id, label: node.label, score: bestScore, highlights })
      }
    }

    return results.sort((a, b) => b.score - a.score)
  }

  /**
   * Filter nodes by one or more unit types.
   */
  filterByUnitType(nodes: SearchableNode[], types: string[]): SearchableNode[] {
    if (types.length === 0) return nodes
    const typeSet = new Set(types.map((t) => t.toUpperCase()))
    return nodes.filter((n) => {
      const nodeType = (n.unitType || n.nodeType || '').toUpperCase()
      return typeSet.has(nodeType)
    })
  }

  /**
   * Filter nodes by date range (startDate/endDate overlap).
   */
  filterByDateRange(nodes: SearchableNode[], startDate: string, endDate: string): SearchableNode[] {
    const rangeStart = new Date(startDate).getTime()
    const rangeEnd = new Date(endDate).getTime()

    return nodes.filter((n) => {
      if (!n.startDate && !n.endDate) return false
      const nodeStart = n.startDate ? new Date(n.startDate).getTime() : -Infinity
      const nodeEnd = n.endDate ? new Date(n.endDate).getTime() : Infinity
      // Overlap check
      return nodeStart <= rangeEnd && nodeEnd >= rangeStart
    })
  }

  /**
   * Filter edges by relationship type.
   */
  filterByEdgeType(edges: SearchableEdge[], types: string[]): SearchableEdge[] {
    if (types.length === 0) return edges
    const typeSet = new Set(types.map((t) => t.toUpperCase()))
    return edges.filter((e) => typeSet.has(e.edgeType.toUpperCase()))
  }

  /**
   * Filter nodes by completion status using a progress map.
   */
  filterByProgress(
    nodes: SearchableNode[],
    progressMap: Map<string, { status: NodeProgressStatus }>,
    statuses: NodeProgressStatus[],
  ): SearchableNode[] {
    if (statuses.length === 0) return nodes
    const statusSet = new Set(statuses)
    return nodes.filter((n) => {
      const progress = progressMap.get(n.id)
      const status = progress?.status || 'not-started'
      return statusSet.has(status)
    })
  }

  /**
   * Apply multiple filters with AND logic. Returns filtered node IDs.
   */
  combineFilters(
    nodes: SearchableNode[],
    edges: SearchableEdge[],
    filters: ActiveFilters,
    progressMap?: Map<string, { status: NodeProgressStatus }>,
  ): { filteredNodeIds: Set<string>; filteredEdgeIds: Set<string> } {
    let filtered = nodes.filter((n) => !n.archived)
    let filteredEdges = edges

    // Unit type filter
    if (filters.unitTypes.length > 0) {
      filtered = this.filterByUnitType(filtered, filters.unitTypes)
    }

    // Date range filter
    if (filters.dateRange) {
      filtered = this.filterByDateRange(filtered, filters.dateRange.start, filters.dateRange.end)
    }

    // Progress filter
    if (filters.progressStatuses.length > 0 && progressMap) {
      filtered = this.filterByProgress(filtered, progressMap, filters.progressStatuses)
    }

    // Edge type filter
    if (filters.edgeTypes.length > 0) {
      filteredEdges = this.filterByEdgeType(edges, filters.edgeTypes)
    }

    const filteredNodeIds = new Set(filtered.map((n) => n.id))
    const filteredEdgeIds = new Set(filteredEdges.map((e) => e.id))

    return { filteredNodeIds, filteredEdgeIds }
  }

  /**
   * Check if any filter is active.
   */
  hasActiveFilters(filters: ActiveFilters): boolean {
    return (
      filters.unitTypes.length > 0 ||
      filters.dateRange !== null ||
      filters.edgeTypes.length > 0 ||
      filters.progressStatuses.length > 0
    )
  }

  /**
   * Save a filter preset to localStorage.
   */
  saveFilterPreset(name: string, filters: ActiveFilters): void {
    const presets = this.loadFilterPresets()
    const criteria: FilterCriteria[] = []

    if (filters.unitTypes.length > 0) {
      criteria.push({ type: 'unitType', unitTypes: filters.unitTypes })
    }
    if (filters.dateRange) {
      criteria.push({ type: 'dateRange', startDate: filters.dateRange.start, endDate: filters.dateRange.end })
    }
    if (filters.edgeTypes.length > 0) {
      criteria.push({ type: 'edgeType', edgeTypes: filters.edgeTypes })
    }
    if (filters.progressStatuses.length > 0) {
      criteria.push({ type: 'progress', progressStatuses: filters.progressStatuses })
    }

    // Update or add
    const idx = presets.findIndex((p) => p.name === name)
    const preset: FilterPreset = { name, filters: criteria, createdAt: new Date().toISOString() }
    if (idx >= 0) {
      presets[idx] = preset
    } else {
      presets.push(preset)
    }

    try {
      localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets))
    } catch {
      // localStorage full or unavailable
    }
  }

  /**
   * Load saved filter presets from localStorage.
   */
  loadFilterPresets(): FilterPreset[] {
    try {
      const raw = localStorage.getItem(PRESET_STORAGE_KEY)
      if (!raw) return []
      return JSON.parse(raw) as FilterPreset[]
    } catch {
      return []
    }
  }

  /**
   * Delete a saved preset by name.
   */
  deleteFilterPreset(name: string): void {
    const presets = this.loadFilterPresets().filter((p) => p.name !== name)
    try {
      localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets))
    } catch {
      // ignore
    }
  }

  /**
   * Convert a FilterPreset back into ActiveFilters.
   */
  presetToActiveFilters(preset: FilterPreset): ActiveFilters {
    const result: ActiveFilters = {
      unitTypes: [],
      dateRange: null,
      edgeTypes: [],
      progressStatuses: [],
    }

    for (const c of preset.filters) {
      switch (c.type) {
        case 'unitType':
          result.unitTypes = c.unitTypes || []
          break
        case 'dateRange':
          if (c.startDate && c.endDate) {
            result.dateRange = { start: c.startDate, end: c.endDate }
          }
          break
        case 'edgeType':
          result.edgeTypes = c.edgeTypes || []
          break
        case 'progress':
          result.progressStatuses = c.progressStatuses || []
          break
      }
    }

    return result
  }
}

// Singleton for convenience
export const searchFilterService = new SearchFilterService()
