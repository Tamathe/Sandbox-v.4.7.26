import { prisma } from '../prisma'

export interface UserSearchResult {
  id: string
  name: string
  email: string
  role: string
  avatarUrl: string | null
}

/**
 * Search users by name or email, excluding the current user.
 * Returns up to `limit` results.
 */
export async function searchUsers(
  currentUserId: string,
  query: string,
  limit = 20,
): Promise<UserSearchResult[]> {
  const trimmed = query.trim()
  if (!trimmed || trimmed.length < 2) return []

  const users = await prisma.user.findMany({
    where: {
      id: { not: currentUserId },
      suspended: false,
      OR: [
        { name: { contains: trimmed, mode: 'insensitive' } },
        { email: { contains: trimmed, mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatarUrl: true,
    },
    take: Math.min(limit, 50),
    orderBy: { name: 'asc' },
  })

  return users
}
