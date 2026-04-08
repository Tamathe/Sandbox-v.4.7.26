import Anthropic from '@anthropic-ai/sdk'

// ── Types ────────────────────────────────────────────────────────────────────

export type GapSeverity = 'error' | 'warning'

export interface GapFinding {
  nodeId: string
  issue: string
  suggestion: string
  severity: GapSeverity
}

export interface GapAnalysisResult {
  findings: GapFinding[]
}

export interface EdgeSuggestion {
  fromNodeId: string
  toNodeId: string
  edgeType: 'PREREQUISITE' | 'SEQUENCE' | 'CONCURRENT'
  reason: string
}

export interface EdgeSuggestionsResult {
  suggestions: EdgeSuggestion[]
}

// ── Helpers ──────────────────────────────────────────────────────────────────

interface NodeInput {
  id: string
  label: string
  nodeType: string
  unitType?: string
}

interface EdgeInput {
  fromNodeId: string
  toNodeId: string
  edgeType: string
}

function extractJson(text: string): string {
  // Try to extract JSON from markdown code fences or raw text
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch) return fenceMatch[1].trim()
  // Try raw JSON array/object
  const jsonMatch = text.match(/[\[{][\s\S]*[\]}]/)
  if (jsonMatch) return jsonMatch[0]
  return text
}

// ── Gap Analysis ─────────────────────────────────────────────────────────────

export async function runGapAnalysis(
  nodes: NodeInput[],
  edges: EdgeInput[],
): Promise<GapAnalysisResult> {
  if (nodes.length === 0) {
    return { findings: [] }
  }

  // Build context for the AI
  const nodeList = nodes.map((n) => `- ${n.id}: "${n.label}" (${n.unitType || n.nodeType})`).join('\n')
  const edgeList = edges.length > 0
    ? edges.map((e) => `- ${e.fromNodeId} → ${e.toNodeId} (${e.edgeType})`).join('\n')
    : '(no edges)'

  // Compute structural hints
  const incomingCount = new Map<string, number>()
  const outgoingCount = new Map<string, number>()
  for (const n of nodes) {
    incomingCount.set(n.id, 0)
    outgoingCount.set(n.id, 0)
  }
  for (const e of edges) {
    incomingCount.set(e.toNodeId, (incomingCount.get(e.toNodeId) || 0) + 1)
    outgoingCount.set(e.fromNodeId, (outgoingCount.get(e.fromNodeId) || 0) + 1)
  }

  const noIncoming = nodes.filter((n) => (incomingCount.get(n.id) || 0) === 0).map((n) => n.id)
  const noOutgoing = nodes.filter((n) => (outgoingCount.get(n.id) || 0) === 0).map((n) => n.id)

  const anthropic = new Anthropic()
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `You are a curriculum design expert. Analyze this course map graph for structural issues.

## Nodes
${nodeList}

## Edges
${edgeList}

## Structural hints
Nodes with no incoming edges (potential missing prerequisites): ${noIncoming.join(', ') || 'none'}
Nodes with no outgoing edges (potential dead ends): ${noOutgoing.join(', ') || 'none'}

## Instructions
Identify issues in the following categories:
1. **Missing prerequisite**: A unit that should have a prerequisite edge but doesn't (e.g., "Lab 3" should require "Lecture 3"). Having no incoming edge is fine for the very first unit in a sequence but suspicious for later units.
2. **Dead end**: A unit with no outgoing edges that logically should connect forward to something (e.g., a lecture that should lead to its lab or exam). The final unit in a course is naturally a dead end — don't flag it.
3. **Missing chain**: A prerequisite chain that should exist based on the naming/topic pattern (e.g., Week 1 → Week 2 → Week 3).

For each issue found, return a JSON object with:
- nodeId: the ID of the affected node
- issue: short description of the problem
- suggestion: actionable recommendation
- severity: "error" for missing prerequisites, "warning" for dead ends

Return ONLY a JSON array of findings. If there are no issues, return an empty array [].
Do not wrap in markdown code fences.`,
    }],
  })

  const text = msg.content[0].type === 'text' ? msg.content[0].text : '[]'

  try {
    const parsed = JSON.parse(extractJson(text))
    const findings = Array.isArray(parsed) ? parsed : []
    // Validate each finding has required fields and nodeId exists in our nodes
    const validNodeIds = new Set(nodes.map((n) => n.id))
    return {
      findings: findings
        .filter((f: GapFinding) =>
          f.nodeId && validNodeIds.has(f.nodeId) && f.issue && f.suggestion && f.severity
        )
        .map((f: GapFinding) => ({
          nodeId: f.nodeId,
          issue: f.issue,
          suggestion: f.suggestion,
          severity: f.severity === 'error' ? 'error' : 'warning',
        })),
    }
  } catch {
    return { findings: [] }
  }
}

// ── Edge Suggestions ─────────────────────────────────────────────────────────

export async function suggestEdges(
  nodes: NodeInput[],
  edges: EdgeInput[],
): Promise<EdgeSuggestionsResult> {
  if (nodes.length < 2) {
    return { suggestions: [] }
  }

  const nodeList = nodes.map((n) => `- ${n.id}: "${n.label}" (${n.unitType || n.nodeType})`).join('\n')
  const edgeList = edges.length > 0
    ? edges.map((e) => `- ${e.fromNodeId} → ${e.toNodeId} (${e.edgeType})`).join('\n')
    : '(no edges)'

  const anthropic = new Anthropic()
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `You are a curriculum design expert. Suggest new edges for this course map graph.

## Nodes
${nodeList}

## Existing Edges
${edgeList}

## Instructions
Based on the node labels and types, suggest new edges that should exist but don't.
Consider:
- Lectures that should be prerequisites for their corresponding labs/assignments
- Sequential topics (Week 1 → Week 2, Chapter 1 → Chapter 2)
- Exams/quizzes that should require their covered content
- Concurrent relationships (e.g., a lab running alongside its lecture)

Do NOT suggest edges that already exist. Do NOT suggest self-loops.

For each suggestion, return a JSON object with:
- fromNodeId: source node ID
- toNodeId: target node ID
- edgeType: "PREREQUISITE", "SEQUENCE", or "CONCURRENT"
- reason: brief explanation of why this edge should exist

Return ONLY a JSON array of suggestions. If no suggestions, return [].
Do not wrap in markdown code fences.`,
    }],
  })

  const text = msg.content[0].type === 'text' ? msg.content[0].text : '[]'

  try {
    const parsed = JSON.parse(extractJson(text))
    const suggestions = Array.isArray(parsed) ? parsed : []

    const validNodeIds = new Set(nodes.map((n) => n.id))
    const existingEdges = new Set(edges.map((e) => `${e.fromNodeId}→${e.toNodeId}`))

    return {
      suggestions: suggestions
        .filter((s: EdgeSuggestion) =>
          s.fromNodeId &&
          s.toNodeId &&
          s.fromNodeId !== s.toNodeId &&
          validNodeIds.has(s.fromNodeId) &&
          validNodeIds.has(s.toNodeId) &&
          !existingEdges.has(`${s.fromNodeId}→${s.toNodeId}`) &&
          ['PREREQUISITE', 'SEQUENCE', 'CONCURRENT'].includes(s.edgeType) &&
          s.reason
        )
        .map((s: EdgeSuggestion) => ({
          fromNodeId: s.fromNodeId,
          toNodeId: s.toNodeId,
          edgeType: s.edgeType,
          reason: s.reason,
        })),
    }
  } catch {
    return { suggestions: [] }
  }
}
