// ─── Student Risk Signal Constants ──────────────────────────────
// Centralized thresholds used across multiple modules to ensure
// consistent risk detection behavior. Change here → changes everywhere.
//
// Consumers:
//   - app/lib/student-profile-service.ts (riskScore computation)
//   - app/lib/success/signal-collectors.ts (success score signals)
//   - app/lib/success/success-service.ts (Sandy context injection)
//   - app/lib/proactive-suggestions.ts (nudge triggers)
//   - app/lib/concierge-service.ts (Sandy proactive alerts)
//   - app/lib/learning-observer.ts (frustration/overload detection)

// ── Inactivity ──────────────────────────────────────────────────

/** Days without a session before student is flagged as inactive (profile risk) */
export const INACTIVE_DAYS_THRESHOLD = 7

/** Days without activity before Sandy context mentions "days since active" */
export const INACTIVE_DAYS_SANDY_CONTEXT = 3

/** Days since last SR nudge before re-nudging is allowed */
export const SR_NUDGE_COOLDOWN_DAYS = 2

// ── Score & Performance ─────────────────────────────────────────

/** Recent average score below this adds risk (0–1 scale) */
export const LOW_SCORE_THRESHOLD = 0.5

/** Risk weight for low recent average score */
export const LOW_SCORE_RISK_WEIGHT = 0.35

/** Risk weight for inactivity (daysSinceLastSession > INACTIVE_DAYS_THRESHOLD) */
export const INACTIVE_RISK_WEIGHT = 0.25

/** Session abandon rate above this adds risk */
export const HIGH_ABANDON_RATE = 0.4

/** Risk weight for high abandon rate */
export const ABANDON_RISK_WEIGHT = 0.25

/** Learning velocity below this (negative slope) adds risk */
export const NEGATIVE_VELOCITY_THRESHOLD = -0.1

/** Risk weight for negative learning velocity */
export const VELOCITY_RISK_WEIGHT = 0.15

// ── Mastery & Concept ───────────────────────────────────────────

/** Days since concept mastery update before data is considered stale */
export const MASTERY_STALE_DAYS = 14

/** Number of recent missed assignments before capping success score */
export const MISSED_ASSIGNMENT_CAP_THRESHOLD = 2

/** Score cap when too many recent assignments missed */
export const MISSED_ASSIGNMENT_SCORE_CAP = 30

// ── Bloom's Taxonomy ────────────────────────────────────────────

/** Dominant Bloom's level at or below this triggers faculty alert */
export const BLOOM_ALERT_MAX_LEVEL = 2

/** Days at low Bloom's level before Sandy alerts faculty */
export const BLOOM_ALERT_DAYS = 7

// ── Proactive Suggestion Staleness ──────────────────────────────

/** Days after starter pack adoption before "revisit" suggestion */
export const STARTER_PACK_REVISIT_DAYS = 60

/** Days of goal inactivity before "resume goals" suggestion */
export const GOAL_STALE_DAYS = 7

/** Days since last evidence collection before accreditation nudge */
export const EVIDENCE_STALE_DAYS = 14

// ── Intervention Outcomes ───────────────────────────────────────

/** Days before marking an intervention outcome as UNKNOWN if no change */
export const INTERVENTION_OUTCOME_TIMEOUT_DAYS = 14
