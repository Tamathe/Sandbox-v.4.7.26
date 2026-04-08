import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../prisma'
import { toJsonValue } from '../prisma-utils'
import type { MapEdgeType, CourseMapUnitType, MapNodeType } from '../../generated/prisma'
import { notifyCourseMapChange } from './notification-service'

// ── Types ────────────────────────────────────────────────────────────────────

export type SuggestionType = 'reorder' | 'add_prerequisite' | 'regroup' | 'remove_redundant'

export interface AISuggestion {
  id: string
  type: SuggestionType
  description: string
  affectedNodeIds: string[]
  proposedChanges: { action: string; details: Record<string, unknown> }
}

export interface SuggestImprovementsResult {
  suggestions: AISuggestion[]
  summary: string
}

export type NLChangeAction = 'add_node' | 'remove_node' | 'move_node' | 'rename_node' | 'add_edge' | 'remove_edge' | 'regroup'

export interface NLChange {
  action: NLChangeAction
  details: Record<string, unknown>
  description: string
}

export interface NLEditResult {
  changes: NLChange[]
  summary: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

interface NodeInput {
  id: string
  label: string
  nodeType: string
  unitType?: string
  xPos: number
  yPos: number
}

interface EdgeInput {
  id: string
  fromNodeId: string
  toNodeId: string
  edgeType: string
}

function extractJson(text: string): string {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch) return fenceMatch[1].trim()
  const jsonMatch = text.match(/[\[{][\s\S]*[\]}]/)
  if (jsonMatch) return jsonMatch[0]
  return text
}

async function fetchMapData(courseId: string) {
  const courseMap = await prisma.courseMap.findUnique({
    where: { courseId },
    include: {
      nodes: {
        where: { archived: false },
        include: { courseUnit: { select: { unitType: true } } },
      },
      edges: true,
    },
  })
  if (!courseMap) return null

  const nodes: NodeInput[] = courseMap.nodes.map((n) => ({
    id: n.id,
    label: n.label,
    nodeType: n.nodeType,
    unitType: n.courseUnit?.unitType ?? undefined,
    xPos: n.xPos,
    yPos: n.yPos,
  }))

  const edges: EdgeInput[] = courseMap.edges.map((e) => ({
    id: e.id,
    fromNodeId: e.fromNodeId,
    toNodeId: e.toNodeId,
    edgeType: e.edgeType,
  }))

  return { courseMap, nodes, edges }
}

// ── AI Suggestions (Task 43) ─────────────────────────────────────────────────

export async function suggestImprovements(courseId: string): Promise<SuggestImprovementsResult> {
  const data = await fetchMapData(courseId)
  if (!data || data.nodes.length === 0) {
    return { suggestions: [], summary: 'No nodes to analyze.' }
  }

  const { nodes, edges } = data
  const nodeList = nodes.map((n) => `- ${n.id}: "${n.label}" (${n.unitType || n.nodeType}, pos: ${Math.round(n.xPos)},${Math.round(n.yPos)})`).join('\n')
  const edgeList = edges.length > 0
    ? edges.map((e) => `- ${e.fromNodeId} → ${e.toNodeId} (${e.edgeType})`).join('\n')
    : '(no edges)'

  const anthropic = new Anthropic()
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `You are a curriculum design expert. Analyze this course map and suggest structural improvements.

## Nodes
${nodeList}

## Edges
${edgeList}

## Instructions
Suggest up to 5 improvements from these categories:
1. **reorder**: Units that should be taught in a different sequence
2. **add_prerequisite**: Missing prerequisite edges that should exist
3. **regroup**: Units that should be grouped closer together visually
4. **remove_redundant**: Redundant edges or connections that add complexity without value

For each suggestion, return a JSON object with:
- id: a unique slug (e.g., "add-prereq-lab3")
- type: one of "reorder", "add_prerequisite", "regroup", "remove_redundant"
- description: clear explanation of the improvement
- affectedNodeIds: array of node IDs involved
- proposedChanges: object with "action" (string) and "details" (object with relevant data)
  - For add_prerequisite: action="create_edge", details={fromNodeId, toNodeId, edgeType}
  - For remove_redundant: action="delete_edge", details={fromNodeId, toNodeId}
  - For reorder: action="reorder_nodes", details={nodeId, newPosition: {x, y}}
  - For regroup: action="move_nodes", details={nodeIds: string[], offsetX, offsetY}

Also include a "summary" field with a 1-2 sentence overview.

Return JSON: { "suggestions": [...], "summary": "..." }
Do not wrap in markdown code fences.`,
    }],
  })

  const text = msg.content[0].type === 'text' ? msg.content[0].text : '{}'

  try {
    const parsed = JSON.parse(extractJson(text))
    const suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : []
    const validNodeIds = new Set(nodes.map((n) => n.id))

    return {
      suggestions: suggestions
        .filter((s: AISuggestion) =>
          s.id && s.type && s.description && s.affectedNodeIds &&
          ['reorder', 'add_prerequisite', 'regroup', 'remove_redundant'].includes(s.type) &&
          s.affectedNodeIds.every((id: string) => validNodeIds.has(id))
        )
        .slice(0, 5)
        .map((s: AISuggestion) => ({
          id: s.id,
          type: s.type,
          description: s.description,
          affectedNodeIds: s.affectedNodeIds,
          proposedChanges: s.proposedChanges || { action: 'unknown', details: {} },
        })),
      summary: typeof parsed.summary === 'string' ? parsed.summary : 'Analysis complete.',
    }
  } catch {
    return { suggestions: [], summary: 'Failed to parse AI response.' }
  }
}

export async function applySuggestion(
  courseId: string,
  userId: string,
  suggestion: AISuggestion,
): Promise<{ success: boolean; error?: string }> {
  const data = await fetchMapData(courseId)
  if (!data) return { success: false, error: 'Course map not found' }

  const { courseMap } = data
  const { action, details } = suggestion.proposedChanges

  try {
    switch (action) {
      case 'create_edge': {
        const { fromNodeId, toNodeId, edgeType } = details as { fromNodeId: string; toNodeId: string; edgeType: string }
        if (!fromNodeId || !toNodeId || !edgeType) return { success: false, error: 'Missing edge details' }

        // Check no duplicate
        const existing = await prisma.mapEdge.findFirst({
          where: { courseMapId: courseMap.id, fromNodeId, toNodeId },
        })
        if (existing) return { success: false, error: 'Edge already exists' }

        await prisma.mapEdge.create({
          data: {
            courseMapId: courseMap.id,
            fromNodeId,
            toNodeId,
            edgeType: edgeType as MapEdgeType,
          },
        })
        break
      }
      case 'delete_edge': {
        const { fromNodeId, toNodeId } = details as { fromNodeId: string; toNodeId: string }
        const edge = await prisma.mapEdge.findFirst({
          where: { courseMapId: courseMap.id, fromNodeId, toNodeId },
        })
        if (edge) {
          await prisma.mapEdge.delete({ where: { id: edge.id } })
        }
        break
      }
      case 'reorder_nodes': {
        const { nodeId, newPosition } = details as { nodeId: string; newPosition: { x: number; y: number } }
        if (nodeId && newPosition) {
          await prisma.mapNode.update({
            where: { id: nodeId },
            data: { xPos: newPosition.x, yPos: newPosition.y },
          })
        }
        break
      }
      case 'move_nodes': {
        const { nodeIds, offsetX, offsetY } = details as { nodeIds: string[]; offsetX: number; offsetY: number }
        if (Array.isArray(nodeIds) && typeof offsetX === 'number' && typeof offsetY === 'number') {
          for (const nodeId of nodeIds) {
            const node = await prisma.mapNode.findUnique({ where: { id: nodeId }, select: { xPos: true, yPos: true } })
            if (node) {
              await prisma.mapNode.update({
                where: { id: nodeId },
                data: { xPos: node.xPos + offsetX, yPos: node.yPos + offsetY },
              })
            }
          }
        }
        break
      }
      default:
        return { success: false, error: `Unknown action: ${action}` }
    }

    // Record the edit
    await prisma.courseMapEdit.create({
      data: {
        courseId,
        userId,
        editType: `AI_SUGGESTION_${suggestion.type.toUpperCase()}`,
        weekNumber: 0,
        payload: toJsonValue({ suggestionId: suggestion.id, action, details }),
      },
    })

    // Fire-and-forget notification
    notifyCourseMapChange(courseId, userId, 'node_modified')

    return { success: true }
  } catch (err) {
    console.error('[applySuggestion] Error:', err)
    return { success: false, error: 'Failed to apply suggestion' }
  }
}

// ── Natural Language Editing (Task 44) ───────────────────────────────────────

export async function processNaturalLanguageEdit(
  courseId: string,
  instruction: string,
): Promise<NLEditResult> {
  const data = await fetchMapData(courseId)
  if (!data || data.nodes.length === 0) {
    return { changes: [], summary: 'No course map found.' }
  }

  const { nodes, edges } = data
  const nodeList = nodes.map((n) => `- ${n.id}: "${n.label}" (${n.unitType || n.nodeType}, pos: ${Math.round(n.xPos)},${Math.round(n.yPos)})`).join('\n')
  const edgeList = edges.length > 0
    ? edges.map((e) => `- ${e.id}: ${e.fromNodeId} → ${e.toNodeId} (${e.edgeType})`).join('\n')
    : '(no edges)'

  const anthropic = new Anthropic()
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `You are a curriculum design assistant. A course map editor wants to make changes described in plain English. Interpret their instruction and translate it into specific graph operations.

## Current Nodes
${nodeList}

## Current Edges
${edgeList}

## User Instruction
"${instruction}"

## Available Actions
- add_node: details={label, nodeType, xPos, yPos} — creates a new node
- remove_node: details={nodeId} — archives (soft-deletes) a node
- move_node: details={nodeId, xPos, yPos} — moves a node to new position
- rename_node: details={nodeId, newLabel} — changes a node's label
- add_edge: details={fromNodeId, toNodeId, edgeType} — creates edge (PREREQUISITE, SEQUENCE, or CONCURRENT)
- remove_edge: details={edgeId} — removes an edge
- regroup: details={nodeIds, offsetX, offsetY} — moves a group of nodes together

## Rules
- Only reference existing node IDs and edge IDs from the lists above
- For add_node, pick reasonable positions near related nodes
- edgeType must be one of: PREREQUISITE, SEQUENCE, CONCURRENT
- When removing connections, use the edge ID from the edge list

Return JSON: { "changes": [{ "action": "...", "details": {...}, "description": "..." }, ...], "summary": "..." }
Do not wrap in markdown code fences.`,
    }],
  })

  const text = msg.content[0].type === 'text' ? msg.content[0].text : '{}'

  try {
    const parsed = JSON.parse(extractJson(text))
    const changes = Array.isArray(parsed.changes) ? parsed.changes : []
    const validNodeIds = new Set(nodes.map((n) => n.id))
    const validEdgeIds = new Set(edges.map((e) => e.id))
    const validActions = new Set<string>(['add_node', 'remove_node', 'move_node', 'rename_node', 'add_edge', 'remove_edge', 'regroup'])

    return {
      changes: changes
        .filter((c: NLChange) => c.action && validActions.has(c.action) && c.description)
        .filter((c: NLChange) => {
          const d = c.details as Record<string, unknown>
          switch (c.action) {
            case 'add_node': return d.label && d.nodeType
            case 'remove_node': return d.nodeId && validNodeIds.has(d.nodeId as string)
            case 'move_node': return d.nodeId && validNodeIds.has(d.nodeId as string) && typeof d.xPos === 'number'
            case 'rename_node': return d.nodeId && validNodeIds.has(d.nodeId as string) && d.newLabel
            case 'add_edge': return d.fromNodeId && d.toNodeId && d.edgeType
            case 'remove_edge': return d.edgeId && validEdgeIds.has(d.edgeId as string)
            case 'regroup': return Array.isArray(d.nodeIds)
            default: return false
          }
        })
        .map((c: NLChange) => ({
          action: c.action,
          details: c.details,
          description: c.description,
        })),
      summary: typeof parsed.summary === 'string' ? parsed.summary : 'Changes parsed.',
    }
  } catch {
    return { changes: [], summary: 'Failed to parse AI response.' }
  }
}

export async function applyNaturalLanguageChanges(
  courseId: string,
  userId: string,
  changes: NLChange[],
): Promise<{ success: boolean; appliedCount: number; error?: string }> {
  const data = await fetchMapData(courseId)
  if (!data) return { success: false, appliedCount: 0, error: 'Course map not found' }

  const { courseMap } = data
  let appliedCount = 0

  try {
    for (const change of changes) {
      const d = change.details as Record<string, unknown>

      switch (change.action) {
        case 'add_node': {
          // We need a CourseUnit to attach the node to; create one
          const unit = await prisma.courseUnit.create({
            data: {
              courseMapId: courseMap.id,
              label: d.label as string,
              unitType: ((d.nodeType as string) || 'LECTURE') as CourseMapUnitType,
              position: 0,
            },
          })
          await prisma.mapNode.create({
            data: {
              courseMapId: courseMap.id,
              courseUnitId: unit.id,
              label: d.label as string,
              nodeType: ((d.nodeType as string) || 'UNIT') as MapNodeType,
              xPos: (d.xPos as number) || 0,
              yPos: (d.yPos as number) || 0,
            },
          })
          appliedCount++
          break
        }
        case 'remove_node': {
          await prisma.mapNode.update({
            where: { id: d.nodeId as string },
            data: { archived: true },
          })
          appliedCount++
          break
        }
        case 'move_node': {
          await prisma.mapNode.update({
            where: { id: d.nodeId as string },
            data: { xPos: d.xPos as number, yPos: d.yPos as number },
          })
          appliedCount++
          break
        }
        case 'rename_node': {
          await prisma.mapNode.update({
            where: { id: d.nodeId as string },
            data: { label: d.newLabel as string },
          })
          appliedCount++
          break
        }
        case 'add_edge': {
          const fromId = d.fromNodeId as string
          const toId = d.toNodeId as string
          const existing = await prisma.mapEdge.findFirst({
            where: { courseMapId: courseMap.id, fromNodeId: fromId, toNodeId: toId },
          })
          if (!existing) {
            await prisma.mapEdge.create({
              data: {
                courseMapId: courseMap.id,
                fromNodeId: fromId,
                toNodeId: toId,
                edgeType: (d.edgeType as MapEdgeType) || 'SEQUENCE',
              },
            })
            appliedCount++
          }
          break
        }
        case 'remove_edge': {
          await prisma.mapEdge.delete({ where: { id: d.edgeId as string } })
          appliedCount++
          break
        }
        case 'regroup': {
          const nodeIds = d.nodeIds as string[]
          const offsetX = (d.offsetX as number) || 0
          const offsetY = (d.offsetY as number) || 0
          for (const nodeId of nodeIds) {
            const node = await prisma.mapNode.findUnique({ where: { id: nodeId }, select: { xPos: true, yPos: true } })
            if (node) {
              await prisma.mapNode.update({
                where: { id: nodeId },
                data: { xPos: node.xPos + offsetX, yPos: node.yPos + offsetY },
              })
            }
          }
          appliedCount++
          break
        }
      }
    }

    // Record the edit
    await prisma.courseMapEdit.create({
      data: {
        courseId,
        userId,
        editType: 'AI_NL_EDIT',
        weekNumber: 0,
        payload: toJsonValue({ changeCount: appliedCount, changes: changes.map((c) => ({ action: c.action, description: c.description })) }),
      },
    })

    notifyCourseMapChange(courseId, userId, 'node_modified')

    return { success: true, appliedCount }
  } catch (err) {
    console.error('[applyNaturalLanguageChanges] Error:', err)
    return { success: false, appliedCount, error: 'Failed to apply some changes' }
  }
}
