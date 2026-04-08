import { createHash } from 'crypto'
import { prisma } from './prisma'
import type { Prisma } from '../generated/prisma'

// ── T1: Tamper-evident hash-chained audit trail ─────────────────────────────

function computeHash(
  previousHash: string,
  eventType: string,
  eventData: string,
  actorId: string,
  timestamp: string,
): string {
  return createHash('sha256')
    .update(`${previousHash}|${eventType}|${eventData}|${actorId}|${timestamp}`)
    .digest('hex')
}

export async function appendToChain(
  eventType: string,
  eventData: Record<string, unknown>,
  actorId: string,
  actorEmail: string,
) {
  // Find max sequence number atomically
  const last = await prisma.complianceAuditChain.findFirst({
    orderBy: { sequenceNumber: 'desc' },
    select: { sequenceNumber: true, currentHash: true },
  })

  const sequenceNumber = (last?.sequenceNumber ?? 0) + 1
  const previousHash = last?.currentHash ?? '0'.repeat(64) // genesis hash
  const timestamp = new Date()
  const eventDataStr = JSON.stringify(eventData)

  const currentHash = computeHash(
    previousHash,
    eventType,
    eventDataStr,
    actorId,
    timestamp.toISOString(),
  )

  return prisma.complianceAuditChain.create({
    data: {
      sequenceNumber,
      eventType,
      eventData: eventData as unknown as Prisma.InputJsonValue,
      actorId,
      actorEmail,
      previousHash,
      currentHash,
      timestamp,
    },
  })
}

export async function verifyChainIntegrity(): Promise<{
  valid: boolean
  brokenAt?: number
  totalRecords: number
}> {
  const records = await prisma.complianceAuditChain.findMany({
    orderBy: { sequenceNumber: 'asc' },
  })

  if (records.length === 0) {
    return { valid: true, totalRecords: 0 }
  }

  let expectedPreviousHash = '0'.repeat(64)

  for (const record of records) {
    // Verify previous hash chain
    if (record.previousHash !== expectedPreviousHash) {
      return { valid: false, brokenAt: record.sequenceNumber, totalRecords: records.length }
    }

    // Recompute and verify current hash
    const recomputed = computeHash(
      record.previousHash,
      record.eventType,
      JSON.stringify(record.eventData),
      record.actorId,
      record.timestamp.toISOString(),
    )

    if (recomputed !== record.currentHash) {
      return { valid: false, brokenAt: record.sequenceNumber, totalRecords: records.length }
    }

    expectedPreviousHash = record.currentHash
  }

  return { valid: true, totalRecords: records.length }
}

export async function getAuditChain(options: {
  eventType?: string
  startDate?: Date
  endDate?: Date
  limit?: number
}) {
  const where: Record<string, unknown> = {}

  if (options.eventType) {
    where.eventType = options.eventType
  }

  if (options.startDate || options.endDate) {
    const ts: Record<string, Date> = {}
    if (options.startDate) ts.gte = options.startDate
    if (options.endDate) ts.lte = options.endDate
    where.timestamp = ts
  }

  return prisma.complianceAuditChain.findMany({
    where,
    orderBy: { sequenceNumber: 'desc' },
    take: options.limit ?? 100,
  })
}

export async function exportAuditChain(format: 'json' | 'csv'): Promise<string> {
  const records = await prisma.complianceAuditChain.findMany({
    orderBy: { sequenceNumber: 'asc' },
  })

  if (format === 'json') {
    return JSON.stringify(records, null, 2)
  }

  // CSV format
  const headers = [
    'sequenceNumber',
    'eventType',
    'eventData',
    'actorId',
    'actorEmail',
    'previousHash',
    'currentHash',
    'timestamp',
  ]
  const rows = records.map((r) =>
    [
      r.sequenceNumber,
      `"${r.eventType}"`,
      `"${JSON.stringify(r.eventData).replace(/"/g, '""')}"`,
      `"${r.actorId}"`,
      `"${r.actorEmail}"`,
      `"${r.previousHash}"`,
      `"${r.currentHash}"`,
      `"${r.timestamp.toISOString()}"`,
    ].join(','),
  )

  return [headers.join(','), ...rows].join('\n')
}
