import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../prisma'

// ── Types ────────────────────────────────────────────────────────────────────

export type PrereqStatus = 'ok' | 'gap' | 'partial'

export interface PrereqValidation {
  nodeId: string
  nodeLabel: string
  prerequisiteNodeId: string
  prerequisiteLabel: string
  status: PrereqStatus
  suggestion: string
}

export interface PrereqValidationResult {
  validations: PrereqValidation[]
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractJson(text: string): string {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch) return fenceMatch[1].trim()
  const jsonMatch = text.match(/[\[{][\s\S]*[\]}]/)
  if (jsonMatch) return jsonMatch[0]
  return text
}

// ── Main ─────────────────────────────────────────────────────────────────────

export async function validatePrerequisites(
  courseId: string,
): Promise<PrereqValidationResult> {
  // 1. Fetch course map with nodes, edges, and unit details
  const courseMap = await prisma.courseMap.findUnique({
    where: { courseId },
    include: {
      nodes: {
        where: { archived: false },
        include: {
          courseUnit: {
            select: {
              unitType: true,
              label: true,
              description: true,
              modules: {
                select: {
                  label: true,
                  lessons: {
                    select: { label: true },
                    take: 10,
                  },
                },
                take: 5,
              },
            },
          },
        },
      },
      edges: true,
    },
  })

  if (!courseMap) {
    return { validations: [] }
  }

  // 2. Filter to PREREQUISITE edges only
  const prereqEdges = courseMap.edges.filter((e) => e.edgeType === 'PREREQUISITE')

  if (prereqEdges.length === 0) {
    return { validations: [] }
  }

  // 3. Build node lookup
  const nodeById = new Map(courseMap.nodes.map((n) => [n.id, n]))

  // Helper: extract topic strings from a node's unit modules/lessons
  const mapNodes = courseMap.nodes
  type MapNodeWithUnit = (typeof mapNodes)[number]
  function getTopics(node: MapNodeWithUnit): string {
    if (!node.courseUnit?.modules?.length) return 'no lesson details'
    const topics: string[] = []
    for (const mod of node.courseUnit.modules) {
      for (const lesson of mod.lessons) {
        topics.push(lesson.label)
      }
      if (mod.lessons.length === 0) {
        topics.push(mod.label)
      }
    }
    return topics.length > 0 ? topics.join(', ') : 'no lesson details'
  }

  // 4. Build context for AI — describe each prerequisite pair
  const pairs = prereqEdges
    .map((e) => {
      const prereqNode = nodeById.get(e.fromNodeId)
      const targetNode = nodeById.get(e.toNodeId)
      if (!prereqNode || !targetNode) return null

      return {
        prereqId: prereqNode.id,
        prereqLabel: prereqNode.label,
        prereqType: prereqNode.courseUnit?.unitType || prereqNode.nodeType,
        prereqDescription: prereqNode.courseUnit?.description || '',
        prereqTopics: getTopics(prereqNode),
        targetId: targetNode.id,
        targetLabel: targetNode.label,
        targetType: targetNode.courseUnit?.unitType || targetNode.nodeType,
        targetDescription: targetNode.courseUnit?.description || '',
        targetTopics: getTopics(targetNode),
      }
    })
    .filter(Boolean)

  if (pairs.length === 0) {
    return { validations: [] }
  }

  const pairsContext = pairs.map((p, i) => `
### Pair ${i + 1}
Prerequisite: "${p!.prereqLabel}" (${p!.prereqType})
  Description: ${p!.prereqDescription || '(none)'}
  Lesson topics: ${p!.prereqTopics}
Target: "${p!.targetLabel}" (${p!.targetType})
  Description: ${p!.targetDescription || '(none)'}
  Lesson topics: ${p!.targetTopics}
  prereqNodeId: ${p!.prereqId}
  targetNodeId: ${p!.targetId}`).join('\n')

  // 5. Call Claude Haiku
  const anthropic = new Anthropic()
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `You are a curriculum design expert. Evaluate whether each prerequisite relationship in this course map is well-covered — i.e., does the prerequisite node's content adequately prepare students for the target node?

## Prerequisite Pairs to Evaluate
${pairsContext}

## Instructions
For each pair, assess whether the prerequisite content covers the foundational knowledge needed for the target. Consider:
- Do the prerequisite's topics build toward the target's topics?
- Are there knowledge gaps where the target assumes concepts not covered by the prerequisite?
- Is the prerequisite too broad or too narrow for what the target needs?

For each pair, return a JSON object with:
- nodeId: the targetNodeId
- nodeLabel: the target's label
- prerequisiteNodeId: the prereqNodeId
- prerequisiteLabel: the prerequisite's label
- status: "ok" if well-covered, "gap" if significant knowledge is missing, "partial" if some coverage but notable gaps
- suggestion: brief actionable advice (1-2 sentences). For "ok" items, confirm what's working. For gaps/partial, explain what's missing and how to fix it.

Return ONLY a JSON array. Do not wrap in markdown code fences.`,
    }],
  })

  const text = msg.content[0].type === 'text' ? msg.content[0].text : '[]'

  try {
    const parsed = JSON.parse(extractJson(text))
    const validations = Array.isArray(parsed) ? parsed : []

    const validNodeIds = new Set(courseMap.nodes.map((n) => n.id))

    return {
      validations: validations
        .filter((v: PrereqValidation) =>
          v.nodeId &&
          v.prerequisiteNodeId &&
          validNodeIds.has(v.nodeId) &&
          validNodeIds.has(v.prerequisiteNodeId) &&
          v.status &&
          v.suggestion
        )
        .map((v: PrereqValidation) => ({
          nodeId: v.nodeId,
          nodeLabel: v.nodeLabel || v.nodeId,
          prerequisiteNodeId: v.prerequisiteNodeId,
          prerequisiteLabel: v.prerequisiteLabel || v.prerequisiteNodeId,
          status: (['ok', 'gap', 'partial'].includes(v.status) ? v.status : 'partial') as PrereqStatus,
          suggestion: v.suggestion,
        })),
    }
  } catch {
    return { validations: [] }
  }
}
