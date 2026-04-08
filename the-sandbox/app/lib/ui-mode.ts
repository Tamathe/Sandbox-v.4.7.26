export type UIMode = 'professional' | 'gamified'

export function getUIMode(role: 'EDUCATOR' | 'STUDENT' | 'ADMIN'): UIMode {
  if (role === 'EDUCATOR' || role === 'ADMIN') return 'professional'
  return 'professional'
}

export const IS_GAMIFIED = (mode: UIMode) => mode === 'gamified'
export const IS_PROFESSIONAL = (mode: UIMode) => mode === 'professional'
