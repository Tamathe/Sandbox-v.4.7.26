const PREFIX_OLD = 'sandbox-'
const PREFIX_NEW = 'uky-'
const MIGRATION_FLAG = 'uky-storage-migrated'

export function migrateLocalStorageKeys(): void {
  if (typeof window === 'undefined') return
  if (localStorage.getItem(MIGRATION_FLAG)) return

  const keysToMigrate: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(PREFIX_OLD)) {
      keysToMigrate.push(key)
    }
  }

  for (const key of keysToMigrate) {
    const value = localStorage.getItem(key)
    if (value !== null) {
      localStorage.setItem(PREFIX_NEW + key.slice(PREFIX_OLD.length), value)
      localStorage.removeItem(key)
    }
  }

  localStorage.setItem(MIGRATION_FLAG, 'true')
}
