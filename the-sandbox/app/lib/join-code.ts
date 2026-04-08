const JOIN_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateJoinCode(length = 6) {
  return Array.from(
    { length },
    () => JOIN_CODE_CHARS[Math.floor(Math.random() * JOIN_CODE_CHARS.length)]
  ).join('')
}

export function normalizeJoinCode(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .replace(/O/g, '')  // ambiguous chars excluded from generation
    .replace(/I/g, '')
    .replace(/0/g, '')
    .replace(/1/g, '')
    .slice(0, 6)
}
