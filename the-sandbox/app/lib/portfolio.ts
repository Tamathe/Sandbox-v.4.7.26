import { isValid, parse } from 'date-fns'
import type {
  PortfolioType,
  Prisma,
  PrismaClient,
  Tool,
} from '../generated/prisma'

export const PHASE_ONE_PORTFOLIO_TYPES: PortfolioType[] = [
  'EDUCATION',
  'EXPERIENCE',
  'PROJECT',
  'AWARD',
  'CERTIFICATION',
]

export const ALL_PORTFOLIO_TYPES: PortfolioType[] = [
  'EDUCATION',
  'EXPERIENCE',
  'PROJECT',
  'PUBLICATION',
  'CERTIFICATION',
  'SKILL',
  'AWARD',
]

export function isPortfolioType(value: unknown): value is PortfolioType {
  return typeof value === 'string' && ALL_PORTFOLIO_TYPES.includes(value as PortfolioType)
}

export function normalizeSkills(value: unknown): string[] {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .filter((entry): entry is string => typeof entry === 'string')
          .map((entry) => entry.trim())
          .filter(Boolean)
      )
    )
  }

  if (typeof value === 'string') {
    return Array.from(
      new Set(
        value
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean)
      )
    )
  }

  return []
}

export function parsePortfolioDateInput(value: unknown): Date | null {
  if (!value || typeof value !== 'string') return null

  const trimmed = value.trim()
  if (!trimmed || trimmed.toLowerCase() === 'present') return null

  if (/^\d{4}-\d{2}$/.test(trimmed)) {
    const parsed = new Date(`${trimmed}-01T00:00:00.000Z`)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  const monthYear = parse(trimmed, 'MMM yyyy', new Date())
  if (isValid(monthYear)) return monthYear

  const genericDate = new Date(trimmed)
  return Number.isNaN(genericDate.getTime()) ? null : genericDate
}

export function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export function getMetadataString(
  metadata: Prisma.JsonValue | null | undefined,
  key: string
): string | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null
  const entry = (metadata as Record<string, Prisma.JsonValue>)[key]
  return typeof entry === 'string' ? entry : null
}

export async function maybeCreatePortfolioItem(
  prisma: PrismaClient,
  tool: Pick<Tool, 'id' | 'name' | 'shortDescription' | 'toolType' | 'category'>,
  userId: string
) {
  const existingItems = await prisma.portfolioItem.findMany({
    where: { userId },
    select: { id: true, metadata: true },
  })

  const alreadyCaptured = existingItems.some(
    (item) => getMetadataString(item.metadata, 'toolId') === tool.id
  )

  if (alreadyCaptured) return null

  return prisma.portfolioItem.create({
    data: {
      userId,
      type: 'PROJECT',
      title: tool.name,
      organization: 'The Sandbox',
      description: tool.shortDescription,
      skills: [],
      isVerified: true,
      metadata: {
        toolId: tool.id,
        toolType: tool.toolType,
        category: tool.category,
      },
    },
  })
}
