import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../prisma'

// ── Types ────────────────────────────────────────────────────────────────────

export type Urgency = 'high' | 'medium' | 'low'

export interface StudyRecommendation {
  nodeId: string
  nodeLabel: string
  reason: string
  urgency: Urgency
}

export interface StudyRecommendationsResult {
  recommendations: StudyRecommendation[]
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

export async function getStudyRecommendations(
  courseId: string,
  studentId: string,
): Promise<StudyRecommendationsResult> {
  // 1. Fetch course map with nodes + edges
  const courseMap = await prisma.courseMap.findUnique({
    where: { courseId },
    include: {
      nodes: {
        where: { archived: false },
        include: {
          courseUnit: {
            select: { unitType: true, label: true, startDate: true, endDate: true },
          },
        },
      },
      edges: true,
    },
  })

  if (!courseMap || courseMap.nodes.length === 0) {
    return { recommendations: [] }
  }

  // 2. Fetch student's study plan
  const studyPlan = await prisma.studentStudyPlan.findMany({
    where: { studentId, courseId },
    orderBy: { targetDate: 'asc' },
  })

  // 3. Fetch lesson progress for the student via course units → modules → lessons
  // Build a map of courseUnitId → nodeId
  const unitToNode = new Map<string, string>()
  for (const n of courseMap.nodes) {
    if (n.courseUnitId) unitToNode.set(n.courseUnitId, n.id)
  }

  const lessonProgress = await prisma.lessonProgress.findMany({
    where: {
      userId: studentId,
      lesson: {
        courseModule: {
          courseUnit: { courseMapId: courseMap.id },
        },
      },
    },
    include: {
      lesson: {
        include: {
          courseModule: {
            select: { courseUnitId: true },
          },
        },
      },
    },
  })

  // Build progress map: nodeId → { completed, total }
  const progressByNode = new Map<string, { completed: number; total: number }>()
  for (const lp of lessonProgress) {
    const nodeId = unitToNode.get(lp.lesson.courseModule.courseUnitId)
    if (!nodeId) continue
    const existing = progressByNode.get(nodeId) || { completed: 0, total: 0 }
    existing.total++
    if (lp.completed) existing.completed++
    progressByNode.set(nodeId, existing)
  }

  // 4. Build context strings
  const now = new Date()
  const nodeList = courseMap.nodes.map((n) => {
    const prog = progressByNode.get(n.id)
    const progStr = prog ? `${prog.completed}/${prog.total} lessons done` : 'no progress tracked'
    const dueDates: string[] = []
    if (n.courseUnit?.endDate) {
      dueDates.push(`due ${n.courseUnit.endDate.toISOString().slice(0, 10)}`)
    }
    return `- ${n.id}: "${n.label}" (${n.courseUnit?.unitType || n.nodeType}) — ${progStr}${dueDates.length ? ` — ${dueDates.join(', ')}` : ''}`
  }).join('\n')

  const edgeList = courseMap.edges.length > 0
    ? courseMap.edges.map((e) => `- ${e.fromNodeId} → ${e.toNodeId} (${e.edgeType})`).join('\n')
    : '(no edges)'

  const planList = studyPlan.length > 0
    ? studyPlan.map((p) => {
        const status = p.completedAt ? 'completed' : p.targetDate < now ? 'OVERDUE' : 'planned'
        return `- Node ${p.nodeId}: target ${p.targetDate.toISOString().slice(0, 10)} — ${status}`
      }).join('\n')
    : '(no study plan entries)'

  // 5. Call Claude Haiku
  const anthropic = new Anthropic()
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: `You are Sandy, a friendly AI study advisor. Based on this student's course map, progress, and study plan, recommend the top 3-5 nodes they should focus on next.

## Course Map Nodes
${nodeList}

## Edges (prerequisites and sequences)
${edgeList}

## Student's Study Plan
${planList}

## Today's Date
${now.toISOString().slice(0, 10)}

## Instructions
Prioritize:
1. Overdue items (highest urgency)
2. Items due soon (within 7 days) that aren't completed
3. Prerequisites that must be done before upcoming items
4. Items the student has started but not finished

For each recommendation, return a JSON object with:
- nodeId: the node ID from the list above
- nodeLabel: the node's label text
- reason: a brief, encouraging explanation (1-2 sentences) of why to focus here
- urgency: "high" (overdue or due within 3 days), "medium" (due within 7 days or blocking something), or "low" (good next step)

Return ONLY a JSON array of 3-5 recommendations. If the student has completed everything, return an empty array [].
Do not wrap in markdown code fences.`,
    }],
  })

  const text = msg.content[0].type === 'text' ? msg.content[0].text : '[]'

  try {
    const parsed = JSON.parse(extractJson(text))
    const recs = Array.isArray(parsed) ? parsed : []

    const validNodeIds = new Set(courseMap.nodes.map((n) => n.id))
    const nodeLabels = new Map(courseMap.nodes.map((n) => [n.id, n.label]))

    return {
      recommendations: recs
        .filter((r: StudyRecommendation) =>
          r.nodeId && validNodeIds.has(r.nodeId) && r.reason && r.urgency
        )
        .map((r: StudyRecommendation) => ({
          nodeId: r.nodeId,
          nodeLabel: nodeLabels.get(r.nodeId) || r.nodeLabel || r.nodeId,
          reason: r.reason,
          urgency: ['high', 'medium', 'low'].includes(r.urgency) ? r.urgency : 'medium' as Urgency,
        }))
        .slice(0, 5),
    }
  } catch {
    return { recommendations: [] }
  }
}
