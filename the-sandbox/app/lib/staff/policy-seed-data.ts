// ─── Policy Seed Service ─────────────────────────────────────
// Seeds PolicyDocument + PolicyChunk records with embeddings.
// Idempotent: deletes and recreates all policy data on each run.

import { prisma } from '../prisma'
import { embeddingAvailable, getEmbeddingProvider } from '../embedding-service'
import { POLICY_DOCUMENTS, type PolicySeed } from './policy-content'

// ─── Types ──────────────────────────────────────────────────

interface ChunkData {
  sectionTitle: string
  content: string
  chunkIndex: number
  metadata: Record<string, string>
}

// ─── Chunking ───────────────────────────────────────────────

// Maximum chars per chunk (~500 tokens). Keeps each chunk within embedding model limits.
const MAX_CHUNK_CHARS = 2000

/**
 * Splits a policy's fullText into chunks.
 * Strategy:
 *   1. Split on ## headings (for markdown-formatted simulated policies)
 *   2. If that produces only 1 large chunk (common for raw PDF text),
 *      fall back to paragraph-based splitting with size limits.
 */
function chunkPolicy(policy: PolicySeed): ChunkData[] {
  const headingChunks = chunkByHeadings(policy)

  // If heading-based chunking produced reasonable chunks, use them
  const hasOversized = headingChunks.some((c) => c.content.length > MAX_CHUNK_CHARS * 4)
  if (headingChunks.length > 1 && !hasOversized) {
    return headingChunks
  }

  // Fall back to paragraph-based chunking for raw PDF text
  return chunkByParagraphs(policy)
}

function chunkByHeadings(policy: PolicySeed): ChunkData[] {
  const chunks: ChunkData[] = []
  const lines = policy.fullText.split('\n')

  let currentSection = 'Header'
  let currentContent: string[] = []
  let chunkIndex = 0

  for (const line of lines) {
    const headingMatch = line.match(/^## (.+)$/)
    if (headingMatch) {
      if (currentContent.length > 0) {
        const content = currentContent.join('\n').trim()
        if (content) {
          chunks.push({
            sectionTitle: currentSection,
            content,
            chunkIndex,
            metadata: {
              policyNumber: policy.policyNumber,
              section: currentSection,
              category: policy.category,
              effectiveDate: policy.effectiveDate,
            },
          })
          chunkIndex++
        }
      }
      currentSection = headingMatch[1]
      currentContent = [line]
    } else {
      currentContent.push(line)
    }
  }

  if (currentContent.length > 0) {
    const content = currentContent.join('\n').trim()
    if (content) {
      chunks.push({
        sectionTitle: currentSection,
        content,
        chunkIndex,
        metadata: {
          policyNumber: policy.policyNumber,
          section: currentSection,
          category: policy.category,
          effectiveDate: policy.effectiveDate,
        },
      })
    }
  }

  return chunks
}

function chunkByParagraphs(policy: PolicySeed): ChunkData[] {
  const chunks: ChunkData[] = []
  // Split on double newlines (paragraph breaks) or single newlines with blank lines
  const paragraphs = policy.fullText.split(/\n\s*\n/).filter((p) => p.trim())

  let currentContent = ''
  let currentSection = 'Section 1'
  let chunkIndex = 0
  let sectionNum = 1

  for (const para of paragraphs) {
    const trimmed = para.trim()
    if (!trimmed) continue

    // Check if this paragraph looks like a section header
    const sectionMatch = trimmed.match(
      /^(?:Section|Article|Part|Chapter|SECTION|ARTICLE)\s+[\dIVXA-Z]+[.:]/i
    )
    const numberedHeader = trimmed.match(/^[\dIVX]+\.\s+[A-Z]/)

    if (sectionMatch || numberedHeader) {
      // Flush current content
      if (currentContent.trim()) {
        chunks.push({
          sectionTitle: currentSection,
          content: currentContent.trim(),
          chunkIndex,
          metadata: {
            policyNumber: policy.policyNumber,
            section: currentSection,
            category: policy.category,
            effectiveDate: policy.effectiveDate,
          },
        })
        chunkIndex++
      }
      sectionNum++
      currentSection = trimmed.slice(0, 80).replace(/\n/g, ' ')
      currentContent = trimmed + '\n\n'
      continue
    }

    // If adding this paragraph would exceed limit, flush
    if (currentContent.length + trimmed.length > MAX_CHUNK_CHARS && currentContent.trim()) {
      chunks.push({
        sectionTitle: currentSection,
        content: currentContent.trim(),
        chunkIndex,
        metadata: {
          policyNumber: policy.policyNumber,
          section: currentSection,
          category: policy.category,
          effectiveDate: policy.effectiveDate,
        },
      })
      chunkIndex++
      sectionNum++
      currentSection = `Section ${sectionNum}`
      currentContent = ''
    }

    currentContent += trimmed + '\n\n'
  }

  // Flush remainder
  if (currentContent.trim()) {
    chunks.push({
      sectionTitle: currentSection,
      content: currentContent.trim(),
      chunkIndex,
      metadata: {
        policyNumber: policy.policyNumber,
        section: currentSection,
        category: policy.category,
        effectiveDate: policy.effectiveDate,
      },
    })
  }

  return chunks
}

// ─── Main Seed Function ─────────────────────────────────────

export async function seedPolicyDocuments(): Promise<void> {
  console.log('🏛️  Seeding policy documents...')

  // 1. Delete existing data (idempotent)
  await prisma.policyChunk.deleteMany()
  await prisma.policyDocument.deleteMany()
  console.log('   Cleared existing policy data')

  // 2. Check embedding availability
  const canEmbed = embeddingAvailable()
  if (!canEmbed) {
    console.log('   ⚠️  OPENAI_API_KEY not set — chunks will be created without embeddings')
  }

  let totalChunks = 0

  // 3. Process each policy document
  for (const policy of POLICY_DOCUMENTS) {
    // Create the PolicyDocument record
    const isReal = !!policy.sourceUrl
    const doc = await prisma.policyDocument.create({
      data: {
        policyNumber: policy.policyNumber,
        title: policy.title,
        category: policy.category,
        responsibleOffice: policy.responsibleOffice,
        appliesTo: policy.appliesTo,
        effectiveDate: new Date(policy.effectiveDate),
        lastRevised: new Date(policy.lastRevised),
        fullText: policy.fullText,
        source: isReal ? 'regs.uky.edu' : 'simulated',
        externalUrl: policy.sourceUrl ?? null,
        isActive: true,
      },
    })

    // Chunk the document
    const chunks = chunkPolicy(policy)

    if (canEmbed && chunks.length > 0) {
      // Generate embeddings in batch for this document's chunks
      const embedder = getEmbeddingProvider()
      const texts = chunks.map((c) => {
        // Prefix with policy metadata for better retrieval
        return `${policy.policyNumber} — ${policy.title} | ${c.sectionTitle}\n\n${c.content}`
      })

      let embeddings: number[][] = []
      try {
        embeddings = await embedder.embedBatch(texts)
      } catch (err) {
        console.log(`   ⚠️  Embedding failed for ${policy.policyNumber}: ${err}`)
        console.log('   Creating chunks without embeddings...')
      }

      // Insert chunks with embeddings via raw SQL (pgvector requires raw insert)
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]
        const embedding = embeddings[i]

        if (embedding) {
          // Use raw SQL for vector column
          const vectorStr = `[${embedding.join(',')}]`
          await prisma.$executeRawUnsafe(
            `INSERT INTO "PolicyChunk" (id, "documentId", "sectionTitle", content, "chunkIndex", embedding, metadata, "createdAt")
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5::vector, $6::jsonb, NOW())`,
            doc.id,
            chunk.sectionTitle,
            chunk.content,
            chunk.chunkIndex,
            vectorStr,
            JSON.stringify(chunk.metadata)
          )
        } else {
          // Fallback: create without embedding
          await prisma.policyChunk.create({
            data: {
              documentId: doc.id,
              sectionTitle: chunk.sectionTitle,
              content: chunk.content,
              chunkIndex: chunk.chunkIndex,
              metadata: chunk.metadata,
            },
          })
        }
      }
    } else {
      // No embedding — create chunks via Prisma
      for (const chunk of chunks) {
        await prisma.policyChunk.create({
          data: {
            documentId: doc.id,
            sectionTitle: chunk.sectionTitle,
            content: chunk.content,
            chunkIndex: chunk.chunkIndex,
            metadata: chunk.metadata,
          },
        })
      }
    }

    totalChunks += chunks.length
    console.log(`   ✅ ${policy.policyNumber} — ${policy.title} (${chunks.length} chunks)`)
  }

  console.log(
    `\n🏛️  Policy seeding complete: ${POLICY_DOCUMENTS.length} documents, ${totalChunks} chunks` +
      (canEmbed ? ' (with embeddings)' : ' (no embeddings)')
  )
}
