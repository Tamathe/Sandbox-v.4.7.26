/**
 * Shared Prisma include shapes.
 * Import these instead of repeating the same include objects across route files.
 * Changing a shape here updates all usages automatically.
 */

/** Tool card — used in list views, search results, and admin grids */
export const TOOL_CARD_INCLUDE = {
  creator: true,
  _count: {
    select: {
      upvotes: true,
      favorites: true,
      comments: true,
      sessions: true,
      ratings: true,
    },
  },
  ratings: { select: { rating: true } },
} as const

/** Tool card — counts only, no creator or ratings (lighter query for admin tables) */
export const TOOL_COUNTS_INCLUDE = {
  _count: {
    select: {
      upvotes: true,
      favorites: true,
      comments: true,
      sessions: true,
    },
  },
} as const

/** Full tool detail — used on tool detail page and edit views */
export const TOOL_FULL_INCLUDE = {
  creator: true,
  customMetrics: true,
  gamificationConfig: {
    select: { totalSteps: true, stepLabel: true },
  },
  ratings: { select: { rating: true } },
  _count: {
    select: {
      upvotes: true,
      favorites: true,
      comments: true,
      ratings: true,
      sessions: true,
    },
  },
} as const

/** Bounty with poster/claimer and review count */
export const BOUNTY_INCLUDE = {
  postedBy: { select: { id: true, name: true, department: true, role: true } },
  claimedBy: { select: { id: true, name: true, department: true } },
  _count: { select: { reviews: true } },
} as const

/** User summary — used in admin user lists */
export const USER_SUMMARY_INCLUDE = {
  _count: {
    select: {
      tools: true,
      toolSessions: true,
    },
  },
} as const
