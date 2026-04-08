const SESSION_LOG_KEY = 'uky-evaluator-session-log'

export interface EvaluatorLogEntry {
  timestamp: string
  action: string
  detail?: string
}

export function logEvaluatorAction(action: string, detail?: string): void {
  if (typeof window === 'undefined') return
  try {
    const raw = sessionStorage.getItem(SESSION_LOG_KEY)
    const log: EvaluatorLogEntry[] = raw ? JSON.parse(raw) : []
    log.push({
      timestamp: new Date().toISOString(),
      action,
      detail,
    })
    sessionStorage.setItem(SESSION_LOG_KEY, JSON.stringify(log))
  } catch {}
}

export function getEvaluatorLog(): EvaluatorLogEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = sessionStorage.getItem(SESSION_LOG_KEY)
    return raw ? (JSON.parse(raw) as EvaluatorLogEntry[]) : []
  } catch {
    return []
  }
}

export function clearEvaluatorLog(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(SESSION_LOG_KEY)
  } catch {}
}
