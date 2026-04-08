import { Redis } from '@upstash/redis'

function createRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

const globalForRedis = globalThis as unknown as { redis: Redis | null }

export const redis: Redis | null = globalForRedis.redis ?? createRedis()

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis
