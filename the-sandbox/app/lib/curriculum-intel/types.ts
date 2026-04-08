/**
 * Curriculum Intelligence Network — Shared Types
 */

// ── Node Types ──────────────────────────────────────────────────────────────

export type CurriculumNodeType = 'objective' | 'concept' | 'skill'

export type BloomLevel =
  | 'knowledge'
  | 'comprehension'
  | 'application'
  | 'analysis'
  | 'synthesis'
  | 'evaluation'

export const BLOOM_LEVELS: BloomLevel[] = [
  'knowledge',
  'comprehension',
  'application',
  'analysis',
  'synthesis',
  'evaluation',
]

export const BLOOM_COLORS: Record<BloomLevel, string> = {
  knowledge: '#3b82f6',
  comprehension: '#06b6d4',
  application: '#22c55e',
  analysis: '#eab308',
  synthesis: '#f97316',
  evaluation: '#ef4444',
}

// ── Insight Types ───────────────────────────────────────────────────────────

export type InsightType =
  | 'gap'
  | 'redundancy'
  | 'pathway-optimization'
  | 'bloom-imbalance'
  | 'tool-effectiveness'

export type InsightSeverity = 'info' | 'moderate' | 'significant'

export type InsightStatus = 'new' | 'reviewed' | 'acted' | 'dismissed'

export interface CurriculumInsightData {
  type: InsightType
  severity: InsightSeverity
  title: string
  description: string
  affectedNodes: string[]
  affectedCourses?: string[]
  recommendation?: string
}

// ── Course Role ─────────────────────────────────────────────────────────────

export type CourseRole = 'teaches' | 'requires' | 'reinforces'

// ── Graph Visualization ─────────────────────────────────────────────────────

export interface GraphNode {
  id: string
  label: string
  type: CurriculumNodeType
  bloomLevel: BloomLevel | null
  department: string | null
  avgMastery: number | null
  courseCount: number
}

export interface GraphEdge {
  id: string
  sourceId: string
  targetId: string
  strength: number
  evidence: string | null
}

export interface CurriculumGraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
  stats: {
    totalNodes: number
    totalEdges: number
    departments: string[]
    avgMastery: number | null
  }
}

// ── Node Detail ─────────────────────────────────────────────────────────────

export interface NodeDetail {
  id: string
  label: string
  type: CurriculumNodeType
  bloomLevel: BloomLevel | null
  department: string | null
  avgMastery: number | null
  masteryVariance: number | null
  bestCourse: string | null
  bestTool: string | null
  computedAt: Date | null
  courses: {
    courseId: string
    role: string
    bloomLevel: string | null
  }[]
  prerequisites: {
    id: string
    label: string
    strength: number
  }[]
  dependents: {
    id: string
    label: string
    strength: number
  }[]
}

// ── Department View ─────────────────────────────────────────────────────────

export interface DepartmentBloomBreakdown {
  department: string
  counts: Record<BloomLevel, number>
  total: number
}

export interface DepartmentView {
  department: string
  nodeCount: number
  bloomBreakdown: Record<BloomLevel, number>
  avgMastery: number | null
  topGaps: CurriculumInsightData[]
}
