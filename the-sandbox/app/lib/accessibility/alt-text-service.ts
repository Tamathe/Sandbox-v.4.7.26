/**
 * ADA Compliance — Alt-Text Generation Service
 *
 * Uses Claude Vision (Haiku) to generate descriptive alt text for images
 * uploaded to the University of Kentucky platform. Supports tool thumbnails, course material images,
 * and playground app image tags.
 */

import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../prisma'
import type { AltTextResult, AltTextTargetType } from './types'

const anthropic = new Anthropic()
const HAIKU = 'claude-haiku-4-5-20251001'

const ALT_TEXT_PROMPT = `You are an accessibility expert generating alt text for a university learning platform.

Analyze this image and provide:
1. A concise alt text (max 150 characters) — describe what the image shows, not what it is ("Student studying in library" not "Photo of student")
2. A longer description for complex images (diagrams, charts, infographics) — up to 300 characters
3. Whether the image is purely decorative (patterns, spacers, generic stock photos with no informational content)
4. The image category

Rules:
- Don't start with "Image of" or "Picture of" — screen readers already announce it as an image
- For charts/diagrams: describe the data relationships, not just "a bar chart"
- For people: describe actions/context, not physical appearance unless relevant
- For screenshots: describe what the UI shows and what action is being demonstrated
- For decorative images: set isDecorative=true, altText="" (empty string is correct per WCAG)

Return JSON only:
{
  "altText": "...",
  "longDescription": "...",
  "confidence": 0.0-1.0,
  "isDecorative": false,
  "category": "photo|diagram|chart|icon|decorative|screenshot|infographic"
}`

/**
 * Generate alt text for an image URL using Claude Vision.
 */
export async function generateAltText(
  imageUrl: string,
  context?: string,
): Promise<AltTextResult> {
  const prompt = context
    ? `${ALT_TEXT_PROMPT}\n\nContext: This image appears in: ${context}`
    : ALT_TEXT_PROMPT

  const response = await anthropic.messages.create({
    model: HAIKU,
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'url', url: imageUrl } },
          { type: 'text', text: prompt },
        ],
      },
    ],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const cleaned = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
  return JSON.parse(cleaned) as AltTextResult
}

/**
 * Save approved alt text to the target model (Tool, CourseMaterial, etc.).
 */
export async function saveAltText(
  targetType: AltTextTargetType,
  targetId: string,
  altText: string,
): Promise<void> {
  switch (targetType) {
    case 'tool':
      await prisma.tool.update({
        where: { id: targetId },
        data: { thumbnailAltText: altText },
      })
      break
    // Future phases will add course_material and playground_app cases
    default:
      throw new Error(`Unsupported target type: ${targetType}`)
  }
}

/**
 * Bulk-generate alt text for all Tool thumbnails that are missing alt text.
 * Returns a summary of results. Used by Sandy agent tool.
 */
export async function bulkGenerateToolAltText(): Promise<{
  scanned: number
  generated: number
  failed: number
  results: Array<{ toolId: string; toolName: string; altText: string; confidence: number }>
}> {
  const tools = await prisma.tool.findMany({
    where: {
      thumbnailUrl: { not: null },
      thumbnailAltText: null,
    },
    select: { id: true, name: true, thumbnailUrl: true, category: true },
    take: 50, // Process in batches to avoid rate limits
  })

  const results: Array<{ toolId: string; toolName: string; altText: string; confidence: number }> = []
  let failed = 0

  for (const tool of tools) {
    try {
      const result = await generateAltText(
        tool.thumbnailUrl!,
        `Tool thumbnail for "${tool.name}" (category: ${tool.category})`,
      )
      // Auto-save high-confidence results
      if (result.confidence >= 0.8) {
        await saveAltText('tool', tool.id, result.isDecorative ? '' : result.altText)
      }
      results.push({
        toolId: tool.id,
        toolName: tool.name,
        altText: result.isDecorative ? '(decorative)' : result.altText,
        confidence: result.confidence,
      })
    } catch {
      failed++
    }
  }

  return {
    scanned: tools.length,
    generated: results.length,
    failed,
    results,
  }
}
