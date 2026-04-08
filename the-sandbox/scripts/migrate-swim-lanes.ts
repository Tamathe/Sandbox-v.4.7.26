/**
 * One-time migration: convert static SWIM_LANES from hub-config.ts
 * into platform-level ToolCollections (departmentId=null) in the database.
 *
 * For each swim lane, creates a ToolCollection with:
 *   - slug = lane.id
 *   - name = lane.title
 *   - emoji from lane tools (first tool's emoji, if any)
 *   - departmentId = null (platform-level)
 *
 * For each ShowcaseTool in the lane, attempts to look up a Tool record
 * by matching the route pattern:
 *   - /tools/{id} → use the id segment directly
 *   - Other routes → look up by name (case-insensitive)
 *
 * Idempotent: skips collections whose slug already exists.
 *
 * Usage: npx tsx scripts/migrate-swim-lanes.ts
 */

import 'dotenv/config'
import { prisma } from '../app/lib/prisma'
import { SWIM_LANES } from '../app/hub/hub-config'

async function main() {
  console.log('🏊 Starting swim lane migration...\n')

  let collectionsCreated = 0
  let collectionsSkipped = 0
  let toolsMapped = 0
  let toolsSkipped = 0

  for (const lane of SWIM_LANES) {
    // Check if collection already exists (idempotent)
    const existing = await prisma.toolCollection.findFirst({
      where: { departmentId: null, slug: lane.id },
    })

    if (existing) {
      console.log(`  ⏭️  Collection "${lane.title}" (${lane.id}) already exists — skipping`)
      collectionsSkipped++
      continue
    }

    // Create platform-level collection
    const collection = await prisma.toolCollection.create({
      data: {
        name: lane.title,
        slug: lane.id,
        departmentId: null,
        displayOrder: SWIM_LANES.indexOf(lane),
        emoji: lane.tools[0]?.emoji ?? null,
      },
    })
    console.log(`  ✅ Created collection "${lane.title}" (${collection.id})`)
    collectionsCreated++

    // Map tools
    for (const showcaseTool of lane.tools) {
      let toolId: string | null = null

      // Strategy 1: Route is /tools/{id} — use the ID directly
      const toolsRouteMatch = showcaseTool.route.match(/^\/tools\/(.+)$/)
      if (toolsRouteMatch) {
        const candidateId = toolsRouteMatch[1]
        const tool = await prisma.tool.findUnique({
          where: { id: candidateId },
          select: { id: true },
        })
        if (tool) toolId = tool.id
      }

      // Strategy 2: Look up by name (case-insensitive)
      if (!toolId) {
        const tool = await prisma.tool.findFirst({
          where: { name: { equals: showcaseTool.label, mode: 'insensitive' } },
          select: { id: true },
        })
        if (tool) toolId = tool.id
      }

      if (toolId) {
        try {
          await prisma.collectionTool.create({
            data: {
              collectionId: collection.id,
              toolId,
              displayOrder: lane.tools.indexOf(showcaseTool),
            },
          })
          console.log(`    🔗 Mapped "${showcaseTool.label}" → ${toolId}`)
          toolsMapped++
        } catch (err) {
          // Unique constraint violation — tool already in collection
          console.log(`    ⏭️  "${showcaseTool.label}" already mapped — skipping`)
          toolsSkipped++
        }
      } else {
        console.log(`    ⚠️  No DB Tool found for "${showcaseTool.label}" (route: ${showcaseTool.route}) — skipping`)
        toolsSkipped++
      }
    }
  }

  console.log('\n📊 Migration summary:')
  console.log(`   Collections created: ${collectionsCreated}`)
  console.log(`   Collections skipped: ${collectionsSkipped}`)
  console.log(`   Tools mapped: ${toolsMapped}`)
  console.log(`   Tools skipped: ${toolsSkipped}`)

  await prisma.$disconnect()
}

main().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
