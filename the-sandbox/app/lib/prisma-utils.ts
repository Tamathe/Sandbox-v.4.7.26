import type { Prisma } from '../generated/prisma'

/**
 * Safely coerce a plain JS value into Prisma's InputJsonValue.
 * Prisma Json columns accept plain objects/arrays, but TypeScript's
 * structural typing sometimes rejects them. This round-trip guarantees
 * a JSON-safe value that satisfies the Prisma type.
 */
export function toJsonValue<T>(value: T): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}
