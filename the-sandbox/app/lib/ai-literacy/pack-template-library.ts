/**
 * Starter Packs v2 — Master template library.
 * Re-exports all seed content from per-discipline files.
 */

export type { AssignmentTemplateData, CheckpointTemplateData, RubricRow } from './templates/types'

import { STEM_ASSIGNMENTS } from './templates/stem'
import { HUMANITIES_ASSIGNMENTS } from './templates/humanities'
import { SOCIAL_SCIENCES_ASSIGNMENTS } from './templates/social-sciences'
import { ARTS_ASSIGNMENTS } from './templates/arts'
import { PROFESSIONAL_ASSIGNMENTS } from './templates/professional'
import { HEALTH_SCIENCES_ASSIGNMENTS } from './templates/health-sciences'
import { CHECKPOINTS_GROUP1 } from './templates/checkpoints-group1'
import { CHECKPOINTS_GROUP2 } from './templates/checkpoints-group2'

/** All 66 assignment templates across 6 disciplines */
export const ASSIGNMENT_TEMPLATES = [
  ...STEM_ASSIGNMENTS,
  ...HUMANITIES_ASSIGNMENTS,
  ...SOCIAL_SCIENCES_ASSIGNMENTS,
  ...ARTS_ASSIGNMENTS,
  ...PROFESSIONAL_ASSIGNMENTS,
  ...HEALTH_SCIENCES_ASSIGNMENTS,
]

/** All 36 checkpoint templates across 6 disciplines */
export const CHECKPOINT_TEMPLATES = [
  ...CHECKPOINTS_GROUP1,
  ...CHECKPOINTS_GROUP2,
]

// Re-export per-discipline arrays for granular access
export {
  STEM_ASSIGNMENTS,
  HUMANITIES_ASSIGNMENTS,
  SOCIAL_SCIENCES_ASSIGNMENTS,
  ARTS_ASSIGNMENTS,
  PROFESSIONAL_ASSIGNMENTS,
  HEALTH_SCIENCES_ASSIGNMENTS,
  CHECKPOINTS_GROUP1,
  CHECKPOINTS_GROUP2,
}
