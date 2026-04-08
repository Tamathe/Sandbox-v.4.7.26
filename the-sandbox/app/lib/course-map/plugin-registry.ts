'use client'

// ── Types ──────────────────────────────────────────────────────────────────

export type { PluginPermission, PluginConfigField, PluginManifest, PluginLifecycleHooks, PluginEntry } from './types'
import type { PluginPermission, PluginConfigField, PluginManifest, PluginLifecycleHooks, PluginEntry } from './types'

// ── Storage key ────────────────────────────────────────────────────────────

const STORAGE_KEY = 'uky-course-map-plugins'

function loadStoredState(): Record<string, { status: 'enabled' | 'disabled'; config: Record<string, string | number | boolean>; installedAt: string }> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveStoredState(plugins: Map<string, PluginEntry>) {
  const state: Record<string, { status: string; config: Record<string, string | number | boolean>; installedAt: string }> = {}
  for (const [id, entry] of plugins) {
    if (entry.status === 'enabled' || entry.status === 'disabled') {
      state[id] = { status: entry.status, config: entry.config, installedAt: entry.installedAt }
    }
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // storage full — ignore
  }
}

// ── Plugin Registry ────────────────────────────────────────────────────────

type RegistryListener = () => void

export class PluginRegistry {
  private plugins = new Map<string, PluginEntry>()
  private listeners = new Set<RegistryListener>()

  constructor() {
    // Restore persisted state
    const stored = loadStoredState()
    for (const [id, state] of Object.entries(stored)) {
      // Entries will be fully populated when registerPlugin is called with a matching manifest
      this.plugins.set(id, {
        manifest: { id, name: id, version: '0.0.0', author: '', description: '', category: 'Node Types', icon: '', entryPoint: '', permissions: [], configSchema: [] },
        hooks: {},
        status: state.status as 'enabled' | 'disabled',
        config: state.config,
        installedAt: state.installedAt,
      })
    }
  }

  /** Subscribe to registry changes */
  subscribe(listener: RegistryListener): () => void {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  private notify() {
    for (const fn of this.listeners) fn()
  }

  /** Register a plugin from its manifest and lifecycle hooks */
  async registerPlugin(manifest: PluginManifest, hooks: PluginLifecycleHooks = {}): Promise<void> {
    const existing = this.plugins.get(manifest.id)
    const defaults: Record<string, string | number | boolean> = {}
    for (const field of manifest.configSchema) {
      defaults[field.key] = field.default
    }

    const entry: PluginEntry = {
      manifest,
      hooks,
      status: existing?.status === 'enabled' ? 'enabled' : 'installed',
      config: existing ? { ...defaults, ...existing.config } : defaults,
      installedAt: existing?.installedAt || new Date().toISOString(),
    }

    try {
      if (hooks.onLoad) await hooks.onLoad()
      if (entry.status === 'enabled' && hooks.onEnable) await hooks.onEnable()
    } catch (err) {
      entry.status = 'error'
      entry.error = err instanceof Error ? err.message : 'Failed to load plugin'
    }

    this.plugins.set(manifest.id, entry)
    saveStoredState(this.plugins)
    this.notify()
  }

  /** Unregister a plugin, calling onUnload */
  async unregisterPlugin(pluginId: string): Promise<void> {
    const entry = this.plugins.get(pluginId)
    if (!entry) return
    try {
      if (entry.hooks.onDisable && entry.status === 'enabled') await entry.hooks.onDisable()
      if (entry.hooks.onUnload) await entry.hooks.onUnload()
    } catch {
      // ignore cleanup errors
    }
    this.plugins.delete(pluginId)
    saveStoredState(this.plugins)
    this.notify()
  }

  /** Enable a disabled/installed plugin */
  async enablePlugin(pluginId: string): Promise<void> {
    const entry = this.plugins.get(pluginId)
    if (!entry || entry.status === 'enabled') return
    try {
      if (entry.hooks.onEnable) await entry.hooks.onEnable()
      entry.status = 'enabled'
      entry.error = undefined
    } catch (err) {
      entry.status = 'error'
      entry.error = err instanceof Error ? err.message : 'Failed to enable plugin'
    }
    saveStoredState(this.plugins)
    this.notify()
  }

  /** Disable an enabled plugin */
  async disablePlugin(pluginId: string): Promise<void> {
    const entry = this.plugins.get(pluginId)
    if (!entry || entry.status !== 'enabled') return
    try {
      if (entry.hooks.onDisable) await entry.hooks.onDisable()
      entry.status = 'disabled'
    } catch {
      entry.status = 'disabled'
    }
    saveStoredState(this.plugins)
    this.notify()
  }

  /** Get a plugin by ID */
  getPlugin(pluginId: string): PluginEntry | undefined {
    return this.plugins.get(pluginId)
  }

  /** List all plugins, optionally filtered by category */
  listPlugins(filter?: { category?: string; status?: string }): PluginEntry[] {
    const all = Array.from(this.plugins.values())
    if (!filter) return all
    return all.filter((p) => {
      if (filter.category && p.manifest.category !== filter.category) return false
      if (filter.status && p.status !== filter.status) return false
      return true
    })
  }

  /** Update plugin config */
  updateConfig(pluginId: string, config: Record<string, string | number | boolean>): void {
    const entry = this.plugins.get(pluginId)
    if (!entry) return
    entry.config = { ...entry.config, ...config }
    saveStoredState(this.plugins)
    this.notify()
  }

  /** Clear plugin data */
  clearPluginData(pluginId: string): void {
    const entry = this.plugins.get(pluginId)
    if (!entry) return
    const defaults: Record<string, string | number | boolean> = {}
    for (const field of entry.manifest.configSchema) {
      defaults[field.key] = field.default
    }
    entry.config = defaults
    saveStoredState(this.plugins)
    this.notify()
  }

  /** Notify all enabled plugins of a map change */
  async notifyMapChange(mapData: { nodes: unknown[]; edges: unknown[] }): Promise<void> {
    for (const entry of this.plugins.values()) {
      if (entry.status === 'enabled' && entry.hooks.onMapChange) {
        try {
          await entry.hooks.onMapChange(mapData)
        } catch {
          // ignore per-plugin errors
        }
      }
    }
  }

  /** Count of installed plugins */
  get count(): number {
    return this.plugins.size
  }

  /** Count of enabled plugins */
  get enabledCount(): number {
    return Array.from(this.plugins.values()).filter((p) => p.status === 'enabled').length
  }
}
