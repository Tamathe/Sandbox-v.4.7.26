/**
 * study-plan-service.ts
 *
 * AI-powered study plan generator. Uses student context + course objectives
 * to build personalized study plans via Sonnet, then logs to StudyPlanLog.
 */

import Anthropic from '@anthropic-ai/sdk'
import { prisma } from './prisma'
import { getStudentContextJSON } from './student-context-api'

// ── Types ─────────────────────────────────────────────────────────────────

export interface StudyPlan {
  courseId: string
  generatedAt: string
  totalEstimatedMinutes: number
  items: StudyPlanItem[]
}

export interface StudyPlanItem {
  concept: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  reason: string
  recommendedActivities: { toolName: string; activityType: string; estimatedMinutes: number }[]
  bloomTarget: number | null
}

// ── Generate ──────────────────────────────────────────────────────────────

export async function generateStudyPlan(
  userId: string,
  courseId: string,
): Promise<StudyPlan> {
  const [studentCtx, objectives, courseTools] = await Promise.all([
    getStudentContextJSON(userId, courseId),
    prisma.learningObjective
      .findMany({
        where: { courseId },
        orderBy: [{ moduleNumber: 'asc' }, { orderIndex: 'asc' }],
        select: { title: true, moduleNumber: true },
      })
      .catch(() => [] as { title: string; moduleNumber: number | null }[]),
    prisma.courseToolLink
      .findMany({
        where: { courseId },
        select: { tool: { select: { id: true, name: true, toolType: true } } },
      })
      .catch(() => [] as { tool: { id: string; name: string; toolType: string } }[]),
  ])

  const availableTools = courseTools.map((ct) => ct.tool)

  // Build the AI prompt
  const contextParts: string[] = []

  if (studentCtx.weakConcepts.length > 0) {
    contextParts.push(
      `Weak concepts: ${studentCtx.weakConcepts.map((c) => `${c.concept} (${Math.round(c.effectiveMastery * 100)}% mastery, ${c.encounterCount} encounters)`).join('; ')}`,
    )
  }

  if (studentCtx.dueConcepts.length > 0) {
    contextParts.push(
      `Overdue for spaced repetition: ${studentCtx.dueConcepts.map((c) => `${c.conceptSlug} (${c.missedReviews} missed reviews)`).join('; ')}`,
    )
  }

  if (studentCtx.strongConcepts.length > 0) {
    contextParts.push(
      `Strong concepts (can skip or use for reinforcement): ${studentCtx.strongConcepts.map((c) => c.concept).join(', ')}`,
    )
  }

  if (studentCtx.profile) {
    const p = studentCtx.profile
    if (p.riskScore != null) {
      const level = p.riskScore > 0.7 ? 'high' : p.riskScore > 0.4 ? 'moderate' : 'low'
      contextParts.push(`Risk level: ${level} (${Math.round(p.riskScore * 100)}%)`)
    }
    if (p.preferredModality) {
      contextParts.push(`Preferred learning modality: ${p.preferredModality}`)
    }
    if (p.learningVelocity != null) {
      const trend =
        p.learningVelocity > 0.05 ? 'improving' : p.learningVelocity < -0.05 ? 'declining' : 'stable'
      contextParts.push(`Learning velocity: ${trend}`)
    }
  }

  if (studentCtx.domainModality) {
    contextParts.push(
      `Domain-specific modality preference: ${studentCtx.domainModality.preferredModality} (${Math.round(studentCtx.domainModality.confidenceScore * 100)}% confidence)`,
    )
  }

  const objectivesList =
    objectives.length > 0
      ? objectives.map((o) => `- ${o.moduleNumber ? `(Module ${o.moduleNumber}) ` : ''}${o.title}`).join('\n')
      : 'No specific objectives defined.'

  const toolsList =
    availableTools.length > 0
      ? availableTools.map((t) => `- ${t.name} (${t.toolType})`).join('\n')
      : 'No specific tools linked.'

  const prompt = `You are an educational AI advisor. Generate a personalized study plan for a student based on their learning data.

## Student Learning State
${contextParts.length > 0 ? contextParts.join('\n') : 'No prior learning data available.'}

## Course Objectives
${objectivesList}

## Available Tools
${toolsList}

## Instructions
Create a focused study plan that:
1. Prioritizes the weakest and most overdue concepts first
2. Recommends specific tools/activities from the available tools list
3. Estimates realistic time for each activity (5-30 minutes each)
4. Assigns priority: "critical" for very weak/overdue, "high" for weak, "medium" for moderate gaps, "low" for reinforcement
5. Limits to 5-8 items maximum — keep it actionable, not overwhelming
6. If no weak concepts exist, suggest reinforcement activities for strong concepts

Respond with ONLY valid JSON matching this schema (no markdown, no explanation):
{
  "totalEstimatedMinutes": <number>,
  "items": [
    {
      "concept": "<concept name>",
      "priority": "critical" | "high" | "medium" | "low",
      "reason": "<brief reason this needs attention>",
      "recommendedActivities": [
        { "toolName": "<tool name>", "activityType": "<what to do>", "estimatedMinutes": <number> }
      ],
      "bloomTarget": <number 1-6 or null>
    }
  ]
}`

  const client = new Anthropic()
  const now = new Date().toISOString()

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')

    const parsed = JSON.parse(text) as { totalEstimatedMinutes: number; items: StudyPlanItem[] }

    const plan: StudyPlan = {
      courseId,
      generatedAt: now,
      totalEstimatedMinutes: parsed.totalEstimatedMinutes,
      items: parsed.items,
    }

    // Log to StudyPlanLog
    await prisma.studyPlanLog
      .create({
        data: {
          userId,
          courseId,
          planType: 'general',
          conceptsTargeted: plan.items.map((i) => i.concept),
          toolsRecommended: [
            ...new Set(
              plan.items.flatMap((i) =>
                i.recommendedActivities.map((a) => a.toolName),
              ),
            ),
          ],
          stepsCount: plan.items.length,
        },
      })
      .catch((err) => console.error('[study-plan] Failed to log plan:', err))

    return plan
  } catch (err) {
    console.error('[study-plan] AI generation failed:', err)

    // Fallback: build a basic plan from raw student context
    const fallbackItems: StudyPlanItem[] = studentCtx.weakConcepts.slice(0, 5).map((c) => ({
      concept: c.concept,
      priority: c.effectiveMastery < 0.25 ? 'critical' as const : 'high' as const,
      reason: `Mastery at ${Math.round(c.effectiveMastery * 100)}% — needs review`,
      recommendedActivities: availableTools.length > 0
        ? [{ toolName: availableTools[0].name, activityType: 'Practice session', estimatedMinutes: 15 }]
        : [{ toolName: 'Study Buddy', activityType: 'Review session', estimatedMinutes: 15 }],
      bloomTarget: null,
    }))

    return {
      courseId,
      generatedAt: now,
      totalEstimatedMinutes: fallbackItems.length * 15,
      items: fallbackItems,
    }
  }
}
