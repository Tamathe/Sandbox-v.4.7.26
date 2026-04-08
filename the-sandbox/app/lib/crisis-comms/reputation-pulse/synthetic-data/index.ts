/**
 * Synthetic data index — single 7-day Sprout Social-style dataset.
 */

import { SPROUT_7DAY_POSTS } from './sprout-7day-posts'
import type { SocialPost } from '../types'

export function getPosts(): SocialPost[] {
  return SPROUT_7DAY_POSTS
}

export { SPROUT_7DAY_POSTS }
