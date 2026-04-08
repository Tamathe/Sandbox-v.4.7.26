// ── Smart Automation Service (Task 98) ──────────────────────────────────────
// Client-side analysis engine for automated map insights.

// ── Types ───────────────────────────────────────────────────────────────────

export interface PrerequisiteSuggestion {
  fromNodeId: string
  fromLabel: string
  toNodeId: string
  toLabel: string
  reason: string
  confidence: number
}

export interface ScheduleConflict {
  nodeIds: string[]
  labels: string[]
  issue: string
  severity: 'high' | 'medium' | 'low'
  suggestion: string
}

export interface WorkloadEntry {
  weekLabel: string
  unitLabel: string
  nodeCount: number
  assessmentCount: number
  contentCount: number
  totalWeight: number
}

export interface WorkloadAnalysis {
  entries: WorkloadEntry[]
  average: number
  peak: number
  peakLabel: string
  imbalances: WorkloadImbalance[]
}

export interface WorkloadImbalance {
  label: string
  weight: number
  deviation: string
  severity: 'high' | 'medium' | 'low'
  suggestion: string
}

export interface HealthIssue {
  id: string
  category: 'orphan' | 'prerequisite' | 'schedule' | 'workload' | 'coverage' | 'structure'
  severity: 'high' | 'medium' | 'low'
  message: string
  nodeIds: string[]
  fix: FixSuggestion | null
}

export interface FixSuggestion {
  label: string
  action: FixAction
}

export type FixAction =
  | { type: 'addEdge'; fromNodeId: string; toNodeId: string; edgeType: string }
  | { type: 'removeNode'; nodeId: string }
  | { type: 'moveNode'; nodeId: string; xPos: number; yPos: number }
  | { type: 'addNode'; label: string; nodeType: string; afterNodeId: string }

export interface HealthReport {
  score: number // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  issues: HealthIssue[]
  summary: string
}

interface MapNode {
  id: string
  label: string
  nodeType: string
  xPos: number
  yPos: number
  courseUnitId: string | null
  archived: boolean
}

interface MapEdge {
  fromNodeId: string
  toNodeId: string
  edgeType: 'PREREQUISITE' | 'SEQUENCE' | 'CONCURRENT'
}

interface CourseUnit {
  id: string
  label: string
  position: number
  startDate: string | null
  endDate: string | null
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const ASSESSMENT_TYPES = new Set(['quiz', 'exam', 'test', 'assessment', 'midterm', 'final', 'assignment', 'homework'])

function isAssessment(node: MapNode): boolean {
  const lower = node.nodeType.toLowerCase()
  const labelLower = node.label.toLowerCase()
  return ASSESSMENT_TYPES.has(lower) || [...ASSESSMENT_TYPES].some((t) => labelLower.includes(t))
}

function extractNumber(label: string): number | null {
  const match = label.match(/(\d+)/)
  return match ? parseInt(match[1], 10) : null
}

function extractPrefix(label: string): string {
  return label.replace(/\s*\d+\s*$/, '').trim().toLowerCase()
}

// ── Main class ──────────────────────────────────────────────────────────────

export class SmartAutomationEngine {
  /**
   * Auto-detect likely prerequisite relationships.
   */
  detectPrerequisites(nodes: MapNode[], edges: MapEdge[]): PrerequisiteSuggestion[] {
    const suggestions: PrerequisiteSuggestion[] = []
    const existingEdges = new Set(edges.map((e) => `${e.fromNodeId}->${e.toNodeId}`))
    const active = nodes.filter((n) => !n.archived)

    // Pattern 1: Sequential numbering (Lab 1 → Lab 2)
    const groups = new Map<string, { node: MapNode; num: number }[]>()
    for (const node of active) {
      const num = extractNumber(node.label)
      if (num !== null) {
        const prefix = extractPrefix(node.label)
        if (!groups.has(prefix)) groups.set(prefix, [])
        groups.get(prefix)!.push({ node, num })
      }
    }
    for (const [prefix, group] of groups) {
      if (group.length < 2) continue
      group.sort((a, b) => a.num - b.num)
      for (let i = 0; i < group.length - 1; i++) {
        const from = group[i]
        const to = group[i + 1]
        if (!existingEdges.has(`${from.node.id}->${to.node.id}`)) {
          suggestions.push({
            fromNodeId: from.node.id,
            fromLabel: from.node.label,
            toNodeId: to.node.id,
            toLabel: to.node.label,
            reason: `Sequential "${prefix}" items: ${from.num} → ${to.num}`,
            confidence: 0.85,
          })
        }
      }
    }

    // Pattern 2: Intro/Basics → Advanced/Intermediate
    const introKeywords = /\b(intro|introduction|basics|overview|fundamentals|primer)\b/i
    const advancedKeywords = /\b(advanced|intermediate|in[- ]?depth|deep[- ]?dive|mastery)\b/i
    const intros = active.filter((n) => introKeywords.test(n.label))
    const advanced = active.filter((n) => advancedKeywords.test(n.label))

    for (const intro of intros) {
      for (const adv of advanced) {
        if (existingEdges.has(`${intro.id}->${adv.id}`)) continue
        if (this.topicSimilarity(intro.label, adv.label) > 0) {
          suggestions.push({
            fromNodeId: intro.id,
            fromLabel: intro.label,
            toNodeId: adv.id,
            toLabel: adv.label,
            reason: `Introductory content typically precedes advanced content`,
            confidence: 0.75,
          })
        }
      }
    }

    // Pattern 3: Content before its assessment
    const contentNodes = active.filter((n) => !isAssessment(n))
    const assessmentNodes = active.filter((n) => isAssessment(n))
    for (const assessment of assessmentNodes) {
      // Check if assessment has any prerequisites
      const hasPrereq = edges.some((e) => e.toNodeId === assessment.id)
      if (hasPrereq) continue

      // Find content in same unit
      const sameUnitContent = contentNodes.filter((c) => c.courseUnitId && c.courseUnitId === assessment.courseUnitId)
      for (const content of sameUnitContent) {
        if (!existingEdges.has(`${content.id}->${assessment.id}`)) {
          suggestions.push({
            fromNodeId: content.id,
            fromLabel: content.label,
            toNodeId: assessment.id,
            toLabel: assessment.label,
            reason: 'Content should precede its assessment within the same unit',
            confidence: 0.7,
          })
        }
      }
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence)
  }

  /**
   * Detect scheduling conflicts.
   */
  findScheduleConflicts(nodes: MapNode[], units: CourseUnit[]): ScheduleConflict[] {
    const conflicts: ScheduleConflict[] = []
    const active = nodes.filter((n) => !n.archived)
    const unitMap = new Map(units.map((u) => [u.id, u]))

    // Group assessments by unit
    const assessmentsByUnit = new Map<string, MapNode[]>()
    for (const node of active) {
      if (isAssessment(node) && node.courseUnitId) {
        if (!assessmentsByUnit.has(node.courseUnitId)) assessmentsByUnit.set(node.courseUnitId, [])
        assessmentsByUnit.get(node.courseUnitId)!.push(node)
      }
    }

    // Conflict 1: Too many assessments in one unit
    for (const [unitId, assessments] of assessmentsByUnit) {
      if (assessments.length >= 3) {
        const unit = unitMap.get(unitId)
        conflicts.push({
          nodeIds: assessments.map((a) => a.id),
          labels: assessments.map((a) => a.label),
          issue: `${assessments.length} assessments in "${unit?.label || 'unit'}"`,
          severity: 'high',
          suggestion: 'Consider spreading assessments across multiple units to reduce student load.',
        })
      }
    }

    // Conflict 2: Back-to-back assessment units
    const sortedUnits = [...units].sort((a, b) => a.position - b.position)
    for (let i = 0; i < sortedUnits.length - 1; i++) {
      const curr = sortedUnits[i]
      const next = sortedUnits[i + 1]
      const currAssessments = assessmentsByUnit.get(curr.id) || []
      const nextAssessments = assessmentsByUnit.get(next.id) || []
      if (currAssessments.length > 0 && nextAssessments.length > 0) {
        // Check if there's content between them
        const currContent = active.filter((n) => !isAssessment(n) && n.courseUnitId === curr.id)
        const nextContent = active.filter((n) => !isAssessment(n) && n.courseUnitId === next.id)
        if (currContent.length === 0 || nextContent.length === 0) {
          conflicts.push({
            nodeIds: [...currAssessments.map((a) => a.id), ...nextAssessments.map((a) => a.id)],
            labels: [...currAssessments.map((a) => a.label), ...nextAssessments.map((a) => a.label)],
            issue: `Back-to-back assessments between "${curr.label}" and "${next.label}"`,
            severity: 'medium',
            suggestion: 'Add review content between consecutive assessment units.',
          })
        }
      }
    }

    // Conflict 3: Empty units
    for (const unit of units) {
      const unitNodes = active.filter((n) => n.courseUnitId === unit.id)
      if (unitNodes.length === 0) {
        conflicts.push({
          nodeIds: [],
          labels: [],
          issue: `"${unit.label}" has no content nodes`,
          severity: 'low',
          suggestion: 'Consider adding content or removing this empty unit.',
        })
      }
    }

    return conflicts.sort((a, b) => {
      const sevOrder = { high: 0, medium: 1, low: 2 }
      return sevOrder[a.severity] - sevOrder[b.severity]
    })
  }

  /**
   * Analyze workload distribution across units.
   */
  analyzeWorkload(nodes: MapNode[], units: CourseUnit[]): WorkloadAnalysis {
    const active = nodes.filter((n) => !n.archived)
    const sortedUnits = [...units].sort((a, b) => a.position - b.position)

    const entries: WorkloadEntry[] = sortedUnits.map((unit) => {
      const unitNodes = active.filter((n) => n.courseUnitId === unit.id)
      const assessments = unitNodes.filter((n) => isAssessment(n))
      const content = unitNodes.filter((n) => !isAssessment(n))
      // Weight: assessments count double
      const weight = content.length + assessments.length * 2
      return {
        weekLabel: `Week ${unit.position + 1}`,
        unitLabel: unit.label,
        nodeCount: unitNodes.length,
        assessmentCount: assessments.length,
        contentCount: content.length,
        totalWeight: weight,
      }
    })

    const weights = entries.map((e) => e.totalWeight)
    const average = weights.length > 0 ? weights.reduce((a, b) => a + b, 0) / weights.length : 0
    const peak = Math.max(0, ...weights)
    const peakEntry = entries.find((e) => e.totalWeight === peak)

    // Detect imbalances
    const imbalances: WorkloadImbalance[] = []
    const stdDev = Math.sqrt(
      weights.reduce((sum, w) => sum + Math.pow(w - average, 2), 0) / Math.max(1, weights.length),
    )

    for (const entry of entries) {
      if (entry.totalWeight > average + stdDev * 1.5) {
        imbalances.push({
          label: entry.unitLabel,
          weight: entry.totalWeight,
          deviation: `${Math.round(((entry.totalWeight - average) / Math.max(1, average)) * 100)}% above average`,
          severity: entry.totalWeight > average + stdDev * 2 ? 'high' : 'medium',
          suggestion: `Consider moving some content from "${entry.unitLabel}" to lighter units.`,
        })
      } else if (entry.totalWeight < average - stdDev * 1.5 && entry.totalWeight > 0) {
        imbalances.push({
          label: entry.unitLabel,
          weight: entry.totalWeight,
          deviation: `${Math.round(((average - entry.totalWeight) / Math.max(1, average)) * 100)}% below average`,
          severity: 'low',
          suggestion: `"${entry.unitLabel}" is lighter than average. Consider adding more content or redistributing.`,
        })
      }
    }

    return {
      entries,
      average: Math.round(average * 10) / 10,
      peak,
      peakLabel: peakEntry?.unitLabel || '',
      imbalances,
    }
  }

  /**
   * Comprehensive health score (0-100).
   */
  scoreMapHealth(nodes: MapNode[], edges: MapEdge[], units: CourseUnit[]): HealthReport {
    const issues: HealthIssue[] = []
    const active = nodes.filter((n) => !n.archived)
    let issueId = 0

    // ── Orphan nodes ──────────────────────────────────────────────────────
    const connectedIds = new Set<string>()
    for (const e of edges) {
      connectedIds.add(e.fromNodeId)
      connectedIds.add(e.toNodeId)
    }
    const orphans = active.filter((n) => !connectedIds.has(n.id))
    for (const orphan of orphans) {
      // Find nearest node for fix suggestion
      let nearest: MapNode | null = null
      let minDist = Infinity
      for (const other of active) {
        if (other.id === orphan.id) continue
        const dist = Math.hypot(other.xPos - orphan.xPos, other.yPos - orphan.yPos)
        if (dist < minDist) { minDist = dist; nearest = other }
      }
      issues.push({
        id: `issue-${++issueId}`,
        category: 'orphan',
        severity: 'high',
        message: `"${orphan.label}" is disconnected from the map`,
        nodeIds: [orphan.id],
        fix: nearest ? {
          label: `Connect to "${nearest.label}"`,
          action: { type: 'addEdge', fromNodeId: nearest.id, toNodeId: orphan.id, edgeType: 'SEQUENCE' },
        } : null,
      })
    }

    // ── Missing prerequisites ─────────────────────────────────────────────
    const prereqs = this.detectPrerequisites(active, edges)
    for (const prereq of prereqs.slice(0, 10)) { // Cap at 10
      if (prereq.confidence >= 0.7) {
        issues.push({
          id: `issue-${++issueId}`,
          category: 'prerequisite',
          severity: prereq.confidence >= 0.8 ? 'high' : 'medium',
          message: `Missing link: "${prereq.fromLabel}" → "${prereq.toLabel}"`,
          nodeIds: [prereq.fromNodeId, prereq.toNodeId],
          fix: {
            label: `Add ${prereq.confidence >= 0.8 ? 'prerequisite' : 'sequence'} edge`,
            action: {
              type: 'addEdge',
              fromNodeId: prereq.fromNodeId,
              toNodeId: prereq.toNodeId,
              edgeType: prereq.confidence >= 0.8 ? 'PREREQUISITE' : 'SEQUENCE',
            },
          },
        })
      }
    }

    // ── Schedule conflicts ────────────────────────────────────────────────
    const conflicts = this.findScheduleConflicts(active, units)
    for (const conflict of conflicts) {
      issues.push({
        id: `issue-${++issueId}`,
        category: 'schedule',
        severity: conflict.severity,
        message: conflict.issue,
        nodeIds: conflict.nodeIds,
        fix: null,
      })
    }

    // ── Workload imbalances ───────────────────────────────────────────────
    const workload = this.analyzeWorkload(active, units)
    for (const imb of workload.imbalances) {
      issues.push({
        id: `issue-${++issueId}`,
        category: 'workload',
        severity: imb.severity,
        message: `${imb.label}: workload is ${imb.deviation}`,
        nodeIds: [],
        fix: null,
      })
    }

    // ── Coverage gaps ─────────────────────────────────────────────────────
    const unitsWithNodes = new Set(active.map((n) => n.courseUnitId).filter(Boolean))
    for (const unit of units) {
      if (!unitsWithNodes.has(unit.id)) {
        issues.push({
          id: `issue-${++issueId}`,
          category: 'coverage',
          severity: 'medium',
          message: `"${unit.label}" has no mapped content`,
          nodeIds: [],
          fix: {
            label: `Add content node to "${unit.label}"`,
            action: { type: 'addNode', label: `${unit.label} Content`, nodeType: 'CONTENT', afterNodeId: '' },
          },
        })
      }
    }

    // ── Structural issues ─────────────────────────────────────────────────
    // Check for cycles
    if (this.hasCycle(active, edges)) {
      issues.push({
        id: `issue-${++issueId}`,
        category: 'structure',
        severity: 'high',
        message: 'Circular dependency detected in prerequisite chain',
        nodeIds: [],
        fix: null,
      })
    }

    // Check for very long chains (> 10 sequential nodes)
    const longestChain = this.longestChainLength(active, edges)
    if (longestChain > 10) {
      issues.push({
        id: `issue-${++issueId}`,
        category: 'structure',
        severity: 'low',
        message: `Longest prerequisite chain is ${longestChain} nodes — students may feel blocked`,
        nodeIds: [],
        fix: null,
      })
    }

    // ── Score calculation ─────────────────────────────────────────────────
    const sevWeights = { high: 10, medium: 5, low: 2 }
    const penalty = issues.reduce((sum, i) => sum + sevWeights[i.severity], 0)
    const rawScore = Math.max(0, 100 - penalty)
    const score = Math.round(rawScore)
    const grade: HealthReport['grade'] =
      score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F'

    const highCount = issues.filter((i) => i.severity === 'high').length
    const medCount = issues.filter((i) => i.severity === 'medium').length
    const summary = score === 100
      ? 'Your course map is in excellent shape!'
      : `Found ${highCount} critical and ${medCount} moderate issue${medCount !== 1 ? 's' : ''}. ${
          highCount > 0 ? 'Address critical issues first.' : 'Minor improvements suggested.'
        }`

    return { score, grade, issues, summary }
  }

  /**
   * Convert health issues into fix operations.
   */
  generateFixSuggestions(report: HealthReport): FixSuggestion[] {
    return report.issues
      .filter((i) => i.fix !== null)
      .sort((a, b) => {
        const sevOrder = { high: 0, medium: 1, low: 2 }
        return sevOrder[a.severity] - sevOrder[b.severity]
      })
      .map((i) => i.fix!)
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  private topicSimilarity(label1: string, label2: string): number {
    const stopWords = new Set([
      'intro', 'introduction', 'advanced', 'intermediate', 'basics',
      'fundamentals', 'overview', 'deep', 'dive', 'mastery', 'primer',
      'the', 'a', 'an', 'to', 'of', 'in', 'for',
    ])
    const words1 = label1.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter((w) => w.length > 2 && !stopWords.has(w))
    const words2 = new Set(label2.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter((w) => w.length > 2 && !stopWords.has(w)))
    let overlap = 0
    for (const w of words1) {
      if (words2.has(w)) overlap++
    }
    return overlap
  }

  private hasCycle(nodes: MapNode[], edges: MapEdge[]): boolean {
    const nodeIds = new Set(nodes.map((n) => n.id))
    const adj = new Map<string, string[]>()
    for (const id of nodeIds) adj.set(id, [])
    for (const e of edges) {
      if (nodeIds.has(e.fromNodeId) && nodeIds.has(e.toNodeId)) {
        adj.get(e.fromNodeId)!.push(e.toNodeId)
      }
    }

    const WHITE = 0, GRAY = 1, BLACK = 2
    const color = new Map<string, number>()
    for (const id of nodeIds) color.set(id, WHITE)

    const dfs = (id: string): boolean => {
      color.set(id, GRAY)
      for (const next of adj.get(id) || []) {
        if (color.get(next) === GRAY) return true
        if (color.get(next) === WHITE && dfs(next)) return true
      }
      color.set(id, BLACK)
      return false
    }

    for (const id of nodeIds) {
      if (color.get(id) === WHITE && dfs(id)) return true
    }
    return false
  }

  private longestChainLength(nodes: MapNode[], edges: MapEdge[]): number {
    const nodeIds = new Set(nodes.map((n) => n.id))
    const adj = new Map<string, string[]>()
    const inDegree = new Map<string, number>()
    for (const id of nodeIds) { adj.set(id, []); inDegree.set(id, 0) }
    for (const e of edges) {
      if (nodeIds.has(e.fromNodeId) && nodeIds.has(e.toNodeId)) {
        adj.get(e.fromNodeId)!.push(e.toNodeId)
        inDegree.set(e.toNodeId, (inDegree.get(e.toNodeId) || 0) + 1)
      }
    }

    // Topological sort + longest path
    const dist = new Map<string, number>()
    for (const id of nodeIds) dist.set(id, 1)
    const queue = [...inDegree.entries()].filter(([, d]) => d === 0).map(([id]) => id)
    const visited: string[] = []

    while (queue.length > 0) {
      const curr = queue.shift()!
      visited.push(curr)
      for (const next of adj.get(curr) || []) {
        dist.set(next, Math.max(dist.get(next) || 1, (dist.get(curr) || 1) + 1))
        inDegree.set(next, (inDegree.get(next) || 1) - 1)
        if (inDegree.get(next) === 0) queue.push(next)
      }
    }

    return Math.max(0, ...dist.values())
  }
}
