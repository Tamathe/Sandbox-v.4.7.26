// ─── Cold Start Golden Path — state management ─────────────────────────────
// Tracks first-time educator progress through the demo conversion funnel:
// course creation → syllabus upload → builder visit → first tool → playground

export interface ColdStartProgress {
  courseCreated: boolean
  syllabusUploaded: boolean
  builderVisited: boolean
  firstToolBuilt: boolean
  playgroundVisited: boolean
}

const STORAGE_PREFIX = 'uky-cold-start-'
const COMPLETE_PREFIX = 'uky-cold-start-complete-'

const DEFAULT_PROGRESS: ColdStartProgress = {
  courseCreated: false,
  syllabusUploaded: false,
  builderVisited: false,
  firstToolBuilt: false,
  playgroundVisited: false,
}

export function getColdStartProgress(email: string): ColdStartProgress {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${email}`)
    if (!raw) return { ...DEFAULT_PROGRESS }
    const parsed = JSON.parse(raw)
    return {
      courseCreated: !!parsed.courseCreated,
      syllabusUploaded: !!parsed.syllabusUploaded,
      builderVisited: !!parsed.builderVisited,
      firstToolBuilt: !!parsed.firstToolBuilt,
      playgroundVisited: !!parsed.playgroundVisited,
    }
  } catch {
    return { ...DEFAULT_PROGRESS }
  }
}

export function setColdStartStep(email: string, step: keyof ColdStartProgress): void {
  try {
    const progress = getColdStartProgress(email)
    progress[step] = true
    localStorage.setItem(`${STORAGE_PREFIX}${email}`, JSON.stringify(progress))
  } catch {}
}

export function isColdStartComplete(email: string): boolean {
  const p = getColdStartProgress(email)
  return p.courseCreated && p.syllabusUploaded && p.builderVisited && p.firstToolBuilt && p.playgroundVisited
}

export function markColdStartComplete(email: string): void {
  try {
    localStorage.setItem(`${COMPLETE_PREFIX}${email}`, 'true')
  } catch {}
}

export function shouldShowColdStart(email: string, courseCount: number): boolean {
  try {
    if (localStorage.getItem(`${COMPLETE_PREFIX}${email}`) === 'true') return false
  } catch {}
  return courseCount === 0
}

/** Returns true if the user has NOT yet built their first tool. */
export function isFirstSession(email: string): boolean {
  try {
    if (localStorage.getItem(`${COMPLETE_PREFIX}${email}`) === 'true') return false
    const progress = getColdStartProgress(email)
    return !progress.firstToolBuilt
  } catch {
    return true
  }
}
